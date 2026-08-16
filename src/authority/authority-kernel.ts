import { validateAndDigest } from "../action-intent/canonicalize.js";
import { classify } from "../action-intent/classify.js";
import type {
  ActionIntent,
  DecisionRecord,
  SovereignAuthorization,
} from "../contracts/domain.js";
import type {
  DecisionLedger,
  EffectExecutor,
  RuntimeAdapter,
  VaultGateway,
} from "../contracts/ports.js";
import { collectVotes } from "../governance/orchestrator.js";
import { buildRefusalPacket } from "../refusal-packet/build-refusal-packet.js";
import { redactForCore } from "../redaction/redactor.js";

export class AuthorityKernel {
  constructor(
    private readonly ledger: DecisionLedger,
    private readonly runtime: RuntimeAdapter,
    private readonly executor: EffectExecutor,
    private readonly vault: VaultGateway,
  ) {}

  hasExecutionCapability(): false {
    return false;
  }

  async submit(
    intent: ActionIntent,
    _authorization?: SovereignAuthorization,
  ): Promise<DecisionRecord> {
    const validated = validateAndDigest(intent);
    const level = classify(validated.intent);

    if (level !== "L3") {
      throw new Error("P0 refusal slice accepts only L3 test intents");
    }

    const votes = await collectVotes(this.runtime, validated);
    const packet = buildRefusalPacket(validated, votes);
    const record = redactForCore<DecisionRecord>({
      actionDigest: validated.digest,
      level,
      state: "RefusedPendingSovereignty",
      policyVersion: packet.policyVersion,
      packet,
    });

    this.ledger.append(record);
    return record;
  }
}
