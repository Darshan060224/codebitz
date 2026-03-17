const { Pool } = require('pg');

function getDatabaseUrl() {
  return process.env.DATABASE_URL
    || process.env.NETLIFY_DATABASE_URL_UNPOOLED
    || process.env.NETLIFY_DATABASE_URL
    || '';
}

function postgresEnabled() {
  return Boolean(getDatabaseUrl());
}

let pool;
function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: getDatabaseUrl(), ssl: { rejectUnauthorized: false } });
  }
  return pool;
}

let schemaReady = false;
let seedReady = false;

async function ensureSchema() {
  if (!postgresEnabled() || schemaReady) return;

  const p = getPool();

  await p.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'bidder',
      credits INTEGER NOT NULL DEFAULT 5000,
      locked_credits INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS app_auctions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      start_bid INTEGER NOT NULL,
      min_increment INTEGER NOT NULL DEFAULT 200,
      current_bid INTEGER NOT NULL,
      highest_bidder TEXT,
      winner TEXT,
      winning_bid INTEGER NOT NULL DEFAULT 0,
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'upcoming',
      total_bids INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS app_bids (
      id TEXT PRIMARY KEY,
      auction_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS app_credit_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS app_notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  schemaReady = true;
}

function makeId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

async function ensureAuctionSeed() {
  if (!postgresEnabled() || seedReady) return;
  await ensureSchema();

  const p = getPool();
  const countRes = await p.query('SELECT COUNT(*)::int AS count FROM app_auctions');
  if (countRes.rows[0].count > 0) {
    seedReady = true;
    return;
  }

  const now = new Date();
  const items = [
    {
      title: 'Gaming Laptop RTX 4090',
      description: 'High performance gaming laptop with RTX 4090, 32GB RAM, 1TB SSD',
      image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600',
      category: 'Electronics',
      start_bid: 5000,
      min_increment: 200,
      start_time: new Date(now.getTime() - 30 * 60000),
      end_time: new Date(now.getTime() + 60 * 60000),
      status: 'live',
    },
    {
      title: 'Sony WH-1000XM5 Headphones',
      description: 'Premium noise cancelling headphones',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
      category: 'Electronics',
      start_bid: 2000,
      min_increment: 100,
      start_time: new Date(now.getTime() - 20 * 60000),
      end_time: new Date(now.getTime() + 40 * 60000),
      status: 'live',
    },
  ];

  for (const item of items) {
    await p.query(
      `INSERT INTO app_auctions
      (id, title, description, image, category, start_bid, min_increment, current_bid, start_time, end_time, status, total_bids)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        makeId(),
        item.title,
        item.description,
        item.image,
        item.category,
        item.start_bid,
        item.min_increment,
        item.start_bid,
        item.start_time,
        item.end_time,
        item.status,
        0,
      ]
    );
  }

  seedReady = true;
}

module.exports = {
  getDatabaseUrl,
  postgresEnabled,
  getPool,
  ensureSchema,
  ensureAuctionSeed,
  makeId,
};
