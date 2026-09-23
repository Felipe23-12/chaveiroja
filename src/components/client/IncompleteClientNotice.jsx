import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { clientCompletionUrl } from '@/lib/clientRegistration';

export default function IncompleteClientNotice() {
  return <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
    <h2 className="font-heading text-lg font-semibold">Cadastro pendente</h2>
    <p className="text-sm text-muted-foreground">Você pode acessar o app, mas serviços e solicitações ficam indisponíveis até concluir seu cadastro.</p>
    <Button asChild><Link to={clientCompletionUrl()}>Concluir cadastro</Link></Button>
  </section>;
}