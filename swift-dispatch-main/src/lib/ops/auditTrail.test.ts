import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  auditEntriesToCsv,
  filterAuditEntries,
  mapOrderEventToAudit,
} from "./auditTrail";

describe("auditTrail", () => {
  it("mapeia evento de pedido com responsável", () => {
    const entry = mapOrderEventToAudit({
      id: "1",
      orderId: "o1",
      orderCode: "#0001",
      fromStatus: "novo",
      toStatus: "em_preparo",
      createdAt: "2026-06-11T12:00:00.000Z",
      actorName: "Maria Silva",
      actorEmail: "maria@loja.com",
    });
    assert.equal(entry.actorName, "Maria Silva");
    assert.equal(entry.source, "order");
    assert.match(entry.action, /preparo/i);
  });

  it("filtra por origem e busca", () => {
    const entries = [
      mapOrderEventToAudit({
        id: "1",
        orderId: "o1",
        orderCode: "#0001",
        fromStatus: null,
        toStatus: "novo",
        createdAt: new Date().toISOString(),
      }),
      {
        id: "wa-1",
        source: "whatsapp" as const,
        createdAt: new Date().toISOString(),
        actorName: "WhatsApp",
        action: "Mensagem",
        summary: "Cliente avisado",
        severity: "success" as const,
      },
    ];
    const filtered = filterAuditEntries(entries, {
      dateFilter: "today",
      sourceFilter: "whatsapp",
      actorFilter: "all",
      search: "avisado",
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.source, "whatsapp");
  });

  it("exporta CSV com cabeçalho", () => {
    const csv = auditEntriesToCsv([
      {
        id: "1",
        source: "order",
        createdAt: "2026-06-11T12:00:00.000Z",
        actorName: "Sistema",
        action: "Pedido criado",
        summary: "Novo pedido",
        orderCode: "#0001",
        severity: "info",
      },
    ]);
    assert.match(csv, /Data\/Hora/);
    assert.match(csv, /#0001/);
  });
});
