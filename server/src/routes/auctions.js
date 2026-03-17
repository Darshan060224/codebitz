const express = require('express');
const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const Message = require('../models/Message');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { postgresEnabled, ensureSchema, ensureAuctionSeed, getPool } = require('../config/postgres');

const router = express.Router();

// Get all auctions (public)
router.get('/', async (req, res) => {
  try {
    if (postgresEnabled()) {
      await ensureSchema();
      await ensureAuctionSeed();

      const { status, category, search, sort } = req.query;
      const p = getPool();

      await p.query(`
        UPDATE app_auctions
        SET status = 'live'
        WHERE status = 'upcoming' AND start_time <= NOW() AND end_time > NOW()
      `);
      await p.query(`
        UPDATE app_auctions
        SET status = 'ended'
        WHERE status = 'live' AND end_time <= NOW()
      `);

      const where = [];
      const values = [];
      if (status) {
        values.push(status);
        where.push(`status = $${values.length}`);
      }
      if (category) {
        values.push(category);
        where.push(`category = $${values.length}`);
      }
      if (search) {
        values.push(`%${search}%`);
        where.push(`title ILIKE $${values.length}`);
      }

      let orderBy = 'created_at DESC';
      if (sort === 'ending') orderBy = 'end_time ASC';
      if (sort === 'bids') orderBy = 'total_bids DESC';

      const result = await p.query(
        `SELECT * FROM app_auctions ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${orderBy}`,
        values
      );

      const auctions = result.rows.map((a) => ({
        _id: a.id,
        title: a.title,
        description: a.description,
        image: a.image,
        images: [a.image],
        category: a.category,
        startBid: a.start_bid,
        minIncrement: a.min_increment,
        currentBid: a.current_bid,
        highestBidder: a.highest_bidder ? { _id: a.highest_bidder, name: 'Bidder' } : null,
        winner: a.winner ? { _id: a.winner, name: 'Winner' } : null,
        startTime: a.start_time,
        endTime: a.end_time,
        status: a.status,
        totalBids: a.total_bids,
        createdAt: a.created_at,
      }));

      return res.json({ auctions });
    }

    const { status, category, search, sort } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) filter.title = { $regex: search, $options: 'i' };

    // Auto-update statuses
    const now = new Date();
    await Auction.updateMany(
      { status: 'upcoming', startTime: { $lte: now }, endTime: { $gt: now } },
      { status: 'live' }
    );
    await Auction.updateMany(
      { status: 'live', endTime: { $lte: now } },
      { status: 'ended' }
    );

    let query = Auction.find(filter)
      .populate('highestBidder', 'name')
      .populate('winner', 'name');

    if (sort === 'ending') query = query.sort({ endTime: 1 });
    else if (sort === 'bids') query = query.sort({ totalBids: -1 });
    else query = query.sort({ createdAt: -1 });

    const auctions = await query;
    res.json({ auctions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single auction
router.get('/:id', async (req, res) => {
  try {
    if (postgresEnabled()) {
      await ensureSchema();
      const p = getPool();

      const auctionRes = await p.query('SELECT * FROM app_auctions WHERE id = $1 LIMIT 1', [req.params.id]);
      if (auctionRes.rowCount === 0) return res.status(404).json({ error: 'Auction not found' });

      const a = auctionRes.rows[0];

      await p.query(`
        UPDATE app_auctions
        SET status = CASE
          WHEN status = 'upcoming' AND start_time <= NOW() AND end_time > NOW() THEN 'live'
          WHEN (status = 'live' OR status = 'upcoming') AND end_time <= NOW() THEN 'ended'
          ELSE status
        END
        WHERE id = $1
      `, [req.params.id]);

      const refreshed = await p.query('SELECT * FROM app_auctions WHERE id = $1 LIMIT 1', [req.params.id]);
      const row = refreshed.rows[0];

      const bidsRes = await p.query(
        `SELECT b.id, b.amount, b.created_at, b.user_id, u.name
         FROM app_bids b
         LEFT JOIN app_users u ON u.id = b.user_id
         WHERE b.auction_id = $1
         ORDER BY b.created_at DESC
         LIMIT 50`,
        [req.params.id]
      );

      const auction = {
        _id: row.id,
        title: row.title,
        description: row.description,
        image: row.image,
        images: [row.image],
        category: row.category,
        startBid: row.start_bid,
        minIncrement: row.min_increment,
        currentBid: row.current_bid,
        highestBidder: row.highest_bidder ? { _id: row.highest_bidder, name: 'Bidder' } : null,
        winner: row.winner ? { _id: row.winner, name: 'Winner' } : null,
        startTime: row.start_time,
        endTime: row.end_time,
        status: row.status,
        totalBids: row.total_bids,
        createdAt: row.created_at,
      };

      const bids = bidsRes.rows.map((b) => ({
        _id: b.id,
        amount: b.amount,
        createdAt: b.created_at,
        user: { _id: b.user_id, name: b.name || 'Bidder' },
      }));

      return res.json({ auction, bids, messages: [] });
    }

    const auction = await Auction.findById(req.params.id)
      .populate('highestBidder', 'name')
      .populate('winner', 'name')
      .populate('createdBy', 'name');
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    // Auto-update status
    const now = new Date();
    if (auction.status === 'upcoming' && auction.startTime <= now && auction.endTime > now) {
      auction.status = 'live';
      await auction.save();
    } else if ((auction.status === 'live' || auction.status === 'upcoming') && auction.endTime <= now) {
      auction.status = 'ended';
      await auction.save();
    }

    const bids = await Bid.find({ auction: auction._id })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    const messages = await Message.find({ auction: auction._id })
      .sort({ createdAt: 1 })
      .limit(100);

    res.json({ auction, bids, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle interest in auction
router.post('/:id/interested', auth, async (req, res) => {
  try {
    if (postgresEnabled()) {
      return res.json({ interested: false, count: 0 });
    }

    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    const userId = req.user._id;
    const isInterested = auction.interestedUsers.includes(userId);

    if (isInterested) {
      auction.interestedUsers.pull(userId);
      await User.findByIdAndUpdate(userId, { $pull: { interestedAuctions: auction._id } });
    } else {
      auction.interestedUsers.addToSet(userId);
      await User.findByIdAndUpdate(userId, { $addToSet: { interestedAuctions: auction._id } });
    }
    await auction.save();

    res.json({
      interested: !isInterested,
      count: auction.interestedUsers.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
