# NFT Auction API

A NestJS-based API service that interacts with NFT smart contracts, listens to blockchain events, and provides a RESTful interface to access auction and NFT data.

## Overview

This service provides a bridge between NFT smart contracts on the blockchain and a traditional database, offering:
- Real-time monitoring of smart contract events
- Database persistence of NFT and auction data
- RESTful API endpoints for data access
- Whitelist management functionality
- Price management for NFTs

## Architecture

### Smart Contract Integration
- Connects to Ethereum-compatible blockchain using ethers.js
- Interacts with two main contracts:
  - NFT Contract (`MyNFT`)
  - Auction Factory Contract (`EnglishAuctionFactory`)
- Implements retry mechanism for blockchain operations
- Validates network connectivity and transaction status

### Database Layer
- Uses TypeORM for database operations
- Entities:
  - `NftEntity`: Stores NFT information (tokenId, owner, mintedAt)
  - `AuctionEntity`: Tracks auction status and details (address, tokenId, creator, status, bids, timestamps)
  - `UserEntity`: Manages user information (walletAddress)

### API Features
- NFT Management:
  - Fetch available NFTs
  - Update NFT prices (public and private)
  - Whitelist management (add/remove addresses)
- Auction Management:
  - Track ongoing auctions
  - View auction history
  - Real-time auction status updates

## Backend Services

### RESTful API Endpoints

#### Public Routes
- `GET /auctions`: Fetch ongoing auctions
  - Returns list of active auctions with their current status
  - Includes auction details: tokenId, creator, current bid, time remaining
- `GET /nfts`: Fetch available NFTs
  - Returns list of all NFTs in the system
  - Includes ownership and minting information

#### Admin Routes
- `PATCH /admin/sales`: Update sale configurations
  - Update NFT prices (public/private)
  - Manage whitelist addresses
  - Requires contract owner authentication

### Event Handling
- Smart Contract Event Listeners:
  - NFT Transfer events
  - Auction creation events
  - Bid placement events
  - Auction status changes (started, ended, cancelled)
- Automatic database synchronization with blockchain state

### Testing Coverage
- Unit Tests:
  - Controller layer tests for all API endpoints
  - Service layer tests for business logic
  - Entity validation tests

## Configuration

The service requires the following environment variables:
- `RPC_URL`: Blockchain node RPC endpoint
- `PRIVATE_KEY`: Private key for contract interactions
- `NFT_CONTRACT`: Address of the NFT contract
- `AUCTION_FACTORY`: Address of the auction factory contract
- `POSTGRES_HOST`: Database host
- `POSTGRES_PORT`: Database port
- `POSTGRES_USER`: Database user
- `POSTGRES_PASSWORD`: Database password
- `POSTGRES_DATABASE`: Database name

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- Ethereum node (or Infura/Alchemy endpoint)

### Setup
1. Navigate to the backend directory:
   ```bash
   cd contracts-api-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables in `.env`:
   ```
   RPC_URL=your_ethereum_node_url
   PRIVATE_KEY=your_private_key
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_USER=your_db_user
   POSTGRES_PASSWORD=your_db_password
   POSTGRES_DATABASE=your_db_name
   ```

   ⚠️ **IMPORTANT**: You must set the following contract addresses before starting the service:
   ```
   NFT_CONTRACT=your_nft_contract_address
   AUCTION_FACTORY=your_auction_factory_address
   ```
   The service will not function without these contract addresses properly configured.
   ```
   You must start the API before creating English auctions so that it can detect their creation and begin listening for related events.

4. Start the service:
   ```bash
   npm run start
   ```

The backend API will be available at http://localhost:3000

### Frontend Application
The frontend application is a separate repository that consumes this API. To start the frontend:

1. Navigate to the frontend directory:
   ```bash
   cd contracts-api-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the frontend development server:
   ```bash
   npm start
   ```

The frontend will be available at http://localhost:3001

## Testing

### Running Tests

1. Unit Tests:
   ```bash
   # Run all unit tests
   npm run test
   ```