const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('../../server/src/config/db');

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.NETLIFY_DATABASE_URL_UNPOOLED || process.env.NETLIFY_DATABASE_URL || '';
}

const authRoutes = require('../../server/src/routes/auth');
const auctionRoutes = require('../../server/src/routes/auctions');
const adminRoutes = require('../../server/src/routes/admin');
const bidRoutes = require('../../server/src/routes/bids');
const walletRoutes = require('../../server/src/routes/wallet');

const app = express();

// No-op socket adapter for REST routes that emit events.
const noopIo = {
  to() {
    return this;
  },
  emit() {},
};

app.set('io', noopIo);

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
});

app.use(limiter);
app.use(cors());
app.use(express.json());

// Support both routing styles because Netlify rewrites can forward either
// /api/* or stripped /* depending on platform behavior.
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/auctions', auctionRoutes);
app.use('/auctions', auctionRoutes);

app.use('/api/admin', adminRoutes);
app.use('/admin', adminRoutes);

app.use('/api/bids', bidRoutes);
app.use('/bids', bidRoutes);

app.use('/api/wallet', walletRoutes);
app.use('/wallet', walletRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), runtime: 'netlify-function' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), runtime: 'netlify-function' });
});

let dbReady;
async function ensureDb() {
  if (process.env.DATABASE_URL) return;
  if (!dbReady) {
    dbReady = connectDB();
  }
  return dbReady;
}

const expressHandler = serverless(app);

exports.handler = async (event, context) => {
  await ensureDb();
  return expressHandler(event, context);
};
