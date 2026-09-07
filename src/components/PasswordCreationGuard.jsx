import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

export default function PasswordCreationGuard() {
  const { user } = useAuth();
  if (!user || user.password_created === true) return <Outlet />;
  return <Navigate to="/criar-senha" replace />;
}