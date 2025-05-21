const API_BASE_URL = 'http://localhost:3000';

export const API_ENDPOINTS = {
  AUCTIONS: {
    LIST: `${API_BASE_URL}/contract/auctions`,
    UPDATE_PRICE: (auctionId) => `${API_BASE_URL}/contract/auctions/${auctionId}/price`,
  },
  WHITELIST: {
    LIST: `${API_BASE_URL}/contract/whitelist`,
    ADD: `${API_BASE_URL}/contract/whitelist`,
  },
}; 