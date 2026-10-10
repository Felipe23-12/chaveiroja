import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function RejectRegistrationDialog({ item, busy, onReject }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const submit = async () => {
    if (await onReject(item.id, reason.trim())) { setOpen(false); setReason(''); }
  };
  return <>
    <Button variant="destructive" disabled={busy} onClick={() => setOpen(true)}>Reprovar cadastro</Button>
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reprovar cadastro de {item.name || 'chaveiro'}?</DialogTitle><DialogDescription>Uma nova tentativa ficará bloqueada por 15 dias a partir de agora, para esta conta e este CPF. Após o prazo, o chaveiro poderá solicitar uma nova análise, sem aprovação automática.</DialogDescription></DialogHeader>
        <Textarea aria-label="Motivo da reprovação" placeholder="Informe o motivo da reprovação (obrigatório)." maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} disabled={busy} />
        <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancelar</Button><Button variant="destructive" disabled={busy || reason.trim().length < 10} onClick={submit}>{busy ? 'Reprovando...' : 'Confirmar reprovação'}</Button></div>
      </DialogContent>
    </Dialog>
  </>;
}