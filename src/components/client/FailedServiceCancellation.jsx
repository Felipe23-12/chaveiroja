import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import PhotoUploader from '@/components/locksmith/PhotoUploader';

export default function FailedServiceCancellation({ request, open, onClose, onRegularCancel, onSuccess }) {
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!open || !request?.client_arrived_confirmed || !request.locksmith_arrived || !['accepted', 'on_the_way'].includes(request.status)) return null;
  const submit = async () => {
    if (!photos.length || busy) return;
    setBusy(true); setError('');
    try {
      const { data } = await base44.functions.invoke('serviceTrust', { action: 'cancel_failed_service', request_id: request.id, photos });
      setPhotos([]); onSuccess(data.request);
    } catch (e) { setError(e?.response?.data?.error || e.message || 'Não foi possível enviar as fotos.'); }
    finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-[85] overflow-y-auto bg-background/95 p-4 pt-safe pb-safe" role="dialog" aria-modal="true" aria-label="Cancelar serviço">
    <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-border bg-card p-5 shadow-lg">
      <h2 className="font-heading text-lg font-semibold">Cancelar serviço</h2>
      <p className="text-sm text-muted-foreground">Se o chaveiro chegou, mas o serviço não deu certo, envie fotos do problema para registrar o cancelamento sem taxa.</p>
      <PhotoUploader label="Fotos do serviço que não deu certo (obrigatórias, até 5)" photos={photos} onChange={next => setPhotos(next.slice(0, 5))} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" disabled={busy || !photos.length} onClick={submit}>{busy ? 'Enviando fotos…' : 'Serviço não deu certo · cancelar sem taxa'}</Button>
      <Button className="w-full" variant="outline" disabled={busy} onClick={() => { onClose(); onRegularCancel(); }}>Outro motivo · ver taxa normal</Button>
      <Button className="w-full" variant="ghost" disabled={busy} onClick={onClose}>Voltar ao atendimento</Button>
    </div>
  </div>;
}