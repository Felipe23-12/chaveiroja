import React from 'react';
import { Loader2, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LocksmithAvailabilityCard({ locksmith, user, busy, trustBlocked, onToggle }) {
  const isLivre = locksmith.work_mode === 'livre';
  const blocked = locksmith.inactive_deactivated === true || (isLivre && locksmith.monthly_fee_paid !== true);
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card mb-5 fade-in-up">
      <div>
        <p className="font-medium text-foreground">{user?.username || user?.full_name || locksmith.name}</p>
        <p className="text-xs text-muted-foreground">
          Modo {isLivre ? 'Livre' : 'Aplicativo'} ·{' '}
          <span className={locksmith.online ? 'text-success' : 'text-muted-foreground'}>{locksmith.online ? 'Online' : 'Offline'}</span>
        </p>
        {blocked && !locksmith.online && <p className="text-xs text-warning mt-1">
          {locksmith.inactive_deactivated ? 'Revalide seu cadastro para voltar a receber chamados.' : 'Pague a mensalidade para ficar online e visível no mapa.'}
        </p>}
      </div>
      <Button onClick={onToggle} variant={locksmith.online ? 'destructive' : 'default'} size="sm" disabled={busy || (!locksmith.online && (blocked || trustBlocked))}>
        {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Power className="w-4 h-4 mr-1.5" />}
        {busy ? (locksmith.online ? 'Atualizando…' : 'Conectando…') : locksmith.online ? 'Sair' : 'Entrar'}
      </Button>
    </div>
  );
}