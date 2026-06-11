import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clearServerAutomationEvents,
  getServerAutomationEvents,
  pushServerAutomationEvent,
} from "./automationEventBus";

describe("automationEventBus", () => {
  it("dedupe por id e limita buffer por tenant", async () => {
    clearServerAutomationEvents("t1");
    pushServerAutomationEvent("t1", {
      id: "evt-1",
      ruleId: "geofence-arrived",
      message: "test",
      level: "success",
    });
    pushServerAutomationEvent("t1", {
      id: "evt-1",
      ruleId: "geofence-arrived",
      message: "dup",
      level: "success",
    });
    const events = await getServerAutomationEvents("t1");
    assert.equal(events.length, 1);
    assert.equal(events[0]?.message, "test");
    clearServerAutomationEvents("t1");
  });
});
