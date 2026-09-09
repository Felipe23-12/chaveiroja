import React from "react";
import { Link } from "react-router-dom";
import { Image } from "@/components/ui/image";

const LOGO_URL = "https://media.base44.com/images/public/6a975d266a8000184833026a/d4717d1d4_ChatGPTImage4desetde202604_02_02.png";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-[100dvh] flex items-start sm:items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md fade-in-up">
        <div className="text-center mb-10">
          <Image
            src={LOGO_URL}
            alt="Chaveiro Já"
            fittingType="fit"
            className="w-16 h-16 rounded-2xl mx-auto mb-3"
          />
          <p className="font-heading font-bold text-foreground text-lg leading-tight">Chaveiro Já</p>
          <p className="text-[11px] text-muted-foreground mb-4">Socorro na hora</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
        <nav className="mt-5 flex justify-center gap-5 text-xs text-muted-foreground" aria-label="Páginas institucionais">
          <Link to="/about" className="hover:text-foreground">Sobre</Link>
          <Link to="/contact" className="hover:text-foreground">Contato</Link>
          <Link to="/termos-privacidade" className="hover:text-foreground">Privacidade</Link>
        </nav>
      </div>
    </div>
  );
}