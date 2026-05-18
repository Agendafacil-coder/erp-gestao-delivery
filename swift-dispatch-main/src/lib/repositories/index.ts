import { 
  LocalAuthRepository, 
  LocalTenantRepository, 
  LocalOrderRepository, 
  LocalDriverRepository, 
  LocalAlertRepository 
} from "./localRepository";

import { 
  SupabaseAuthRepository, 
  SupabaseTenantRepository, 
  SupabaseOrderRepository, 
  SupabaseDriverRepository, 
  SupabaseAlertRepository 
} from "./supabaseRepository";

import { 
  IAuthRepository, 
  ITenantRepository, 
  IOrderRepository, 
  IDriverRepository, 
  IAlertRepository 
} from "./types";

// Dynamic configuration toggle - easily migratable via localStorage or environment vars
export const USE_SUPABASE = typeof window !== "undefined" 
  ? localStorage.getItem("use_supabase_backend") === "true" 
  : false;

export const authRepository: IAuthRepository = USE_SUPABASE 
  ? new SupabaseAuthRepository() 
  : new LocalAuthRepository();

export const tenantRepository: ITenantRepository = USE_SUPABASE 
  ? new SupabaseTenantRepository() 
  : new LocalTenantRepository();

export const orderRepository: IOrderRepository = USE_SUPABASE 
  ? new SupabaseOrderRepository() 
  : new LocalOrderRepository();

export const driverRepository: IDriverRepository = USE_SUPABASE 
  ? new SupabaseDriverRepository() 
  : new LocalDriverRepository();

export const alertRepository: IAlertRepository = USE_SUPABASE 
  ? new SupabaseAlertRepository() 
  : new LocalAlertRepository();

console.log(`[Delivery OS Router] Active operational backend: ${USE_SUPABASE ? "Supabase Cloud" : "LocalStorage Engine (Offline First)"}`);

export type { 
  IAuthRepository, 
  ITenantRepository, 
  IOrderRepository, 
  IDriverRepository, 
  IAlertRepository 
};
export * from "./types";
export * from "../db/localDb";
