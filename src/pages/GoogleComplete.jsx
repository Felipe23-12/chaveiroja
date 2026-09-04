import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User, UserPlus, Wrench, Phone, CreditCard, AtSign } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { cpfError, onlyDigits, formatCpf } from "@/lib/cpf";

export default function GoogleComplete() {
  const [searchParams] = useSearchParams();
  const tipo = searchParams.get("tipo") === "chaveiro" ? "chaveiro" : "cliente";
  const dest = tipo === "chaveiro" ? "/painel-chaveiro" : "/";

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const me = await base44.auth.me();
        if (me?.full_name) setFullName(me.full_name);
        if (me?.username) setUsername(me.username);
        if (me?.phone) setPhone(me.phone);
        if (me?.cpf) setCpf(me.cpf);
      } catch (e) {
        /* ignora — segue com o formulário em branco */
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) {
      setError("Informe seu nome completo");
      return;
    }
    if (!username.trim()) {
      setError("Crie um nome de usuário");
      return;
    }
    if (onlyDigits(phone).length < 10) {
      setError("Informe um telefone válido com DDD");
      return;
    }
    const cpfDigits = onlyDigits(cpf);
    const cpfMsg = cpfError(cpf);
    if (cpfMsg) {
      setError(cpfMsg);
      return;
    }
    setSaving(true);
    try {
      await base44.auth.updateMe({
        full_name: fullName.trim(),
        username: username.trim(),
        phone: phone.trim(),
        cpf: cpfDigits,
        account_type: tipo,
      });
      window.location.assign(dest);
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
              placeholder="Seu nome completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Nome de usuário</Label>
          <div className="relative">
            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="username"
              type="text"
              placeholder="Como você quer ser chamado"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>

        <Button type="submit" className="w-full h-12 font-medium" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar e continuar"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}