import { CheckoutStepper } from "@/components/menu/public/CheckoutStepper";
import {
  TRACKING_STEP_LABELS,
  trackingStageIndex,
  isTrackingCancelled,
} from "@/lib/ops/trackingTimeline";

type TrackingStepperProps = {
  status: string;
};

export function TrackingStepper({ status }: TrackingStepperProps) {
  const stage = trackingStageIndex(status);
  if (isTrackingCancelled(status)) return null;

  return (
    <div className="tracking-stepper-wrap">
      <CheckoutStepper steps={TRACKING_STEP_LABELS} current={Math.max(0, stage)} />
    </div>
  );
}
