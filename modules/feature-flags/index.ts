export type FeatureFlagClient = {
  rpc: (name: "is_feature_enabled", args: { p_flag: string }) => PromiseLike<{ data: unknown; error: unknown }>;
};

const ALLOWED_FLAGS = new Set(["sos.enabled", "billing.enabled", "community.fundraising.enabled"]);

/** Fail closed on unknown flags and database errors. Call after authorization. */
export async function isRiskyFeatureEnabled(client: FeatureFlagClient, flag: string): Promise<boolean> {
  if (!ALLOWED_FLAGS.has(flag)) return false;
  try {
    const { data, error } = await client.rpc("is_feature_enabled", { p_flag: flag });
    return !error && data === true;
  } catch {
    return false;
  }
}
