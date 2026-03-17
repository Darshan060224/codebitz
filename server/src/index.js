require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const path = require('path');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const auctionRoutes = require('./routes/auctions');
const adminRoutes = require('./routes/admin');
const bidRoutes = require('./routes/bids');
const walletRoutes = require('./routes/wallet');
const setupSocket = require('./socket');

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;

  try {
    const hostname = new URL(origin).hostname;
    if (hostname.endsWith('.netlify.app')) return true;
  } catch {
    return false;
  }

  return false;
}

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
};

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
});

app.use(limiter);
app.use(cors(corsOptions));
app.use(express.json());

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Make io accessible in routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/wallet', walletRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Socket.io
setupSocket(io);

// Seed database with demo data
async function seedDatabase() {
  const User = require('./models/User');
  const Auction = require('./models/Auction');
  const CreditTransaction = require('./models/CreditTransaction');

  const existingUsers = await User.countDocuments();
  if (existingUsers > 0) return;

  console.log('Seeding demo data...');

  const admin = await User.create({
    name: 'Admin',
    email: 'admin@knockbet.com',
    password: 'admin123',
    role: 'admin',
    credits: 0,
  });

  const darshan = await User.create({
    name: 'Darshan',
    email: 'darshan@knockbet.com',
    password: 'darshan123',
    role: 'bidder',
    credits: 10000,
  });

  const abinaya = await User.create({
    name: 'Abinaya',
    email: 'abinaya@knockbet.com',
    password: 'abinaya123',
    role: 'bidder',
    credits: 8000,
  });

  await CreditTransaction.create([
    { user: darshan._id, type: 'assign', amount: 10000, reason: 'Welcome credits' },
    { user: abinaya._id, type: 'assign', amount: 8000, reason: 'Welcome credits' },
  ]);

  const now = new Date();
  await Auction.insertMany([
    {
      title: 'Gaming Laptop RTX 4090',
      description: 'High performance gaming laptop with RTX 4090, 32GB RAM, 1TB SSD',
      image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600',
      category: 'Electronics',
      startBid: 5000, currentBid: 5000, minIncrement: 200,
      startTime: new Date(now.getTime() + 2 * 60000),
      endTime: new Date(now.getTime() + 15 * 60000),
      status: 'upcoming', createdBy: admin._id,
    },
    {
      title: 'iPhone 16 Pro Max',
      description: 'Brand new iPhone 16 Pro Max 256GB - Desert Titanium',
      image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600',
      category: 'Electronics',
      startBid: 8000, currentBid: 8000, minIncrement: 500,
      startTime: new Date(now.getTime() - 5 * 60000),
      endTime: new Date(now.getTime() + 10 * 60000),
      status: 'live', createdBy: admin._id,
    },
    {
      title: 'Sony WH-1000XM5 Headphones',
      description: 'Premium noise cancelling headphones',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
      category: 'Electronics',
      startBid: 2000, currentBid: 2000, minIncrement: 100,
      startTime: new Date(now.getTime() - 3 * 60000),
      endTime: new Date(now.getTime() + 20 * 60000),
      status: 'live', createdBy: admin._id,
    },
    {
      title: 'Vintage Guitar Collection',
      description: 'Rare 1965 Fender Stratocaster in excellent condition',
      image: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600',
      category: 'Collectibles',
      startBid: 15000, currentBid: 15000, minIncrement: 1000,
      startTime: new Date(now.getTime() + 30 * 60000),
      endTime: new Date(now.getTime() + 60 * 60000),
      status: 'upcoming', createdBy: admin._id,
    },
    {
      title: 'Nike Air Jordan 1 Retro',
      description: 'Limited edition Chicago colorway, Size 10',
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
      category: 'Fashion',
      startBid: 3000, currentBid: 3000, minIncrement: 200,
      startTime: new Date(now.getTime() - 2 * 60000),
      endTime: new Date(now.getTime() + 12 * 60000),
      status: 'live', createdBy: admin._id,
    },
    {
      title: 'Original Oil Painting',
      description: 'Beautiful landscape oil painting by renowned artist',
      image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600',
      category: 'Art',
      startBid: 4000, currentBid: 4000, minIncrement: 300,
      startTime: new Date(now.getTime() + 5 * 60000),
      endTime: new Date(now.getTime() + 25 * 60000),
      status: 'upcoming', createdBy: admin._id,
    },
  ]);

  console.log('Demo data seeded!');
  console.log('  Admin:   admin@knockbet.com / admin123');
  console.log('  Darshan: darshan@knockbet.com / darshan123');
  console.log('  Abinaya: abinaya@knockbet.com / abinaya123');
}

// Connect DB and start
const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();

  await seedDatabase();

  // Background auction scheduler — auto-end expired live auctions every 10 seconds
  const Auction = require('./models/Auction');
  const User = require('./models/User');
  const Notification = require('./models/Notification');

  setInterval(async () => {
    try {
      const expiredAuctions = await Auction.find({ status: 'live', endTime: { $lte: new Date() } });
      for (const auction of expiredAuctions) {
        auction.status = 'ended';
        if (auction.highestBidder) {
          auction.winner = auction.highestBidder;
          auction.winningBid = auction.currentBid;
          await User.findByIdAndUpdate(auction.highestBidder, {
            $addToSet: { wonAuctions: auction._id },
          });
          await Notification.create({
            user: auction.highestBidder,
            type: 'auction_won',
            title: 'You Won!',
            message: `You won "${auction.title}" with ₹${auction.currentBid}`,
            auction: auction._id,
          });
        }
        await auction.save();
        io.to(`auction_${auction._id}`).emit('auctionEnded', {
          auctionId: auction._id,
          winner: auction.winner,
          winningBid: auction.winningBid,
        });
      }

      // Auto-start upcoming auctions whose start time has passed
      await Auction.updateMany(
        { status: 'upcoming', startTime: { $lte: new Date() }, endTime: { $gt: new Date() } },
        { $set: { status: 'live' } }
      );
    } catch (err) {
      console.error('Scheduler error:', err.message);
    }
  }, 10000);

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Startup error:', err.message);
  process.exit(1);
});
