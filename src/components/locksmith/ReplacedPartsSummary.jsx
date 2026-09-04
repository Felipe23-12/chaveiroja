import React from "react";
import { CheckSquare } from "lucide-react";

export default function ReplacedPartsSummary({ parts = [] }) {
  if (!parts.length) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <div className="flex items-center gap-1.5 mb-2">
        <CheckSquare className="w-3.5 h-3.5 text-primary" />
        <p className="text-xs font-medium text-muted-foreground">Peças substituídas</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {parts.map((part) => (
          <span key={part} className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-foreground">
            {part}
          </span>
        ))}
      </div>
    </div>
  );
}