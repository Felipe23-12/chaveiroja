import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import PasswordInput from '@/components/ui/PasswordInput';
import { Label } from '@/components/ui/label';

export default function AccountPasswordForm({ user }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const save = async (event) => {
    event.preventDefault(); setMessage('');
    if (!current) return setMessage('Informe a senha atual.');
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) return setMessage('Use pelo menos 8 caracteres, com letras e números.');
    if (next !== confirm) return setMessage('As senhas não coincidem.');
    setBusy(true);
    try {
      await base44.auth.changePassword({ userId: user.id, currentPassword: current, newPassword: next });
      setCurrent(''); setNext(''); setConfirm(''); setMessage('Senha alterada.');
    } catch (error) { setMessage(error?.message || 'Não foi possível alterar a senha.'); }
    finally { setBusy(false); }
  };
  return <form onSubmit={save} className="rounded-xl border border-border bg-card p-4 space-y-3">
    <h2 className="font-heading font-semibold">Trocar senha</h2>
    <div><Label htmlFor="current-pass">Senha atual</Label><PasswordInput id="current-pass" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} required /></div>
    <div><Label htmlFor="new-pass">Nova senha</Label><PasswordInput id="new-pass" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} required /></div>
    <div><Label htmlFor="confirm-pass">Confirmar nova senha</Label><PasswordInput id="confirm-pass" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required /></div>
    <Link to="/forgot-password" className="text-sm font-medium underline text-foreground">Esqueci minha senha</Link>
    {message && <p role="status" className="text-sm text-foreground">{message}</p>}
    <div><Button type="submit" disabled={busy}>{busy ? 'Alterando...' : 'Alterar senha'}</Button></div>
  </form>;
}