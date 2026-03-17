const mongoose = require('mongoose');

const auctionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  image: { type: String, default: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600' },
  images: [{ type: String }],
  category: { type: String, default: 'General', trim: true },
  startBid: { type: Number, required: true },
  minIncrement: { type: Number, default: 200 },
  reservePrice: { type: Number, default: 0 },
  retailPrice: { type: Number, default: 0 },
  currentBid: { type: Number, default: 0 },
  highestBidder: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: { type: String, enum: ['upcoming', 'live', 'ended', 'paused'], default: 'upcoming' },
  totalBids: { type: Number, default: 0 },
  bidders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  winningBid: { type: Number, default: 0 },
  interestedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

// Virtual for heat level
auctionSchema.virtual('heatLevel').get(function () {
  if (this.totalBids >= 15) return 'hot';
  if (this.totalBids >= 7) return 'warm';
  return 'calm';
});

auctionSchema.set('toJSON', { virtuals: true });
auctionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Auction', auctionSchema);
