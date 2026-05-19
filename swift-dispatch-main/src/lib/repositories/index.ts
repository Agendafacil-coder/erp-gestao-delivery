import {
  LocalAuthRepository,
  LocalTenantRepository,
  LocalOrderRepository,
  LocalDriverRepository,
  LocalAlertRepository,
} from "./localRepository";

import {
  PostgresAuthRepository,
  PostgresTenantRepository,
  PostgresOrderRepository,
  PostgresDriverRepository,
  PostgresAlertRepository,
} from "./postgresRepository";

import {
  IAuthRepository,
  ITenantRepository,
  IOrderRepository,
  IDriverRepository,
  IAlertRepository,
} from "./types";

/** Usa PostgreSQL local por padrão. Defina VITE_USE_LOCAL_STORAGE=true para modo demo offline. */
export const USE_POSTGRES =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_USE_LOCAL_STORAGE !== "true";

export const authRepository: IAuthRepository = USE_POSTGRES
  ? new PostgresAuthRepository()
  : new LocalAuthRepository();

export const tenantRepository: ITenantRepository = USE_POSTGRES
  ? new PostgresTenantRepository()
  : new LocalTenantRepository();

export const orderRepository: IOrderRepository = USE_POSTGRES
  ? new PostgresOrderRepository()
  : new LocalOrderRepository();

export const driverRepository: IDriverRepository = USE_POSTGRES
  ? new PostgresDriverRepository()
  : new LocalDriverRepository();

export const alertRepository: IAlertRepository = USE_POSTGRES
  ? new PostgresAlertRepository()
  : new LocalAlertRepository();

if (typeof window !== "undefined") {
  console.log(
    `[Delivery OS] Backend: ${USE_POSTGRES ? "PostgreSQL (local)" : "LocalStorage (demo)"}`,
  );
}

export type {
  IAuthRepository,
  ITenantRepository,
  IOrderRepository,
  IDriverRepository,
  IAlertRepository,
};
export * from "./types";
export * from "../db/localDb";
