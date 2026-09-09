import React from "react";
import { Navigate } from "react-router-dom";
import { Lock } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GooglePasswordSetup from "@/components/auth/GooglePasswordSetup";
import { useAuth } from "@/lib/AuthContext";

export default function CreatePassword() {
  const { user } = useAuth();
  const destination = user?.role === "admin"
    ? "/painel-admin"
    : user?.account_type === "chaveiro" ? "/painel-chaveiro" : "/";

  const alreadyRegistered = Boolean(
    user?.account_type && user?.phone && (user?.legal_name || user?.full_name)
  );

  if (user?.password_created === true || alreadyRegistered) return <Navigate to={destination} replace />;

  return (
    <AuthLayout icon={Lock} title="Cadastre sua senha" subtitle="Crie uma senha para continuar usando o aplicativo">
      <GooglePasswordSetup onComplete={() => { window.location.href = destination; }} />
    </AuthLayout>
  );
}