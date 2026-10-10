import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, Mail } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function InlineOtpInput({ email, onSuccess }) {
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [checking, setChecking] = useState(true);
  const complete = useRef(onSuccess);
  complete.current = onSuccess;

  useEffect(() => {
    let active = true;
    const check = async () => {
      // Only the authenticated owner of this email may skip an already
      // completed verification. Never infer confirmation from admin approval.
      const user = await base44.auth.me().catch(() => null);
      if (!active) return;
      if (user?.is_verified === true && user.email?.trim().toLowerCase() === email.trim().toLowerCase()) {
        setVerified(true); setLoading(true);
        try { await complete.current(); }
        catch (err) { if (active) setError(err.message || 'Email confirmado. Não foi possível concluir o cadastro.'); }
        finally { if (active) setLoading(false); }
      }
      if (active) setChecking(false);
    };
    check();
    return () => { active = false; };
  }, [email]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerify = async () => {
    if (checking || loading || resending) return;
    if (!verified && otpCode.length < 6) {
      setError("Digite o código completo de 6 dígitos.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      if (!verified) {
        const result = await base44.auth.verifyOtp({ email, otpCode });
        if (!result?.access_token) throw new Error('Não foi possível confirmar o acesso. Tente novamente.');
        base44.auth.setToken(result.access_token);
        setVerified(true);
      }
      await onSuccess();
    } catch (err) {
      setError(err.message || "Código inválido");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (checking || resendCooldown > 0 || resending || loading || verified) return;
    setError("");
    setResending(true);
    try {
      await base44.auth.resendOtp(email);
      setOtpCode("");
      setResendCooldown(60);
      toast({ title: "Código reenviado", description: "Verifique sua caixa de entrada e a pasta de spam." });
    } catch (err) {
      setError(err.message || "Falha ao reenviar o código");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
          <Mail className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{checking ? 'Verificando confirmação...' : verified ? 'Email já confirmado' : 'Confirme seu email'}</p>
          <p className="text-xs text-muted-foreground">{verified ? 'Não é necessário confirmar novamente.' : `Digite o código de 6 dígitos para ${email}`}</p>
        </div>
      </div>

      {error && (
        <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
          {error}
        </div>
      )}

      {!verified && !checking && <div className="flex justify-center">
        <InputOTP
          maxLength={6}
          value={otpCode}
          onChange={setOtpCode}
          autoFocus
          autoComplete="one-time-code"
        >
          <InputOTPGroup className="gap-1.5">
            <InputOTPSlot index={0} className="w-10 h-11 text-base rounded-md" />
            <InputOTPSlot index={1} className="w-10 h-11 text-base rounded-md" />
            <InputOTPSlot index={2} className="w-10 h-11 text-base rounded-md" />
            <InputOTPSlot index={3} className="w-10 h-11 text-base rounded-md" />
            <InputOTPSlot index={4} className="w-10 h-11 text-base rounded-md" />
            <InputOTPSlot index={5} className="w-10 h-11 text-base rounded-md" />
          </InputOTPGroup>
        </InputOTP>
      </div>}

      <Button
        type="button"
        className="w-full h-11 font-medium"
        onClick={handleVerify}
        disabled={checking || loading || resending || (!verified && otpCode.length < 6)}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verificando...
          </>
        ) : (
          verified ? "Tentar concluir cadastro novamente" : "Confirmar email"
        )}
      </Button>

      {!verified && !checking && <p className="text-xs text-muted-foreground">Não recebeu? Confira o endereço, aguarde alguns minutos e verifique o spam. Se o reenvio também não chegar, contate o suporte da Base44.</p>}
      {!verified && !checking && <div className="text-center">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || loading || verified || resendCooldown > 0}
          className="text-sm text-primary font-medium hover:underline disabled:opacity-50 disabled:no-underline"
        >
          {resending ? "Enviando..." : resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : "Reenviar código"}
        </button>
      </div>}
    </div>
  );
}