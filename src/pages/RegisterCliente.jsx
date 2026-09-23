import React, { useState, useRef, useEffect } from "react";
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
import { markAuthProvider, isGoogleAuthSession } from "@/lib/authProvider";
import useGoogleLoginReturn from '@/components/auth/useGoogleLoginReturn';
import InlineOtpInput from "@/components/auth/InlineOtpInput";
import { cpfError } from "@/lib/cpf";
import { claimCpf } from "@/lib/cpfRegistration";
import CpfInput from "@/components/auth/CpfInput";
import TermsAcceptance from "@/components/auth/TermsAcceptance";
import { termsPayload } from "@/lib/termsVersion";
import { registerEmailAccount, registrationErrorMessage } from "@/lib/emailRegistration";
import ExistingAccountNotice from "@/components/auth/ExistingAccountNotice";
import { isFullName } from "@/lib/fullName";

// Campos que recebem foco além do scroll.
const FOCUS_FIELDS = new Set(["fullName", "password", "confirmPassword"]);

export default function RegisterCliente() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const fullNameRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const cpfRef = useRef(null);
  const termsRef = useRef(null);

  const refMap = {
    fullName: fullNameRef,
    password: passwordRef,
    confirmPassword: confirmPasswordRef,
    cpf: cpfRef,
    terms: termsRef,
  };

  useEffect(() => {
    if (!fieldError) return;
    const ref = refMap[fieldError];
    if (!ref?.current) return;
    ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    if (FOCUS_FIELDS.has(fieldError)) ref.current.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldError]);

  const returnTo = safeReturnTo();
  const qs = returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "";
  useGoogleLoginReturn(returnTo, !showOtp && isGoogleAuthSession());

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || showOtp) return;
    setError("");
    setFieldError("");
    if (!isFullName(fullName)) {
      setError("Informe seu nome completo, com nome e sobrenome");
      setFieldError("fullName");
      return;
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
      setError("A senha deve ter no mínimo 8 caracteres, com letras e números");
      setFieldError("password");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      setFieldError("confirmPassword");
      return;
    }
    const cpfMsg = cpfError(cpf);
    if (cpfMsg) {
      setError(cpfMsg);
      setFieldError("cpf");
      return;
    }
    if (!acceptedTerms) {
      setError("É necessário aceitar as regras e os termos de uso para criar a conta");
      setFieldError("terms");
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
    markAuthProvider('password');
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

  const handleGoogle = async () => {
    if (loading) return;
    setLoading(true); setError('');
    try {
      markAuthProvider('google');
      localStorage.setItem('remember_login', 'true');
      sessionStorage.setItem('active_login_session', 'true');
      // O retorno precisa chegar à tela que recupera a sessão antes da rota protegida.
      await base44.auth.loginWithProvider('google', `/login?returnTo=${encodeURIComponent(returnTo)}`);
    } catch (err) { setError(err.message || 'Não foi possível entrar com Google.'); }
    finally { setLoading(false); }
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
        disabled={loading}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Entrar diretamente com Google
      </Button>
      <p className="mb-4 text-xs text-muted-foreground">Você pode explorar o aplicativo agora e completar CPF, telefone, confirmação de email e senha antes do primeiro chamado.</p>

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
              ref={fullNameRef}
              id="name"
              type="text"
              autoComplete="name"
              autoFocus
              placeholder="Seu nome"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (fieldError === "fullName") setFieldError("");
              }}
              className={`pl-10 h-12 ${fieldError === "fullName" ? "border-destructive" : ""}`}
              aria-invalid={fieldError === "fullName" || undefined}
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

        <div ref={cpfRef}>
          <CpfInput
            value={cpf}
            onChange={(v) => {
              setCpf(v);
              if (fieldError === "cpf") setFieldError("");
            }}
            email={email}
          />
        </div>

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
            ref={passwordRef}
            id="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldError === "password") setFieldError("");
            }}
            className={fieldError === "password" ? "border-destructive" : ""}
            aria-invalid={fieldError === "password" || undefined}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar senha</Label>
          <PasswordInput
            ref={confirmPasswordRef}
            id="confirm"
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (fieldError === "confirmPassword") setFieldError("");
            }}
            className={fieldError === "confirmPassword" ? "border-destructive" : ""}
            aria-invalid={fieldError === "confirmPassword" || undefined}
            required
          />
        </div>

        <div ref={termsRef}>
          <TermsAcceptance
            accountType="cliente"
            checked={acceptedTerms}
            onChange={(v) => {
              setAcceptedTerms(v);
              if (fieldError === "terms") setFieldError("");
            }}
          />
        </div>

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