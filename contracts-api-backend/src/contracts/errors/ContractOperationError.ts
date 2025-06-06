export class ContractOperationError extends Error {
  constructor(
    operation: string,
    contractAddress: string,
    originalError: unknown,
  ) {
    super(
      `Failed to ${operation} on contract ${contractAddress} | Reason: ${(originalError as Error)?.message}`,
    );
    this.name = 'ContractOperationError';
  }
}
