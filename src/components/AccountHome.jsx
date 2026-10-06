import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { getEffectiveRole } from '@/lib/accessControl';

// Abrir a raiz do app é uma entrada normal, não uma tentativa de acesso proibido.
export default function AccountHome({ children }) {
  const { user } = useAuth();
  if (getEffectiveRole(user) === 'chaveiro') {
    return <Navigate to="/painel-chaveiro" replace />;
  }
  return children;
}