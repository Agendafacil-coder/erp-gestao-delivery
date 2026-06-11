import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildProductionReadinessReport } from "./productionReadiness";

describe("buildProductionReadinessReport", () => {
  it("marca produção como não pronta sem SESSION_SECRET forte", () => {
    const report = buildProductionReadinessReport({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://u:p@db:5432/delivery_os",
      SESSION_SECRET: "change-me-in-production-min-32-chars",
      PUBLIC_APP_URL: "https://app.exemplo.com.br",
      PAYMENT_PROVIDER: "mercadopago",
      MERCADOPAGO_ACCESS_TOKEN: "APP_USR_test",
    });
    assert.equal(report.isProduction, true);
    assert.equal(report.ready, false);
    assert.ok(report.warnings.length > 0);
  });

  it("aceita ambiente dev com mock", () => {
    const report = buildProductionReadinessReport({
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://delivery:delivery@localhost:5432/delivery_os",
      SESSION_SECRET: "dev-session-secret-change-me",
      PUBLIC_APP_URL: "http://localhost:3000",
      PAYMENT_PROVIDER: "mock",
    });
    assert.equal(report.isProduction, false);
    assert.equal(report.ready, true);
  });

  it("exige HTTPS em produção para URL pública", () => {
    const report = buildProductionReadinessReport({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://u:p@db:5432/delivery_os",
      SESSION_SECRET: "a".repeat(40),
      PUBLIC_APP_URL: "http://app.exemplo.com.br",
      PAYMENT_PROVIDER: "stripe",
      STRIPE_SECRET_KEY: "sk_test",
    });
    const publicItem = report.categories
      .flatMap((c) => c.items)
      .find((i) => i.id === "public_url");
    assert.equal(publicItem?.done, false);
  });
});
