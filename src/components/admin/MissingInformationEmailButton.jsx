import React, { useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function MissingInformationEmailButton({ id, disabled }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const send = async () => {
    setSending(true); setError('');
    try {
      await base44.functions.invoke('locksmithRegistrationApproval', { action: 'notify_missing_information', id });
      setSent(true);
    } catch (error) {
      setError(error?.response?.data?.error || 'Não foi possível enviar o e-mail. Tente novamente.');
    } finally { setSending(false); }
  };
  return <div className="space-y-2 rounded-lg border border-border bg-muted p-3">
    <p className="text-sm">Avise o chaveiro sobre as informações pendentes para aprovação.</p>
    <Button variant="outline" disabled={disabled || sending || sent} onClick={send}>
      {sending ? <Loader2 className="animate-spin" /> : <Mail />}
      {sending ? 'Enviando...' : sent ? 'E-mail enviado' : 'Enviar e-mail de pendências'}
    </Button>
    {sent && <p role="status" className="text-sm text-success">E-mail enviado com as pendências e o link para completar o cadastro.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}