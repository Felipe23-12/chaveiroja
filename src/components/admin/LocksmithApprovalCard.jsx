import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { formatCpf } from '@/lib/cpf';

export default function LocksmithApprovalCard({ item, busy, onApprove }) {
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState('');
  const profile = item.profile;
  return <article className="rounded-xl border border-border bg-card p-4 space-y-4">
    <div><h3 className="font-heading font-semibold">{item.name || 'Nome não informado'}</h3><p className="text-sm text-warning">Aguardando aprovação administrativa</p></div>
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div><dt className="text-muted-foreground">Email</dt><dd className="break-all">{item.email}</dd></div>
      <div><dt className="text-muted-foreground">Telefone</dt><dd>{item.phone || 'Não informado'}</dd></div>
      <div><dt className="text-muted-foreground">CPF solicitado</dt><dd>{formatCpf(item.cpf)}</dd></div>
      <div><dt className="text-muted-foreground">Solicitação recebida</dt><dd>{new Date(item.created_date).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</dd></div>
      <div><dt className="text-muted-foreground">Especialidades</dt><dd>{profile?.specialties?.join(', ') || profile?.specialty || 'Perfil ainda não concluído'}</dd></div>
      <div><dt className="text-muted-foreground">Veículo</dt><dd>{profile?.vehicle || 'Não informado'}</dd></div>
    </dl>
    {profile?.bio && <p className="text-sm whitespace-pre-wrap">{profile.bio}</p>}
    <p className="text-xs text-muted-foreground">Aprovar confirma a titularidade do CPF e libera essa pendência cadastral. As exigências de recebimentos, cobertura e eventuais bloqueios continuam válidas.</p>
    <label className="flex items-start gap-3 text-sm"><Checkbox checked={confirmed} onCheckedChange={value => setConfirmed(value === true)} disabled={busy} /><span>Conferi os dados e a comprovação de titularidade do CPF deste chaveiro.</span></label>
    <Textarea aria-label="Registro da conferência" placeholder="Registre como a titularidade foi conferida (obrigatório)." maxLength={1000} value={note} onChange={event => setNote(event.target.value)} disabled={busy} />
    <Button disabled={busy || !confirmed || note.trim().length < 10} onClick={() => onApprove(item.id, note.trim())}>{busy ? 'Aprovando...' : 'Aprovar cadastro'}</Button>
  </article>;
}