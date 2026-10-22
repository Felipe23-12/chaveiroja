import React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import LowRatingReviewItem from '@/components/admin/LowRatingReviewItem';

export default function LowRatingsPanel() {
  const { data, isPending, isError, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
    queryKey: ['admin-low-rating-reviews'],
    initialPageParam: undefined,
    queryFn: ({ pageParam }) => base44.entities.Review.filter(
      { rating: { $gte: 1, $lte: 3 }, review_type: { $ne: 'client' } },
      { sort: '-created_date', limit: 5, ...(pageParam ? { cursor: pageParam } : {}) }
    ),
    getNextPageParam: page => page.has_more ? page.next_cursor : undefined,
  });
  const reviews = data?.pages.flatMap(page => page.items) || [];
  return <section aria-labelledby="low-ratings-title" className="space-y-4 rounded-xl border border-border bg-card p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 id="low-ratings-title" className="flex items-center gap-2 font-heading text-lg font-semibold"><Star className="h-5 w-5 text-warning" />Avaliações com notas baixas</h2>
        <p className="text-sm text-muted-foreground">Notas de 1 a 3 estrelas recebidas pelos chaveiros, mais recentes primeiro.</p>
      </div>
      <Button variant="outline" size="sm" disabled={isFetching} onClick={() => refetch()}>{isFetching && !isFetchingNextPage ? 'Atualizando...' : 'Atualizar'}</Button>
    </div>
    {isPending && <p role="status" className="text-sm text-muted-foreground">Carregando avaliações...</p>}
    {isError && <p role="alert" className="text-sm text-destructive">Não foi possível carregar as avaliações. Clique em Atualizar para tentar novamente.</p>}
    {!isPending && !isError && !reviews.length && <p className="py-3 text-sm text-muted-foreground">Nenhuma avaliação de 1 a 3 estrelas encontrada.</p>}
    {reviews.length > 0 && <ul className="max-h-[28rem] divide-y divide-border overflow-y-auto pr-2">{reviews.map(review => <LowRatingReviewItem key={review.id} review={review} />)}</ul>}
    {hasNextPage && <Button variant="outline" size="sm" disabled={isFetching} onClick={() => fetchNextPage()}>{isFetchingNextPage ? 'Carregando...' : 'Carregar mais'}</Button>}
  </section>;
}