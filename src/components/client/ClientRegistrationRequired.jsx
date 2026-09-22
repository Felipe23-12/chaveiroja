import React from 'react';
import { Button } from '@/components/ui/button';

export default function ClientRegistrationRequired({ onComplete }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <h2 className="font-heading text-lg font-semibold">Complete seu cadastro</h2>
      <p className="text-sm text-muted-foreground">Finalize seu cadastro antes de escolher um serviço ou simular o valor de um chamado.</p>
      <Button onClick={onComplete} className="w-full">Concluir cadastro</Button>
    </div>
  );
}