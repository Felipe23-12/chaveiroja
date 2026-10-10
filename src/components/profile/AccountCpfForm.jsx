import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import CpfInput from '@/components/auth/CpfInput';
import { cpfError, isValidCpf, formatCpf } from '@/lib/cpf';
import submitCpfForReview from '@/lib/submitCpfForReview';
import RegistrationApprovalStatus from '@/components/profile/RegistrationApprovalStatus';

export default function AccountCpfForm({ user, onSaved }) {
  const [cpf, setCpf] = useState(formatCpf(user.cpf));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [linked, setLinked] = useState(null);
  const [retryBlocked, setRetryBlocked] = useState(false);
  const [pending, setPending] = useState(false);
  useEffect(() => setCpf(formatCpf(user.cpf)), [user.cpf]);
  useEffect(() => {
    let active = true;
    setLinked(null);
    base44.functions.invoke('claimCpf', { action: 'status' })
      .then(({ data }) => { if (active) { setLinked(data?.linked === true); setPending(data.pending === true); setRetryBlocked(data.retry_blocked === true); setMessage(data.message || (data.pending ? 'CPF recebido. Seus dados não estão inválidos: o cadastro aguarda aprovação administrativa. Não é necessário reenviar CPF, telefone ou senha.' : '')); if (!user.cpf && data.requested_cpf) setCpf(formatCpf(data.requested_cpf)); } })
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
      const status = await submitCpfForReview(cpf);
      setLinked(status.linked === true); setPending(status.pending === true);
      setRetryBlocked(status.retry_blocked === true);
      onSaved(await base44.auth.me());
      setMessage(status.message || (status.linked ? 'CPF aprovado e vinculado ao cadastro.' : status.pending ? 'CPF recebido. Seus dados não estão inválidos: o cadastro aguarda aprovação administrativa. Não é necessário reenviar CPF, telefone ou senha.' : 'Não foi possível confirmar uma solicitação pendente. Confira o CPF informado.'));
    } catch (error) { setMessage(error?.message || 'Não foi possível vincular o CPF.'); }
    finally { setBusy(false); }
  };
  return <section id="cpf" className="rounded-xl border border-border bg-card p-4 space-y-3 scroll-mt-20">
    <h2 className="font-heading font-semibold">Conclusão de cadastro · CPF</h2>
    {saved && <p className={`text-sm ${linked ? 'text-success' : 'text-muted-foreground'}`}>CPF cadastrado: {formatCpf(user.cpf)}. {linked === null ? 'Verificando confirmação...' : linked ? 'CPF confirmado.' : 'Aprovação administrativa pendente, com comprovação de titularidade.'} Por segurança, não é possível substituí-lo por outro CPF neste formulário.</p>}
    {!linked && <RegistrationApprovalStatus onStatus={data => { setPending(data.pending === true); setRetryBlocked(data.retry_blocked === true); setMessage(data.message || (data.pending ? 'Cadastro recebido e aguardando aprovação administrativa, sem necessidade de preencher os dados novamente.' : '')); }} onApproved={fresh => { setLinked(true); setPending(false); onSaved(fresh); }} />}
    {pending && <p className="text-sm text-muted-foreground">CPF em análise: {formatCpf(cpf)}. Use “Verificar aprovação do cadastro” após a conferência pela administração.</p>}
    {!linked && !pending && <form onSubmit={save} className="space-y-3">
      <p className="text-sm text-muted-foreground">{saved ? 'Envie o CPF já cadastrado para análise administrativa de titularidade.' : 'Informe seu CPF para análise administrativa de titularidade.'}</p>
      <CpfInput value={cpf} onChange={setCpf} email={user.email} />
      <Button type="submit" disabled={busy || linked === null || retryBlocked}>{busy ? 'Enviando...' : 'Solicitar análise do CPF'}</Button>
    </form>}
    {message && <p role="status" className="text-sm text-foreground">{message}</p>}
  </section>;
}