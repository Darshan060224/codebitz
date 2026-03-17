const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  auction: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  maxBid: { type: Number, default: 0 },   // proxy/auto-bid ceiling
  isProxy: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

bidSchema.index({ auction: 1, createdAt: -1 });

module.exports = mongoose.model('Bid', bidSchema);
