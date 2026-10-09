import React, { useState } from 'react';
import { SERVICE_CATALOG } from '@/lib/pricing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import NativeSelectDrawer from '@/components/ui/NativeSelectDrawer';
export default function ReviewRequestForm({ busy, onSubmit }) {
  const [service, setService] = useState('Abertura Residencial');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  return <form className="space-y-4 rounded-xl border border-border bg-card p-4" onSubmit={event => { event.preventDefault(); onSubmit({ service_type: service, address, description }); }}>
    <h2 className="text-lg font-semibold">Qual serviço você precisa?</h2>
    <NativeSelectDrawer label="Serviço" value={service} onChange={setService} options={SERVICE_CATALOG.map(s => ({ value: s.label, label: s.label }))} />
    <label className="block space-y-1 text-sm">Endereço do atendimento<Input required maxLength={300} value={address} onChange={event => setAddress(event.target.value)} placeholder="Digite qualquer endereço, inclusive nos EUA" /></label>
    <label className="block space-y-1 text-sm">Descrição<Textarea maxLength={1000} value={description} onChange={event => setDescription(event.target.value)} /></label>
    <p className="text-sm text-muted-foreground">Total simulado: R$ 0,00. Somente o chaveiro de revisão receberá este pedido.</p>
    <Button className="w-full" type="submit" disabled={busy || !address.trim()}>{busy ? 'Solicitando...' : 'Solicitar chaveiro'}</Button>
  </form>;
}