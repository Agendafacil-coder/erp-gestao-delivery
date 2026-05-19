import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import type { LocalDriver, LocalOrder } from "@/lib/db/localDb";
import { useTenant } from "./useTenant";

export type UnitOption = { id: string; label: string; districts: string[] | null };

const DEMO_UNITS: UnitOption[] = [
  { id: "all", label: "Consolidado (3 lojas)", districts: null },
  { id: "pinheiros", label: "Pinheiros (matriz)", districts: ["Pinheiros", "Vila Madalena", "Perdizes"] },
  { id: "moema", label: "Moema", districts: ["Moema", "Vila Mariana"] },
  { id: "itaim", label: "Itaim Bibi", districts: ["Itaim Bibi", "Jardins", "Brooklin"] },
];

const STORAGE_KEY = "delivery_os_unit_view";

function orderDistrict(o: LocalOrder): string {
  const addr = o.address ?? "";
  const fromAddr = addr.split(",")[0]?.trim();
  return fromAddr || "";
}

function matchesUnit(order: LocalOrder, unit: UnitOption): boolean {
  if (!unit.districts) return true;
  const d = orderDistrict(order);
  return unit.districts.some((name) => d.includes(name) || addrIncludes(order.address ?? "", name));
}

function addrIncludes(address: string, name: string) {
  return address.toLowerCase().includes(name.toLowerCase());
}

type UnitCtx = {
  units: UnitOption[];
  unitId: string;
  setUnitId: (id: string) => void;
  currentUnit: UnitOption;
  filterOrders: (orders: LocalOrder[]) => LocalOrder[];
  filterDrivers: (orders: LocalOrder[], drivers: LocalDriver[]) => LocalDriver[];
};

const Ctx = createContext<UnitCtx | null>(null);

export function UnitViewProvider({ children }: { children: React.ReactNode }) {
  const { current, tenants } = useTenant();
  const [unitId, setUnitIdState] = useState("all");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && DEMO_UNITS.some((u) => u.id === saved)) setUnitIdState(saved);
  }, []);

  const units = useMemo((): UnitOption[] => {
    if (tenants.length > 1) {
      return [
        { id: "all", label: "Todas as unidades", districts: null },
        ...tenants.map((t) => ({ id: t.id, label: t.name, districts: null })),
      ];
    }
    return DEMO_UNITS;
  }, [tenants]);

  const setUnitId = (id: string) => {
    setUnitIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const currentUnit = units.find((u) => u.id === unitId) ?? units[0]!;

  const filterOrders = (orders: LocalOrder[]) => {
    if (currentUnit.districts) {
      return orders.filter((o) => matchesUnit(o, currentUnit));
    }
    if (unitId !== "all" && tenants.some((t) => t.id === unitId)) {
      return orders.filter((o) => o.tenant_id === unitId);
    }
    return orders;
  };

  const filterDrivers = (orders: LocalOrder[], drivers: LocalDriver[]) => {
    const filteredOrders = filterOrders(orders);
    const busyDriverIds = new Set(
      filteredOrders.map((o) => o.driver_id).filter(Boolean) as string[],
    );
    if (!currentUnit.districts && unitId === "all") return drivers;
    return drivers.filter(
      (d) => busyDriverIds.has(d.id) || d.status === "disponivel" || d.status === "ocioso",
    );
  };

  return (
    <Ctx.Provider
      value={{ units, unitId, setUnitId, currentUnit, filterOrders, filterDrivers }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useUnitView() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUnitView must be used within UnitViewProvider");
  return ctx;
}
