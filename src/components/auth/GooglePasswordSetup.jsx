import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function GooglePasswordSetup({ onComplete }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const sendResetLink = async () => {
    setError("");
    setSaving(true);
    try {
      const user = await base44.auth.me();
      await base44.auth.resetPasswordRequest(user.email);
      setEmailSent(true);
    } catch (err) {
      setError(err?.message || "Não foi possível enviar o link.");
    } finally {
      setSaving(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    const valid = password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
    if (!valid) return setError("Use no mínimo 8 caracteres, com letras e números.");
    if (password !== confirmation) return setError("As senhas não coincidem.");
    setSaving(true);
    try {
      const user = await base44.auth.me();
      await base44.auth.changePassword({ userId: user.id, currentPassword, newPassword: password });
      await base44.auth.updateMe({ password_created: true });
      localStorage.setItem("remember_login", String(rememberMe));
      sessionStorage.setItem("active_login_session", "true");
      onComplete();
    } catch (err) {
      setError(err?.message || "Não foi possível criar a senha.");
    } finally {
      setSaving(false);
    }
  };

  if (emailSent) return <div className="space-y-4 text-center"><p className="rounded-lg bg-primary/10 p-4 text-sm text-foreground">Enviamos um link para seu e-mail. Abra o link, crie a senha e depois entre no aplicativo usando seu e-mail e a nova senha.</p><Link to="/login" className="text-sm font-medium text-primary hover:underline">Ir para a tela de entrada</Link></div>;

  return <form onSubmit={submit} className="space-y-4">
    {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    <div className="space-y-2">
      <div className="flex items-center justify-between"><Label htmlFor="current-password">Senha atual, se já tiver</Label><Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">Esqueci minha senha</Link></div>
      <Input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
    </div>
    <div className="space-y-2"><Label htmlFor="google-password">Nova senha</Label><Input id="google-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
    <div className="space-y-2"><Label htmlFor="google-confirmation">Confirmar senha</Label><Input id="google-confirmation" type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required /></div>
    <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres, contendo letras e números.</p>
    <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
      <Checkbox checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked === true)} />
      Manter conectado neste aparelho
    </label>
    <Button type="submit" className="w-full h-12" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}Criar senha e continuar</Button>
    <Button type="button" variant="outline" className="w-full h-12" disabled={saving} onClick={sendResetLink}>Não tenho senha — enviar link por e-mail</Button>
  </form>;
}