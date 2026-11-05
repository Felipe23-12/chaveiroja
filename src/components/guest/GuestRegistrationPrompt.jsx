import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { UserRoundCheck } from 'lucide-react';
export default function GuestRegistrationPrompt({ finished = false, failed = false }) {
  const returnTo = '/atendimento-visitante' + (failed ? '?cancel=1' : '');
  const query = '?returnTo=' + encodeURIComponent(returnTo);
  return <section className="space-y-4 rounded-2xl border border-primary/40 bg-card p-5">
    <UserRoundCheck className="h-8 w-8 text-foreground" />
    <h2 className="font-heading text-xl font-bold">{finished ? 'Finalize seu cadastro para concluir' : 'Vincule este chamado à sua conta'}</h2>
    <p className="text-sm text-muted-foreground">{failed ? 'Entre ou crie sua conta para registrar as fotos do serviço que não deu certo e solicitar o cancelamento sem taxa.' : finished ? 'O chaveiro registrou o fim do serviço. Entre com Google ou crie sua conta com email para confirmar, pagar e guardar o atendimento no seu histórico.' : 'Você pode acompanhar sem login neste navegador. Para outro chamado, será necessário entrar e concluir o cadastro.'}</p>
    <Button asChild className="w-full"><Link to={'/cadastro/cliente' + query}>Continuar com Google ou email</Link></Button>
    <Button asChild variant="outline" className="w-full"><Link to={'/login/cliente' + query}>Já tenho conta · entrar</Link></Button>
    <p className="text-xs text-muted-foreground">O atendimento e as mensagens serão vinculados à conta em que você entrar. Não compartilhe este navegador.</p>
  </section>;
}