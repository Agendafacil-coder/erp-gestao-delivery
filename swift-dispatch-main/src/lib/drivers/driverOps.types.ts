import type { LocalDriver } from "@/lib/db/localDb";
import type {
  DriverDayStats,
  DriverDeliveryHistoryItem,
} from "@/lib/drivers/driverStats";

export type DriverOrderView = {
  id: string;
  code: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  neighborhood: string | null;
  postal_code: string | null;
  lat: number | null;
  lng: number | null;
  items_count: number;
  placed_at: string;
  picked_up_at: string | null;
  driver_payout: number;
  notes: string | null;
};

export type DriverStoreInfo = {
  name: string;
  address: string;
  city_region: string | null;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
};

export type DriverDashboardData = {
  driver: LocalDriver;
  myOrders: DriverOrderView[];
  store: DriverStoreInfo | null;
  stats: DriverDayStats;
  history: DriverDeliveryHistoryItem[];
};
