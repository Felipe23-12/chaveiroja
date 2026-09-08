import React from "react";

export default function KeyTechnicalDetails({ description }) {
  if (!description) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs font-medium text-muted-foreground mb-1">Descrição e dados técnicos</p>
      <p className="text-sm text-foreground whitespace-pre-wrap">{description}</p>
    </div>
  );
}