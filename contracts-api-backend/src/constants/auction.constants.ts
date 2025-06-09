export const AUCTION_EVENTS = {
    TRANSFER: 'Transfer',
    AUCTION_CREATED: 'AuctionCreated',
    BID_PLACED: 'BidPlaced',
    AUCTION_ENDED: 'AuctionEnded',
    AUCTION_STARTED: 'AuctionStarted',
    AUCTION_CANCELLED: 'AuctionCancelled',
    AUCTION_EXTENDED: 'AuctionExtended',
  } as const;

  export const OPERATIONS = {
    ADD_TO_WHITELIST: 'Add to whitelist',
    UPDATE_NFT_PRICE: 'Update NFT price',
    REMOVE_FROM_WHITELIST: 'Remove from whitelist',
    CHECK_WHITELIST_STATUS: 'Check whitelist status',
    UPDATE_PRIVATE_PRICE: 'Update private price',
    UPDATE_PUBLIC_PRICE: 'Update public price',
    UPDATE_BOTH_PRICES: 'Update NFT prices',
    CHECK_ROLE: 'Check whitelister role',
    FETCH_ONGOING_AUCTIONS: 'Fetch ongoing auctions',
    FETCH_AVAILABLE_NFTs: 'Fetch available NFTs',
    OPERATION_FAILED: 'Operation failed',
    PERSIST_NFT: 'Persist NFT',
    PERSIST_USER: 'Persist user',
    PRUNE_OUTDATED_AUCTIONS: 'Prune outdated auctions',
  } as const;

  export const MESSAGES = {
    ALREADY_WHITELISTED: 'Address is already whitelisted',
    NOT_WHITELISTED: 'Address was not in the whitelist',
    REMOVED: 'Successfully removed address from whitelist',
    ADDED_TO_WHITELIST: 'Address added to whitelist',
    INVALID_ETH_ADDRESS: 'Invalid Ethereum address format',
    INVALID_PRICE: 'Invalid price format',
    NEGATIVE_PRICE: 'Price cannot be negative',
    NETWORK_ERROR: 'Failed to connect to the blockchain network',
    NO_WHITELIST_ADMIN_ROLE: 'Caller does not have WHITELIST_ADMIN_ROLE',
    NO_ADDRESSES_PROVIDED: 'No addresses provided',
    LISTENERS_STARTED: 'Event listeners started using WebSocket provider',
  } as const; 

  export const CONFIG_KEYS = {
    WS_URL: 'WS_URL',
    NFT_CONTRACT: 'NFT_CONTRACT',
    AUCTION_FACTORY: 'AUCTION_FACTORY',
    PRIVATE_KEY: 'PRIVATE_KEY',
  } as const;