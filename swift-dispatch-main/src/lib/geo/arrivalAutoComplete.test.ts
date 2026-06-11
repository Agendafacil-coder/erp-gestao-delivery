import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AUTO_COMPLETE_AFTER_ARRIVAL_MIN } from "./arrivalAutoComplete";

describe("arrivalAutoComplete", () => {
  it("auto-completes 3 minutes after geofence arrival", () => {
    assert.equal(AUTO_COMPLETE_AFTER_ARRIVAL_MIN, 3);
    assert.ok(AUTO_COMPLETE_AFTER_ARRIVAL_MIN >= 1);
    assert.ok(AUTO_COMPLETE_AFTER_ARRIVAL_MIN <= 10);
  });
});
