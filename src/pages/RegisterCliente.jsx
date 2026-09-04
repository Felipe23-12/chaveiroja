import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2, User, Phone, CreditCard } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { safeReturnTo } from "@/lib/authReturnTo";
import InlineOtpInput from "@/components/auth/InlineOtpInput";
import { cpfError } from "@/lib/cpf";
import CpfInput from "@/components/auth/CpfInput";
import TermsAcceptance from "@/components/auth/TermsAcceptance";

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
    setError("");
    if (!fullName.trim()) {
      setError("Informe seu nome");
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
      const registration = await base44.auth.register({ email, password });

      sessionStorage.setItem("cliente_onboarding", JSON.stringify({
        fullName, phone, cpf,
      }));

      if (registration?.access_token) {
        base44.auth.setToken(registration.access_token);
        await finishClientRegistration();
      } else {
        setShowOtp(true);
      }
    } catch (err) {
      const message = String(err?.message || "");
      const requiresVerification = /verif|confirm|otp|c[oó]digo|email/i.test(message);

      if (requiresVerification) {
        setShowOtp(true);
      } else {
        setError(message || "Falha no cadastro");
        setLoading(false);
      }
    }
  };

  const finishClientRegistration = async () => {
    try {
      await base44.auth.updateMe({
        phone,
        cpf,
        account_type: "cliente",
        terms_accepted_at: new Date().toISOString(),
      });
    } catch (e) {
      /* não bloqueia o cadastro se um campo opcional não puder ser salvo */
    }
    try {
      await base44.auth.updateMe({ full_name: fullName });
    } catch (e) {
      /* ignora se a plataforma não permitir editar este campo */
    }
    window.location.assign(returnTo !== "/" ? returnTo : "/");
  };

  const handleGoogle = () =>
    base44.auth.loginWithProvider("google", "/google-complete?tipo=cliente");

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

        <CpfInput value={cpf} onChange={setCpf} />

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
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
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

        {showOtp && (
          <InlineOtpInput email={email} onSuccess={finishClientRegistration} />
        )}
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