import type { DecisionRecord, RefusalPacket } from "../contracts/domain.js";
import type { DecisionLedger } from "../contracts/ports.js";
import { redactForCore } from "../redaction/redactor.js";

function snapshot<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class InMemoryLedger implements DecisionLedger {
  private readonly records: DecisionRecord[] = [];

  append(record: DecisionRecord): void {
    this.records.push(redactForCore(record));
  }

  getRefusalPacket(actionDigest: string): RefusalPacket | undefined {
    const packet = this.records.find((record) => record.actionDigest === actionDigest)?.packet;
    return packet === undefined ? undefined : snapshot(packet);
  }

  exportRecords(): readonly DecisionRecord[] {
    return snapshot(this.records);
  }
}
