import React, { useState } from 'react';
import './Admin.css';

const API_BASE_URL = 'http://localhost:3000';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('nft');
  const [callerAddress, setCallerAddress] = useState('');
  const [pricePrivate, setPricePrivate] = useState('');
  const [pricePublic, setPricePublic] = useState('');
  const [whitelistAddress, setWhitelistAddress] = useState('');
  const [pendingAddresses, setPendingAddresses] = useState([]);
  const [pendingRemovalAddresses, setPendingRemovalAddresses] = useState([]);
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

  const handleAddToPending = (e) => {
    e.preventDefault();
    if (!whitelistAddress) {
      setError('Please enter an address to add');
      return;
    }

    if (pendingAddresses.includes(whitelistAddress)) {
      setError('This address is already in the list');
      return;
    }

    setPendingAddresses([...pendingAddresses, whitelistAddress]);
    setWhitelistAddress('');
    setError(null);
    setSuccess('Address added to pending list');
  };

  const handleAddToRemovalList = (e) => {
    e.preventDefault();
    if (!whitelistAddress) {
      setError('Please enter an address to remove');
      return;
    }

    if (pendingRemovalAddresses.includes(whitelistAddress)) {
      setError('This address is already in the removal list');
      return;
    }

    setPendingRemovalAddresses([...pendingRemovalAddresses, whitelistAddress]);
    setWhitelistAddress('');
    setError(null);
    setSuccess('Address added to removal list');
  };

  const handleRemoveFromPending = (addressToRemove) => {
    setPendingAddresses(pendingAddresses.filter(addr => addr !== addressToRemove));
  };

  const handleRemoveFromRemovalList = (addressToRemove) => {
    setPendingRemovalAddresses(pendingRemovalAddresses.filter(addr => addr !== addressToRemove));
  };

  const handleSubmitWhitelist = async (e) => {
    e.preventDefault();
    if (!callerAddress) {
      setError('Please enter your wallet address');
      return;
    }

    if (pendingAddresses.length === 0) {
      setError('Please add at least one address to the whitelist');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const payload = {
      callerAddress,
      addresses: pendingAddresses,
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

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to add to whitelist');
      }

      setSuccess('Addresses added to whitelist successfully!');
      setPendingAddresses([]);
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

    if (pendingRemovalAddresses.length === 0) {
      setError('Please add at least one address to remove');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('Removing addresses from whitelist:', pendingRemovalAddresses);
      const response = await fetch(`${API_BASE_URL}/contract/admin/sales/whitelist`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callerAddress,
          addresses: pendingRemovalAddresses
        }),
      });

      const responseData = await response.json();
      console.log('Response from server:', responseData);

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to remove from whitelist');
      }

      if (responseData.notInWhitelist?.length > 0 && responseData.removed?.length > 0) {
        setSuccess(responseData.message);
      } else if (responseData.notInWhitelist?.length > 0) {
        setError(responseData.message);
      } else {
        setSuccess(responseData.message);
      }

      setPendingRemovalAddresses([]);
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
                onClick={handleAddToPending}
                className="submit-button"
                disabled={loading || pendingRemovalAddresses.length > 0}
                title={pendingRemovalAddresses.length > 0 ? "Complete or clear removal list first" : ""}
              >
                Add to List
              </button>
              <button
                onClick={handleAddToRemovalList}
                className="remove-button"
                disabled={loading || pendingAddresses.length > 0}
                title={pendingAddresses.length > 0 ? "Complete or clear add list first" : ""}
              >
                Add to Removal List
              </button>
            </div>
          </div>

          {pendingAddresses.length > 0 && (
            <div className="pending-addresses">
              <h3>Addresses to Add to Whitelist</h3>
              <div className="address-list">
                {pendingAddresses.map((address) => (
                  <div key={address} className="address-item">
                    <span>{formatAddress(address)}</span>
                    <button
                      onClick={() => handleRemoveFromPending(address)}
                      className="remove-button"
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="button-group">
                <button
                  onClick={handleSubmitWhitelist}
                  className="submit-button submit-all"
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Submit All Addresses'}
                </button>
                <button
                  onClick={() => setPendingAddresses([])}
                  className="remove-button"
                  type="button"
                >
                  Clear List
                </button>
              </div>
            </div>
          )}

          {pendingRemovalAddresses.length > 0 && (
            <div className="pending-addresses removal-list">
              <h3>Addresses to Remove from Whitelist</h3>
              <div className="address-list">
                {pendingRemovalAddresses.map((address) => (
                  <div key={address} className="address-item">
                    <span>{formatAddress(address)}</span>
                    <button
                      onClick={() => handleRemoveFromRemovalList(address)}
                      className="remove-button"
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="button-group">
                <button
                  onClick={handleSubmitRemoval}
                  className="submit-button submit-all remove-all"
                  disabled={loading}
                >
                  {loading ? 'Removing...' : 'Remove All Addresses'}
                </button>
                <button
                  onClick={() => setPendingRemovalAddresses([])}
                  className="remove-button"
                  type="button"
                >
                  Clear List
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Admin; 