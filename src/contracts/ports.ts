import type { ActionIntent, DecisionRecord, GovernanceRole, GovernanceVote, RefusalPacket } from "./domain.js";
export interface RuntimeAdapter {
  request(brief: Readonly<{ role: GovernanceRole; actionDigest: string; policyVersion: string; intent: Record<string, unknown> }>): Promise<unknown>;
}
export interface DecisionLedger {
  append(record: DecisionRecord): void;
  getRefusalPacket(actionDigest: string): RefusalPacket | undefined;
  exportRecords(): readonly DecisionRecord[];
}
export interface VaultGateway { decryptNeverAvailable(ref: string): never; }
export interface EffectExecutor { executeNeverAvailable(intent: ActionIntent): never; }
export interface SecureKeyStore { verifyUserPresenceNeverAvailable(): never; }
export interface LocalPathPolicy { normalizeLogicalIds(ids: readonly string[]): readonly string[]; }
export interface ProcessSupervisor { startNeverAvailable(): never; }
export interface DesktopInteraction { showReadOnlyPacket(packet: RefusalPacket): void; }
export interface HostBundle {
  secureKeyStore: SecureKeyStore;
  localPathPolicy: LocalPathPolicy;
  processSupervisor: ProcessSupervisor;
  desktopInteraction: DesktopInteraction;
}
