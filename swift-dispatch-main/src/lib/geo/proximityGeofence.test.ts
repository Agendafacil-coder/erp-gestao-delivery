import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ARRIVED_GEOFENCE_KM, ARRIVING_NOTIFY_KM } from "./proximityConstants";
import { haversineKm } from "@/lib/map/geo";

describe("proximityGeofence thresholds", () => {
  it("100 m geofence is tighter than 500 m WhatsApp alert", () => {
    assert.ok(ARRIVED_GEOFENCE_KM < ARRIVING_NOTIFY_KM);
    assert.equal(ARRIVED_GEOFENCE_KM, 0.1);
    assert.equal(ARRIVING_NOTIFY_KM, 0.5);
  });

  it("detects arrival within 100 m", () => {
    const driver = { lat: -23.55052, lng: -46.633308 };
    const customer = { lat: -23.55052, lng: -46.632408 };
    const km = haversineKm(driver, customer);
    assert.ok(km <= ARRIVED_GEOFENCE_KM);
  });
});
