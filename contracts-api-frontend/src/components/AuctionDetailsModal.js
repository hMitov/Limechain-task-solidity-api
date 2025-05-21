import React from 'react';
import './AuctionDetailsModal.css';

const AuctionDetailsModal = ({ auction, onClose }) => {
  if (!auction) return null;

  const formatDate = (date) => {
    return date ? new Date(date).toLocaleString() : '-';
  };

  const formatEther = (value) => {
    return value ? `${value} ETH` : '-';
  };

  const formatAddress = (address) => {
    return address || '-';
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'ENDED':
        return 'bg-gray-100 text-gray-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'CREATED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Auction Details</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="modal-grid">
          <div className="modal-item">
            <h3>Contract Address</h3>
            <p>{auction.address || '-'}</p>
          </div>
          <div className="modal-item">
            <h3>Token ID</h3>
            <p>{auction.tokenId || '-'}</p>
          </div>
          <div className="modal-item">
            <h3>Creator</h3>
            <p>{formatAddress(auction.creator)}</p>
          </div>
          <div className="modal-item">
            <h3>Status</h3>
            <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusBadgeClass(auction.status)}`}>
              {auction.status || '-'}
            </span>
          </div>
          <div className="modal-item">
            <h3>Highest Bid</h3>
            <p>{formatEther(auction.highestBid)}</p>
          </div>
          <div className="modal-item">
            <h3>Highest Bidder</h3>
            <p>{formatAddress(auction.highestBidder)}</p>
          </div>
          <div className="modal-item">
            <h3>Minimum Bid Increment</h3>
            <p>{formatEther(auction.minBidIncrement)}</p>
          </div>
          <div className="modal-item">
            <h3>Duration</h3>
            <p>{auction.duration ? `${auction.duration} seconds` : '-'}</p>
          </div>
          <div className="modal-item">
            <h3>Started At</h3>
            <p>{formatDate(auction.startedAt)}</p>
          </div>
          <div className="modal-item">
            <h3>Ended At</h3>
            <p>{formatDate(auction.endedAt)}</p>
          </div>
          <div className="modal-item">
            <h3>Cancelled At</h3>
            <p>{formatDate(auction.cancelledAt)}</p>
          </div>
          <div className="modal-item">
            <h3>Created At</h3>
            <p>{formatDate(auction.createdAt)}</p>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="close-button">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuctionDetailsModal; 