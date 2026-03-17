const express = require('express');
const Bid = require('../models/Bid');
const Auction = require('../models/Auction');
const User = require('../models/User');
const CreditTransaction = require('../models/CreditTransaction');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');
const { postgresEnabled, ensureSchema, getPool, makeId } = require('../config/postgres');

const router = express.Router();

// Place a bid (REST fallback — primary bidding through Socket.io)
router.post('/', auth, async (req, res) => {
  try {
    const { auctionId, amount } = req.body;
    if (!auctionId || amount === undefined) return res.status(400).json({ error: 'auctionId and amount required' });
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0 || !Number.isInteger(numAmount)) {
      return res.status(400).json({ error: 'Bid amount must be a positive whole number' });
    }

    if (postgresEnabled()) {
      await ensureSchema();
      const p = getPool();
      const client = await p.connect();
      try {
        await client.query('BEGIN');

        const auctionRes = await client.query('SELECT * FROM app_auctions WHERE id = $1 FOR UPDATE', [auctionId]);
        if (auctionRes.rowCount === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'Auction not found' });
        }

        const auction = auctionRes.rows[0];
        if (auction.status !== 'live') {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Auction is not live' });
        }

        const now = new Date();
        if (now < new Date(auction.start_time) || now > new Date(auction.end_time)) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Auction is not active' });
        }

        const minBid = Number(auction.current_bid) + Number(auction.min_increment);
        if (numAmount < minBid) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `Minimum bid is ₹${minBid}` });
        }

        const userRes = await client.query('SELECT * FROM app_users WHERE id = $1 FOR UPDATE', [req.user._id]);
        if (userRes.rowCount === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'User not found' });
        }
        const user = userRes.rows[0];
        const available = Number(user.credits) - Number(user.locked_credits);
        if (available < numAmount) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Insufficient credits' });
        }

        if (auction.highest_bidder && auction.highest_bidder !== req.user._id) {
          await client.query(
            'UPDATE app_users SET locked_credits = GREATEST(0, locked_credits - $1) WHERE id = $2',
            [Number(auction.current_bid), auction.highest_bidder]
          );
        }

        const prevMyBidRes = await client.query(
          'SELECT amount FROM app_bids WHERE auction_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1',
          [auctionId, req.user._id]
        );

        let newLocked = Number(user.locked_credits) + numAmount;
        if (prevMyBidRes.rowCount > 0) newLocked -= Number(prevMyBidRes.rows[0].amount);

        await client.query('UPDATE app_users SET locked_credits = $1 WHERE id = $2', [Math.max(0, newLocked), req.user._id]);

        const bidId = makeId();
        await client.query(
          'INSERT INTO app_bids (id, auction_id, user_id, amount) VALUES ($1, $2, $3, $4)',
          [bidId, auctionId, req.user._id, numAmount]
        );

        let newEndTime = auction.end_time;
        if (new Date(auction.end_time).getTime() - now.getTime() < 10000) {
          newEndTime = new Date(new Date(auction.end_time).getTime() + 30000).toISOString();
        }

        await client.query(
          `UPDATE app_auctions
           SET current_bid = $1, highest_bidder = $2, total_bids = total_bids + 1, end_time = $3
           WHERE id = $4`,
          [numAmount, req.user._id, newEndTime, auctionId]
        );

        await client.query(
          'INSERT INTO app_credit_transactions (id, user_id, type, amount, reason) VALUES ($1, $2, $3, $4, $5)',
          [makeId(), req.user._id, 'bid_lock', numAmount, `Bid on "${auction.title}"`]
        );

        const updatedAuction = await client.query('SELECT * FROM app_auctions WHERE id = $1', [auctionId]);
        await client.query('COMMIT');

        const a = updatedAuction.rows[0];
        const bid = {
          _id: bidId,
          auction: auctionId,
          user: req.user._id,
          amount: numAmount,
          createdAt: new Date().toISOString(),
        };
        const auctionOut = {
          _id: a.id,
          title: a.title,
          currentBid: a.current_bid,
          minIncrement: a.min_increment,
          status: a.status,
          totalBids: a.total_bids,
          endTime: a.end_time,
        };

        return res.json({ bid, auction: auctionOut });
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }

    const auction = await Auction.findById(auctionId);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    if (auction.status !== 'live') return res.status(400).json({ error: 'Auction is not live' });

    const now = new Date();
    if (now < auction.startTime || now > auction.endTime) {
      return res.status(400).json({ error: 'Auction is not active' });
    }

    const minBid = auction.currentBid + auction.minIncrement;
    if (amount < minBid) return res.status(400).json({ error: `Minimum bid is ₹${minBid}` });

    const user = await User.findById(req.user._id);
    const availableCredits = user.credits - user.lockedCredits;
    if (availableCredits < amount) return res.status(400).json({ error: 'Insufficient credits' });

    // Unlock previous highest bidder's credits
    if (auction.highestBidder && auction.highestBidder.toString() !== user._id.toString()) {
      const prevBidder = await User.findById(auction.highestBidder);
      if (prevBidder) {
        prevBidder.lockedCredits = Math.max(0, prevBidder.lockedCredits - auction.currentBid);
        await prevBidder.save();
        await Notification.create({
          user: prevBidder._id,
          type: 'outbid',
          title: 'You have been outbid!',
          message: `${user.name} bid ₹${amount} on "${auction.title}"`,
          auction: auction._id,
        });
      }
    }

    // Lock bidder's credits
    user.lockedCredits += amount;
    // If same user re-bids, unlock their previous lock for this auction
    const prevUserBid = await Bid.findOne({ auction: auction._id, user: user._id }).sort({ createdAt: -1 });
    if (prevUserBid) {
      user.lockedCredits = Math.max(0, user.lockedCredits - prevUserBid.amount);
    }
    await user.save();

    // Create bid
    const bid = await Bid.create({ auction: auction._id, user: user._id, amount });

    // Update auction
    auction.currentBid = amount;
    auction.highestBidder = user._id;
    auction.totalBids += 1;
    if (!auction.bidders.includes(user._id)) {
      auction.bidders.push(user._id);
    }

    // Auto-extend timer (anti-sniping)
    const timeLeft = auction.endTime - now;
    if (timeLeft < 10000) {
      auction.endTime = new Date(auction.endTime.getTime() + 30000);
    }

    await auction.save();

    await CreditTransaction.create({
      user: user._id,
      type: 'bid_lock',
      amount,
      reason: `Bid on "${auction.title}"`,
      auction: auction._id,
    });

    const io = req.app.get('io');
    io.to(`auction_${auction._id}`).emit('bidUpdated', {
      auctionId: auction._id,
      bid: { amount, userName: user.name, userId: user._id, createdAt: bid.createdAt },
      currentBid: auction.currentBid,
      highestBidder: { _id: user._id, name: user.name },
      totalBids: auction.totalBids,
      endTime: auction.endTime,
    });

    res.json({ bid, auction });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's bid history
router.get('/history', auth, async (req, res) => {
  try {
    if (postgresEnabled()) {
      await ensureSchema();
      const p = getPool();

      const rows = await p.query(
        `SELECT b.id, b.amount, b.created_at,
                a.id AS auction_id, a.title, a.status, a.current_bid, a.winner, a.image
         FROM app_bids b
         JOIN app_auctions a ON a.id = b.auction_id
         WHERE b.user_id = $1
         ORDER BY b.created_at DESC`,
        [req.user._id]
      );

      const history = rows.rows.map((b) => ({
        _id: b.id,
        auctionId: b.auction_id,
        auctionTitle: b.title,
        auctionImage: b.image,
        amount: b.amount,
        status: b.winner === req.user._id
          ? 'Won'
          : b.status === 'ended'
            ? 'Lost'
            : Number(b.current_bid) === Number(b.amount)
              ? 'Winning'
              : 'Outbid',
        createdAt: b.created_at,
      }));

      return res.json({ history });
    }

    const bids = await Bid.find({ user: req.user._id })
      .populate('auction', 'title status currentBid winner image')
      .sort({ createdAt: -1 });

    const history = bids.map((b) => ({
      _id: b._id,
      auctionId: b.auction._id,
      auctionTitle: b.auction.title,
      auctionImage: b.auction.image,
      amount: b.amount,
      status: b.auction.winner?.toString() === req.user._id.toString()
        ? 'Won'
        : b.auction.status === 'ended'
          ? 'Lost'
          : b.auction.currentBid === b.amount
            ? 'Winning'
            : 'Outbid',
      createdAt: b.createdAt,
    }));

    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
