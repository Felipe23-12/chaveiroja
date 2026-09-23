import React from 'react';
import { Button } from '@/components/ui/button';

// Pacote Android publicado, associado ao domínio do app via assetlinks.json.
const ANDROID_PACKAGE = 'com.base6a975d266a8000184833026a.app';

export default function GoogleAppHandoff({ destination, token }) {
  const target = new URL('/auth/google-return', window.location.origin);
  target.searchParams.set('returnTo', destination);
  target.searchParams.set('native_return', '1');
  target.searchParams.set('access_token', token);
  const intent = `intent://${target.host}${target.pathname}${target.search}#Intent;scheme=https;package=${ANDROID_PACKAGE};end`;

  return <main className="min-h-[100dvh] flex items-center justify-center bg-background px-4 pt-safe">
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center">
      <h1 className="font-heading text-xl font-bold">Conta Google conectada</h1>
      <p className="mt-2 mb-5 text-sm text-muted-foreground">A entrada foi concluída no navegador. Toque abaixo para continuar no aplicativo.</p>
      <Button asChild className="w-full"><a href={intent}>Abrir aplicativo</a></Button>
      <Button asChild variant="ghost" className="mt-3 w-full"><a href={destination}>Continuar no navegador</a></Button>
      <p className="mt-4 text-xs text-muted-foreground">Se o aplicativo não abrir, verifique se ele está instalado e se a abertura de links está ativada no Android.</p>
    </div>
  </main>;
}