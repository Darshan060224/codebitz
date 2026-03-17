const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  auction: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  userName: { type: String, default: 'AuctionBot' },
  text: { type: String, required: true },
  type: { type: String, enum: ['chat', 'system', 'bid', 'battle', 'reaction'], default: 'chat' },
  emoji: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

messageSchema.index({ auction: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
