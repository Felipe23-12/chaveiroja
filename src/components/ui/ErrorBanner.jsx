import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Banner de erro consistente e acionável.
 * Substitui os <p className="text-red-600 bg-red-50"> espalhados pelo app,
 * oferecendo ícone, mensagem clara e botão de retry opcional.
 */
export default function ErrorBanner({ message, onRetry, retryLabel = "Tentar novamente" }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-destructive/10 border border-destructive/30">
      <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-destructive">{message}</p>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="mt-2 h-7 px-2 text-destructive hover:bg-destructive/10"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> {retryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}