import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';
import { AuctionStatus } from '../types/auction';
import AuctionDetailsModal from '../components/AuctionDetailsModal';
import './Auctions.css';

const Auctions = () => {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAuction, setSelectedAuction] = useState(null);

  const fetchAuctions = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.AUCTIONS.LIST);
      const data = await response.json();
      setAuctions(data);
    } catch (error) {
      console.error('Error fetching auctions:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAuctions();
  }, []);

  const formatDate = (date) => {
    return date ? new Date(date).toLocaleString() : '-';
  };

  const formatEther = (value) => {
    return value ? `${value} ETH` : '-';
  };

  const formatAddress = (address) => {
    return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '-';
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedAndFilteredAuctions = () => {
    let filteredAuctions = auctions;
    
    if (statusFilter !== 'all') {
      filteredAuctions = auctions.filter(auction => auction.status === statusFilter);
    }

    return [...filteredAuctions].sort((a, b) => {
      if (sortConfig.key === 'highestBid' || sortConfig.key === 'duration') {
        return sortConfig.direction === 'asc' 
          ? a[sortConfig.key] - b[sortConfig.key]
          : b[sortConfig.key] - a[sortConfig.key];
      }
      if (sortConfig.key === 'startedAt' || sortConfig.key === 'endedAt' || sortConfig.key === 'createdAt') {
        return sortConfig.direction === 'asc'
          ? new Date(a[sortConfig.key]) - new Date(b[sortConfig.key])
          : new Date(b[sortConfig.key]) - new Date(a[sortConfig.key]);
      }
      return sortConfig.direction === 'asc'
        ? a[sortConfig.key].toString().localeCompare(b[sortConfig.key].toString())
        : b[sortConfig.key].toString().localeCompare(a[sortConfig.key].toString());
    });
  };

  return (
    <div className="auctions-container">
      <div className="auctions-header">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="status-filter"
        >
          <option value="all">All Statuses</option>
          {Object.values(AuctionStatus).map((status) => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
        <button
          onClick={fetchAuctions}
          className="refresh-button"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <table className="auctions-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('id')}>ID</th>
            <th onClick={() => handleSort('status')}>Status</th>
            <th onClick={() => handleSort('highestBid')}>Highest Bid</th>
            <th onClick={() => handleSort('highestBidder')}>Highest Bidder</th>
            <th onClick={() => handleSort('createdAt')}>Created</th>
            <th onClick={() => handleSort('startedAt')}>Started</th>
            <th onClick={() => handleSort('endedAt')}>Ended</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {getSortedAndFilteredAuctions().map((auction) => (
            <tr key={auction.id}>
              <td>{auction.id}</td>
              <td>{auction.status}</td>
              <td>{formatEther(auction.highestBid)}</td>
              <td>{formatAddress(auction.highestBidder)}</td>
              <td>{formatDate(auction.createdAt)}</td>
              <td>{formatDate(auction.startedAt)}</td>
              <td>{formatDate(auction.endedAt)}</td>
              <td>
                <button
                  onClick={() => setSelectedAuction(auction)}
                  className="view-button"
                >
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedAuction && (
        <AuctionDetailsModal
          auction={selectedAuction}
          onClose={() => setSelectedAuction(null)}
        />
      )}
    </div>
  );
};

export default Auctions; 