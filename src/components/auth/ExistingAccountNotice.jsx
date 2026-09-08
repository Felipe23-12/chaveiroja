import React from 'react';
import { Link } from 'react-router-dom';

export default function ExistingAccountNotice({ query = '' }) {
  return <div className="mb-4 rounded-lg border border-border bg-muted/40 p-3 text-sm">
    <p>Já se cadastrou? Não precisa criar outra conta ao reinstalar o aplicativo.</p>
    <div className="mt-2 flex flex-wrap gap-4">
      <Link to={'/login' + query} className="font-semibold text-primary underline">Entrar na minha conta</Link>
      <Link to="/forgot-password" className="text-primary underline">Esqueci minha senha</Link>
    </div>
  </div>;
}