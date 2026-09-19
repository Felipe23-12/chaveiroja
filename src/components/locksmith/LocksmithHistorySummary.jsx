import React, { useState, useEffect } from "react";
import { Star, Loader2, History, MessageSquare } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getReviews } from "@/lib/reviews";
import ReplacedPartsSummary from "@/components/locksmith/ReplacedPartsSummary";
import ServiceHistoryCard from "@/components/history/ServiceHistoryCard";
import ClientReviewForm from "@/components/locksmith/ClientReviewForm";
import ClientRatingSummary from "@/components/history/ClientRatingSummary";

export default function LocksmithHistorySummary({ locksmithId }) {
  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [clientReviews, setClientReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!locksmithId) return;
    let active = true;
    const load = async () => {
      const [reqs, revs, clientRevs] = await Promise.all([
        base44.entities.ServiceRequest.filter(
          { locksmith_id: locksmithId, status: "completed" },
          "-created_date",
          20
        ),
        getReviews(locksmithId),
        base44.entities.Review.filter({ locksmith_id: locksmithId, review_type: "client" }, "-created_date"),
      ]);
      if (active) {
        setServices(reqs);
        setReviews(revs);
        setClientReviews(clientRevs);
      }
    };
    load().finally(() => active && setLoading(false));
    const unsubReq = base44.entities.ServiceRequest.subscribe(() => load());
    const unsubRev = base44.entities.Review.subscribe(() => load());
    return () => {
      active = false;
      unsubReq();
      unsubRev();
    };
  }, [locksmithId]);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const avg =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length
      : 0;

  return (
    <div className="space-y-4">
      {/* Resumo de avaliações */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          <h3 className="font-heading font-semibold text-foreground text-sm">
            Avaliações dos clientes
          </h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">
              {avg.toFixed(1)}
            </p>
            <div className="flex items-center gap-0.5 justify-center mt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`w-3.5 h-3.5 ${
                    avg >= n ? "fill-amber-400 text-amber-400" : "text-border"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {reviews.length} {reviews.length === 1 ? "avaliação" : "avaliações"}
            </p>
          </div>
          <div className="flex-1 space-y-2 max-h-40 overflow-y-auto pr-1">
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Ainda não há avaliações.
              </p>
            ) : (
              reviews.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  className="p-2.5 rounded-lg bg-muted/50 border border-border"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-foreground">
                      {r.customer_name}
                    </p>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`w-3 h-3 ${
                            r.rating >= n
                              ? "fill-amber-400 text-amber-400"
                              : "text-border"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {r.comment && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                      <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                      {r.comment}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Histórico de serviços finalizados */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-foreground text-sm">
            Serviços finalizados
          </h3>
          <span className="ml-auto text-xs text-muted-foreground">
            {services.length} {services.length === 1 ? "serviço" : "serviços"}
          </span>
        </div>
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum serviço finalizado ainda.
          </p>
        ) : (
          <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
            {services.map((s) => (
              <ServiceHistoryCard key={s.id} request={s} perspective="chaveiro">
                <ReplacedPartsSummary parts={s.replaced_parts} />
                {clientReviews.find((review) => review.service_request_id === s.id)
                  ? <ClientRatingSummary review={clientReviews.find((review) => review.service_request_id === s.id)} label="Sua avaliação do cliente:" />
                  : <ClientReviewForm request={s} onSubmitted={(review) => setClientReviews((current) => [review, ...current])} />}
              </ServiceHistoryCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}