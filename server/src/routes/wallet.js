const express = require('express');
const CreditTransaction = require('../models/CreditTransaction');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');
const { postgresEnabled, ensureSchema, getPool } = require('../config/postgres');

const router = express.Router();

// Get wallet info
router.get('/', auth, async (req, res) => {
  try {
    if (postgresEnabled()) {
      await ensureSchema();
      const p = getPool();

      const userRes = await p.query(
        'SELECT credits, locked_credits FROM app_users WHERE id = $1 LIMIT 1',
        [req.user._id]
      );
      if (userRes.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const txRes = await p.query(
        `SELECT id, type, amount, reason, created_at
         FROM app_credit_transactions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [req.user._id]
      );

      const credits = Number(userRes.rows[0].credits);
      const lockedCredits = Number(userRes.rows[0].locked_credits);

      const transactions = txRes.rows.map((t) => ({
        _id: t.id,
        type: t.type,
        amount: t.amount,
        reason: t.reason,
        createdAt: t.created_at,
      }));

      return res.json({
        credits,
        lockedCredits,
        available: credits - lockedCredits,
        transactions,
      });
    }

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
    if (postgresEnabled()) {
      await ensureSchema();
      const p = getPool();
      const rows = await p.query(
        `SELECT id, type, title, message, read, created_at
         FROM app_notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 30`,
        [req.user._id]
      );

      const notifications = rows.rows.map((n) => ({
        _id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        read: n.read,
        createdAt: n.created_at,
      }));

      return res.json({ notifications });
    }

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
    if (postgresEnabled()) {
      await ensureSchema();
      const p = getPool();
      const updated = await p.query(
        `UPDATE app_notifications
         SET read = TRUE
         WHERE id = $1 AND user_id = $2
         RETURNING id, type, title, message, read, created_at`,
        [req.params.id, req.user._id]
      );

      const row = updated.rows[0] || null;
      return res.json({
        notification: row
          ? {
              _id: row.id,
              type: row.type,
              title: row.title,
              message: row.message,
              read: row.read,
              createdAt: row.created_at,
            }
          : null,
      });
    }

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
