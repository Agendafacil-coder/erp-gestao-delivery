import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { submitOrderReviewFn } from "@/functions/reviews";
import type { PublicTrackingPayload } from "@/functions/tracking";

type TrackingReviewSectionProps = {
  orderId: string;
  token: string;
  data: PublicTrackingPayload;
  onReviewSubmitted: (review: NonNullable<PublicTrackingPayload["review"]>) => void;
};

export function TrackingReviewSection({
  orderId,
  token,
  data,
  onReviewSubmitted,
}: TrackingReviewSectionProps) {
  const [reviewScore, setReviewScore] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);

  if (data.order.status !== "entregue") return null;

  const submitReview = async () => {
    if (reviewScore < 1) {
      toast.error("Escolha uma nota de 1 a 5");
      return;
    }
    setReviewBusy(true);
    try {
      const review = await submitOrderReviewFn({
        data: { orderId, token, score: reviewScore, comment: reviewComment || undefined },
      });
      onReviewSubmitted({
        score: review.score,
        comment: review.comment,
        created_at: review.created_at,
      });
      toast.success("Obrigado pela avaliação!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setReviewBusy(false);
    }
  };

  return (
    <div className="glass-strong rounded-2xl p-5 border border-border space-y-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Como foi sua experiência?
      </h2>
      {data.review ? (
        <div className="space-y-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`size-5 ${n <= data.review!.score ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
              />
            ))}
          </div>
          {data.review.comment && (
            <p className="text-sm text-muted-foreground">{data.review.comment}</p>
          )}
          <p className="text-xs text-success">Obrigado pela avaliação!</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setReviewScore(n)}
                className="rounded-lg p-1 transition-colors hover:bg-surface/60"
                aria-label={`Nota ${n}`}
              >
                <Star
                  className={`size-7 ${n <= reviewScore ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                />
              </button>
            ))}
          </div>
          <textarea
            className="w-full rounded-xl border border-border bg-surface/40 px-3 py-2 text-sm min-h-[4.5rem] resize-none"
            placeholder="Conte como foi (opcional)"
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            maxLength={500}
          />
          <button
            type="button"
            disabled={reviewBusy || reviewScore < 1}
            onClick={() => void submitReview()}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {reviewBusy ? "Enviando…" : "Enviar avaliação"}
          </button>
        </>
      )}
    </div>
  );
}
