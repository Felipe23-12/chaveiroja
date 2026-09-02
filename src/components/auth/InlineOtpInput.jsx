import React, { useEffect, useState } from "react";
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
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerify = async () => {
    if (otpCode.length < 6) {
      setError("Digite o código completo de 6 dígitos.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
      }
      await onSuccess();
    } catch (err) {
      setError(err.message || "Código inválido");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
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
          <p className="text-sm font-semibold text-foreground">Confirme seu email</p>
          <p className="text-xs text-muted-foreground">Código de 6 dígitos enviado para {email}</p>
        </div>
      </div>

      {error && (
        <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
          {error}
        </div>
      )}

      <div className="flex justify-center">
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
      </div>

      <Button
        type="button"
        className="w-full h-11 font-medium"
        onClick={handleVerify}
        disabled={loading || otpCode.length < 6}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verificando...
          </>
        ) : (
          "Confirmar email"
        )}
      </Button>

      <div className="text-center">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || resendCooldown > 0}
          className="text-sm text-primary font-medium hover:underline disabled:opacity-50 disabled:no-underline"
        >
          {resending ? "Enviando..." : resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : "Reenviar código"}
        </button>
      </div>
    </div>
  );
}