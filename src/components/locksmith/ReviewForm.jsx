import React, { useState, useEffect } from "react";
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { submitReview } from "@/lib/reviews";

export default function ReviewForm({ locksmithId, locksmithName, serviceType, workMode, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [customerName, setCustomerName] = useState("Cliente");

  useEffect(() => {
    base44.auth.me().then((u) => setCustomerName(u?.full_name || "Cliente")).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating || submitting) return;
    setSubmitting(true);
    try {
      await submitReview({
        locksmithId,
        locksmithName,
        rating,
        comment,
        serviceType,
        workMode,
        customerName,
      });
      setDone(true);
      onSubmitted?.(rating, comment);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return <p className="text-center text-sm text-emerald-600 py-2">Obrigado pela avaliação! ⭐</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex justify-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            className="transition-transform hover:scale-110"
          >
            <Star className={`w-8 h-8 ${(hover || rating) >= n ? "fill-amber-400 text-amber-400" : "text-border"}`} />
          </button>
        ))}
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Conte como foi o atendimento (opcional)"
        rows={3}
      />
      <Button type="submit" disabled={!rating || submitting} className="w-full">
        {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Enviar avaliação
      </Button>
    </form>
  );
}