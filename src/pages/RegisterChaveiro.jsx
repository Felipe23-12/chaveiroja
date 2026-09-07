import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SpecialtiesSelector from "@/components/locksmith/SpecialtiesSelector";
import { Wrench, Mail, Lock, Loader2, User, Phone, CreditCard } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { safeReturnTo } from "@/lib/authReturnTo";
import InlineOtpInput from "@/components/auth/InlineOtpInput";
import { cpfError } from "@/lib/cpf";
import { claimCpf } from "@/lib/cpfRegistration";
import CpfInput from "@/components/auth/CpfInput";
import TermsAcceptance from "@/components/auth/TermsAcceptance";
import { termsPayload } from "@/lib/termsVersion";

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
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
      setError("A senha deve ter no mínimo 8 caracteres, com letras e números");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }
    if (specialties.length === 0) {
      setError("Escolha pelo menos uma especialidade");
      return;
    }
    if (!vehicle.trim()) {
      setError("Informe seu veículo (ex: Moto Honda Pop 110i)");
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

      sessionStorage.setItem("chaveiro_onboarding", JSON.stringify({
        fullName, phone, cpf, specialty: specialties[0] || "Residencial", specialties, vehicle, bio,
      }));

      // O cadastro por email do Base44 envia um código OTP. Mostramos a etapa
      // de confirmação imediatamente, em vez de tentar fazer login antes da
      // verificação e deixar o usuário sem onde informar o código.
      if (registration?.access_token) {
        base44.auth.setToken(registration.access_token);
        await claimCpf(cpf);
        await base44.auth.updateMe({
          phone,
          full_name: fullName,
          account_type: "chaveiro",
          password_created: true,
          ...termsPayload(),
        });
        window.location.assign("/cadastro/recebimentos");
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

  const handleGoogle = () =>
    base44.auth.loginWithProvider("google", "/google-complete?tipo=chaveiro");

  const finishLocksmithRegistration = async () => {
    const raw = sessionStorage.getItem("chaveiro_onboarding");
    const data = raw ? JSON.parse(raw) : null;
    if (data) {
      await claimCpf(data.cpf);
      await base44.auth.updateMe({
        phone: data.phone,
        full_name: data.fullName,
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
    window.location.assign("/cadastro/recebimentos");
  };

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

        <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-sm font-semibold text-foreground">Dados profissionais</p>
          <SpecialtiesSelector value={specialties} onChange={setSpecialties} />
          <div className="space-y-2">
            <Label htmlFor="vehicle">Veículo</Label>
            <Input
              id="vehicle"
              type="text"
              placeholder="Ex: Moto Honda Pop 110i"
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              className="h-12"
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

        <TermsAcceptance accountType="chaveiro" checked={acceptedTerms} onChange={setAcceptedTerms} />

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

        {showOtp && (
          <InlineOtpInput email={email} onSuccess={finishLocksmithRegistration} />
        )}
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