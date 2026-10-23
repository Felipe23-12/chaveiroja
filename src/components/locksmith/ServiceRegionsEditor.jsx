import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import ServiceRegionsField from '@/components/locksmith/ServiceRegionsField';

export default function ServiceRegionsEditor({ locksmith, onSave }) {
  const [value, setValue] = useState(locksmith.service_regions || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => { setValue(locksmith.service_regions || ''); }, [locksmith.id, locksmith.service_regions]);
  const submit = async e => {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    try {
      await onSave({ service_regions: value.trim() });
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Não foi possível salvar as regiões. Tente novamente.');
    } finally { setSaving(false); }
  };
  return <form onSubmit={submit} className="space-y-3 rounded-xl border border-border bg-card p-4">
    <ServiceRegionsField value={value} onChange={next => { setValue(next); setSaved(false); }} disabled={saving} />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {saved && <p role="status" className="text-sm text-success">Regiões salvas.</p>}
    <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar regiões'}</Button>
  </form>;
}