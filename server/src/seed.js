require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Auction = require('./models/Auction');
const Bid = require('./models/Bid');
const CreditTransaction = require('./models/CreditTransaction');
const Notification = require('./models/Notification');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear all collections
  await User.deleteMany({});
  await Auction.deleteMany({});
  await Bid.deleteMany({});
  await CreditTransaction.deleteMany({});
  await Notification.deleteMany({});

  // ── Users ──────────────────────────────────────────────────────────
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
    credits: 25000,
  });

  const abinaya = await User.create({
    name: 'Abinaya',
    email: 'abinaya@knockbet.com',
    password: 'abinaya123',
    role: 'bidder',
    credits: 20000,
  });

  const judge = await User.create({
    name: 'Judge',
    email: 'judge@knockbet.com',
    password: 'judge123',
    role: 'bidder',
    credits: 50000,
  });

  await CreditTransaction.insertMany([
    { user: darshan._id, type: 'assign', amount: 25000, reason: 'Welcome credits' },
    { user: abinaya._id, type: 'assign', amount: 20000, reason: 'Welcome credits' },
    { user: judge._id,   type: 'assign', amount: 50000, reason: 'Judge demo credits' },
  ]);

  // ── Auctions ───────────────────────────────────────────────────────
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  // 1. LIVE — hot battle (for bid battle demo)
  const auctionLiveHot = await Auction.create({
    title: 'MacBook Pro M3 Max 16"',
    description: 'Brand new MacBook Pro with M3 Max chip, 36GB RAM, 1TB SSD. Factory sealed.',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600',
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=900',
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900',
    ],
    category: 'Electronics',
    startBid: 8000,
    currentBid: 9200,
    minIncrement: 200,
    reservePrice: 9000,
    retailPrice: 22000,
    startTime: new Date(now.getTime() - 8 * 60000),
    endTime: new Date(now.getTime() + 12 * 60000),
    status: 'live',
    heatLevel: 'hot',
    totalBids: 6,
    highestBidder: darshan._id,
    bidders: [darshan._id, abinaya._id],
    createdBy: admin._id,
  });

  // 2. LIVE — warm (for normal bidding demo)
  const auctionLiveWarm = await Auction.create({
    title: 'PlayStation 5 Slim + 2 Controllers',
    description: 'PS5 Slim bundle with DualSense Edge wireless controllers. Perfect condition.',
    image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600',
    images: [
      'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=900',
      'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=900',
    ],
    category: 'Electronics',
    startBid: 3000,
    currentBid: 3800,
    minIncrement: 200,
    retailPrice: 7500,
    startTime: new Date(now.getTime() - 5 * 60000),
    endTime: new Date(now.getTime() + 25 * 60000),
    status: 'live',
    heatLevel: 'warm',
    totalBids: 4,
    highestBidder: abinaya._id,
    bidders: [abinaya._id, judge._id],
    createdBy: admin._id,
  });

  // 3. LIVE — premium collectible with active bidding
  const auctionLiveCollectible = await Auction.create({
    title: 'Pokemon Base Set Booster Box',
    description: 'Factory sealed vintage booster box with strong collector demand and verified authenticity.',
    image: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=600',
    images: [
      'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=900',
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=900',
    ],
    category: 'Collectibles',
    startBid: 12000,
    currentBid: 14500,
    minIncrement: 300,
    reservePrice: 14000,
    retailPrice: 26000,
    startTime: new Date(now.getTime() - 18 * 60000),
    endTime: new Date(now.getTime() + 18 * 60000),
    status: 'live',
    totalBids: 8,
    highestBidder: darshan._id,
    bidders: [darshan._id, abinaya._id, judge._id],
    createdBy: admin._id,
  });

  // 4. LIVE — fashion bundle with image gallery
  const auctionLiveStyle = await Auction.create({
    title: 'MotoGP Race Helmet + Leather Jacket Set',
    description: 'Limited-edition riding set with signed visor and premium protective jacket in mint condition.',
    image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600',
    images: [
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=900',
      'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=900',
    ],
    category: 'Fashion',
    startBid: 4500,
    currentBid: 6500,
    minIncrement: 250,
    reservePrice: 6000,
    retailPrice: 15000,
    startTime: new Date(now.getTime() - 12 * 60000),
    endTime: new Date(now.getTime() + 22 * 60000),
    status: 'live',
    totalBids: 5,
    highestBidder: judge._id,
    bidders: [judge._id, abinaya._id],
    createdBy: admin._id,
  });

  const additionalAuctionCatalog = [
    {
      title: 'Aston Martin F1 Paddock Pass Experience',
      description: 'VIP weekend paddock pass package with hospitality access and signed team merchandise.',
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600',
      images: [
        'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900',
        'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=900',
      ],
      category: 'Experiences',
      startBid: 18000,
      minIncrement: 500,
      retailPrice: 40000,
      status: 'live',
      startOffsetDays: -1,
      endOffsetDays: 9,
    },
    {
      title: 'Yamaha Grand Piano C3 Studio Edition',
      description: 'Concert-grade grand piano with polished ebony finish and matching bench.',
      image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=600',
      images: [
        'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=900',
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=900',
      ],
      category: 'Collectibles',
      startBid: 42000,
      minIncrement: 1200,
      retailPrice: 89000,
      status: 'live',
      startOffsetDays: -2,
      endOffsetDays: 8,
    },
    {
      title: 'Nikon Z8 Creator Bundle',
      description: 'Mirrorless camera bundle with 24-70 lens, mic kit, and cage for creator workflows.',
      image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600',
      images: [
        'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=900',
        'https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?w=900',
      ],
      category: 'Electronics',
      startBid: 16000,
      minIncrement: 400,
      retailPrice: 36000,
      status: 'live',
      startOffsetDays: -1,
      endOffsetDays: 7,
    },
    {
      title: 'Signed Cricket World Cup Bat Display',
      description: 'Limited collector display bat signed by multiple tournament legends.',
      image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600',
      images: [
        'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=900',
        'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=900',
      ],
      category: 'Sports',
      startBid: 9000,
      minIncrement: 250,
      retailPrice: 21000,
      status: 'live',
      startOffsetDays: -1,
      endOffsetDays: 6,
    },
    {
      title: 'Louis Vuitton Horizon Cabin Trolley',
      description: 'Luxury cabin trolley with monogram finish and full authentication documents.',
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
      images: [
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900',
        'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=900',
      ],
      category: 'Fashion',
      startBid: 14000,
      minIncrement: 350,
      retailPrice: 32000,
      status: 'live',
      startOffsetDays: -1,
      endOffsetDays: 5,
    },
    {
      title: 'Signed Anime Cel Archive Frame',
      description: 'Museum-framed original animation cel with archival certificate and studio seal.',
      image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600',
      images: [
        'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=900',
        'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=900',
      ],
      category: 'Art',
      startBid: 11000,
      minIncrement: 300,
      retailPrice: 26000,
      status: 'live',
      startOffsetDays: -1,
      endOffsetDays: 4,
    },
    {
      title: 'Lamborghini Track Day Package',
      description: 'Two-day performance driving experience with instructor coaching and pit access.',
      image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600',
      images: [
        'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=900',
        'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=900',
      ],
      category: 'Experiences',
      startBid: 25000,
      minIncrement: 750,
      retailPrice: 60000,
      status: 'upcoming',
      startOffsetDays: 1,
      endOffsetDays: 10,
    },
    {
      title: 'Hermes Silk Scarf Collector Set',
      description: 'Three-piece collector scarf set with original boutique boxes and condition cards.',
      image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600',
      images: [
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=900',
        'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900',
      ],
      category: 'Fashion',
      startBid: 7000,
      minIncrement: 200,
      retailPrice: 16000,
      status: 'upcoming',
      startOffsetDays: 2,
      endOffsetDays: 9,
    },
    {
      title: 'Star Wars Prop Replica Vault Set',
      description: 'Screen-inspired prop vault with numbered plaques and custom display case.',
      image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600',
      images: [
        'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=900',
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900',
      ],
      category: 'Collectibles',
      startBid: 13500,
      minIncrement: 300,
      retailPrice: 29000,
      status: 'upcoming',
      startOffsetDays: 3,
      endOffsetDays: 10,
    },
    {
      title: 'Bespoke Home Theatre Recliner Row',
      description: 'Four-seat premium recliner row with ambient lighting and powered headrests.',
      image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600',
      images: [
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=900',
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=900&sat=-100',
      ],
      category: 'General',
      startBid: 15000,
      minIncrement: 450,
      retailPrice: 34000,
      status: 'upcoming',
      startOffsetDays: 4,
      endOffsetDays: 10,
    },
    {
      title: 'Road Bike Carbon Race Edition',
      description: 'Ultralight carbon road bike with electronic shifting and race wheelset.',
      image: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=600',
      images: [
        'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=900',
        'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=900',
      ],
      category: 'Sports',
      startBid: 12500,
      minIncrement: 300,
      retailPrice: 31000,
      status: 'upcoming',
      startOffsetDays: 5,
      endOffsetDays: 10,
    },
    {
      title: 'Luxury Beachfront Villa Stay',
      description: 'Five-night private villa experience with concierge service and airport transfer.',
      image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&h=600&fit=crop',
      images: [
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=900&h=900&fit=crop',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900',
      ],
      category: 'Experiences',
      startBid: 30000,
      minIncrement: 900,
      retailPrice: 70000,
      status: 'upcoming',
      startOffsetDays: 6,
      endOffsetDays: 10,
    },
  ];

  const additionalActiveAuctions = await Auction.insertMany(
    additionalAuctionCatalog.map((item) => {
      const startTime = new Date(now.getTime() + item.startOffsetDays * dayMs);
      const endTime = new Date(now.getTime() + item.endOffsetDays * dayMs);
      return {
        title: item.title,
        description: item.description,
        image: item.image,
        images: item.images,
        category: item.category,
        startBid: item.startBid,
        currentBid: item.startBid,
        minIncrement: item.minIncrement,
        reservePrice: Math.round(item.startBid * 1.15),
        retailPrice: item.retailPrice,
        startTime,
        endTime,
        status: item.status,
        totalBids: 0,
        bidders: [],
        createdBy: admin._id,
      };
    })
  );

  // 5. UPCOMING — starts in 3 min (for upcoming demo)
  await Auction.create({
    title: 'Rolex Submariner Date 41mm',
    description: 'Authentic Rolex Submariner in mint condition with original box and papers.',
    image: 'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=600',
    images: [
      'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=900',
      'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=900',
    ],
    category: 'Luxury',
    startBid: 50000,
    currentBid: 50000,
    minIncrement: 1000,
    reservePrice: 55000,
    retailPrice: 120000,
    startTime: new Date(now.getTime() + 3 * 60000),
    endTime: new Date(now.getTime() + 33 * 60000),
    status: 'upcoming',
    createdBy: admin._id,
  });

  // 6. UPCOMING — starts in 8 min
  await Auction.create({
    title: 'DJI Air 3 Fly More Combo',
    description: 'Dual-camera drone bundle with extra batteries, ND filters, and travel case.',
    image: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=600',
    images: [
      'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=900',
      'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=900',
    ],
    category: 'Electronics',
    startBid: 15000,
    currentBid: 15000,
    minIncrement: 500,
    reservePrice: 17000,
    retailPrice: 34000,
    startTime: new Date(now.getTime() + 8 * 60000),
    endTime: new Date(now.getTime() + 38 * 60000),
    status: 'upcoming',
    createdBy: admin._id,
  });

  // 7. UPCOMING — starts in 18 min
  await Auction.create({
    title: 'Diamond Necklace Signature Edition',
    description: 'Certified diamond necklace with showroom packaging and appraisal certificate included.',
    image: 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=600',
    images: [
      'https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=900',
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=900',
    ],
    category: 'Luxury',
    startBid: 22000,
    currentBid: 22000,
    minIncrement: 750,
    reservePrice: 26000,
    retailPrice: 52000,
    startTime: new Date(now.getTime() + 18 * 60000),
    endTime: new Date(now.getTime() + 58 * 60000),
    status: 'upcoming',
    createdBy: admin._id,
  });

  // 8. UPCOMING — starts in 45 min
  await Auction.create({
    title: 'Canon EOS R5 Mark II + 24-70mm Lens',
    description: 'Professional mirrorless camera kit. Under 500 shutter count.',
    image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600',
    images: [
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=900',
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=900',
    ],
    category: 'Electronics',
    startBid: 12000,
    currentBid: 12000,
    minIncrement: 500,
    retailPrice: 30000,
    startTime: new Date(now.getTime() + 45 * 60000),
    endTime: new Date(now.getTime() + 90 * 60000),
    status: 'upcoming',
    createdBy: admin._id,
  });

  // 9. ENDED — Apple Watch Ultra 2 (winner: darshan — bid replay will work here)
  const endedTime = new Date(now.getTime() - 30 * 60000);
  const auctionEnded = await Auction.create({
    title: 'Apple Watch Ultra 2 (49mm)',
    description: 'Titanium case, Alpine Loop band. Barely used — excellent condition.',
    image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600',
    category: 'Electronics',
    startBid: 5000,
    currentBid: 7200,
    minIncrement: 200,
    retailPrice: 15000,
    startTime: new Date(now.getTime() - 90 * 60000),
    endTime: endedTime,
    status: 'ended',
    heatLevel: 'hot',
    totalBids: 7,
    highestBidder: darshan._id,
    winner: darshan._id,
    winningBid: 7200,
    bidders: [darshan._id, abinaya._id, judge._id],
    createdBy: admin._id,
  });

  // ── Seed bids for ended auction (for Bid Replay demo) ──────────────
  const bidStart = new Date(now.getTime() - 88 * 60000);
  const rawBids = [
    { auction: auctionEnded._id, user: judge._id,   amount: 5200, isProxy: false, createdAt: new Date(bidStart.getTime() + 2*60000),  updatedAt: new Date(bidStart.getTime() + 2*60000) },
    { auction: auctionEnded._id, user: abinaya._id,  amount: 5400, isProxy: false, createdAt: new Date(bidStart.getTime() + 3*60000),  updatedAt: new Date(bidStart.getTime() + 3*60000) },
    { auction: auctionEnded._id, user: darshan._id,  amount: 5600, isProxy: false, createdAt: new Date(bidStart.getTime() + 4*60000),  updatedAt: new Date(bidStart.getTime() + 4*60000) },
    { auction: auctionEnded._id, user: abinaya._id,  amount: 6000, isProxy: false, createdAt: new Date(bidStart.getTime() + 5*60000),  updatedAt: new Date(bidStart.getTime() + 5*60000) },
    { auction: auctionEnded._id, user: darshan._id,  amount: 6200, isProxy: false, createdAt: new Date(bidStart.getTime() + 5*60000 + 30000), updatedAt: new Date(bidStart.getTime() + 5*60000 + 30000) }, // battle: <60s gap
    { auction: auctionEnded._id, user: abinaya._id,  amount: 7000, isProxy: true,  createdAt: new Date(bidStart.getTime() + 6*60000),  updatedAt: new Date(bidStart.getTime() + 6*60000) },
    { auction: auctionEnded._id, user: darshan._id,  amount: 7200, isProxy: false, createdAt: new Date(bidStart.getTime() + 7*60000),  updatedAt: new Date(bidStart.getTime() + 7*60000) },
  ];
  await Bid.collection.insertMany(rawBids.map((b) => ({ ...b, _id: new mongoose.Types.ObjectId(), maxBid: 0 })));

  // Add some live bids for the live auctions
  const liveHotBids = [
    { auction: auctionLiveHot._id, user: abinaya._id, amount: 8400, isProxy: false, maxBid: 0, createdAt: new Date(now.getTime() - 7*60000), updatedAt: new Date(now.getTime() - 7*60000) },
    { auction: auctionLiveHot._id, user: darshan._id, amount: 8600, isProxy: false, maxBid: 0, createdAt: new Date(now.getTime() - 6*60000), updatedAt: new Date(now.getTime() - 6*60000) },
    { auction: auctionLiveHot._id, user: abinaya._id, amount: 8800, isProxy: false, maxBid: 0, createdAt: new Date(now.getTime() - 5*60000), updatedAt: new Date(now.getTime() - 5*60000) },
    { auction: auctionLiveHot._id, user: darshan._id, amount: 9000, isProxy: false, maxBid: 0, createdAt: new Date(now.getTime() - 4*60000), updatedAt: new Date(now.getTime() - 4*60000) },
    { auction: auctionLiveHot._id, user: abinaya._id, amount: 9000, isProxy: false, maxBid: 0, createdAt: new Date(now.getTime() - 3*60000 - 30000), updatedAt: new Date(now.getTime() - 3*60000 - 30000) },
    { auction: auctionLiveHot._id, user: darshan._id, amount: 9200, isProxy: false, maxBid: 0, createdAt: new Date(now.getTime() - 3*60000), updatedAt: new Date(now.getTime() - 3*60000) },
  ];
  const liveCollectibleBids = [
    { auction: auctionLiveCollectible._id, user: judge._id, amount: 12600, isProxy: false, maxBid: 0, createdAt: new Date(now.getTime() - 16*60000), updatedAt: new Date(now.getTime() - 16*60000) },
    { auction: auctionLiveCollectible._id, user: abinaya._id, amount: 12900, isProxy: false, maxBid: 0, createdAt: new Date(now.getTime() - 14*60000), updatedAt: new Date(now.getTime() - 14*60000) },
    { auction: auctionLiveCollectible._id, user: darshan._id, amount: 13300, isProxy: false, maxBid: 0, createdAt: new Date(now.getTime() - 12*60000), updatedAt: new Date(now.getTime() - 12*60000) },
    { auction: auctionLiveCollectible._id, user: judge._id, amount: 13800, isProxy: false, maxBid: 0, createdAt: new Date(now.getTime() - 9*60000), updatedAt: new Date(now.getTime() - 9*60000) },
    { auction: auctionLiveCollectible._id, user: darshan._id, amount: 14500, isProxy: false, maxBid: 0, createdAt: new Date(now.getTime() - 6*60000), updatedAt: new Date(now.getTime() - 6*60000) },
  ];
  const liveStyleBids = [
    { auction: auctionLiveStyle._id, user: abinaya._id, amount: 5000, isProxy: false, maxBid: 0, createdAt: new Date(now.getTime() - 11*60000), updatedAt: new Date(now.getTime() - 11*60000) },
    { auction: auctionLiveStyle._id, user: judge._id, amount: 5500, isProxy: false, maxBid: 0, createdAt: new Date(now.getTime() - 10*60000), updatedAt: new Date(now.getTime() - 10*60000) },
    { auction: auctionLiveStyle._id, user: abinaya._id, amount: 6000, isProxy: false, maxBid: 0, createdAt: new Date(now.getTime() - 8*60000), updatedAt: new Date(now.getTime() - 8*60000) },
    { auction: auctionLiveStyle._id, user: judge._id, amount: 6500, isProxy: false, maxBid: 0, createdAt: new Date(now.getTime() - 6*60000), updatedAt: new Date(now.getTime() - 6*60000) },
  ];
  await Bid.collection.insertMany(
    [...liveHotBids, ...liveCollectibleBids, ...liveStyleBids].map((b) => ({ ...b, _id: new mongoose.Types.ObjectId() }))
  );

  // Lock credits for active highest bidders
  darshan.lockedCredits = 23700;
  await darshan.save();
  abinaya.lockedCredits = 3800;
  await abinaya.save();
  judge.lockedCredits = 6500;
  await judge.save();

  // Mark darshan as winner of ended auction
  darshan.wonAuctions = [auctionEnded._id];
  await darshan.save();

  console.log('\n✅ Seed complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  DEMO ACCOUNTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  👑 Admin   admin@knockbet.com  / admin123');
  console.log('  🔨 Darshan darshan@knockbet.com / darshan123 (₹25,000)');
  console.log('  🔨 Abinaya abinaya@knockbet.com / abinaya123 (₹20,000)');
  console.log('  🏛  Judge   judge@knockbet.com   / judge123   (₹50,000)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  AUCTIONS  10 live · 10 upcoming · 1 ended (${additionalActiveAuctions.length + 8} active across 10 days)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
