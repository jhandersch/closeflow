type RetentionRpcClient = {
  rpc: (
    functionName: string,
    args: Record<string, number>,
  ) => PromiseLike<{
    data: unknown;
    error: { message?: string } | null;
  }>;
};

type PurgeOptions = {
  batchSize?: number;
  maxBatches?: number;
};

export async function purgeExpiredAuditLogs(
  client: RetentionRpcClient,
  { batchSize = 1000, maxBatches = 20 }: PurgeOptions = {},
) {
  if (
    !Number.isSafeInteger(batchSize) ||
    batchSize < 1 ||
    batchSize > 1000 ||
    !Number.isSafeInteger(maxBatches) ||
    maxBatches < 1 ||
    maxBatches > 20
  ) {
    throw new Error("Invalid audit log retention batch limits.");
  }

  let deleted = 0;
  let batches = 0;

  for (; batches < maxBatches; batches += 1) {
    const { data, error } = await client.rpc("purge_expired_audit_logs", {
      p_batch_size: batchSize,
    });

    if (error) {
      throw new Error(`Audit log retention failed: ${error.message || "database error"}`);
    }
    if (
      typeof data !== "number" ||
      !Number.isSafeInteger(data) ||
      data < 0 ||
      data > batchSize
    ) {
      throw new Error("Audit log retention returned an invalid deletion count.");
    }

    deleted += data;
    if (data < batchSize) {
      batches += 1;
      break;
    }
  }

  return { deleted, batches };
}
