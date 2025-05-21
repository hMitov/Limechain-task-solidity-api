export const AuctionStatus = {
  ACTIVE: 'active',
  ENDED: 'ended',
  CANCELLED: 'cancelled',
  CREATED: 'created'
};

export const Auction = {
  id: Number,
  address: String,
  tokenId: String,
  creator: String,
  status: String,
  highestBid: Number,
  highestBidder: String,
  minBidIncrement: String,
  duration: Number,
  startedAt: Date,
  endedAt: Date,
  cancelledAt: Date,
  createdAt: Date
}; 