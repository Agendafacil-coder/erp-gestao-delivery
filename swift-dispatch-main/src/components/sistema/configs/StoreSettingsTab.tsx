import {
  Clock,
  Copy,
  Link2,
  Loader2,
  MapPin,
  Plus,
  ShoppingBag,
  Store,
  Tag,
  Trash2,
  Truck,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { handlePostalCodeInputChange } from "@/hooks/useBrazilCepAutofill";
import { useStoreConfigs } from "@/hooks/useStoreConfigs";
import type { MenuCoupon } from "@/lib/menu/public-settings";
import { STORE_DAY_LABELS, STORE_DAY_ORDER } from "@/lib/menu/store-hours";
import { cn } from "@/lib/utils";

const premiumCheckboxClass = cn(
  "size-[1.125rem] rounded-[6px] border-border/60 bg-background/50 shadow-none",
  "transition-all duration-200 ease-out",
  "hover:border-primary/40 hover:bg-muted/25",
  "data-[state=checked]:border-primary data-[state=checked]:bg-primary",
  "data-[state=checked]:shadow-[0_0_0_3px] data-[state=checked]:shadow-primary/15",
  "[&_svg]:size-2.5",
);

export function StoreSettingsTab() {
  const {
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
    cepLoading,
    clearLookupCache,
    defaultDeliveryFee,
    setDefaultDeliveryFee,
    neighborhoodFees,
    setNeighborhoodFees,
    deliveryBusy,
    deliveryEnabled,
    setDeliveryEnabled,
    pickupEnabled,
    setPickupEnabled,
    fulfillmentBusy,
    coupons,
    setCoupons,
    couponsBusy,
    openingHours,
    setOpeningHours,
    hoursBusy,
    menuUrl,
    handleSaveStoreName,
    handleSaveStoreRegion,
    handleSaveDeliveryFees,
    handleSaveFulfillment,
    handleSaveCoupons,
    handleSaveOpeningHours,
    copyMenuLink,
  } = useStoreConfigs();

  return (
        <div className="space-y-8">
            <section className="erp-card p-5 space-y-4">
              <div className="flex items-center gap-2 font-medium">
                <Store className="size-4 text-primary" />
                Identidade da loja
              </div>
              <p className="text-sm text-muted-foreground">
                Nome exibido no cardápio digital, checkout, impressões e rastreio do pedido.
              </p>
              <form onSubmit={handleSaveStoreName} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Nome da loja *</label>
                  <input
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Ex.: Burger House Aguaí"
                    required
                    minLength={2}
                    maxLength={80}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={nameBusy}
                  className="erp-btn-primary disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {nameBusy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Salvar nome
                </button>
              </form>
            </section>

            <section className="erp-card p-5 space-y-4">
              <div className="flex items-center gap-2 font-medium">
                <MapPin className="size-4 text-primary" />
                Região da loja (entregas)
              </div>
              <p className="text-sm text-muted-foreground">
                Cidade e UF usadas para montar o endereço completo nas entregas e no Google Maps.
                Sem isso, o sistema não sabe em qual cidade montar o endereço dos pedidos.
              </p>
              <form onSubmit={handleSaveStoreRegion} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">CEP</label>
                  <div className="relative mt-1 max-w-xs">
                    <input
                      value={storePostalCode}
                      onChange={(e) =>
                        handlePostalCodeInputChange(
                          e.target.value,
                          setStorePostalCode,
                          clearLookupCache,
                        )
                      }
                      placeholder="00000-000"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm"
                    />
                    {cepLoading ? (
                      <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                    ) : null}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Ao digitar o CEP, preenchemos cidade, UF e endereço automaticamente.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Endereço da loja</label>
                  <input
                    value={storeAddress}
                    onChange={(e) => {
                      addressFromCep.current = false;
                      setStoreAddress(e.target.value);
                    }}
                    placeholder="Rua, número — bairro"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Cidade *</label>
                    <input
                      value={storeCity}
                      onChange={(e) => setStoreCity(e.target.value)}
                      placeholder="Ex.: Aguaí"
                      required
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">UF *</label>
                    <input
                      value={storeState}
                      onChange={(e) => setStoreState(e.target.value.toUpperCase().slice(0, 2))}
                      placeholder="SP"
                      required
                      maxLength={2}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm uppercase"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={storeBusy}
                  className="erp-btn-primary disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {storeBusy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Salvar região
                </button>
              </form>
            </section>

            <section className="erp-card p-5 space-y-4">
              <div className="flex items-center gap-2 font-medium">
                <Truck className="size-4 text-primary" />
                Taxas de entrega
              </div>
              <p className="text-sm text-muted-foreground">
                Defina a taxa padrão e valores por bairro. No checkout, o cliente escolhe o bairro
                na lista ou o CEP tenta casar automaticamente.
              </p>
              <form onSubmit={handleSaveDeliveryFees} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Taxa padrão (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={defaultDeliveryFee}
                    onChange={(e) => setDefaultDeliveryFee(e.target.value)}
                    className="mt-1 w-full max-w-xs rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Taxa por bairro
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setNeighborhoodFees((prev) => [...prev, { name: "", fee: 0 }])
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:bg-surface-elevated/50"
                    >
                      <Plus className="size-3.5" />
                      Bairro
                    </button>
                  </div>
                  {neighborhoodFees.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Nenhum bairro configurado — será usada só a taxa padrão.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {neighborhoodFees.map((row, index) => (
                        <li key={index} className="flex flex-wrap items-center gap-2">
                          <input
                            value={row.name}
                            onChange={(e) =>
                              setNeighborhoodFees((prev) =>
                                prev.map((n, i) =>
                                  i === index ? { ...n, name: e.target.value } : n,
                                ),
                              )
                            }
                            placeholder="Nome do bairro"
                            className="min-w-[140px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                          />
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={row.fee}
                            onChange={(e) =>
                              setNeighborhoodFees((prev) =>
                                prev.map((n, i) =>
                                  i === index
                                    ? { ...n, fee: Number(e.target.value) || 0 }
                                    : n,
                                ),
                              )
                            }
                            className="w-28 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setNeighborhoodFees((prev) => prev.filter((_, i) => i !== index))
                            }
                            className="rounded-lg border border-border p-2 text-muted-foreground hover:text-danger"
                            aria-label="Remover bairro"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={deliveryBusy}
                  className="erp-btn-primary disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {deliveryBusy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Salvar taxas
                </button>
              </form>
            </section>

            <section className="erp-card p-5 space-y-4">
              <div className="flex items-center gap-2 font-medium">
                <ShoppingBag className="size-4 text-primary" />
                Formas de pedido
              </div>
              <p className="text-sm text-muted-foreground">
                Escolha o que o cliente pode selecionar no checkout do cardápio digital.
              </p>
              <form onSubmit={handleSaveFulfillment} className="space-y-3">
                <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/15 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Entrega</p>
                    <p className="text-xs text-muted-foreground">
                      Cliente informa endereço e taxa de entrega.
                    </p>
                  </div>
                  <Switch
                    checked={deliveryEnabled}
                    onCheckedChange={setDeliveryEnabled}
                    className="shrink-0 data-[state=unchecked]:bg-border/80"
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/15 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Retirada na loja</p>
                    <p className="text-xs text-muted-foreground">
                      Cliente busca no balcão — sem taxa de entrega.
                    </p>
                  </div>
                  <Switch
                    checked={pickupEnabled}
                    onCheckedChange={setPickupEnabled}
                    className="shrink-0 data-[state=unchecked]:bg-border/80"
                  />
                </div>
                {!deliveryEnabled && !pickupEnabled ? (
                  <p className="text-xs text-danger">
                    Ative pelo menos uma forma de pedido.
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={fulfillmentBusy || (!deliveryEnabled && !pickupEnabled)}
                  className="erp-btn-primary disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {fulfillmentBusy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Salvar formas de pedido
                </button>
              </form>
            </section>

            <section className="erp-card p-5 space-y-4">
              <div className="flex items-center gap-2 font-medium">
                <Tag className="size-4 text-primary" />
                Cupons promocionais
              </div>
              <p className="text-sm text-muted-foreground">
                Códigos que o cliente digita no checkout. Desconto percentual ou valor fixo em reais.
              </p>
              <form onSubmit={handleSaveCoupons} className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Cupons ativos</span>
                    <button
                      type="button"
                      onClick={() =>
                        setCoupons((prev) => [
                          ...prev,
                          {
                            code: "",
                            label: "",
                            type: "percent",
                            value: 10,
                          },
                        ])
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:bg-surface-elevated/50"
                    >
                      <Plus className="size-3.5" />
                      Cupom
                    </button>
                  </div>
                  {coupons.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Nenhum cupom — o campo no checkout fica oculto até cadastrar ao menos um.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {coupons.map((row, index) => (
                        <li
                          key={index}
                          className="rounded-xl border border-border/60 p-3 space-y-2"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              value={row.code}
                              onChange={(e) =>
                                setCoupons((prev) =>
                                  prev.map((c, i) =>
                                    i === index ? { ...c, code: e.target.value.toUpperCase() } : c,
                                  ),
                                )
                              }
                              placeholder="Código (ex.: BEMVINDO)"
                              className="min-w-[120px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm uppercase"
                            />
                            <select
                              value={row.type}
                              onChange={(e) =>
                                setCoupons((prev) =>
                                  prev.map((c, i) =>
                                    i === index
                                      ? { ...c, type: e.target.value as MenuCoupon["type"] }
                                      : c,
                                  ),
                                )
                              }
                              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                            >
                              <option value="percent">Percentual (%)</option>
                              <option value="fixed">Valor fixo (R$)</option>
                            </select>
                            <button
                              type="button"
                              onClick={() =>
                                setCoupons((prev) => prev.filter((_, i) => i !== index))
                              }
                              className="rounded-lg border border-border p-2 text-muted-foreground hover:text-danger"
                              aria-label="Remover cupom"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              value={row.label}
                              onChange={(e) =>
                                setCoupons((prev) =>
                                  prev.map((c, i) =>
                                    i === index ? { ...c, label: e.target.value } : c,
                                  ),
                                )
                              }
                              placeholder="Descrição (ex.: 10% de boas-vindas)"
                              className="sm:col-span-2 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                            />
                            <input
                              type="number"
                              min={row.type === "percent" ? 1 : 0.01}
                              max={row.type === "percent" ? 100 : undefined}
                              step={row.type === "percent" ? 1 : 0.01}
                              value={row.value}
                              onChange={(e) =>
                                setCoupons((prev) =>
                                  prev.map((c, i) =>
                                    i === index
                                      ? { ...c, value: Number(e.target.value) || 0 }
                                      : c,
                                  ),
                                )
                              }
                              placeholder={row.type === "percent" ? "10" : "5,00"}
                              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-muted-foreground">
                              Pedido mínimo (opcional, R$)
                            </label>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={row.min_subtotal ?? ""}
                              onChange={(e) =>
                                setCoupons((prev) =>
                                  prev.map((c, i) =>
                                    i === index
                                      ? {
                                          ...c,
                                          min_subtotal:
                                            e.target.value === ""
                                              ? undefined
                                              : Number(e.target.value) || 0,
                                        }
                                      : c,
                                  ),
                                )
                              }
                              placeholder="vazio = sem mínimo"
                              className="mt-1 w-full max-w-xs rounded-lg border border-border bg-background px-3 py-2 text-sm"
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={couponsBusy}
                  className="erp-btn-primary disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {couponsBusy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Salvar cupons
                </button>
              </form>
            </section>

            <section className="erp-card p-5 space-y-4">
              <div className="flex items-center gap-2 font-medium">
                <Clock className="size-4 text-primary" />
                Horário de funcionamento
              </div>
              <p className="text-sm text-muted-foreground">
                Controla o status aberto/fechado no cardápio público e bloqueia novos pedidos fora do
                horário.
              </p>
              <form onSubmit={handleSaveOpeningHours} className="space-y-3">
                <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/15 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Ativar controle de horário</p>
                    <p className="text-xs text-muted-foreground">
                      Exibe aberto/fechado no cardápio conforme os horários abaixo.
                    </p>
                  </div>
                  <Switch
                    checked={openingHours.enabled}
                    onCheckedChange={(enabled) =>
                      setOpeningHours((prev) => ({ ...prev, enabled }))
                    }
                    className="shrink-0 data-[state=unchecked]:bg-border/80"
                  />
                </div>
                {openingHours.enabled ? (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full min-w-[28rem] text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                          <th className="px-3 py-2 font-medium">Dia</th>
                          <th className="px-3 py-2 font-medium">Fechado</th>
                          <th className="px-3 py-2 font-medium">Abre</th>
                          <th className="px-3 py-2 font-medium">Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {STORE_DAY_ORDER.map((dayIndex) => {
                          const day = openingHours.days[dayIndex];
                          return (
                            <tr key={dayIndex} className="border-b border-border/60 last:border-0">
                              <td className="px-3 py-2 font-medium">{STORE_DAY_LABELS[dayIndex]}</td>
                              <td className="px-3 py-2">
                                <div className="flex justify-center">
                                  <Checkbox
                                    checked={day.closed}
                                    onCheckedChange={(checked) =>
                                      setOpeningHours((prev) => ({
                                        ...prev,
                                        days: prev.days.map((row, index) =>
                                          index === dayIndex
                                            ? { ...row, closed: checked === true }
                                            : row,
                                        ),
                                      }))
                                    }
                                    className={premiumCheckboxClass}
                                    aria-label={`${STORE_DAY_LABELS[dayIndex]} fechado`}
                                  />
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="time"
                                  value={day.open}
                                  disabled={day.closed}
                                  onChange={(e) =>
                                    setOpeningHours((prev) => ({
                                      ...prev,
                                      days: prev.days.map((row, index) =>
                                        index === dayIndex ? { ...row, open: e.target.value } : row,
                                      ),
                                    }))
                                  }
                                  className="w-full min-w-[6.5rem] rounded-lg border border-border bg-background px-2 py-1.5 text-sm disabled:opacity-40"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="time"
                                  value={day.close}
                                  disabled={day.closed}
                                  onChange={(e) =>
                                    setOpeningHours((prev) => ({
                                      ...prev,
                                      days: prev.days.map((row, index) =>
                                        index === dayIndex
                                          ? { ...row, close: e.target.value }
                                          : row,
                                      ),
                                    }))
                                  }
                                  className="w-full min-w-[6.5rem] rounded-lg border border-border bg-background px-2 py-1.5 text-sm disabled:opacity-40"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Com o controle desativado, o cardápio sempre aparece como aberto.
                  </p>
                )}
                <button
                  type="submit"
                  disabled={hoursBusy}
                  className="erp-btn-primary disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {hoursBusy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Salvar horário
                </button>
              </form>
            </section>

            <section className="erp-card p-5 space-y-3">
              <div className="flex items-center gap-2 font-medium">
                <Link2 className="size-4 text-primary" />
                Cardápio digital (link público)
              </div>
              <p className="text-sm text-muted-foreground">
                Compartilhe com clientes para pedir e acompanhar o pedido.
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={menuUrl}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={copyMenuLink}
                  className="rounded-lg border border-border px-3 py-2 hover:bg-surface-elevated/50"
                >
                  <Copy className="size-4" />
                </button>
              </div>
            </section>
        </div>  );
}
