import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import InlineOtpInput from '@/components/auth/InlineOtpInput';

export default function CompletionSecurity({ user, returnTo, onVerified }) {
  const [sent, setSent] = useState(false), [busy, setBusy] = useState(false);
  const login = `/login?${user.account_type === 'chaveiro' ? 'tipo=chaveiro&' : ''}returnTo=${encodeURIComponent(returnTo)}`;
  const sendLink = async () => {
    setBusy(true);
    sessionStorage.setItem('registration_password_pending', 'true');
    try { await base44.auth.resetPasswordRequest(user.email); }
    catch { /* O resultado é sempre genérico, sem revelar informações da conta. */ }
    finally { setBusy(false); setSent(true); }
  };
  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">Seus dados foram salvos. Conclua a segurança da conta antes de solicitar um chamado.</p>
    <div className="rounded-lg border border-border bg-muted p-3 text-sm"><p className="font-medium break-all">{user.email}</p><p>{user.is_verified === true ? 'Email confirmado na autenticação.' : 'Confirmação de email pendente.'}</p></div>
    {user.is_verified !== true && <InlineOtpInput email={user.email} onSuccess={onVerified} />}
    {user.password_created !== true && <>
      <p className="text-sm">Para cadastrar sua senha, abra o link seguro enviado ao seu email e depois entre com email e a nova senha.</p>
      {sent && <p role="status" className="rounded-lg bg-primary/10 p-3 text-sm">Se o endereço puder receber a mensagem, você receberá um link para criar sua senha. Confira também a pasta de spam.</p>}
      <Button type="button" className="w-full" disabled={busy} onClick={sendLink}>{busy ? 'Solicitando link...' : sent ? 'Reenviar link para criar senha' : 'Enviar link para criar senha'}</Button>
      <Button type="button" variant="outline" className="w-full" onClick={() => base44.auth.logout(login)}>Já criei minha senha — entrar</Button>
    </>}
    <Link className="block text-center text-sm text-primary underline" to="/">Voltar sem solicitar chamado</Link>
  </div>;
}