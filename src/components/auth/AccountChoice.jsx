import React from 'react';
import { Link } from 'react-router-dom';
import { User, Wrench, ArrowRight } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';

export default function AccountChoice({ returnTo = '/' }) {
  const qs = returnTo === '/' ? '' : `&returnTo=${encodeURIComponent(returnTo)}`;
  return <AuthLayout title="Como você quer entrar?" subtitle="Escolha o tipo de conta para continuar">
    <div className="space-y-3">
      <Link to={`/login?tipo=cliente${qs}`} className="flex items-center gap-4 rounded-xl border-2 border-border bg-card p-4 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <User className="h-6 w-6 shrink-0 text-primary" />
        <span className="flex-1 font-heading font-semibold">Sou cliente</span>
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
      </Link>
      <Link to={`/login?tipo=chaveiro${qs}`} className="flex items-center gap-4 rounded-xl border-2 border-border bg-card p-4 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Wrench className="h-6 w-6 shrink-0 text-primary" />
        <span className="flex-1 font-heading font-semibold">Sou chaveiro</span>
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
      </Link>
      <p className="pt-3 text-center text-xs text-muted-foreground">O mesmo CPF não pode ser usado em contas de cliente e chaveiro ao mesmo tempo.</p>
    </div>
  </AuthLayout>;
}