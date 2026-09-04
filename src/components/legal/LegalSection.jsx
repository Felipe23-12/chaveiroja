import React from "react";

/** Seção de texto legal com título e conteúdo. */
export default function LegalSection({ icon: Icon, title, children }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="w-5 h-5 text-primary shrink-0" />}
        <h2 className="font-heading font-semibold text-base text-foreground">{title}</h2>
      </div>
      <div className="space-y-2.5 text-sm text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}