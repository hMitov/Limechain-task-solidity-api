export class MissingConfigurationError extends Error {
  constructor(cause?: unknown) {
    super(`Missing configuration | Reason: ${(cause as Error)?.message}`); 
    this.name = 'MissingConfigurationError';
    this.cause = cause;
  }
}
