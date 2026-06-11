import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { toast } from "sonner";
import { formatBrazilPostalCode } from "@/lib/geo/addressNavigation";
import { lookupBrazilCep, type BrazilCepLookup } from "@/lib/geo/viacep";

export type UseBrazilCepAutofillOptions = {
  /** Quando false, não consulta o ViaCEP (ex.: retirada ou modal fechado). */
  enabled?: boolean;
  onFound: (result: BrazilCepLookup) => void;
  onNotFound?: () => void;
};

/** Substitui o valor anterior só se estiver vazio ou veio de consulta anterior. */
export function overwriteIfEmptyOrFromSource(
  previous: string,
  next: string,
  fromSourceRef: MutableRefObject<boolean>,
): string {
  if (!previous.trim() || fromSourceRef.current) return next;
  return previous;
}

export function handlePostalCodeInputChange(
  raw: string,
  setPostalCode: (value: string) => void,
  clearLookupCache: () => void,
): void {
  const formatted = formatBrazilPostalCode(raw);
  setPostalCode(formatted);
  if (formatted.replace(/\D/g, "").length < 8) {
    clearLookupCache();
  }
}

export function useBrazilCepAutofill(
  postalCode: string,
  setPostalCode: (value: string) => void,
  options: UseBrazilCepAutofillOptions,
) {
  const { enabled = true, onFound, onNotFound } = options;
  const [loading, setLoading] = useState(false);
  const lastLookupDigits = useRef("");
  const onFoundRef = useRef(onFound);
  const onNotFoundRef = useRef(onNotFound);

  useEffect(() => {
    onFoundRef.current = onFound;
    onNotFoundRef.current = onNotFound;
  });

  const clearLookupCache = useCallback(() => {
    lastLookupDigits.current = "";
  }, []);

  const seedLookupDigits = useCallback((digits: string) => {
    lastLookupDigits.current = digits.replace(/\D/g, "");
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const digits = postalCode.replace(/\D/g, "");
    if (digits.length !== 8) {
      if (digits.length < 8) lastLookupDigits.current = "";
      return;
    }
    if (lastLookupDigits.current === digits) return;

    let cancelled = false;
    setLoading(true);

    void lookupBrazilCep(digits)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          if (onNotFoundRef.current) {
            onNotFoundRef.current();
          } else {
            toast.error("CEP não encontrado");
          }
          return;
        }

        lastLookupDigits.current = digits;
        setPostalCode(result.postalCode);
        onFoundRef.current(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [postalCode, enabled, setPostalCode]);

  return { loading, clearLookupCache, seedLookupDigits };
}
