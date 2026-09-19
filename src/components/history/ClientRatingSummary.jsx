import React from "react";
import { Star } from "lucide-react";

export default function ClientRatingSummary({ review, label = "Avaliação do chaveiro:" }) {
  if (!review) return null;
  return <div className="mt-3 border-t border-border pt-3">
    <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-medium text-muted-foreground">{label}</span><div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((value) => <Star key={value} className={`h-4 w-4 ${value <= review.rating ? "fill-warning text-warning" : "text-border"}`} />)}</div><span className="text-sm font-semibold">{Number(review.rating).toFixed(1)}</span></div>
    {review.comment && <p className="mt-1 text-sm italic text-muted-foreground">“{review.comment}”</p>}
  </div>;
}