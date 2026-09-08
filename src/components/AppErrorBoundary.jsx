import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default class AppErrorBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("Falha inesperada na interface", error, info);
  }

  reload = () => window.location.reload();

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center px-4 pt-safe pb-safe">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="font-heading text-lg font-bold">Não foi possível abrir esta tela</h1>
          <p className="mt-2 text-sm text-muted-foreground">Seus dados foram preservados. Recarregue o aplicativo para continuar.</p>
          <Button onClick={this.reload} className="mt-5 w-full">
            <RotateCcw className="h-4 w-4" /> Recarregar aplicativo
          </Button>
        </div>
      </main>
    );
  }
}