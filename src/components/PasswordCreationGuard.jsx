import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { isGoogleAuthSession } from "@/lib/authProvider";
import LocksmithGoogleAccessNotice from '@/components/auth/LocksmithGoogleAccessNotice';

export default function PasswordCreationGuard() {
  const { user } = useAuth();
  if (!user || user.role === 'admin' || user.account_type !== 'chaveiro') return <Outlet />;
  if (isGoogleAuthSession()) return <LocksmithGoogleAccessNotice />;
  if (user.password_created === true) return <Outlet />;
  return <Navigate to="/criar-senha" replace />;
}