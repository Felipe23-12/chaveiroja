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
    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50 border border-red-200">
      <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-700">{message}</p>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="mt-2 h-7 px-2 text-red-600 hover:bg-red-100 hover:text-red-700"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> {retryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}