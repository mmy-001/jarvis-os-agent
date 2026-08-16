import { expect, it } from "vitest";
import {
  FakeMacPorts,
  FakeWindowsPorts,
  NoEffectExecutor,
  NoEffectProcessSupervisor,
  NoEffectSecureKeyStore,
  NoEffectVaultGateway,
} from "../helpers/no-effect-doubles.js";

it("uses equivalent logical-id normalization on both fake hosts", () => {
  expect(new FakeWindowsPorts().localPathPolicy.normalizeLogicalIds(["resource:one"])).toEqual(
    new FakeMacPorts().localPathPolicy.normalizeLogicalIds(["resource:one"]),
  );
});

it("fails closed for every effectful or plaintext-only port", () => {
  expect(() => new NoEffectExecutor().executeNeverAvailable({} as never)).toThrow(
    "effects disabled in L3 refusal slice",
  );
  expect(() => new NoEffectVaultGateway().decryptNeverAvailable("vault:secret")).toThrow(
    "vault plaintext disabled in L3 refusal slice",
  );
  expect(() => new NoEffectSecureKeyStore().verifyUserPresenceNeverAvailable()).toThrow(
    "key-store access disabled in L3 refusal slice",
  );
  expect(() => new NoEffectProcessSupervisor().startNeverAvailable()).toThrow(
    "processes disabled in L3 refusal slice",
  );
});
