export class ContractOperationError extends Error {
  constructor(operation: string, contractAddress: string, cause: unknown) {
    super(
      `Failed to ${operation} on contract ${contractAddress} | Reason: ${(cause as Error)?.message}`,
    );
    this.name = 'ContractOperationError';
    this.cause = cause;
  }
}
