import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

// Exige CPF e telefone no cadastro, inclusive para quem entrou pelo Google.
// Sem esses dados, o usuário é levado para completar o cadastro.
export default function ProfileCompletionGuard() {
  const { user } = useAuth();
  if (!user) return <Outlet />;

  const cpfOk = String(user.cpf || "").replace(/\D/g, "").length === 11;
  const phoneOk = String(user.phone || "").trim().length >= 8;

  if (cpfOk && phoneOk) return <Outlet />;

  const tipo = user.account_type === "chaveiro" ? "chaveiro" : "cliente";
  return <Navigate to={`/google-complete?tipo=${tipo}`} replace />;
}