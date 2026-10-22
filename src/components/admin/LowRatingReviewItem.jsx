import React from 'react';
import { Star } from 'lucide-react';

export default function LowRatingReviewItem({ review }) {
  return <li className="space-y-2 py-4 first:pt-0 last:pb-0">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <h3 className="break-words font-semibold text-foreground">{review.locksmith_name || 'Chaveiro não identificado'}</h3>
        <p className="text-xs text-muted-foreground">{review.service_type || 'Serviço não informado'} · {new Date(review.created_date).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })}</p>
      </div>
      <span aria-label={`Nota ${review.rating} de 5 estrelas`} className="inline-flex shrink-0 items-center gap-1 rounded-md bg-warning/10 px-2 py-1 text-sm font-semibold text-warning"><Star className="h-4 w-4 fill-current" aria-hidden="true" />{review.rating}/5</span>
    </div>
    <p className="whitespace-pre-wrap break-words text-sm text-foreground">{review.comment?.trim() || 'Sem comentário.'}</p>
    <p className="text-xs text-muted-foreground">Cliente: {review.customer_name || 'Não informado'}</p>
  </li>;
}