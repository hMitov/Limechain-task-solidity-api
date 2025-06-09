export class PersistenceError extends Error {  
  constructor(operation: string, cause: unknown) {
    super(
      `Failed to ${operation} | Reason: ${(cause as Error)?.message}`,
    );
    this.name = 'PersistenceError';
    this.cause = cause;
  }
}
