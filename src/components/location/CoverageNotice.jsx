import React from 'react';
import { MapPinOff } from 'lucide-react';
import { AREA_UNAVAILABLE } from '@/lib/serviceAreas';
import useServiceCoverage from '@/hooks/useServiceCoverage';
import { Button } from '@/components/ui/button';
export default function CoverageNotice({ location, known = true, locksmith = false, accuracy }) {
  const { allowed, status, message, checking, retry } = useServiceCoverage(location, known);
  if (allowed) return null;
  const approximate = status === 'unavailable' && Number.isFinite(accuracy) && accuracy > 100;
  if (status !== 'unavailable' || approximate) return (
    <div role="status" className="rounded-xl border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
      <p>{approximate ? 'Sua localização está aproximada. Confirme o endereço nas sugestões para verificar a cobertura com precisão.' : message}</p>
      {status === 'error' && <Button type="button" variant="outline" size="sm" className="mt-2" disabled={checking} onClick={() => retry()}>{checking ? 'Verificando…' : 'Tentar novamente'}</Button>}
    </div>
  );
  return <div role="status" className="flex gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"><MapPinOff className="h-5 w-5 shrink-0" /><div><p className="font-semibold">{AREA_UNAVAILABLE}</p><p className="mt-1 text-xs">{locksmith ? 'Sua conta continua ativa. Entre em uma área liberada e toque em Entrar para receber novos chamados.' : 'Selecione um endereço dentro da área liberada. As regiões em vermelho ainda não têm atendimento.'}</p></div></div>;
}