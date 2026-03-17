const express = require('express');
const Bid = require('../models/Bid');
const Auction = require('../models/Auction');
const User = require('../models/User');
const CreditTransaction = require('../models/CreditTransaction');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

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
