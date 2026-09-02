import React from "react";
import { Award, Wrench, BadgeCheck, GraduationCap } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ReviewsList from "@/components/locksmith/ReviewsList";
import { SERVICE_CATALOG } from "@/lib/pricing";

const SPECIALTY_ICONS = {
  Residencial: Wrench,
  Automotivo: Wrench,
  Comercial: Wrench,
  Emergencial: Wrench,
};

export default function LocksmithCredentialsTabs({ locksmith }) {
  const specialties = locksmith.specialties?.length
    ? locksmith.specialties
    : locksmith.specialty
    ? [locksmith.specialty]
    : [];

  const certificates = locksmith.certificates || [];

  return (
    <Tabs defaultValue="specialties" className="w-full">
      <TabsList className="grid grid-cols-3 w-full mb-4">
        <TabsTrigger value="specialties" className="text-xs sm:text-sm">
          Especialidades
        </TabsTrigger>
        <TabsTrigger value="certificates" className="text-xs sm:text-sm">
          Certificados
        </TabsTrigger>
        <TabsTrigger value="reviews" className="text-xs sm:text-sm">
          Avaliações
        </TabsTrigger>
      </TabsList>

      {/* Especialidades */}
      <TabsContent value="specialties" className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Wrench className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-foreground text-sm">
            Áreas de atuação
          </h3>
        </div>
        {specialties.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhuma especialidade informada.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {specialties.map((s) => {
              const Icon = SPECIALTY_ICONS[s] || Wrench;
              return (
                <div
                  key={s}
                  className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{s}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2 mt-4 mb-2">
          <GraduationCap className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-foreground text-sm">
            Serviços que realiza
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {SERVICE_CATALOG.map((s) => (
            <span
              key={s.id}
              className="px-2.5 py-1 rounded-full bg-muted text-xs text-muted-foreground"
            >
              {s.label}
            </span>
          ))}
        </div>
      </TabsContent>

      {/* Certificados */}
      <TabsContent value="certificates" className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Award className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-foreground text-sm">
            Certificados técnicos
          </h3>
        </div>
        {certificates.length === 0 ? (
          <div className="text-center py-8 rounded-xl border border-dashed border-border">
            <Award className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Este chaveiro ainda não cadastrou certificados técnicos.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {certificates.map((c, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <BadgeCheck className="w-5 h-5 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {c.name}
                  </p>
                  {c.issuer && (
                    <p className="text-xs text-muted-foreground">
                      {c.issuer}
                      {c.year ? ` · ${c.year}` : ""}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      {/* Avaliações */}
      <TabsContent value="reviews">
        <ReviewsList locksmithId={locksmith.id} />
      </TabsContent>
    </Tabs>
  );
}