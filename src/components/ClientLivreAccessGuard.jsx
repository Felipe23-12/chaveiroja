import React from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { clientRegistrationComplete } from '@/lib/clientRegistration';
import IncompleteClientNotice from '@/components/client/IncompleteClientNotice';
import LoadingCard from '@/components/ui/LoadingCard';
import ErrorBanner from '@/components/ui/ErrorBanner';

export default function ClientLivreAccessGuard({ allowAppChat = false }) {
  const { user } = useAuth();
  const params = useParams();
  const locksmithId = params.locksmithId || params.id;
  const complete = clientRegistrationComplete(user);
  const checkAppChat = Boolean(!complete && allowAppChat && user?.id && locksmithId);
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['client-app-chat-access', user?.id, locksmithId],
    enabled: checkAppChat,
    queryFn: async () => {
      const matches = await base44.entities.ServiceRequest.filter({
        created_by_id: user.id, locksmith_id: locksmithId,
        status: { $in: ['queued', 'accepted', 'on_the_way', 'completed'] },
      }, '-created_date', 1);
      return matches.length > 0;
    },
  });
  if (complete || (checkAppChat && data === true)) return <Outlet />;
  return <div className="mx-auto max-w-2xl px-4 py-6">
    {checkAppChat && error ? <ErrorBanner message="Não foi possível verificar o acesso à conversa." onRetry={refetch} />
      : checkAppChat && isPending ? <LoadingCard label="Verificando conversa do atendimento..." />
      : <IncompleteClientNotice />}
  </div>;
}