import React from 'react';
import { MapPinOff } from 'lucide-react';
import { useServiceAreas, isAreaAvailable, AREA_UNAVAILABLE } from '@/lib/serviceAreas';
export default function CoverageNotice({ location, known = true, locksmith = false }) {
  const { areas, loading, error } = useServiceAreas();
  if (!known || !location) return null;
  if (loading) return <p role="status" className="text-sm text-muted-foreground">Verificando área de atendimento…</p>;
  if (error) return <p role="alert" className="text-sm text-warning">Não foi possível verificar a cobertura. Tente novamente quando a conexão voltar.</p>;
  if (isAreaAvailable(areas, location.lat, location.lng)) return null;
  return <div role="status" className="flex gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"><MapPinOff className="h-5 w-5 shrink-0" /><div><p className="font-semibold">{AREA_UNAVAILABLE}</p><p className="mt-1 text-xs">{locksmith ? 'Sua conta continua ativa. Entre em uma área liberada e toque em Entrar para receber novos chamados.' : 'Selecione um endereço dentro da área liberada. As regiões em vermelho ainda não têm atendimento.'}</p></div></div>;
}