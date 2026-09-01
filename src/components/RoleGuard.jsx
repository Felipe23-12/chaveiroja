import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

// Guarda de rota por tipo de conta (cliente / chaveiro). Admin acessa tudo.
export default function RoleGuard({ allow }) {
  const { user } = useAuth();
  const type = user?.account_type || (user?.role === "admin" ? "admin" : "cliente");

  if (type === "admin" || allow.includes(type)) {
    return <Outlet />;
  }

  return <Navigate to={type === "chaveiro" ? "/painel-chaveiro" : "/"} replace />;
}