import React from "react";
import { Info } from "lucide-react";
import AdminPricePreview from "@/components/admin/AdminPricePreview";
import DynamicPriceFactors from "@/components/locksmith/DynamicPriceFactors";

export default function PriceSummary({ price, showCalculationDetails = false, service = null, nearestDistance, assumedNearby = false }) {
  if (!price) return null;
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-muted p-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="font-heading font-semibold text-foreground">Valor do serviço</span>
          <span className="font-heading font-bold text-xl text-primary">R$ {price.total.toFixed(2)}</span>
        </div>
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Valor estimado. O valor final pode variar conforme as condições do serviço.</span>
        </div>
      </div>
      <DynamicPriceFactors price={price} nearestDistance={nearestDistance} assumedNearby={assumedNearby} />
      {showCalculationDetails && <AdminPricePreview price={price} service={service} />}
    </div>
  );
}