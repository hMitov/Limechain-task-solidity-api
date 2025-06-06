import { API_BASE_URL } from './config/env'; 

export const API_ENDPOINTS = {
  CONTRACTS: {
    LIST: `${API_BASE_URL}/contracts`,
    DETAILS: (address) => `${API_BASE_URL}/contracts/${address}`,
  },
  WHITELIST: {
    LIST: (contractAddress) => `${API_BASE_URL}/contracts/${contractAddress}/whitelist`,
    ADD: (contractAddress) => `${API_BASE_URL}/contracts/${contractAddress}/whitelist`,
    REMOVE: (contractAddress, address) => `${API_BASE_URL}/contracts/${contractAddress}/whitelist/${address}`,
  },
  PRICE: {
    UPDATE: (contractAddress) => `${API_BASE_URL}/contracts/${contractAddress}/price`,
  },
}; 