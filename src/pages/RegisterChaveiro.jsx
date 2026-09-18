import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StepProgress from "@/components/ui/StepProgress";
import PasswordInput from "@/components/ui/PasswordInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SpecialtiesSelector from "@/components/locksmith/SpecialtiesSelector";
import { Wrench, Mail, Loader2, User, Phone, CreditCard } from "lucide-react";
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

// Campos que recebem foco além do scroll.
const FOCUS_FIELDS = new Set(["fullName", "password", "confirmPassword", "vehicle"]);

export default function RegisterChaveiro() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [specialties, setSpecialties] = useState(["Residencial"]);
  const [vehicle, setVehicle] = useState("");
  const [bio, setBio] = useState("");
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
  const specialtiesRef = useRef(null);
  const vehicleRef = useRef(null);
  const cpfRef = useRef(null);
  const termsRef = useRef(null);

  const refMap = {
    fullName: fullNameRef,
    password: passwordRef,
    confirmPassword: confirmPasswordRef,
    specialties: specialtiesRef,
    vehicle: vehicleRef,
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
    if (specialties.length === 0) {
      setError("Escolha pelo menos uma especialidade");
      setFieldError("specialties");
      return;
    }
    if (!vehicle.trim()) {
      setError("Informe seu veículo (ex: Moto Honda Pop 110i)");
      setFieldError("vehicle");
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
      sessionStorage.setItem("chaveiro_onboarding", JSON.stringify({
        fullName, phone, cpf, specialty: specialties[0] || "Residencial", specialties, vehicle, bio,
      }));
      setShowOtp(true);
    } catch (err) {
      setError(registrationErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    markAuthProvider("google");
    base44.auth.loginWithProvider("google", "/google-complete?tipo=chaveiro");
  };

  const finishLocksmithRegistration = async () => {
    const raw = sessionStorage.getItem("chaveiro_onboarding");
    const data = raw ? JSON.parse(raw) : null;
    if (data) {
      await claimCpf(data.cpf);
      await base44.auth.updateMe({
        legal_name: data.fullName.trim(),
        phone: data.phone,
        account_type: "chaveiro",
        password_created: true,
        ...termsPayload(),
      });
    } else {
      await base44.auth.updateMe({
        account_type: "chaveiro",
        password_created: true,
        ...termsPayload(),
      });
    }
    localStorage.setItem("remember_login", "true");
    sessionStorage.setItem("active_login_session", "true");
    window.location.assign("/cadastro/recebimentos");
  };

  if (showOtp) return (
    <AuthLayout icon={Wrench} title="Confirme seu email" subtitle="Conclua a verificação para ativar seu cadastro">
      <StepProgress step={2} total={3} labels={{ 1: "Dados", 2: "Verificação", 3: "Recebimentos" }} />
      <InlineOtpInput key={email} email={email} onSuccess={finishLocksmithRegistration} />
      <Button type="button" variant="ghost" className="w-full mt-3" onClick={() => setShowOtp(false)}>Voltar e corrigir os dados</Button>
      <ExistingAccountNotice query={qs} />
    </AuthLayout>
  );

  return (
    <AuthLayout
      icon={Wrench}
      title="Cadastro de chaveiro"
      subtitle="Comece a receber solicitações de serviço"
      footer={
        <>
          Já tem conta?{" "}
          <Link to={"/login" + qs} className="text-primary font-medium hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <StepProgress step={1} total={3} labels={{ 1: "Dados", 2: "Verificação", 3: "Recebimentos" }} />
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

        <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-sm font-semibold text-foreground">Dados profissionais</p>
          <div ref={specialtiesRef}>
            <SpecialtiesSelector
              value={specialties}
              onChange={(v) => {
                setSpecialties(v);
                if (fieldError === "specialties") setFieldError("");
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicle">Veículo</Label>
            <Input
              ref={vehicleRef}
              id="vehicle"
              type="text"
              placeholder="Ex: Moto Honda Pop 110i"
              value={vehicle}
              onChange={(e) => {
                setVehicle(e.target.value);
                if (fieldError === "vehicle") setFieldError("");
              }}
              className={`h-12 ${fieldError === "vehicle" ? "border-destructive" : ""}`}
              aria-invalid={fieldError === "vehicle" || undefined}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Apresentação (opcional)</Label>
            <Textarea
              id="bio"
              placeholder="Conte um pouco sobre sua experiência..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
            />
          </div>
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
            accountType="chaveiro"
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
            "Criar conta de chaveiro"
          )}
        </Button>


      </form>

      <p className="text-center text-sm text-muted-foreground mt-4">
        É cliente?{" "}
        <Link to={"/cadastro/cliente" + qs} className="text-primary font-medium hover:underline">
          Cadastre-se como cliente
        </Link>
      </p>
    </AuthLayout>
  );
}