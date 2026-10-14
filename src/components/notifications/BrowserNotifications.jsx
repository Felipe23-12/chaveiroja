import React from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useBrowserNotifications from '@/components/notifications/useBrowserNotifications';

export default function BrowserNotifications() {
  const { visible, busy, subscribed, denied, installIOS, unsupported, error, enable, retry, disable } = useBrowserNotifications();
  if (!visible) return null;
  return <section className="mx-4 mt-4 rounded-xl border border-border bg-card p-3 text-sm" aria-label="Notificações do navegador">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-start gap-2">
        <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div><p className="font-semibold">Avisos pelo navegador</p>
          <p className="text-xs text-muted-foreground">{installIOS ? 'No iPhone/iPad: abra no Safari, toque em Compartilhar → Adicionar à Tela de Início e abra por esse ícone (iOS 16.4 ou superior).' : unsupported ? 'Este navegador não permite notificações web. Use uma versão atual do Chrome, Edge, Firefox ou Safari.' : denied ? 'Os avisos estão bloqueados. Permita notificações nas configurações deste site no navegador.' : subscribed ? 'Ativados para mensagens e atualizações do chamado, mesmo com o site fechado.' : 'Receba mensagens e avisos do seu chamado, mesmo com o site fechado.'}</p>
        </div>
      </div>
      {!installIOS && !unsupported && !denied && <Button size="sm" variant={subscribed ? 'outline' : 'default'} disabled={busy} onClick={error ? retry : subscribed ? disable : enable}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}{error ? 'Tentar novamente' : subscribed ? 'Desativar avisos' : 'Ativar avisos'}
      </Button>}
    </div>
    {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
  </section>;
}