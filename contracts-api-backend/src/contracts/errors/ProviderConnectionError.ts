export class ProviderConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderConnectionError';
  }
}
