import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeMarketplaceFeeRate,
  estimateDayMarketplaceFees,
} from "./marketplaceFees";

describe("marketplaceFees", () => {
  it("computes fee rate from monthly gross/fees", () => {
    assert.equal(computeMarketplaceFeeRate(10000, 1200), 0.12);
  });

  it("returns null when gross is zero", () => {
    assert.equal(computeMarketplaceFeeRate(0, 10), null);
  });

  it("estimates day fees from rate", () => {
    assert.deepEqual(estimateDayMarketplaceFees(500, 0.12), {
      feesEstimated: 60,
      netEstimated: 440,
    });
  });

  it("skips estimate without rate", () => {
    assert.equal(estimateDayMarketplaceFees(500, null), null);
  });
});
