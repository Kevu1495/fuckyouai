import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is required');
const client = new MongoClient(uri);
await client.connect();
const db = client.db('fuckyouai');
await db.collection('leaderboard').createIndex({ week: 1, score: -1, updatedAt: 1 }, { name: 'weekly_score' });
await db.collection('leaderboard').createIndex({ expireAt: 1 }, { name: 'leaderboard_ttl', expireAfterSeconds: 0 });
console.log('MongoDB indexes ready.');
await client.close();
