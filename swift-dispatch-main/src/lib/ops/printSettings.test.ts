import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clampCopies, DEFAULT_PRINT_SETTINGS } from "./printSettings";

describe("printSettings", () => {
  it("limita cópias entre 1 e 3", () => {
    assert.equal(clampCopies(0), 1);
    assert.equal(clampCopies(2), 2);
    assert.equal(clampCopies(9), 3);
    assert.equal(clampCopies("x"), 1);
  });

  it("padrão usa comanda de cozinha", () => {
    assert.equal(DEFAULT_PRINT_SETTINGS.format, "kitchen");
    assert.equal(DEFAULT_PRINT_SETTINGS.autoPrintKds, false);
  });
});
