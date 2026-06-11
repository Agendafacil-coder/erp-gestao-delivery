import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Keyboard, Loader2, QrCode, X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

type DriverTicketScannerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (code: string) => Promise<void>;
  busy?: boolean;
  orderCodes?: string[];
};

type ScanMode = "camera" | "manual";

export function DriverTicketScanner({
  open,
  onOpenChange,
  onScan,
  busy = false,
  orderCodes = [],
}: DriverTicketScannerProps) {
  const [mode, setMode] = useState<ScanMode>("camera");
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  const processingRef = useRef(false);

  const stopCamera = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    zxingControlsRef.current?.stop();
    zxingControlsRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }, []);

  const processCode = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (!trimmed || processingRef.current || busy) return;
      processingRef.current = true;
      try {
        await onScan(trimmed);
        setManualCode("");
        onOpenChange(false);
      } finally {
        processingRef.current = false;
      }
    },
    [busy, onOpenChange, onScan],
  );

  useEffect(() => {
    if (!open || mode !== "camera") {
      stopCamera();
      return;
    }

    let cancelled = false;
    setCameraError(null);

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Câmera não disponível neste dispositivo.");
        setMode("manual");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        await video.play();
        setCameraReady(true);

        const Detector = (
          window as Window & {
            BarcodeDetector?: new (opts: { formats: string[] }) => {
              detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
            };
          }
        ).BarcodeDetector;

        if (Detector) {
          const detector = new Detector({ formats: ["qr_code", "code_128", "code_39", "ean_13"] });

          const tick = async () => {
            if (cancelled || !videoRef.current || videoRef.current.readyState < 2) {
              rafRef.current = requestAnimationFrame(() => void tick());
              return;
            }
            try {
              const codes = await detector.detect(videoRef.current);
              const value = codes[0]?.rawValue;
              if (value) {
                await processCode(value);
                return;
              }
            } catch {
              /* frame skip */
            }
            rafRef.current = requestAnimationFrame(() => void tick());
          };

          rafRef.current = requestAnimationFrame(() => void tick());
        } else {
          const [{ BrowserMultiFormatReader }, { NotFoundException }] = await Promise.all([
            import("@zxing/browser"),
            import("@zxing/library"),
          ]);
          const reader = new BrowserMultiFormatReader();
          const controls = await reader.decodeFromVideoElement(video, (result, err) => {
            if (cancelled) return;
            if (result) void processCode(result.getText());
            if (err && !(err instanceof NotFoundException)) {
              /* frame skip */
            }
          });
          zxingControlsRef.current = controls;
        }
      } catch {
        if (!cancelled) {
          setCameraError("Não foi possível acessar a câmera. Use digitação manual.");
          setMode("manual");
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, mode, processCode, stopCamera]);

  useEffect(() => {
    if (!open) {
      setManualCode("");
      setCameraError(null);
      setMode("camera");
    }
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 max-h-[90vh] overflow-y-auto">
        <SheetTitle className="text-base font-semibold flex items-center gap-2">
          <QrCode className="size-5 text-primary" />
          Ler etiqueta
        </SheetTitle>

        <div className="flex gap-2 mt-4 p-1 rounded-xl bg-muted/50">
          <button
            type="button"
            onClick={() => setMode("camera")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${
              mode === "camera" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            <Camera className="size-3.5" />
            Câmera
          </button>
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${
              mode === "manual" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            <Keyboard className="size-3.5" />
            Digitar
          </button>
        </div>

        {mode === "camera" ? (
          <div className="mt-4 space-y-3">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black border border-border">
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                muted
              />
              {!cameraReady && !cameraError ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <Loader2 className="size-8 animate-spin text-primary" />
                </div>
              ) : null}
              <div className="pointer-events-none absolute inset-8 border-2 border-primary/50 rounded-xl" />
            </div>
            {cameraError ? (
              <p className="text-xs text-muted-foreground text-center">{cameraError}</p>
            ) : (
              <p className="text-xs text-muted-foreground text-center">
                Aponte para o código da etiqueta do pedido
              </p>
            )}
          </div>
        ) : (
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void processCode(manualCode);
            }}
          >
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ex.: #4820"
              className="flex-1 h-11 px-3 rounded-xl border border-border bg-background text-sm font-mono"
              disabled={busy}
              autoFocus
            />
            <button
              type="submit"
              disabled={busy || !manualCode.trim()}
              className="px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              Ler
            </button>
          </form>
        )}

        {orderCodes.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              Seus pedidos
            </p>
            <div className="flex flex-wrap gap-2">
              {orderCodes.map((code) => (
                <button
                  key={code}
                  type="button"
                  disabled={busy}
                  onClick={() => void processCode(code)}
                  className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-mono font-semibold hover:border-primary/40 disabled:opacity-50"
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="mt-4 w-full py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground flex items-center justify-center gap-2"
        >
          <X className="size-4" />
          Fechar
        </button>
      </SheetContent>
    </Sheet>
  );
}
