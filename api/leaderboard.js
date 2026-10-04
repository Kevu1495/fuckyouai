import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const DB_NAME = 'fuckyouai';
const COLLECTION = 'leaderboard';
const MAX_ENTRIES_PER_WEEK = 500;
const MAX_SCORE = 1000000;
const RATE_WINDOW_MS = 15000;
const RATE_LIMIT = 4;
const rateBuckets = new Map();
let clientPromise;

function weekKey() {
  const d = new Date();
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const start = new Date(Date.UTC(y, 0, 1));
  const w = Math.ceil((((t - start) / 86400000) + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}
function cleanName(value) {
  const name = String(value || 'ANON').replace(/[^a-z0-9 _.-]/gi, '').trim().slice(0, 18);
  return name || 'ANON';
}
function cleanId(value) {
  const id = String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  return /^[a-zA-Z0-9_-]{8,64}$/.test(id) ? id : '';
}
function requestKey(req, playerId = '') {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwarded || String(req.socket?.remoteAddress || 'unknown');
  return `${ip}:${playerId || 'anon'}`;
}
function allowRequest(key) {
  const now = Date.now();
  const recent = (rateBuckets.get(key) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) { rateBuckets.set(key, recent); return false; }
  recent.push(now); rateBuckets.set(key, recent);
  if (rateBuckets.size > 5000) for (const [k, times] of rateBuckets) if (!times.some(t => now - t < RATE_WINDOW_MS)) rateBuckets.delete(k);
  return true;
}
function applyCors(req, res) {
  const origin = String(req.headers.origin || '');
  const allowed = new Set([
    'https://fuckyouai.si',
    'https://www.fuckyouai.si',
    ...(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000', 'http://localhost:4173', 'http://127.0.0.1:4173'])
  ]);
  if (origin && allowed.has(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function getClient() {
  if (!uri) throw new Error('MONGODB_URI is not configured');
  if (!clientPromise) clientPromise = new MongoClient(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000 }).connect();
  return clientPromise;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  try {
    const client = await getClient();
    const collection = client.db(DB_NAME).collection(COLLECTION);
    const week = weekKey();

    if (req.method === 'POST') {
      const playerId = cleanId(req.body?.playerId);
      if (!playerId) return res.status(400).json({ error: 'Invalid playerId' });
      if (!allowRequest(requestKey(req, playerId))) return res.status(429).json({ error: 'Too many leaderboard updates', retryAfterMs: RATE_WINDOW_MS });
      const rawScore = Number(req.body?.score);
      if (!Number.isFinite(rawScore) || rawScore < 0 || rawScore > MAX_SCORE) return res.status(400).json({ error: 'Invalid score' });
      const score = Math.floor(rawScore);
      const name = cleanName(req.body?.name);
      const docId = `${playerId}:${week}`;
      const existing = await collection.findOne({ _id: docId }, { projection: { _id: 1 } });
      if (!existing) {
        const count = await collection.countDocuments({ week });
        if (count >= MAX_ENTRIES_PER_WEEK) return res.status(429).json({ error: 'Chaos board is full for this week' });
      }
      await collection.updateOne(
        { _id: docId },
        { $set: { playerId, week, name, updatedAt: new Date(), expireAt: new Date(Date.now() + 14 * 86400000) }, $max: { score } },
        { upsert: true }
      );
    }

    const rows = await collection.find({ week }, { projection: { _id: 0, playerId: 1, name: 1, score: 1 } }).sort({ score: -1, updatedAt: 1 }).limit(10).toArray();
    return res.status(200).json({ week, entries: rows.map((r, i) => ({ rank: i + 1, playerId: r.playerId, name: r.name, score: Number(r.score || 0) })) });
  } catch (error) {
    console.error('fuckyouai.si leaderboard API error:', error);
    return res.status(500).json({ error: 'Leaderboard unavailable', message: process.env.NODE_ENV === 'production' ? 'Check MONGODB_URI and MongoDB Atlas Network Access.' : error.message });
  }
}
