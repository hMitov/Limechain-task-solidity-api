export class AuctionListenerError extends Error {
  constructor(auctionAddress: string, originalError: unknown) {
    super(
      `Failed to attach listener to auction contract ${auctionAddress} | Reason: ${(originalError as Error)?.message}`,
    );
    this.name = 'AuctionListenerError';
  }
}
