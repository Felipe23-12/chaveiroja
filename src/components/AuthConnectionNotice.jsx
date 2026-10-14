import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";

export default function AuthConnectionNotice() {
  const { checkAppState, isLoadingAuth, isLoadingPublicSettings } = useAuth();
  return <div className="min-h-screen flex items-center justify-center p-6">
    <div role="alert" className="w-full max-w-sm text-center space-y-4">
      <h1 className="text-xl font-semibold">Não foi possível conectar</h1>
      <p className="text-sm text-muted-foreground">Confira sua internet e tente novamente. Uma falha de conexão não exige refazer seu cadastro.</p>
      <Button className="w-full" disabled={isLoadingAuth || isLoadingPublicSettings} onClick={() => void checkAppState()}>Tentar novamente</Button>
    </div>
  </div>;
}
