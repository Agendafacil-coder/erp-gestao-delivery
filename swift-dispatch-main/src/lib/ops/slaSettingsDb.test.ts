import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SLA_SETTINGS } from "@/lib/ops/slaSettings";
import { parseSlaSettingsJson, serializeSlaSettings } from "@/lib/ops/slaSettingsDb";

describe("slaSettingsDb", () => {
  it("retorna padrão quando JSON é nulo ou inválido", () => {
    assert.deepEqual(parseSlaSettingsJson(null), DEFAULT_SLA_SETTINGS);
    assert.deepEqual(parseSlaSettingsJson("{bad"), DEFAULT_SLA_SETTINGS);
  });

  it("serializa e faz clamp dos valores", () => {
    const raw = serializeSlaSettings({
      slaRiskRatio: 2,
      batchRadiusKm: 99,
      congestionMode: "manual",
      congestionMultiplier: 5,
      kitchenBottleneckMin: 1,
    });
    const parsed = parseSlaSettingsJson(raw);
    assert.equal(parsed.slaRiskRatio, 1);
    assert.equal(parsed.batchRadiusKm, 10);
    assert.equal(parsed.congestionMultiplier, 3);
    assert.equal(parsed.kitchenBottleneckMin, 2);
  });
});
