import React from 'react';
import { MapPinOff } from 'lucide-react';
import { AREA_UNAVAILABLE } from '@/lib/serviceAreas';
import useServiceCoverage from '@/hooks/useServiceCoverage';
export default function CoverageNotice({ location, known = true, locksmith = false }) {
  const { allowed, loading, checking } = useServiceCoverage(location, known);
  if (allowed) return null;
  if (loading || checking) return <p role="status" className="text-sm text-muted-foreground">Verificando área de atendimento…</p>;
  return <div role="status" className="flex gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"><MapPinOff className="h-5 w-5 shrink-0" /><div><p className="font-semibold">{AREA_UNAVAILABLE}</p><p className="mt-1 text-xs">{locksmith ? 'Sua conta continua ativa. Entre em uma área liberada e toque em Entrar para receber novos chamados.' : 'Selecione um endereço dentro da área liberada. As regiões em vermelho ainda não têm atendimento.'}</p></div></div>;
}