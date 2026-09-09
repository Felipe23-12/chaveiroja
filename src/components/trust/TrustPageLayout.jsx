import React from "react";
import { Link } from "react-router-dom";
import { Image } from "@/components/ui/image";

const LOGO_URL = "https://media.base44.com/images/public/6a975d266a8000184833026a/d4717d1d4_ChatGPTImage4desetde202604_02_02.png";

export default function TrustPageLayout({ children }) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-card pt-safe">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link to="/login" className="flex items-center gap-2 font-heading font-bold">
            <Image src={LOGO_URL} alt="Chaveiro Já" fittingType="fit" className="h-9 w-9 rounded-lg" />
            Chaveiro Já
          </Link>
          <nav className="flex gap-4 text-sm font-medium" aria-label="Páginas institucionais">
            <Link to="/sobre" className="hover:text-primary">Sobre</Link>
            <Link to="/contato" className="hover:text-primary">Contato</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10">{children}</main>
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <nav className="flex flex-wrap justify-center gap-5" aria-label="Links institucionais do rodapé">
          <Link to="/sobre" className="hover:text-foreground">Sobre</Link>
          <Link to="/contato" className="hover:text-foreground">Contato</Link>
          <Link to="/termos-privacidade" className="hover:text-foreground">Termos e Privacidade</Link>
        </nav>
      </footer>
    </div>
  );
}