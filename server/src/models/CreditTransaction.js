const mongoose = require('mongoose');

const creditTransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['assign', 'deduct', 'refund', 'bid_lock', 'bid_unlock', 'win_deduct'], required: true },
  amount: { type: Number, required: true },
  reason: { type: String, default: '' },
  auction: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('CreditTransaction', creditTransactionSchema);
