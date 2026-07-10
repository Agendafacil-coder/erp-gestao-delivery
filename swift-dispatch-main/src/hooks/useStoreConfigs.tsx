import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useTenant } from "@/hooks/useTenant";
import { assignTeamRoleFn, listTeamFn, removeTeamRoleFn, type TeamMember } from "@/functions/team";
import type { AppRole } from "@/lib/roles";
import { toast } from "sonner";
import {
  getStoreSettingsFn,
  updateStoreCouponsFn,
  updateStoreDeliveryFeesFn,
  updateStoreFulfillmentFn,
  updateStoreHoursFn,
  updateStoreNameFn,
  updateStoreRegionFn,
} from "@/functions/storeSettings";
import type { MenuCoupon, NeighborhoodFee, StoreOpeningHours } from "@/lib/menu/public-settings";
import { DEFAULT_OPENING_HOURS } from "@/lib/menu/store-hours";
import { formatBrazilPostalCode } from "@/lib/geo/addressNavigation";
import {
  overwriteIfEmptyOrFromSource,
  useBrazilCepAutofill,
} from "@/hooks/useBrazilCepAutofill";
import {
  DEFAULT_PRINT_SETTINGS,
  loadPrintSettings,
  savePrintSettings,
  type PrintFormat,
  type PrintMode,
} from "@/lib/ops/printSettings";

export type StoreConfigsValue = ReturnType<typeof useStoreConfigsState>;

const StoreConfigsContext = createContext<StoreConfigsValue | null>(null);

export function StoreConfigsProvider({ children }: { children: ReactNode }) {
  const value = useStoreConfigsState();
  return <StoreConfigsContext.Provider value={value}>{children}</StoreConfigsContext.Provider>;
}

export function useStoreConfigs() {
  const ctx = useContext(StoreConfigsContext);
  if (!ctx) throw new Error("useStoreConfigs must be used within StoreConfigsProvider");
  return ctx;
}

function useStoreConfigsState() {
  const { current, refresh: refreshTenant } = useTenant();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("kitchen");
  const [busy, setBusy] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [storeBusy, setStoreBusy] = useState(false);
  const [storeAddress, setStoreAddress] = useState("");
  const [storeCity, setStoreCity] = useState("");
  const [storeState, setStoreState] = useState("");
  const [storePostalCode, setStorePostalCode] = useState("");
  const [defaultDeliveryFee, setDefaultDeliveryFee] = useState("0");
  const [neighborhoodFees, setNeighborhoodFees] = useState<NeighborhoodFee[]>([]);
  const [deliveryBusy, setDeliveryBusy] = useState(false);
  const [openingHours, setOpeningHours] = useState<StoreOpeningHours>(DEFAULT_OPENING_HOURS);
  const [hoursBusy, setHoursBusy] = useState(false);
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [pickupEnabled, setPickupEnabled] = useState(true);
  const [fulfillmentBusy, setFulfillmentBusy] = useState(false);
  const [coupons, setCoupons] = useState<MenuCoupon[]>([]);
  const [couponsBusy, setCouponsBusy] = useState(false);
  const [printFormat, setPrintFormat] = useState<PrintFormat>(DEFAULT_PRINT_SETTINGS.format);
  const [printCopies, setPrintCopies] = useState(DEFAULT_PRINT_SETTINGS.copies);
  const [autoPrintKds, setAutoPrintKds] = useState(DEFAULT_PRINT_SETTINGS.autoPrintKds);
  const [printMode, setPrintMode] = useState<PrintMode>(DEFAULT_PRINT_SETTINGS.printMode);
  const addressFromCep = useRef(false);

  const { loading: cepLoading, clearLookupCache, seedLookupDigits } = useBrazilCepAutofill(
    storePostalCode,
    setStorePostalCode,
    {
      onFound: (result) => {
        setStoreCity(result.city);
        setStoreState(result.state);
        const fromCep = [result.street, result.neighborhood].filter(Boolean).join(" — ");
        if (fromCep) {
          setStoreAddress((prev) => overwriteIfEmptyOrFromSource(prev, fromCep, addressFromCep));
          addressFromCep.current = true;
        }
      },
    },
  );

  const menuUrl =
    typeof window !== "undefined" && current ? `${window.location.origin}/${current.slug}` : "";

  const loadTeam = async () => {
    if (!current) return;
    try {
      setTeam(await listTeamFn({ data: { tenantId: current.id } }));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const loadStoreSettings = async () => {
    if (!current) return;
    try {
      const settings = await getStoreSettingsFn({ data: { tenantId: current.id } });
      setStoreName(settings.store_name ?? "");
      setStoreAddress(settings.store_address ?? "");
      setStoreCity(settings.store_city ?? "");
      setStoreState(settings.store_state ?? "");
      setStorePostalCode(
        settings.store_postal_code ? formatBrazilPostalCode(settings.store_postal_code) : "",
      );
      seedLookupDigits(settings.store_postal_code ?? "");
      setDefaultDeliveryFee(String(settings.default_delivery_fee ?? 0));
      setNeighborhoodFees(settings.neighborhood_fees ?? []);
      setOpeningHours(settings.opening_hours ?? DEFAULT_OPENING_HOURS);
      setDeliveryEnabled(settings.delivery_enabled);
      setPickupEnabled(settings.pickup_enabled);
      setCoupons(settings.coupons ?? []);
      const printPrefs = loadPrintSettings(current.id);
      setPrintFormat(printPrefs.format);
      setPrintCopies(printPrefs.copies);
      setAutoPrintKds(printPrefs.autoPrintKds);
      setPrintMode(printPrefs.printMode);
      addressFromCep.current = false;
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  useEffect(() => {
    void loadTeam();
    void loadStoreSettings();
  }, [current?.id]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return;
    setBusy(true);
    try {
      await assignTeamRoleFn({ data: { tenantId: current.id, email, role } });
      toast.success("Papel atribuído");
      setEmail("");
      await loadTeam();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (userId: string, r: AppRole) => {
    if (!current) return;
    try {
      await removeTeamRoleFn({ data: { tenantId: current.id, userId, role: r } });
      toast.success("Papel removido");
      await loadTeam();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleSaveStoreName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return;
    const trimmed = storeName.trim();
    if (trimmed.length < 2) {
      toast.error("Informe o nome da loja (mínimo 2 caracteres)");
      return;
    }
    setNameBusy(true);
    try {
      const saved = await updateStoreNameFn({ data: { tenantId: current.id, name: trimmed } });
      setStoreName(saved.store_name);
      await refreshTenant();
      toast.success("Nome da loja atualizado no cardápio digital");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setNameBusy(false);
    }
  };

  const handleSaveStoreRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return;
    setStoreBusy(true);
    try {
      const saved = await updateStoreRegionFn({
        data: {
          tenantId: current.id,
          store_address: storeAddress || null,
          store_city: storeCity,
          store_state: storeState,
          store_postal_code: storePostalCode || null,
        },
      });
      setStoreCity(saved.store_city ?? "");
      setStoreState(saved.store_state ?? "");
      setStorePostalCode(
        saved.store_postal_code ? formatBrazilPostalCode(saved.store_postal_code) : "",
      );
      toast.success("Região da loja salva — entregas usarão esta cidade");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setStoreBusy(false);
    }
  };

  const handleSaveOpeningHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return;
    setHoursBusy(true);
    try {
      const saved = await updateStoreHoursFn({
        data: { tenantId: current.id, opening_hours: openingHours },
      });
      setOpeningHours(saved.opening_hours);
      toast.success("Horário de funcionamento salvo");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setHoursBusy(false);
    }
  };

  const handleSaveDeliveryFees = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return;
    setDeliveryBusy(true);
    try {
      const saved = await updateStoreDeliveryFeesFn({
        data: {
          tenantId: current.id,
          default_delivery_fee: Number(defaultDeliveryFee.replace(",", ".")) || 0,
          neighborhood_fees: neighborhoodFees,
        },
      });
      setDefaultDeliveryFee(String(saved.default_delivery_fee ?? 0));
      setNeighborhoodFees(saved.neighborhood_fees ?? []);
      toast.success("Taxas de entrega salvas");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeliveryBusy(false);
    }
  };

  const handleSaveFulfillment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return;
    setFulfillmentBusy(true);
    try {
      const saved = await updateStoreFulfillmentFn({
        data: {
          tenantId: current.id,
          delivery_enabled: deliveryEnabled,
          pickup_enabled: pickupEnabled,
        },
      });
      setDeliveryEnabled(saved.delivery_enabled);
      setPickupEnabled(saved.pickup_enabled);
      toast.success("Formas de pedido salvas");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setFulfillmentBusy(false);
    }
  };

  const handleSaveCoupons = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return;
    setCouponsBusy(true);
    try {
      const saved = await updateStoreCouponsFn({ data: { tenantId: current.id, coupons } });
      setCoupons(saved.coupons ?? []);
      toast.success("Cupons salvos");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCouponsBusy(false);
    }
  };

  const handleSavePrintSettings = () => {
    if (!current) return;
    const saved = savePrintSettings(current.id, {
      format: printFormat,
      copies: printCopies,
      autoPrintKds,
      printMode,
    });
    setPrintFormat(saved.format);
    setPrintCopies(saved.copies);
    setAutoPrintKds(saved.autoPrintKds);
    setPrintMode(saved.printMode);
    toast.success("Preferências de impressão salvas");
  };

  const copyMenuLink = () => {
    if (!menuUrl) return;
    void navigator.clipboard.writeText(menuUrl);
    toast.success("Link do cardápio copiado");
  };

  return {
    current,
    team,
    email,
    setEmail,
    role,
    setRole,
    busy,
    storeName,
    setStoreName,
    nameBusy,
    storeBusy,
    storeAddress,
    setStoreAddress,
    addressFromCep,
    storeCity,
    setStoreCity,
    storeState,
    setStoreState,
    storePostalCode,
    setStorePostalCode,
    defaultDeliveryFee,
    setDefaultDeliveryFee,
    neighborhoodFees,
    setNeighborhoodFees,
    deliveryBusy,
    openingHours,
    setOpeningHours,
    hoursBusy,
    deliveryEnabled,
    setDeliveryEnabled,
    pickupEnabled,
    setPickupEnabled,
    fulfillmentBusy,
    coupons,
    setCoupons,
    couponsBusy,
    printFormat,
    setPrintFormat,
    printCopies,
    setPrintCopies,
    autoPrintKds,
    setAutoPrintKds,
    printMode,
    setPrintMode,
    cepLoading,
    clearLookupCache,
    menuUrl,
    handleAssign,
    handleRemove,
    handleSaveStoreName,
    handleSaveStoreRegion,
    handleSaveOpeningHours,
    handleSaveDeliveryFees,
    handleSaveFulfillment,
    handleSaveCoupons,
    handleSavePrintSettings,
    copyMenuLink,
  };
}
