export class AuctionListenerError extends Error {
  constructor(auctionAddress: string, cause: unknown) {
    super(
      `Failed to attach listener to auction contract ${auctionAddress} | Reason: ${(cause as Error)?.message}`,
    );
    this.name = 'AuctionListenerError';
    this.cause = cause;
  }
}
