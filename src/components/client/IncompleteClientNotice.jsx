import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function IncompleteClientNotice() {
  return <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
    <h2 className="font-heading text-lg font-semibold">Cadastro completo para o Modo Livre</h2>
    <p className="text-sm text-muted-foreground">Para negociar diretamente com chaveiros no Modo Livre, conclua seu cadastro. No modo aplicativo, você pode solicitar sem CPF, telefone ou endereço de cadastro.</p>
    <Button asChild><Link to="/google-complete?tipo=cliente&returnTo=%2Fmapa">Concluir cadastro para o Modo Livre</Link></Button>
    <Button asChild variant="outline"><Link to="/">Usar modo aplicativo</Link></Button>
  </section>;
}