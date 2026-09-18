import React from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SERVICE_CATALOG } from "@/lib/pricing";
import KeyBlockBanner from "@/components/locksmith/KeyBlockBanner";
import PointsProgressCard from "@/components/locksmith/PointsProgressCard";
import ServiceCard from "@/components/locksmith/ServiceCard";

/** Etapa 1: seleção do serviço (modo aplicativo). */
export default function HomeServiceSelectionStep({ config }) {
  const { keyBlock, loyalty, serviceId, setServiceId, setOpeningReason, setBrokenKeyInLock, goToStep } = config;
  return (
    <div className="space-y-5 step-enter">
      <KeyBlockBanner block={keyBlock} />
      <PointsProgressCard loyalty={loyalty} />
      <div>
        <h2 className="font-heading font-semibold text-lg text-foreground">Qual serviço você precisa?</h2>
        <p className="text-sm text-muted-foreground">Selecione o tipo de atendimento</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {SERVICE_CATALOG.map((s) => (
          <ServiceCard key={s.id} service={s} selected={serviceId === s.id} onClick={() => { setServiceId(s.id); setOpeningReason(null); setBrokenKeyInLock(null); }} />
        ))}
      </div>
      <Button onClick={() => goToStep(2)} disabled={!serviceId || !keyBlock || keyBlock.blocked} size="lg" className="w-full">
        Continuar <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}