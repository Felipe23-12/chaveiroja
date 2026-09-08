import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { isGoogleAuthSession } from "@/lib/authProvider";

export default function PasswordCreationGuard() {
  const { user } = useAuth();
  if (!user || user.password_created === true || isGoogleAuthSession()) return <Outlet />;
  return <Navigate to="/criar-senha" replace />;
}