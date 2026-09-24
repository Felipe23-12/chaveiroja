import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import CpfInput from '@/components/auth/CpfInput';
import { cpfError, isValidCpf, formatCpf } from '@/lib/cpf';
import { claimCpf } from '@/lib/cpfRegistration';

export default function AccountCpfForm({ user, onSaved }) {
  const [cpf, setCpf] = useState(formatCpf(user.cpf));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [linked, setLinked] = useState(null);
  useEffect(() => setCpf(formatCpf(user.cpf)), [user.cpf]);
  useEffect(() => {
    let active = true;
    setLinked(null);
    base44.functions.invoke('claimCpf', { action: 'status' })
      .then(({ data }) => { if (active) setLinked(data?.linked === true); })
      .catch(() => { if (active) setLinked(false); });
    return () => { active = false; };
  }, [user.id, user.cpf]);
  if (user.account_type !== 'chaveiro') return null;
  const saved = isValidCpf(user.cpf);
  const save = async (event) => {
    event.preventDefault(); setMessage('');
    const error = cpfError(cpf);
    if (error) return setMessage(error);
    setBusy(true);
    try {
      await claimCpf(cpf);
      setLinked(true);
      onSaved(await base44.auth.me());
      setMessage('CPF vinculado ao seu cadastro. Você já pode tentar aceitar chamados.');
    } catch (error) { setMessage(error?.message || 'Não foi possível vincular o CPF.'); }
    finally { setBusy(false); }
  };
  return <section id="cpf" className="rounded-xl border border-border bg-card p-4 space-y-3 scroll-mt-20">
    <h2 className="font-heading font-semibold">Conclusão de cadastro · CPF</h2>
    {saved && <p className={`text-sm ${linked ? 'text-success' : 'text-muted-foreground'}`}>CPF cadastrado: {formatCpf(user.cpf)}. {linked === null ? 'Verificando confirmação...' : linked ? 'CPF confirmado.' : 'Confirmação pendente. Confirme abaixo para aceitar chamados.'} Por segurança, não é possível substituí-lo por outro CPF neste formulário.</p>}
    {!linked && <form onSubmit={save} className="space-y-3">
      <p className="text-sm text-muted-foreground">{saved ? 'Confirme o CPF já cadastrado para liberar a aceitação de chamados.' : 'Informe seu CPF para liberar a aceitação de chamados.'}</p>
      <CpfInput value={cpf} onChange={setCpf} email={user.email} />
      <Button type="submit" disabled={busy || linked === null}>{busy ? 'Validando...' : 'Validar e salvar CPF'}</Button>
    </form>}
    {message && <p role="status" className="text-sm text-foreground">{message}</p>}
  </section>;
}