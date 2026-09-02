import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wrench, Mail, Lock, Loader2, User, Phone, CreditCard } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function RegisterChaveiro() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [specialty, setSpecialty] = useState("Residencial");
  const [vehicle, setVehicle] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    if (!vehicle.trim()) {
      setError("Informe seu veículo (ex: Moto Honda Pop 110i)");
      return;
    }
    const cpfDigits = cpf.replace(/\D/g, "");
    if (cpfDigits.length !== 11) {
      setError("Informe um CPF válido (11 dígitos)");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      // Confirmação por email removida — os códigos não estavam chegando.
      // Salva os dados do cadastro para criar o perfil após o login automático.
      sessionStorage.setItem("chaveiro_onboarding", JSON.stringify({
        fullName, phone, cpf, specialty, vehicle, bio,
      }));
      const dest = returnTo !== "/" ? returnTo : "/painel-chaveiro";
      window.history.replaceState({}, "", `${window.location.pathname}?returnTo=${encodeURIComponent(dest)}`);
      await base44.auth.loginViaEmailPassword(email, password);
    } catch (err) {
      setError(err.message || "Falha no cadastro");
      setLoading(false);
    }
  };

  const handleGoogle = () => base44.auth.loginWithProvider("google", returnTo);

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

        <div className="space-y-2">
          <Label htmlFor="cpf">CPF</Label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="cpf"
              type="text"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-sm font-semibold text-foreground">Dados profissionais</p>
          <div className="space-y-2">
            <Label htmlFor="specialty">Especialidade</Label>
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger id="specialty" className="h-12">
                <SelectValue placeholder="Escolha sua especialidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Residencial">Residencial</SelectItem>
                <SelectItem value="Automotivo">Automotivo</SelectItem>
                <SelectItem value="Comercial">Comercial</SelectItem>
                <SelectItem value="Emergencial">Emergencial</SelectItem>
              </SelectContent>
            </Select>
          </div>
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

        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
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