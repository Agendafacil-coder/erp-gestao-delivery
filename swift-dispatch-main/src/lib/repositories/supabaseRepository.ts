import { 
  IAuthRepository, 
  ITenantRepository, 
  IOrderRepository, 
  IDriverRepository, 
  IAlertRepository 
} from "./types";
import { supabase } from "@/integrations/supabase/client";
import { type LocalUser, type LocalTenant, type LocalOrder, type LocalDriver, type LocalAlert } from "../db/localDb";
import { type OrderStatus } from "@/lib/ops/orderWorkflow";

export class SupabaseAuthRepository implements IAuthRepository {
  async getUser(): Promise<LocalUser | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return {
      id: user.id,
      email: user.email ?? "",
      full_name: user.user_metadata?.full_name ?? ""
    };
  }

  async signIn(email: string, password?: string): Promise<LocalUser> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: password ?? ""
    });
    if (error) throw error;
    if (!data.user) throw new Error("No user returned");
    return {
      id: data.user.id,
      email: data.user.email ?? "",
      full_name: data.user.user_metadata?.full_name ?? ""
    };
  }

  async signUp(email: string, name: string, password?: string): Promise<LocalUser> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: password ?? "",
      options: {
        data: { full_name: name }
      }
    });
    if (error) throw error;
    if (!data.user) throw new Error("SignUp failed");
    return {
      id: data.user.id,
      email: data.user.email ?? "",
      full_name: name
    };
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  onAuthStateChange(callback: (user: LocalUser | null) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        callback(null);
      } else {
        callback({
          id: session.user.id,
          email: session.user.email ?? "",
          full_name: session.user.user_metadata?.full_name ?? ""
        });
      }
    });
    return () => subscription.unsubscribe();
  }
}

export class SupabaseTenantRepository implements ITenantRepository {
  async getTenants(userId: string): Promise<LocalTenant[]> {
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("tenant_id, tenants:tenant_id(id, name, slug, plan)")
      .eq("user_id", userId);
    if (error) throw error;

    return (roles ?? [])
      .map((r: any) => r.tenants)
      .filter(Boolean)
      .filter((t: any, i: number, arr: any[]) => arr.findIndex((x) => x.id === t.id) === i) as LocalTenant[];
  }

  async getCurrentTenant(userId: string): Promise<LocalTenant | null> {
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_tenant_id")
      .eq("id", userId)
      .single();
      
    if (!profile?.current_tenant_id) return null;
    
    const { data: tenant } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", profile.current_tenant_id)
      .single();
      
    return tenant as LocalTenant | null;
  }

  async switchTenant(userId: string, tenantId: string): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .update({ current_tenant_id: tenantId })
      .eq("id", userId);
    if (error) throw error;
  }

  async createTenant(name: string): Promise<string> {
    const slug = name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).slice(2, 6);
    const { data, error } = await supabase.rpc("create_tenant_with_owner", { _name: name, _slug: slug });
    if (error) throw error;
    return data as string;
  }
}

export class SupabaseOrderRepository implements IOrderRepository {
  async listOrders(tenantId: string): Promise<LocalOrder[]> {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("placed_at", { ascending: false });
    if (error) throw error;
    
    // Map database models to LocalOrder format cleanly
    return (data ?? []).map((o: any) => ({
      id: o.id,
      code: o.code,
      tenant_id: o.tenant_id,
      customer_name: o.customer_name ?? o.customer ?? "Cliente",
      customer_phone: o.customer_phone ?? "",
      address: o.address,
      items_count: o.items_count ?? o.items ?? 1,
      total_amount: Number(o.total_amount ?? o.value ?? 0),
      channel: o.channel ?? "Delivery",
      sla_minutes: o.sla_minutes ?? o.slaMin ?? 45,
      placed_at: o.placed_at,
      driver_id: o.driver_id,
      status: o.status as OrderStatus,
      priority: o.priority ?? "normal",
      lat: o.lat ? Number(o.lat) : null,
      lng: o.lng ? Number(o.lng) : null
    }));
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<LocalOrder> {
    const { data, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId)
      .select()
      .single();
    if (error) throw error;
    return data as LocalOrder;
  }

  async updateOrderDriver(orderId: string, driverId: string | null, status: OrderStatus): Promise<LocalOrder> {
    const { data, error } = await supabase
      .from("orders")
      .update({ driver_id: driverId, status })
      .eq("id", orderId)
      .select()
      .single();
    if (error) throw error;
    return data as LocalOrder;
  }

  async listOrderLineItems(_orderId: string, _tenantId: string) {
    return [];
  }

  async createOrder(
    order: Omit<LocalOrder, "id" | "placed_at">,
    _extras?: import("@/functions/orders").CreateOrderExtras,
  ): Promise<LocalOrder> {
    const { data, error } = await supabase
      .from("orders")
      .insert({
        code: order.code,
        tenant_id: order.tenant_id,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        address: order.address,
        items_count: order.items_count,
        total_amount: order.total_amount,
        channel: order.channel,
        sla_minutes: order.sla_minutes,
        driver_id: order.driver_id,
        status: order.status,
        priority: order.priority,
        lat: order.lat,
        lng: order.lng
      })
      .select()
      .single();
      
    if (error) throw error;
    return data as LocalOrder;
  }

  async batchUpdateOrders(orders: LocalOrder[]): Promise<void> {
    // Perform bulk updates or simulate sequentially
    for (const o of orders) {
      await supabase
        .from("orders")
        .update({ 
          status: o.status, 
          driver_id: o.driver_id,
          lat: o.lat,
          lng: o.lng 
        })
        .eq("id", o.id);
    }
  }
}

export class SupabaseDriverRepository implements IDriverRepository {
  async listDrivers(tenantId: string): Promise<LocalDriver[]> {
    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });
    if (error) throw error;
    
    return (data ?? []).map((d: any) => ({
      id: d.id,
      tenant_id: d.tenant_id,
      name: d.name,
      status: d.status,
      vehicle: d.vehicle ?? "moto",
      lat: d.lat ? Number(d.lat) : null,
      lng: d.lng ? Number(d.lng) : null,
      active_orders: d.active_orders ?? 0,
      rating: d.rating ? Number(d.rating) : 5.0,
      vx: 0,
      vy: 0
    }));
  }

  async updateDriverStatus(driverId: string, status: LocalDriver["status"]): Promise<LocalDriver> {
    const { data, error } = await supabase
      .from("drivers")
      .update({ status })
      .eq("id", driverId)
      .select()
      .single();
    if (error) throw error;
    return data as LocalDriver;
  }

  async updateDriverCoords(driverId: string, lat: number, lng: number): Promise<LocalDriver> {
    const { data, error } = await supabase
      .from("drivers")
      .update({ lat, lng })
      .eq("id", driverId)
      .select()
      .single();
    if (error) throw error;
    return data as LocalDriver;
  }

  async batchUpdateDrivers(drivers: LocalDriver[]): Promise<void> {
    for (const d of drivers) {
      await supabase
        .from("drivers")
        .update({ 
          status: d.status, 
          lat: d.lat, 
          lng: d.lng,
          active_orders: d.active_orders 
        })
        .eq("id", d.id);
    }
  }
}

export class SupabaseAlertRepository implements IAlertRepository {
  async listAlerts(tenantId: string): Promise<LocalAlert[]> {
    const { data, error } = await supabase
      .from("alerts" as any) // if custom table exists
      .select("*")
      .eq("tenant_id", tenantId);
    if (error) return []; // soft fallback
    
    return (data ?? []).map((a: any) => ({
      id: a.id,
      tenant_id: a.tenant_id,
      level: a.level,
      title: a.title,
      detail: a.detail,
      agoMin: a.agoMin ?? 1,
      timestamp: a.created_at ?? new Date().toISOString()
    }));
  }

  async createAlert(alert: Omit<LocalAlert, "id" | "timestamp">): Promise<LocalAlert> {
    const { data, error } = await supabase
      .from("alerts" as any)
      .insert({
        tenant_id: alert.tenant_id,
        level: alert.level,
        title: alert.title,
        detail: alert.detail,
        ago_min: alert.agoMin
      })
      .select()
      .single();
    if (error) throw error;
    return data as LocalAlert;
  }

  async clearAlerts(tenantId: string): Promise<void> {
    await supabase
      .from("alerts" as any)
      .delete()
      .eq("tenant_id", tenantId);
  }
}
