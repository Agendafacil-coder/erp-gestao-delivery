import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_AUTOMATION_SETTINGS } from "@/lib/ops/automationSettings";
import {
  parseAutomationSettingsJson,
  serializeAutomationSettings,
} from "@/lib/ops/automationSettingsDb";

describe("automationSettingsDb", () => {
  it("retorna padrão quando JSON é nulo ou inválido", () => {
    assert.deepEqual(parseAutomationSettingsJson(null), DEFAULT_AUTOMATION_SETTINGS);
    assert.deepEqual(parseAutomationSettingsJson("{bad"), DEFAULT_AUTOMATION_SETTINGS);
  });

  it("serializa toggles conhecidos", () => {
    const raw = serializeAutomationSettings({
      enabled: { "sla-whatsapp": false, "ops-alerts": true },
    });
    const parsed = parseAutomationSettingsJson(raw);
    assert.equal(parsed.enabled["sla-whatsapp"], false);
    assert.equal(parsed.enabled["ops-alerts"], true);
    assert.equal(parsed.enabled["geofence-arriving"], true);
  });
});
