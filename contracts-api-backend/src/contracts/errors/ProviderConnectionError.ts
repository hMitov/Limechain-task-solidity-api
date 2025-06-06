export class ProviderConnectionError extends Error {
  constructor(error: Error) {
    super(`Failed to connect to provider: ${error.message}`);
    this.name = 'ProviderConnectionError';
  }
}
