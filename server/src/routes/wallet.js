const express = require('express');
const CreditTransaction = require('../models/CreditTransaction');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get wallet info
router.get('/', auth, async (req, res) => {
  try {
    const user = req.user;
    const transactions = await CreditTransaction.find({ user: user._id })
      .populate('auction', 'title')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      credits: user.credits,
      lockedCredits: user.lockedCredits,
      available: user.credits - user.lockedCredits,
      transactions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get notifications
router.get('/notifications', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark notification as read
router.patch('/notifications/:id/read', auth, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true }
    );
    res.json({ notification: notif });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
