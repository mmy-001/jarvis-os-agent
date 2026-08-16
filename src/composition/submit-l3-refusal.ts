import type { AuthorityKernel } from "../authority/authority-kernel.js";
import type { ActionIntent, DecisionRecord, SovereignAuthorization } from "../contracts/domain.js";
import type { HostBundle } from "../contracts/ports.js";

export async function submitL3RefusalThroughHost(
  host: HostBundle,
  kernel: AuthorityKernel,
  intent: ActionIntent,
  authorization?: SovereignAuthorization,
): Promise<DecisionRecord> {
  const record = await kernel.submit({
    ...intent,
    targetResourceIds: host.localPathPolicy.normalizeLogicalIds(intent.targetResourceIds),
  }, authorization);
  if (record.packet === undefined) throw new Error("P0 refusal flow did not produce a packet");
  host.desktopInteraction.showReadOnlyPacket(record.packet);
  return record;
}
