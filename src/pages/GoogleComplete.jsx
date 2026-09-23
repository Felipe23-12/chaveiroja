import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User, UserPlus, Wrench, Phone, AtSign, ArrowLeft } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { cpfError, onlyDigits, isValidCpf } from "@/lib/cpf";
import { claimCpf } from "@/lib/cpfRegistration";
import CpfInput from "@/components/auth/CpfInput";
import TermsAcceptance from "@/components/auth/TermsAcceptance";
import { termsPayload } from "@/lib/termsVersion";
import { isFullName } from "@/lib/fullName";
import { safeReturnTo } from '@/lib/authReturnTo';
import CompletionSecurity from '@/components/auth/CompletionSecurity';

export default function GoogleComplete() {
  const [searchParams] = useSearchParams();
  const [tipo, setTipo] = useState(searchParams.get("tipo") === "chaveiro" ? "chaveiro" : "cliente");
  const returnTo = safeReturnTo();
  const dest = tipo === 'chaveiro' ? '/painel-chaveiro' : returnTo;
  const [account, setAccount] = useState(null);
  const [securityStep, setSecurityStep] = useState(false);
  const completionUrl = `/google-complete?tipo=${tipo}&returnTo=${encodeURIComponent(returnTo)}`;

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const leaveRegistration = (useGoogle = false) => {
    if (saving || leaving) return;
    setLeaving(true);
    localStorage.removeItem("remember_login");
    sessionStorage.removeItem("active_login_session");
    const returnTo = `/google-complete?tipo=${tipo}`;
    const loginUrl = useGoogle
      ? `/login?provider=google&returnTo=${encodeURIComponent(returnTo)}`
      : tipo === 'chaveiro' ? '/login?tipo=chaveiro' : '/login';
    base44.auth.logout(loginUrl);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const me = await base44.auth.me();
        setAccount(me);
        setTipo(me.account_type === 'chaveiro' ? 'chaveiro' : 'cliente');
        setAcceptedTerms(Boolean(me.terms_accepted_at));
        const profileReady = isValidCpf(me.cpf) && /^\d{10,11}$/.test(onlyDigits(me.phone)) && isFullName(me.legal_name || me.full_name) && me.terms_accepted_at;
        if (profileReady && me.password_created === true && me.is_verified === true) {
          window.location.assign(me.role === 'admin' ? '/painel-admin' : me.account_type === 'chaveiro' ? '/painel-chaveiro' : returnTo);
          return;
        }
        if (profileReady) setSecurityStep(true);
        if (me?.legal_name || me?.full_name) setFullName(me.legal_name || me.full_name);
        if (me?.username) setUsername(me.username);
        if (me?.phone) setPhone(me.phone);
        if (me?.cpf) setCpf(me.cpf);
        if (me?.email) setEmail(me.email);
      } catch (e) {
        window.location.assign(`/login?returnTo=${encodeURIComponent(completionUrl)}`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!isFullName(fullName)) {
      setError("Informe seu nome completo, com nome e sobrenome");
      return;
    }
    if (tipo === 'chaveiro' && !username.trim()) {
      setError("Crie um nome de usuário");
      return;
    }
    if (!/^\d{10,11}$/.test(onlyDigits(phone))) {
      setError("Informe um telefone válido com DDD");
      return;
    }
    const cpfDigits = onlyDigits(cpf);
    const cpfMsg = cpfError(cpf);
    if (cpfMsg) {
      setError(cpfMsg);
      return;
    }
    if (!acceptedTerms) {
      setError("É necessário aceitar as regras e os termos de uso para validar o cadastro");
      return;
    }
    setSaving(true);
    try {
      await claimCpf(cpfDigits);
      await base44.auth.updateMe({
        legal_name: fullName.trim(),
        username: username.trim(),
        phone: phone.trim(),
        account_type: tipo,
        ...termsPayload(),
      });
      const fresh = await base44.auth.me();
      setAccount(fresh);
      if (fresh.password_created !== true || fresh.is_verified !== true) {
        setSecurityStep(true); setSaving(false); return;
      }
      window.location.assign(tipo === 'chaveiro' ? '/cadastro/recebimentos' : dest);
    } catch (err) {
      setError(String(err?.message || "Não foi possível salvar. Tente novamente."));
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <AuthLayout
      icon={tipo === "chaveiro" ? Wrench : UserPlus}
      title="Complete seu cadastro"
      subtitle={tipo === "chaveiro" ? "Finalize seu perfil de chaveiro" : "Finalize seu perfil de cliente"}
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      {securityStep && account ? <CompletionSecurity user={account} returnTo={completionUrl} onVerified={() => { window.location.href = completionUrl; }} /> : <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome completo</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="name"
              type="text"
              autoComplete="name"
              autoFocus
              placeholder="Seu nome completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Nome de usuário{tipo === 'cliente' ? ' (opcional)' : ''}</Label>
          <div className="relative">
            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="username"
              type="text"
              placeholder="Como você quer ser chamado"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="pl-10 h-12"
              required={tipo === 'chaveiro'}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>

        <div className="space-y-2"><Label htmlFor="account-email">Email da conta</Label><Input id="account-email" type="email" value={email} readOnly /><p className="text-xs text-muted-foreground">{account?.is_verified === true ? 'Email confirmado na autenticação.' : 'Você precisará confirmar este email na próxima etapa.'}</p></div>
        <CpfInput value={cpf} onChange={setCpf} email={email} />

        <TermsAcceptance accountType={tipo} checked={acceptedTerms} onChange={setAcceptedTerms} />

        <Button type="submit" className="w-full h-12 font-medium" disabled={saving || leaving || !acceptedTerms}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar e continuar"
          )}
        </Button>
      </form>}

      <div className="mt-6 pt-5 border-t border-border space-y-3">
        <p className="text-center text-sm text-muted-foreground">Não consegue finalizar agora?</p>
        {tipo === 'cliente' && !securityStep && <Button asChild variant="outline" className="w-full h-12"><Link to="/">Voltar ao app sem concluir cadastro</Link></Button>}
        {tipo === 'cliente' && <Button type="button" variant="outline" className="w-full h-12" disabled={saving || leaving} onClick={() => leaveRegistration(true)}>
          {leaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <GoogleIcon className="w-5 h-5 mr-2" />}
          Tentar com outra conta Google
        </Button>}
        <Button type="button" variant="ghost" className="w-full h-12" disabled={saving || leaving} onClick={() => leaveRegistration(false)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para email e senha
        </Button>
      </div>
    </AuthLayout>
  );
}