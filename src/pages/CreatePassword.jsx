import React from "react";
import { Lock } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GooglePasswordSetup from "@/components/auth/GooglePasswordSetup";
import { useAuth } from "@/lib/AuthContext";

export default function CreatePassword() {
  const { user } = useAuth();
  const destination = user?.role === "admin"
    ? "/painel-admin"
    : user?.account_type === "chaveiro" ? "/painel-chaveiro" : "/";

  return (
    <AuthLayout icon={Lock} title="Cadastre sua senha" subtitle="Crie uma senha para continuar usando o aplicativo">
      <GooglePasswordSetup onComplete={() => { window.location.href = destination; }} />
    </AuthLayout>
  );
}