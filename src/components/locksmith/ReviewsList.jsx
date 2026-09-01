import React, { useState, useEffect } from "react";
import { Star, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getReviews } from "@/lib/reviews";

export default function ReviewsList({ locksmithId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = () => getReviews(locksmithId).then((r) => active && setReviews(r));
    load().finally(() => active && setLoading(false));
    const unsub = base44.entities.Review.subscribe(() => load());
    return () => {
      active = false;
      unsub();
    };
  }, [locksmithId]);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">Ainda não há avaliações.</p>;
  }

  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <div key={r.id} className="p-3 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-foreground">{r.customer_name}</p>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={`w-3.5 h-3.5 ${r.rating >= n ? "fill-amber-400 text-amber-400" : "text-border"}`} />
              ))}
            </div>
          </div>
          {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
          {r.service_type && <p className="text-[11px] text-muted-foreground mt-1">{r.service_type}</p>}
        </div>
      ))}
    </div>
  );
}