import React from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function LocksmithGoogleAccessNotice() {
  return <div className="mx-auto max-w-md p-6 pt-safe space-y-4">
    <h1 className="text-xl font-semibold">Acesso de chaveiro</h1>
    <p className="text-sm text-muted-foreground">Para acessar a área profissional, entre com email e senha. O acesso direto pelo Google é exclusivo para clientes.</p>
    <p className="text-sm text-muted-foreground">Se sua conta foi criada com Google, use “Esqueceu a senha?” na tela de entrada para cadastrar uma senha, sem criar outra conta.</p>
    <Button className="w-full" onClick={() => base44.auth.logout('/login?tipo=chaveiro')}>Entrar com email e senha</Button>
  </div>;
}