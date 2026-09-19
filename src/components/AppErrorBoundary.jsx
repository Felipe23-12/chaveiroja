import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

const CACHE_RECOVERY_KEY = "app-cache-recovery";

export default class AppErrorBoundary extends React.Component {
  state = { failed: false, diagnostic: "" };

  componentDidMount() {
    this.recoveryTimer = window.setTimeout(() => sessionStorage.removeItem(CACHE_RECOVERY_KEY), 10000);
  }

  componentWillUnmount() {
    window.clearTimeout(this.recoveryTimer);
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("Falha inesperada na interface", error, info);
    const message = String(error?.message || error || "Erro desconhecido");
    this.setState({ diagnostic: message.slice(0, 180) });
    base44.functions.invoke("feedbackOperations", {
      action: "client_error",
      message,
      stack: String(error?.stack || ""),
      component_stack: String(info?.componentStack || ""),
      path: `${window.location.pathname}${window.location.search}`,
    }).catch(() => {});
    const staleModule = /requested module|dynamically imported module|module script|chunkloaderror/i.test(message);
    if (staleModule && !sessionStorage.getItem(CACHE_RECOVERY_KEY)) {
      sessionStorage.setItem(CACHE_RECOVERY_KEY, "1");
      const url = new URL(window.location.href);
      url.searchParams.set("app_refresh", Date.now().toString());
      window.location.replace(url.toString());
    }
  }

  reload = () => {
    sessionStorage.removeItem(CACHE_RECOVERY_KEY);
    const url = new URL(window.location.href);
    url.searchParams.set("app_refresh", Date.now().toString());
    window.location.replace(url.toString());
  };

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
          {this.state.diagnostic && (
            <p className="mt-3 rounded-lg bg-muted p-2 text-left text-xs text-muted-foreground break-words">
              Diagnóstico: {this.state.diagnostic}
            </p>
          )}
          <Button onClick={this.reload} className="mt-5 w-full">
            <RotateCcw className="h-4 w-4" /> Recarregar aplicativo
          </Button>
        </div>
      </main>
    );
  }
}