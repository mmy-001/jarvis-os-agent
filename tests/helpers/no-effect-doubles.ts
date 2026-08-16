import type {
  DesktopInteraction,
  EffectExecutor,
  HostBundle,
  LocalPathPolicy,
  ProcessSupervisor,
  SecureKeyStore,
  VaultGateway,
} from "../../src/contracts/ports.js";
import type { ActionIntent, RefusalPacket } from "../../src/contracts/domain.js";
import { validateLogicalResourceId } from "../../src/action-intent/logical-resource-id.js";

export class NoEffectExecutor implements EffectExecutor {
  executeNeverAvailable(_intent: ActionIntent): never {
    throw new Error("effects disabled in L3 refusal slice");
  }
}

export class NoEffectVaultGateway implements VaultGateway {
  decryptNeverAvailable(_ref: string): never {
    throw new Error("vault plaintext disabled in L3 refusal slice");
  }
}

export class NoEffectSecureKeyStore implements SecureKeyStore {
  callCount = 0;

  verifyUserPresenceNeverAvailable(): never {
    this.callCount += 1;
    throw new Error("key-store access disabled in L3 refusal slice");
  }
}

export class NoEffectProcessSupervisor implements ProcessSupervisor {
  callCount = 0;

  startNeverAvailable(): never {
    this.callCount += 1;
    throw new Error("processes disabled in L3 refusal slice");
  }
}

export class FakeWindowsPathPolicy implements LocalPathPolicy {
  callCount = 0;

  normalizeLogicalIds(ids: readonly string[]): readonly string[] {
    this.callCount += 1;
    return ids.map(validateLogicalResourceId);
  }
}

export class FakeMacPathPolicy implements LocalPathPolicy {
  callCount = 0;

  normalizeLogicalIds(ids: readonly string[]): readonly string[] {
    this.callCount += 1;
    return ids.map(validateLogicalResourceId);
  }
}

class ReadOnlyDesktop implements DesktopInteraction {
  readonly packets: RefusalPacket[] = [];

  showReadOnlyPacket(packet: RefusalPacket): void {
    this.packets.push(packet);
  }
}

class FakeHostPorts<PathPolicy extends LocalPathPolicy> implements HostBundle {
  readonly secureKeyStore = new NoEffectSecureKeyStore();
  readonly processSupervisor = new NoEffectProcessSupervisor();
  readonly desktopInteraction = new ReadOnlyDesktop();

  constructor(readonly localPathPolicy: PathPolicy) {}
}

export class FakeWindowsPorts extends FakeHostPorts<FakeWindowsPathPolicy> {
  constructor() {
    super(new FakeWindowsPathPolicy());
  }
}

export class FakeMacPorts extends FakeHostPorts<FakeMacPathPolicy> {
  constructor() {
    super(new FakeMacPathPolicy());
  }
}
