import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function RegistrationApprovalStatus({ onApproved, onStatus }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const check = async () => {
    setBusy(true); setMessage('');
    try {
      const { data } = await base44.functions.invoke('claimCpf', { action: 'status' });
      onStatus?.(data);
      if (data.linked) {
        await onApproved(await base44.auth.me());
        setMessage('Cadastro aprovado. Você pode voltar ao painel para concluir as demais etapas.');
      } else setMessage(data.message || (data.pending ? 'Seu cadastro continua aguardando a conferência administrativa da titularidade do CPF.' : 'Envie seu CPF abaixo para solicitar a análise administrativa.'));
    } catch (error) { setMessage(error?.response?.data?.error || error.message); }
    finally { setBusy(false); }
  };
  return <div className="space-y-2">
    <Button type="button" variant="outline" disabled={busy} onClick={check}>{busy ? 'Verificando...' : 'Verificar aprovação do cadastro'}</Button>
    {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
  </div>;
}