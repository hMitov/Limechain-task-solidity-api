export class RetryFailedError extends Error {
  constructor(operationName: string, contractAddress: string, cause: unknown) {
    super(
      `Operation ${operationName} failed after retries for contract ${contractAddress} | Reason: ${(cause as Error)?.message}`,
    );
    this.name = 'RetryFailedError';
    this.cause = cause;
  }
} 