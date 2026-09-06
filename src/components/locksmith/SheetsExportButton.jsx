import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function SheetsExportButton() {
  const { toast } = useToast();
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(false);
  const [lastUrl, setLastUrl] = useState(null);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("exportLocksmithBillingToSheets", { month });
      const d = res.data;
      if (d?.error) throw new Error(d.error);
      setLastUrl(d.spreadsheetUrl);
      toast({
        title: "Faturamento exportado",
        description: `${d.count} serviço(s) e ${d.cancelledCount} taxa(s) enviados para a aba "${d.sheetName}".`,
      });
    } catch (e) {
      toast({ title: "Falha ao exportar", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-xl border border-border bg-card space-y-3">
      <div>
        <p className="text-sm font-medium text-foreground">Exportar para Google Sheets</p>
        <p className="text-xs text-muted-foreground">Envie o faturamento do mês para a planilha de controle financeiro.</p>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />
        <Button size="sm" onClick={handleExport} disabled={loading || !month}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sheet className="w-4 h-4" />}
          Exportar mês
        </Button>
        {lastUrl && (
          <Button size="sm" variant="outline" asChild>
            <a href={lastUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="w-4 h-4" /> Abrir planilha
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}