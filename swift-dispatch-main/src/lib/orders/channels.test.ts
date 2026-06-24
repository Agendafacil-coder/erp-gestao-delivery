import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { channelLabel, normalizeOrderChannel } from "./channels";

describe("normalizeOrderChannel", () => {
  it("normalizes legacy aliases", () => {
    assert.equal(normalizeOrderChannel("ifood"), "ifood");
    assert.equal(normalizeOrderChannel("site"), "web");
    assert.equal(normalizeOrderChannel("balcão"), "balcao");
  });

  it("returns manual for empty", () => {
    assert.equal(normalizeOrderChannel(""), "manual");
  });
});

describe("channelLabel", () => {
  it("returns friendly labels", () => {
    assert.equal(channelLabel("ifood"), "iFood");
    assert.equal(channelLabel("web"), "Site");
  });
});
