import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isFullName } from '@/lib/fullName';
import { onlyDigits } from '@/lib/cpf';
import { fetchMyLocksmith } from '@/lib/myLocksmith';

export default function AccountBasicsForm({ user, onSaved }) {
  const [name, setName] = useState(user.legal_name || user.full_name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [username, setUsername] = useState(user.username || '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { setName(user.legal_name || user.full_name || ''); setPhone(user.phone || ''); setUsername(user.username || ''); }, [user]);
  const save = async (event) => {
    event.preventDefault(); setMessage('');
    if (!isFullName(name)) return setMessage('Informe nome e sobrenome.');
    if (!/^\d{10,11}$/.test(onlyDigits(phone))) return setMessage('Informe um telefone válido com DDD.');
    setBusy(true);
    try {
      await base44.auth.updateMe({ legal_name: name.trim(), phone: phone.trim(), username: username.trim() });
      const fresh = await base44.auth.me(); onSaved(fresh);
      if (fresh.account_type === 'chaveiro') {
        const profile = await fetchMyLocksmith(fresh.id);
        if (profile) await base44.entities.Locksmith.update(profile.id, { phone: phone.trim() });
      }
      setMessage('Dados salvos.');
    } catch (error) { setMessage(`Não foi possível concluir: ${error?.message || 'tente novamente'}. Confira os dados exibidos antes de tentar de novo.`); }
    finally { setBusy(false); }
  };
  return <form onSubmit={save} className="rounded-xl border border-border bg-card p-4 space-y-3">
    <h2 className="font-heading font-semibold">Editar dados</h2>
    <div><Label htmlFor="legal-name">Nome completo</Label><Input id="legal-name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} required /></div>
    <div><Label htmlFor="user-phone">Telefone com DDD</Label><Input id="user-phone" type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} required /></div>
    <div><Label htmlFor="user-name">Nome de exibição</Label><Input id="user-name" value={username} onChange={e => setUsername(e.target.value)} maxLength={80} /></div>
    {message && <p role="status" className="text-sm text-foreground">{message}</p>}
    <Button type="submit" disabled={busy}>{busy ? 'Salvando...' : 'Salvar dados'}</Button>
  </form>;
}