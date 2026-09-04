import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { isValidCpf } from "@/lib/cpf";

// Exige CPF e telefone no cadastro, inclusive para quem entrou pelo Google.
// Sem esses dados, o usuário é levado para completar o cadastro.
export default function ProfileCompletionGuard() {
  const { user } = useAuth();
  if (!user) return <Outlet />;

  const cpfOk = isValidCpf(user.cpf);
  const phoneOk = String(user.phone || "").replace(/\D/g, "").length >= 10;

  if (cpfOk && phoneOk) return <Outlet />;

  const tipo = user.account_type === "chaveiro" ? "chaveiro" : "cliente";
  return <Navigate to={`/google-complete?tipo=${tipo}`} replace />;
}