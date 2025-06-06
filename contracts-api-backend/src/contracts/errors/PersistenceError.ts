export class PersistenceError extends Error {
  cause: unknown;
  constructor(operation: string, originalError: unknown) {
    super(
      `Failed to ${operation} | Reason: ${(originalError as Error)?.message}`,
    );
    this.name = 'PersistenceError';
    this.cause = originalError;
  }
}
