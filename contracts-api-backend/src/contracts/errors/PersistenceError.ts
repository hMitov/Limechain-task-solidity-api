export class PersistenceError extends Error {
  cause: unknown;
  constructor(operation: string, entity: string, originalError: unknown) {
    super(
      `Failed to ${operation} ${entity} | Reason: ${(originalError as Error)?.message}`,
    );
    this.name = 'PersistenceError';
    this.cause = originalError;
  }
}
