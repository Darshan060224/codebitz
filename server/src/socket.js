const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Auction = require('./models/Auction');
const Bid = require('./models/Bid');
const Message = require('./models/Message');
const Notification = require('./models/Notification');
const CreditTransaction = require('./models/CreditTransaction');

// Track recent bids for battle detection
const recentBids = {};

// Track active knock timers
const knockTimers = {};

// Bid processing locks to prevent race conditions
const bidLocks = {};

// Dynamic bid increment based on current price
function getEffectiveIncrement(currentBid, baseIncrement) {
  if (currentBid < 5000) return Math.max(baseIncrement, 200);
  if (currentBid < 25000) return Math.max(baseIncrement, 500);
  return Math.max(baseIncrement, 1000);
}

// Auto-proxy bidding: after a bid is placed, check if any proxy bidder should respond
async function checkProxyBidders(io, auction, currentBidderId, depth = 0) {
  if (depth >= 5) return; // Cap recursion to prevent runaway loops

  const proxyBids = await Bid.find({
    auction: auction._id,
    isProxy: true,
    maxBid: { $gt: auction.currentBid },
    user: { $ne: currentBidderId },
  }).sort({ maxBid: -1 }).limit(1).populate('user');

  if (!proxyBids.length) return;
  const proxyBid = proxyBids[0];
  const proxyUser = proxyBid.user;

  const incr = getEffectiveIncrement(auction.currentBid, auction.minIncrement);
  const autoBidAmount = auction.currentBid + incr;
  if (autoBidAmount > proxyBid.maxBid) return; // Would exceed their stated max

  // Check proxy user has enough free credits
  const creditUser = await User.findById(proxyUser._id);
  const prevBid = await Bid.findOne({ auction: auction._id, user: proxyUser._id }).sort({ createdAt: -1 });
  const available = (creditUser.credits - creditUser.lockedCredits) + (prevBid ? prevBid.amount : 0);
  if (available < autoBidAmount) return;

  // Unlock outbid user's credits and notify them
  if (auction.highestBidder && auction.highestBidder.toString() !== proxyUser._id.toString()) {
    const outbidUser = await User.findById(auction.highestBidder);
    if (outbidUser) {
      outbidUser.lockedCredits = Math.max(0, outbidUser.lockedCredits - auction.currentBid);
      await outbidUser.save();
      await Notification.create({
        user: outbidUser._id,
        type: 'outbid',
        title: 'You have been outbid!',
        message: `A proxy bidder placed ₹${autoBidAmount} on "${auction.title}"`,
        auction: auction._id,
      });
      io.to(`auction_${auction._id}`).emit('notification', {
        userId: outbidUser._id,
        type: 'outbid',
        message: `Proxy bidder outbid you with ₹${autoBidAmount}`,
      });
    }
  }

  // Lock proxy user's credits
  if (prevBid) {
    creditUser.lockedCredits = Math.max(0, creditUser.lockedCredits - prevBid.amount);
  }
  creditUser.lockedCredits += autoBidAmount;
  await creditUser.save();

  const newBid = await Bid.create({
    auction: auction._id,
    user: proxyUser._id,
    amount: autoBidAmount,
    maxBid: proxyBid.maxBid,
    isProxy: true,
  });

  auction.currentBid = autoBidAmount;
  auction.highestBidder = proxyUser._id;
  auction.totalBids += 1;
  if (!auction.bidders.includes(proxyUser._id)) auction.bidders.push(proxyUser._id);
  await auction.save();

  await CreditTransaction.create({
    user: proxyUser._id,
    type: 'bid_lock',
    amount: autoBidAmount,
    reason: `Auto proxy bid on "${auction.title}"`,
    auction: auction._id,
  });

  io.to(`auction_${auction._id}`).emit('bidUpdated', {
    auctionId: auction._id,
    bid: { amount: autoBidAmount, userName: `🤖 ${proxyUser.name}`, userId: proxyUser._id, createdAt: newBid.createdAt, isProxy: true },
    currentBid: auction.currentBid,
    highestBidder: { _id: proxyUser._id, name: proxyUser.name },
    totalBids: auction.totalBids,
    biddersCount: auction.bidders.length,
    endTime: auction.endTime,
    timerExtended: false,
    heatLevel: auction.heatLevel,
    effectiveIncrement: getEffectiveIncrement(auction.currentBid, auction.minIncrement),
    reserveMet: auction.reservePrice > 0 ? auction.currentBid >= auction.reservePrice : null,
    isProxy: true,
  });

  io.to('marketplace').emit('marketplaceUpdate', {
    auctionId: auction._id,
    currentBid: auction.currentBid,
    totalBids: auction.totalBids,
    heatLevel: auction.heatLevel,
    endTime: auction.endTime,
  });

  const sysMsg = await Message.create({
    auction: auction._id,
    userName: 'AuctionBot',
    text: `🤖 Proxy bid: ${proxyUser.name} auto-bid ₹${autoBidAmount.toLocaleString('en-IN')}`,
    type: 'bid',
  });
  io.to(`auction_${auction._id}`).emit('chatMessage', sysMsg);

  // Recurse: maybe the current highestBidder also has a proxy that should respond
  await checkProxyBidders(io, auction, proxyUser._id, depth + 1);
}

function setupSocket(io) {
  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.name}`);

    // Join marketplace room for real-time card updates
    socket.on('joinMarketplace', () => {
      socket.join('marketplace');
    });

    socket.on('leaveMarketplace', () => {
      socket.leave('marketplace');
    });

    // Join auction room
    socket.on('joinAuction', async (auctionId) => {
      socket.join(`auction_${auctionId}`);
      socket.currentAuction = auctionId;

      // System message
      const msg = await Message.create({
        auction: auctionId,
        userName: 'AuctionBot',
        text: `${socket.user.name} joined the auction`,
        type: 'system',
      });
      io.to(`auction_${auctionId}`).emit('chatMessage', msg);
      io.to(`auction_${auctionId}`).emit('activityEvent', {
        type: 'join',
        userName: socket.user.name,
        text: `${socket.user.name} joined the auction`,
        time: new Date(),
      });

      // Broadcast updated watcher count
      const room = io.sockets.adapter.rooms.get(`auction_${auctionId}`);
      const watcherCount = room ? room.size : 0;
      io.to(`auction_${auctionId}`).emit('watcherCount', { count: watcherCount });
    });

    // Leave auction room
    socket.on('leaveAuction', (auctionId) => {
      socket.leave(`auction_${auctionId}`);
      socket.currentAuction = null;

      // Broadcast updated watcher count
      setTimeout(() => {
        const room = io.sockets.adapter.rooms.get(`auction_${auctionId}`);
        const watcherCount = room ? room.size : 0;
        io.to(`auction_${auctionId}`).emit('watcherCount', { count: watcherCount });
      }, 100);
    });

    // Place bid via socket
    socket.on('placeBid', async ({ auctionId, amount, maxBid: userMaxBid = 0, isProxy = false }) => {
      // ── Input validation ──────────────────────────────────────────
      if (!auctionId || !amount) {
        return socket.emit('bidError', { error: 'Invalid bid data' });
      }
      const numAmount = Number(amount);
      if (!Number.isFinite(numAmount) || numAmount <= 0 || !Number.isInteger(numAmount)) {
        return socket.emit('bidError', { error: 'Bid amount must be a positive whole number' });
      }
      const numMaxBid = Number(userMaxBid) || 0;
      if (numMaxBid < 0 || !Number.isFinite(numMaxBid)) {
        return socket.emit('bidError', { error: 'Invalid max bid value' });
      }
      // ─────────────────────────────────────────────────────────────
      const lockKey = auctionId.toString();
      if (bidLocks[lockKey]) {
        return socket.emit('bidError', { error: 'Another bid is being processed, try again' });
      }
      bidLocks[lockKey] = true;
      try {
        const auction = await Auction.findById(auctionId);
        if (!auction || auction.status !== 'live') {
          return socket.emit('bidError', { error: 'Auction is not live' });
        }

        // Prevent shill bidding — auction creator cannot bid
        if (auction.createdBy && auction.createdBy.toString() === socket.user._id.toString()) {
          return socket.emit('bidError', { error: 'Auction creator cannot bid on their own auction' });
        }

        const now = new Date();
        if (now < auction.startTime || now > auction.endTime) {
          return socket.emit('bidError', { error: 'Auction is not active' });
        }

        const effectiveIncrement = getEffectiveIncrement(auction.currentBid, auction.minIncrement);
        const minBid = auction.currentBid + effectiveIncrement;
        if (amount < minBid) {
          return socket.emit('bidError', { error: `Minimum bid is ₹${minBid}` });
        }

        // Prevent excessively high bids (max 10x current bid)
        const maxBid = Math.max(auction.currentBid * 10, auction.startBid * 10);
        if (amount > maxBid) {
          return socket.emit('bidError', { error: `Bid too high. Maximum allowed: ₹${maxBid.toLocaleString('en-IN')}` });
        }

        const user = await User.findById(socket.user._id);
        const availableCredits = user.credits - user.lockedCredits;

        // Account for user's current lock on this auction
        const prevUserBid = await Bid.findOne({ auction: auctionId, user: user._id }).sort({ createdAt: -1 });
        const effectiveAvailable = prevUserBid
          ? availableCredits + prevUserBid.amount
          : availableCredits;

        if (effectiveAvailable < amount) {
          return socket.emit('bidError', { error: 'Insufficient credits' });
        }

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

            // Emit notification to outbid user
            io.to(`auction_${auctionId}`).emit('notification', {
              userId: prevBidder._id,
              type: 'outbid',
              message: `${user.name} outbid you with ₹${amount}`,
            });
          }
        }

        // Update user's locked credits
        if (prevUserBid) {
          user.lockedCredits = Math.max(0, user.lockedCredits - prevUserBid.amount);
        }
        user.lockedCredits += amount;
        await user.save();

        // Create bid record
        const bid = await Bid.create({ auction: auctionId, user: user._id, amount, maxBid: userMaxBid, isProxy });

        // Update auction
        auction.currentBid = amount;
        auction.highestBidder = user._id;
        auction.totalBids += 1;
        if (!auction.bidders.includes(user._id)) {
          auction.bidders.push(user._id);
        }

        // Auto-extend timer (anti-sniping) — any bid in last 30 seconds extends by 30s
        const timeLeft = auction.endTime - now;
        let timerExtended = false;
        if (timeLeft < 30000) {
          auction.endTime = new Date(auction.endTime.getTime() + 30000);
          timerExtended = true;
        }

        // Cancel any active knock when a new bid comes in
        const knockKey = auctionId.toString();
        if (knockTimers[knockKey]) {
          clearTimeout(knockTimers[knockKey].timer);
          delete knockTimers[knockKey];
          io.to(`auction_${auctionId}`).emit('knockCancelled', { reason: 'New bid placed' });
        }

        await auction.save();

        await CreditTransaction.create({
          user: user._id,
          type: 'bid_lock',
          amount,
          reason: `Bid on "${auction.title}"`,
          auction: auction._id,
        });

        // Broadcast bid update
        io.to(`auction_${auctionId}`).emit('bidUpdated', {
          auctionId,
          bid: { amount, userName: user.name, userId: user._id, createdAt: bid.createdAt },
          currentBid: auction.currentBid,
          highestBidder: { _id: user._id, name: user.name },
          totalBids: auction.totalBids,
          biddersCount: auction.bidders.length,
          endTime: auction.endTime,
          timerExtended,
          heatLevel: auction.heatLevel,
          effectiveIncrement: getEffectiveIncrement(auction.currentBid, auction.minIncrement),
          reserveMet: auction.reservePrice > 0 ? auction.currentBid >= auction.reservePrice : null,
        });

        // Broadcast lightweight update to marketplace room
        io.to('marketplace').emit('marketplaceUpdate', {
          auctionId,
          currentBid: auction.currentBid,
          totalBids: auction.totalBids,
          heatLevel: auction.heatLevel,
          endTime: auction.endTime,
        });

        // System message in chat
        const sysMsg = await Message.create({
          auction: auctionId,
          userName: 'AuctionBot',
          text: `📈 ${user.name} placed bid ₹${amount.toLocaleString('en-IN')}`,
          type: 'bid',
        });
        io.to(`auction_${auctionId}`).emit('chatMessage', sysMsg);

        // Activity feed
        io.to(`auction_${auctionId}`).emit('activityEvent', {
          type: 'bid',
          userName: user.name,
          text: `${user.name} bid ₹${amount.toLocaleString('en-IN')}`,
          amount,
          time: new Date(),
        });

        // Timer extension announcement
        if (timerExtended) {
          const extMsg = await Message.create({
            auction: auctionId,
            userName: 'AuctionBot',
            text: '⏱️ Timer extended by 30 seconds!',
            type: 'system',
          });
          io.to(`auction_${auctionId}`).emit('chatMessage', extMsg);
          io.to(`auction_${auctionId}`).emit('auctionExtended', { endTime: auction.endTime });
        }

        // Bid battle detection
        detectBidBattle(io, auctionId, user.name);

        // Check if any proxy bidder should respond to this new bid
        await checkProxyBidders(io, auction, user._id);
      } catch (err) {
        socket.emit('bidError', { error: err.message });
      } finally {
        delete bidLocks[lockKey];
      }
    });

    // Chat message
    socket.on('sendMessage', async ({ auctionId, text }) => {
      try {
        if (!text || text.trim().length === 0) return;
        const safeText = text.slice(0, 500);

        const msg = await Message.create({
          auction: auctionId,
          user: socket.user._id,
          userName: socket.user.name,
          text: safeText,
          type: 'chat',
        });
        io.to(`auction_${auctionId}`).emit('chatMessage', msg);
      } catch (err) {
        socket.emit('chatError', { error: err.message });
      }
    });

    // Emoji reaction
    socket.on('sendReaction', async ({ auctionId, emoji }) => {
      const allowedEmojis = ['🔥', '💰', '👏', '⚡', '😮', '🎉'];
      if (!allowedEmojis.includes(emoji)) return;

      const msg = await Message.create({
        auction: auctionId,
        user: socket.user._id,
        userName: socket.user.name,
        text: `${socket.user.name} reacted ${emoji}`,
        type: 'reaction',
        emoji,
      });
      io.to(`auction_${auctionId}`).emit('chatMessage', msg);
    });

    // Knock feature — highest bidder can knock to force 15s countdown
    socket.on('knock', async ({ auctionId }) => {
      try {
        const auction = await Auction.findById(auctionId);
        if (!auction || auction.status !== 'live') {
          return socket.emit('bidError', { error: 'Auction is not live' });
        }
        // Only the current highest bidder can knock
        if (!auction.highestBidder || auction.highestBidder.toString() !== socket.user._id.toString()) {
          return socket.emit('bidError', { error: 'Only the highest bidder can knock' });
        }
        const knockKey = auctionId.toString();
        // Prevent double-knock
        if (knockTimers[knockKey]) {
          return socket.emit('bidError', { error: 'Knock already active' });
        }

        // Broadcast knock event
        io.to(`auction_${auctionId}`).emit('knockStarted', {
          userName: socket.user.name,
          userId: socket.user._id,
          endsAt: Date.now() + 15000,
        });

        const knockMsg = await Message.create({
          auction: auctionId,
          userName: 'AuctionBot',
          text: `⚡ ${socket.user.name} used KNOCK! 15 seconds to outbid or they win!`,
          type: 'battle',
        });
        io.to(`auction_${auctionId}`).emit('chatMessage', knockMsg);

        // Set 15-second timer — if no new bid, end auction immediately
        knockTimers[knockKey] = {
          userId: socket.user._id.toString(),
          timer: setTimeout(async () => {
            try {
              const freshAuction = await Auction.findById(auctionId);
              // Only end if still live and same highest bidder
              if (freshAuction && freshAuction.status === 'live' &&
                  freshAuction.highestBidder && freshAuction.highestBidder.toString() === socket.user._id.toString()) {
                freshAuction.status = 'ended';
                freshAuction.winner = freshAuction.highestBidder;
                freshAuction.winningBid = freshAuction.currentBid;
                await freshAuction.save();

                io.to(`auction_${auctionId}`).emit('auctionEnded', {
                  winner: freshAuction.winner,
                  winningBid: freshAuction.winningBid,
                  reason: 'knock',
                });

                const endMsg = await Message.create({
                  auction: auctionId,
                  userName: 'AuctionBot',
                  text: `🏆 KNOCK successful! ${socket.user.name} wins with ₹${freshAuction.currentBid.toLocaleString('en-IN')}!`,
                  type: 'system',
                });
                io.to(`auction_${auctionId}`).emit('chatMessage', endMsg);
              }
              delete knockTimers[knockKey];
            } catch (err) {
              delete knockTimers[knockKey];
            }
          }, 15000),
        };
      } catch (err) {
        socket.emit('bidError', { error: err.message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.name}`);

      // Update watcher count on disconnect
      if (socket.currentAuction) {
        const auctionId = socket.currentAuction;
        setTimeout(() => {
          const room = io.sockets.adapter.rooms.get(`auction_${auctionId}`);
          const watcherCount = room ? room.size : 0;
          io.to(`auction_${auctionId}`).emit('watcherCount', { count: watcherCount });
        }, 100);
      }
    });
  });
}

// Detect bid battles: 3+ bids from 2+ users in 15 seconds
function detectBidBattle(io, auctionId, userName) {
  const key = auctionId.toString();
  if (!recentBids[key]) recentBids[key] = [];

  recentBids[key].push({ userName, time: Date.now() });

  // Keep only last 15 seconds
  const cutoff = Date.now() - 15000;
  recentBids[key] = recentBids[key].filter((b) => b.time > cutoff);

  const uniqueUsers = new Set(recentBids[key].map((b) => b.userName));
  if (recentBids[key].length >= 3 && uniqueUsers.size >= 2) {
    const users = [...uniqueUsers];
    const battleMsg = `⚔️ Bid Battle: ${users.join(' vs ')}`;

    Message.create({
      auction: auctionId,
      userName: 'AuctionBot',
      text: battleMsg,
      type: 'battle',
    }).then((msg) => {
      io.to(`auction_${auctionId}`).emit('chatMessage', msg);
      io.to(`auction_${auctionId}`).emit('bidBattle', { users, message: battleMsg });
    });

    // Reset to avoid spam
    recentBids[key] = [];
  }
}

module.exports = setupSocket;
