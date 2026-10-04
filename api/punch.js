import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const DB_NAME = 'fuckyouai';
const COLLECTION = 'punches';
const COUNTER_ID = 'global';
const MAX_HITS_PER_REQUEST = 100;
const RATE_WINDOW_MS = 10000;
const RATE_LIMIT = 30;
const rateBuckets = new Map();

function currentWeekKey() {
  const d = new Date();
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const start = new Date(Date.UTC(y, 0, 1));
  const w = Math.ceil((((t - start) / 86400000) + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}

let clientPromise;
function getClient() {
  if (!uri) throw new Error('MONGODB_URI is not configured');
  if (!clientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    });
    clientPromise = client.connect();
  }
  return clientPromise;
}

function requestKey(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.socket?.remoteAddress || 'unknown');
}
function allowRequest(key) {
  const now = Date.now();
  const recent = (rateBuckets.get(key) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) { rateBuckets.set(key, recent); return false; }
  recent.push(now);
  rateBuckets.set(key, recent);
  if (rateBuckets.size > 5000) {
    for (const [k, times] of rateBuckets) if (!times.some(t => now - t < RATE_WINDOW_MS)) rateBuckets.delete(k);
  }
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

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  try {
    const client = await getClient();
    const punches = client.db(DB_NAME).collection(COLLECTION);

    if (req.method === 'POST') {
      if (!allowRequest(requestKey(req))) return res.status(429).json({ error: 'Rate limit reached', retryAfterMs: RATE_WINDOW_MS });
      const requestedHits = Number(req.body?.hits ?? 1);
      if (!Number.isFinite(requestedHits) || requestedHits < 1) return res.status(400).json({ error: 'hits must be a positive number' });
      if (requestedHits > MAX_HITS_PER_REQUEST) return res.status(413).json({ error: 'Batch too large', maxHits: MAX_HITS_PER_REQUEST });
      const hits = Math.floor(requestedHits);
      const weekKey = currentWeekKey();
      const weekField = `weeks.${weekKey}`;
      const result = await punches.findOneAndUpdate(
        { _id: COUNTER_ID },
        {
          $inc: { count: hits, [weekField]: hits },
          $set: { updatedAt: new Date() },
          $setOnInsert: { createdAt: new Date(), type: 'global-counter' },
        },
        { upsert: true, returnDocument: 'after' }
      );
      const doc = result?.value ?? result;
      return res.status(200).json({ count: Number(doc?.count ?? hits), weekKey, weekCount: Number(doc?.weeks?.[weekKey] ?? hits), added: hits });
    }

    const stats = await punches.findOne({ _id: COUNTER_ID });
    const weekKey = currentWeekKey();
    return res.status(200).json({ count: Number(stats?.count ?? 0), weekKey, weekCount: Number(stats?.weeks?.[weekKey] ?? 0) });
  } catch (error) {
    console.error('fuckyouai.si punch API error:', error);
    return res.status(500).json({
      error: 'MongoDB connection failed',
      message: process.env.NODE_ENV === 'production' ? 'Check MONGODB_URI and MongoDB Atlas Network Access.' : error.message,
    });
  }
}
