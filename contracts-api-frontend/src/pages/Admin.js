import React, { useState } from 'react';
import './Admin.css';
import { API_BASE_URL } from '../config/env';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('nft');
  const [callerAddress, setCallerAddress] = useState('');
  const [pricePrivate, setPricePrivate] = useState('');
  const [pricePublic, setPricePublic] = useState('');
  const [whitelistAddress, setWhitelistAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleUpdatePrices = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_BASE_URL}/contract/admin/sales/prices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callerAddress,
          pricePrivate,
          pricePublic,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update prices');
      }

      setSuccess('Prices updated successfully!');
      setPricePrivate('');
      setPricePublic('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitWhitelist = async (e) => {
    e.preventDefault();
    if (!callerAddress) {
      setError('Please enter your wallet address');
      return;
    }

    if (!whitelistAddress) {
      setError('Please enter an address to add to whitelist');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const payload = {
      callerAddress,
      address: whitelistAddress,
    };
    
    console.log('Sending whitelist request with payload:', payload);

    try {
      const response = await fetch(`${API_BASE_URL}/contract/admin/sales/whitelist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();
      console.log('Response from server:', responseData);

      if (!response.ok || !responseData.success) {
        throw new Error(responseData.message || 'Failed to add to whitelist');
      }

      setSuccess(responseData.message);
      setWhitelistAddress('');
    } catch (err) {
      console.error('Error details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRemoval = async () => {
    if (!callerAddress) {
      setError('Please enter your wallet address first');
      return;
    }

    if (!whitelistAddress) {
      setError('Please enter an address to remove from whitelist');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('Removing address from whitelist:', whitelistAddress);
      const response = await fetch(`${API_BASE_URL}/contract/admin/sales/whitelist`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callerAddress,
          address: whitelistAddress
        }),
      });

      const responseData = await response.json();
      console.log('Response from server:', responseData);

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to remove from whitelist');
      }

      setSuccess(responseData.message);
      setWhitelistAddress('');
    } catch (err) {
      console.error('Error removing from whitelist:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address) => {
    return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '-';
  };

  const handlePriceChange = (e, setter) => {
    const value = e.target.value;
    // Only allow numbers and one decimal point
    if (value === '' || /^\d*\.?\d{0,18}$/.test(value)) {
      setter(value);
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="tab-buttons">
          <button
            className={`tab-button ${activeTab === 'nft' ? 'active' : ''}`}
            onClick={() => setActiveTab('nft')}
          >
            NFT Management
          </button>
          <button
            className={`tab-button ${activeTab === 'whitelist' ? 'active' : ''}`}
            onClick={() => setActiveTab('whitelist')}
          >
            Whitelist Management
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      {activeTab === 'nft' && (
        <div className="section">
          <h2>NFT Price Management</h2>
          <form onSubmit={handleUpdatePrices} className="price-form">
            <div className="form-group">
              <label htmlFor="callerAddress">Your Wallet Address</label>
              <input
                id="callerAddress"
                type="text"
                value={callerAddress}
                onChange={(e) => setCallerAddress(e.target.value)}
                placeholder="0x..."
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="pricePrivate">Private Sale Price (ETH)</label>
              <input
                id="pricePrivate"
                type="text"
                value={pricePrivate}
                onChange={(e) => handlePriceChange(e, setPricePrivate)}
                placeholder="e.g., 0.1 for 0.1 ETH"
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="pricePublic">Public Sale Price (ETH)</label>
              <input
                id="pricePublic"
                type="text"
                value={pricePublic}
                onChange={(e) => handlePriceChange(e, setPricePublic)}
                placeholder="e.g., 0.1 for 0.1 ETH"
                min="0"
                required
              />
            </div>

            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Prices'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'whitelist' && (
        <div className="section">
          <h2>Whitelist Management</h2>
          <div className="whitelist-form">
            <div className="form-group">
              <label htmlFor="whitelistCallerAddress">Your Wallet Address</label>
              <input
                id="whitelistCallerAddress"
                type="text"
                value={callerAddress}
                onChange={(e) => setCallerAddress(e.target.value)}
                placeholder="0x..."
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="whitelistAddress">Wallet Address</label>
              <input
                id="whitelistAddress"
                type="text"
                value={whitelistAddress}
                onChange={(e) => setWhitelistAddress(e.target.value)}
                placeholder="0x..."
              />
            </div>

            <div className="button-group">
              <button
                onClick={handleSubmitWhitelist}
                className="submit-button"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add to Whitelist'}
              </button>
              <button
                onClick={handleSubmitRemoval}
                className="remove-button"
                disabled={loading}
              >
                {loading ? 'Removing...' : 'Remove from Whitelist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin; 