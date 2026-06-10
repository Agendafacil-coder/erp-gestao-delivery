import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type CheckoutStepperProps = {
  steps: readonly string[];
  current: number;
};

/** Indicador de etapas do checkout — conectado, mobile-first. */
export function CheckoutStepper({ steps, current }: CheckoutStepperProps) {
  return (
    <div className="menu-checkout-stepper" role="list" aria-label="Etapas do pedido">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const last = i === steps.length - 1;

        return (
          <div key={label} className="menu-checkout-step" role="listitem">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "menu-checkout-step__dot",
                  done && "menu-checkout-step__dot--done",
                  active && "menu-checkout-step__dot--active",
                  !done && !active && "menu-checkout-step__dot--idle",
                )}
                aria-current={active ? "step" : undefined}
              >
                {done ? <Check className="size-3.5" strokeWidth={2.5} /> : i + 1}
              </div>
              <span
                className={cn(
                  "menu-checkout-step__label",
                  (active || done) && "menu-checkout-step__label--active",
                )}
              >
                {label}
              </span>
            </div>
            {!last ? (
              <div
                className={cn(
                  "menu-checkout-step__line",
                  i < current && "menu-checkout-step__line--done",
                )}
                aria-hidden
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
