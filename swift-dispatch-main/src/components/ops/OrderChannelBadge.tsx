import { channelColorClass, channelLabel } from "@/lib/orders/channels";
import { cn } from "@/lib/utils";

type Props = {
  channel: string | null | undefined;
  className?: string;
  size?: "xs" | "sm";
};

export function OrderChannelBadge({ channel, className, size = "xs" }: Props) {
  if (!channel?.trim()) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium tabular-nums",
        size === "xs" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs",
        channelColorClass(channel),
        className,
      )}
    >
      {channelLabel(channel)}
    </span>
  );
}
