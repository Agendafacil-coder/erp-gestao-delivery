import { useEffect, useRef, useState } from "react";
import {
  X,
  QrCode,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  Volume2,
  Keyboard,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import {
  nextStatusFromScan,
  normalizeOrderStatus,
  STATUS_LABEL,
  type OrderStatus,
} from "@/lib/ops/orderWorkflow";
import { useOps } from "@/hooks/useOps";
import { useI18n } from "@/hooks/useI18n";

type TicketScannerProps = {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  onScanSuccess?: () => void;
};

// Web Audio API sci-fi synth beeps (zero external assets needed)
function playBeep(type: "success" | "error" | "laser") {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      // Short crisp high-pitched validation chime (A5 -> C6)
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.08); // C6
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === "laser") {
      // Rapid sweep downwards frequency
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(1500, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else {
      // Dull low-pitched warning sound
      osc.type = "triangle";
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {
    console.error("Audio Context blocked or unsupported:", e);
  }
}

export function TicketScanner({ isOpen, onClose, tenantId, onScanSuccess }: TicketScannerProps) {
  const { t } = useI18n();
  const { orders: activeOrders, handleScanLabel } = useOps();
  const [inputVal, setInputVal] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mode, setMode] = useState<"usb" | "camera">("usb");

  const inputRef = useRef<HTMLInputElement | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement | null>(null);

  // Keep input focused when modal is open for USB hardware scanner support
  useEffect(() => {
    if (isOpen && mode === "usb") {
      const timer = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen, mode]);

  // Handle outside click focus
  const handleContainerClick = () => {
    if (mode === "usb") inputRef.current?.focus();
  };

  // Filter active orders for easy display inside simulate scan panel
  const pendingScanOrders = activeOrders.filter(
    (o) => o.status !== "entregue" && o.status !== "cancelado",
  );

  // Handle scanned receipt tag code
  const handleProcessCode = async (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    setInputVal("");

    // Find order in active list
    const order = pendingScanOrders.find(
      (o) =>
        o.code.toLowerCase() === cleanCode.toLowerCase() ||
        o.code.replace("#", "").toLowerCase() === cleanCode.toLowerCase(),
    );

    if (!order) {
      if (soundEnabled) playBeep("error");
      toast.error(`${t("scanner", "helperText")} ("${cleanCode}")`);
      return;
    }

    setIsScanning(true);
    if (soundEnabled) playBeep("laser");

    // Hold visual scanning sweep animation
    setTimeout(async () => {
      try {
        const success = await handleScanLabel(order.code);
        setIsScanning(false);

        if (success) {
          if (soundEnabled) playBeep("success");

          // Next lifecycle resolution for visualization in log
          const norm = normalizeOrderStatus(order.status);
          const scanLabel =
            norm === "aguardando_entregador" && order.driver_id && !order.picked_up_at
              ? "Retirada no restaurante"
              : (STATUS_LABEL[nextStatusFromScan(norm) ?? normalizeOrderStatus(order.status)] ??
                norm);

          setScanResult({
            code: order.code,
            customer: order.customer_name,
            from: order.status,
            to: scanLabel,
          });

          toast.success(`Pedido ${order.code}: ${scanLabel}`);

          if (onScanSuccess) onScanSuccess();
        } else {
          if (soundEnabled) playBeep("error");
          toast.error("Falha ao ler etiqueta do pedido.");
        }
      } catch (err: any) {
        setIsScanning(false);
        if (soundEnabled) playBeep("error");
        toast.error(`Erro ao atualizar pedido: ${err.message}`);
      }
    }, 850);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleProcessCode(inputVal);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in"
      onClick={handleContainerClick}
    >
      <div
        ref={scannerContainerRef}
        className="w-full max-w-lg overflow-hidden glass-strong rounded-3xl border border-border shadow-2xl relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top scan bar */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-accent to-primary animate-pulse" />

        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <QrCode className="size-4.5 text-primary-glow" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg">{t("scanner", "title")}</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                {t("scanner", "subtitle")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`size-8 rounded-lg border flex items-center justify-center transition cursor-pointer ${
                soundEnabled
                  ? "border-primary/25 bg-primary/10 text-primary-glow"
                  : "border-border text-muted-foreground"
              }`}
              title={soundEnabled ? "Sons ativados" : "Mudo"}
            >
              <Volume2 className="size-4" />
            </button>
            <button
              onClick={onClose}
              className="size-8 rounded-lg border border-border hover:border-border-strong text-muted-foreground hover:text-foreground transition flex items-center justify-center cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Body tabs */}
        <div className="flex border-b border-border bg-surface/30">
          <button
            onClick={() => setMode("usb")}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition cursor-pointer ${
              mode === "usb"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Keyboard className="size-3.5" /> {t("scanner", "physicalScanner")}
          </button>
          <button
            onClick={() => setMode("camera")}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition cursor-pointer ${
              mode === "camera"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Camera className="size-3.5" /> {t("scanner", "cameraScanner")}
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {mode === "usb" ? (
            <div className="space-y-4 text-center">
              {/* Virtual Scanner Screen */}
              <div className="relative h-44 rounded-2xl bg-black/40 border border-border overflow-hidden flex flex-col items-center justify-center p-4">
                {/* Laser scan line */}
                {isScanning && (
                  <div className="absolute inset-x-0 top-0 h-1 bg-red-500 shadow-[0_0_12px_2px_rgba(239,68,68,0.8)] z-10 animate-[scan_0.8s_linear_infinite]" />
                )}

                <QrCode
                  className={`size-14 text-muted-foreground/30 mb-2 ${isScanning ? "animate-pulse" : ""}`}
                />

                {isScanning ? (
                  <span className="text-xs font-mono tracking-widest text-red-400 uppercase animate-pulse">
                    Lendo etiqueta de pedido...
                  </span>
                ) : (
                  <>
                    <span className="text-xs text-foreground font-medium flex items-center gap-1.5 justify-center">
                      <span className="size-2 rounded-full bg-success pulse-dot" />
                      {t("scanner", "readyScan")}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-1 max-w-[280px] mx-auto block leading-relaxed font-sans">
                      {t("scanner", "helperText")}
                    </span>
                  </>
                )}

                {/* Secret invisible/styled input for keeping focus */}
                <form onSubmit={handleFormSubmit} className="absolute bottom-2 inset-x-4">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder={t("scanner", "manualPlaceholder")}
                    className="w-full h-8 bg-surface/60 border border-border rounded-lg px-3 text-center text-xs font-mono outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition text-foreground"
                  />
                </form>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <div className="relative h-44 rounded-2xl bg-black/40 border border-border overflow-hidden flex flex-col items-center justify-center">
                {/* Scanner Laser */}
                {isScanning && (
                  <div className="absolute inset-x-0 top-0 h-1 bg-success shadow-[0_0_12px_2px_rgba(34,197,94,0.8)] z-10 animate-[scan_0.8s_linear_infinite]" />
                )}

                <div className="size-16 rounded-full border border-dashed border-success/30 flex items-center justify-center mb-2 animate-[spin_10s_linear_infinite]">
                  <Camera className="size-6 text-success/60" />
                </div>
                <span className="text-xs text-success/80 font-mono uppercase tracking-widest">
                  Leitor Óptico Ativo
                </span>
                <span className="text-[9px] text-muted-foreground mt-1 font-sans">
                  Câmera ativa virtualmente · Selecione um pedido rápido abaixo
                </span>
              </div>
            </div>
          )}

          {/* Quick-scan Simulator for Demos */}
          <div className="space-y-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
              {t("scanner", "quickSimulate")}
            </div>

            {pendingScanOrders.length === 0 ? (
              <div className="border border-dashed border-border rounded-xl p-4 text-center text-xs text-muted-foreground">
                {t("scanner", "emptyOrders")}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                {pendingScanOrders.slice(0, 8).map((o) => (
                  <button
                    key={o.id}
                    onClick={() => handleProcessCode(o.code)}
                    disabled={isScanning}
                    className="flex flex-col text-left p-2.5 rounded-xl border border-border bg-surface/60 hover:bg-surface hover:border-primary/40 transition disabled:opacity-50 group cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full font-mono text-[11px] font-semibold text-foreground">
                      <span>{o.code}</span>
                      <span className="text-[9px] uppercase font-normal tracking-wide px-1.5 rounded-md border border-border bg-muted/30 font-sans">
                        {o.status.replace("_", " ")}
                      </span>
                    </div>
                    <span className="text-[11px] text-foreground truncate font-medium mt-1 w-full">
                      {o.customer_name}
                    </span>
                    <span className="text-[9px] text-muted-foreground truncate w-full mt-0.5">
                      {o.address}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Success Scan Display */}
          {scanResult && (
            <div className="glass rounded-xl p-4 border border-success/20 bg-success/5 flex gap-3 animate-slide-up">
              <CheckCircle2 className="size-5 text-success shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-success font-mono uppercase tracking-wider">
                  {t("scanner", "scanComplete")}
                </div>
                <div className="text-sm font-medium text-foreground mt-1">
                  Pedido <b className="font-mono text-success">{scanResult.code}</b> (
                  {scanResult.customer})
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center flex-wrap gap-1.5 font-sans">
                  <span className="px-1.5 py-0.5 rounded border border-border bg-surface/40 font-mono text-[10px]">
                    {STATUS_LABEL[scanResult.from as OrderStatus] || scanResult.from}
                  </span>
                  <span>→</span>
                  <span className="px-1.5 py-0.5 rounded border border-success/30 bg-success/10 font-mono text-[10px] text-success font-medium">
                    {STATUS_LABEL[scanResult.to as OrderStatus] || scanResult.to}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface/40 text-center flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Delivery OS TagScanner Engine v1.0</span>
          <span>Foco automático ativo</span>
        </div>
      </div>

      {/* Custom Scan Line keyframes styles */}
      <style>{`
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>
    </div>
  );
}
