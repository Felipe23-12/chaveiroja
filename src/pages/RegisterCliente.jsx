import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PasswordInput from "@/components/ui/PasswordInput";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Loader2, User, Phone, CreditCard } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { safeReturnTo } from "@/lib/authReturnTo";
import { markAuthProvider } from "@/lib/authProvider";
import InlineOtpInput from "@/components/auth/InlineOtpInput";
import { cpfError } from "@/lib/cpf";
import { claimCpf } from "@/lib/cpfRegistration";
import CpfInput from "@/components/auth/CpfInput";
import TermsAcceptance from "@/components/auth/TermsAcceptance";
import { termsPayload } from "@/lib/termsVersion";
import { registerEmailAccount, registrationErrorMessage } from "@/lib/emailRegistration";
import ExistingAccountNotice from "@/components/auth/ExistingAccountNotice";
import { isFullName } from "@/lib/fullName";

export default function RegisterCliente() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const returnTo = safeReturnTo();
  const qs = returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || showOtp) return;
    setError("");
    if (!isFullName(fullName)) {
      setError("Informe seu nome completo, com nome e sobrenome");
      return;
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
      setError("A senha deve ter no mínimo 8 caracteres, com letras e números");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }
    const cpfMsg = cpfError(cpf);
    if (cpfMsg) {
      setError(cpfMsg);
      return;
    }
    if (!acceptedTerms) {
      setError("É necessário aceitar as regras e os termos de uso para criar a conta");
      return;
    }
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await registerEmailAccount(normalizedEmail, password);
      setEmail(normalizedEmail);
      sessionStorage.setItem("cliente_onboarding", JSON.stringify({ fullName, phone, cpf }));
      setShowOtp(true);
    } catch (err) {
      setError(registrationErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const finishClientRegistration = async () => {
    await claimCpf(cpf);
    await base44.auth.updateMe({
      legal_name: fullName.trim(),
      phone,
      account_type: "cliente",
      password_created: true,
      ...termsPayload(),
    });
    localStorage.setItem("remember_login", "true");
    sessionStorage.setItem("active_login_session", "true");
    sessionStorage.removeItem("cliente_onboarding");
    window.location.assign(returnTo !== "/" ? returnTo : "/");
  };

  const handleGoogle = () => {
    markAuthProvider("google");
    base44.auth.loginWithProvider("google", "/google-complete?tipo=cliente");
  };

  if (showOtp) return (
    <AuthLayout icon={UserPlus} title="Confirme seu email" subtitle="Conclua a verificação para ativar seu cadastro">
      <InlineOtpInput key={email} email={email} onSuccess={finishClientRegistration} />
      <Button type="button" variant="ghost" className="w-full mt-3" onClick={() => setShowOtp(false)}>Voltar e corrigir os dados</Button>
      <ExistingAccountNotice query={qs} />
    </AuthLayout>
  );

  return (
    <AuthLayout
      icon={UserPlus}
      title="Cadastro de cliente"
      subtitle="Solicite serviços de chaveiro na hora"
      footer={
        <>
          Já tem conta?{" "}
          <Link to={"/login" + qs} className="text-primary font-medium hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <ExistingAccountNotice query={qs} />
      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6"
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continuar com Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">ou</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome completo</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="name"
              type="text"
              autoComplete="name"
              autoFocus
              placeholder="Seu nome"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="pl-10 h-12"
              required
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

        <CpfInput value={cpf} onChange={setCpf} email={email} />

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="voce@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar senha</Label>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <TermsAcceptance accountType="cliente" checked={acceptedTerms} onChange={setAcceptedTerms} />

        <Button type="submit" className="w-full h-12 font-medium" disabled={loading || !acceptedTerms}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Criando conta...
            </>
          ) : (
            "Criar conta"
          )}
        </Button>


      </form>

      <p className="text-center text-sm text-muted-foreground mt-4">
        É chaveiro?{" "}
        <Link to={"/cadastro/chaveiro" + qs} className="text-primary font-medium hover:underline">
          Cadastre-se como profissional
        </Link>
      </p>
    </AuthLayout>
  );
}