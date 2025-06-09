export class ProviderConnectionError extends Error {
  constructor(cause: unknown) {
    super(`Failed to connect to provider | Reason: ${(cause as Error)?.message}`);
    this.name = 'ProviderConnectionError';
    this.cause = cause;
  }
}
