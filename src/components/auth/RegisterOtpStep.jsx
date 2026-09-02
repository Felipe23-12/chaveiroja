import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Mail, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { toast } from "@/components/ui/use-toast";

export default function RegisterOtpStep({ email, title, subtitle, notice, onSuccess }) {
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
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
    <AuthLayout icon={Mail} title={title || "Confirme seu email"} subtitle={subtitle || "Digite o código enviado para seu email."}>
      <div className="flex flex-col items-center text-center mb-6">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
          <Mail className="w-8 h-8" />
        </div>
        <p className="text-sm text-muted-foreground max-w-sm">
          Enviamos um código de <strong className="text-foreground">6 dígitos</strong> para:
        </p>
        <p className="font-semibold text-foreground mt-1 break-all">{email}</p>
      </div>

      {notice && <div className="mb-4">{notice}</div>}
      {error && (
        <div role="alert" className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
          {error}
        </div>
      )}

      <div className="flex justify-center mb-5">
        <InputOTP
          maxLength={6}
          value={otpCode}
          onChange={setOtpCode}
          autoFocus
          autoComplete="one-time-code"
        >
          <InputOTPGroup className="gap-2">
            <InputOTPSlot index={0} className="w-11 h-12 text-lg rounded-md" />
            <InputOTPSlot index={1} className="w-11 h-12 text-lg rounded-md" />
            <InputOTPSlot index={2} className="w-11 h-12 text-lg rounded-md" />
            <InputOTPSlot index={3} className="w-11 h-12 text-lg rounded-md" />
            <InputOTPSlot index={4} className="w-11 h-12 text-lg rounded-md" />
            <InputOTPSlot index={5} className="w-11 h-12 text-lg rounded-md" />
          </InputOTPGroup>
        </InputOTP>
      </div>
      <Button
        className="w-full h-12 font-medium"
        onClick={handleVerify}
        disabled={loading || otpCode.length < 6}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Verificando...
          </>
        ) : (
          "Confirmar"
        )}
      </Button>
      <div className="mt-4 p-4 rounded-xl bg-muted/50 border text-sm text-center">
        <p className="font-medium text-foreground">Não recebeu o código?</p>
        <p className="text-xs text-muted-foreground mt-1">
          Confira também a pasta de <strong>spam/lixo eletrônico</strong>.
        </p>
      </div>
      <div className="text-center mt-4">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || resendCooldown > 0}
          className="text-primary font-medium hover:underline disabled:opacity-50 disabled:no-underline"
        >
          {resending ? "Enviando..." : resendCooldown > 0 ? `Reenviar código em ${resendCooldown}s` : "Reenviar código"}
        </button>
      </div>
    </AuthLayout>
  );
}