const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['outbid', 'winning', 'auction_ending', 'auction_won', 'auction_lost', 'credits', 'system'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  auction: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', default: null },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', notificationSchema);
