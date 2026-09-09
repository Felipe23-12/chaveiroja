import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { safeReturnTo } from "@/lib/authReturnTo";
import { markAuthProvider } from "@/lib/authProvider";
import { requiresEmailVerification } from "@/lib/emailRegistration";
import InlineOtpInput from "@/components/auth/InlineOtpInput";
import useGoogleLoginReturn from "@/components/auth/useGoogleLoginReturn";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [verificationEmail, setVerificationEmail] = useState("");
  const returnTo = safeReturnTo();
  useGoogleLoginReturn(returnTo);

  const completeLogin = async (passwordAuthenticated = false) => {
    let me = await base44.auth.me();
    // Só uma entrada com senha bem-sucedida comprova que a senha existe.
    if (passwordAuthenticated && me.password_created !== true) {
      me = await base44.auth.updateMe({ password_created: true });
    }
    const dest = returnTo !== "/" ? returnTo : me.role === "admin" ? "/painel-admin" : me.account_type === "chaveiro" ? "/painel-chaveiro" : "/";
    localStorage.setItem("remember_login", String(rememberMe));
    sessionStorage.setItem("active_login_session", "true");
    window.location.href = dest;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      await base44.auth.loginViaEmailPassword(normalizedEmail, password);
      markAuthProvider("password");
      await completeLogin(true);
    } catch (err) {
      if (requiresEmailVerification(err)) setVerificationEmail(normalizedEmail);
      else setError(err.message || "Email ou senha inválidos. Use Esqueceu a senha? para recuperar o acesso.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      markAuthProvider("google");
      localStorage.setItem("remember_login", String(rememberMe));
      sessionStorage.setItem("active_login_session", "true");
      await base44.auth.loginWithProvider("google", returnTo);
    } catch (err) {
      setError(err.message || "Não foi possível entrar com Google. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (verificationEmail) return (
    <AuthLayout icon={Mail} title="Verificação pendente" subtitle="Esta conta ainda precisa confirmar o email">
      <p className="mb-4 text-sm text-muted-foreground">Não é necessário cadastrar novamente. Se não tiver um código, toque em Reenviar código.</p>
      <InlineOtpInput key={verificationEmail} email={verificationEmail} onSuccess={() => completeLogin(false)} />
      <Button type="button" variant="ghost" className="w-full mt-3" onClick={() => setVerificationEmail("")}>Voltar para entrar</Button>
    </AuthLayout>
  );

  return (
    <AuthLayout
      icon={LogIn}
      title="Bem-vindo de volta"
      subtitle="Acesse sua conta"
      footer={
        <>
          Não tem uma conta?{" "}
          <Link
            to={"/register" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "")}
            className="text-primary font-medium hover:underline"
          >
            Criar conta
          </Link>
        </>
      }
    >
      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6"
        onClick={handleGoogle}
        disabled={loading}
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
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              autoFocus
              placeholder="voce@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Esqueceu a senha?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <Checkbox checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked === true)} />
          Manter conectado neste aparelho
        </label>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Entrando...
            </>
          ) : (
            "Entrar"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}