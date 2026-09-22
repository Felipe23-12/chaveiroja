import React, { useState } from 'react';
import AddressAutocomplete from '@/components/locksmith/AddressAutocomplete';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { REPAIR_PARTS } from '@/lib/quoteMode';

export default function QuoteRequestForm({ onSubmit, remaining, busy }) {
  const [service_type, setType] = useState('Confecção de Chave de Carro');
  const [repair_part, setPart] = useState('ignicao');
  const [vehicle_info, setVehicle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [point, setPoint] = useState(null);
  const submit = async e => {
    e.preventDefault();
    if (!point || point.address !== address) return;
    const saved = await onSubmit({ service_type, repair_part: service_type === 'Reparo de Fechadura Automotiva' ? repair_part : undefined, vehicle_info, description, address, customer_lat: point.lat, customer_lng: point.lng });
    if (saved) { setAddress(''); setPoint(null); setDescription(''); setVehicle(''); }
  };
  return <form onSubmit={submit} className="space-y-3 rounded-xl border border-border bg-card p-4">
    <h2 className="font-heading font-semibold">Pedir orçamento ({remaining} de 3 restantes hoje)</h2>
    <label className="block text-sm">Serviço<select value={service_type} onChange={e => setType(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background p-2"><option>Confecção de Chave de Carro</option><option>Reparo de Fechadura Automotiva</option></select></label>
    {service_type === 'Reparo de Fechadura Automotiva' && <label className="block text-sm">Local do reparo<select value={repair_part} onChange={e => setPart(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background p-2">{REPAIR_PARTS.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>}
    <label className="block text-sm">Veículo (marca, modelo e ano)<Input required maxLength={160} value={vehicle_info} onChange={e => setVehicle(e.target.value)} placeholder="Ex.: Volkswagen Gol 2020" /></label>
    <label className="block text-sm">Endereço do atendimento<AddressAutocomplete value={address} onChange={value => { setAddress(value); setPoint(null); }} onSelect={place => { setAddress(place.address); setPoint(place); }} allowCurrentLocation /></label>
    <label className="block text-sm">Descreva o problema<textarea required minLength={8} maxLength={1000} value={description} onChange={e => setDescription(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background p-2" /></label>
    {!point && address && <p className="text-xs text-warning">Selecione um endereço nas sugestões para confirmar a localização.</p>}
    <Button type="submit" disabled={busy || remaining === 0 || !point || address !== point.address} className="w-full">{busy ? 'Enviando…' : 'Solicitar orçamento'}</Button>
  </form>;
}