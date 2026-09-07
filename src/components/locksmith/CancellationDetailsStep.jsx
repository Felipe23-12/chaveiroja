import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import PhotoUploader from "@/components/locksmith/PhotoUploader";

export default function CancellationDetailsStep({ reason, loading, onSubmit, onBack }) {
  const [report, setReport] = useState("");
  const [photos, setPhotos] = useState([]);
  const needsReport = reason === "threat";
  const needsPhoto = reason === "client_cancelled";
  const valid = (!needsReport || report.trim().length >= 20) && (!needsPhoto || photos.length > 0);
  return <div className="space-y-3"><p className="text-sm text-muted-foreground">{reason === "address_incorrect" ? "Confirme para avisar o cliente e iniciar a espera de 6 minutos." : needsReport ? "Descreva com detalhes o que aconteceu." : "Tire uma foto que comprove sua chegada ao local."}</p>{needsReport && <Textarea value={report} onChange={(e) => setReport(e.target.value)} placeholder="Relate o ocorrido (mínimo 20 caracteres)" />}{needsPhoto && <PhotoUploader label="Foto obrigatória do local" photos={photos} onChange={setPhotos} />}<div className="flex gap-2"><Button variant="outline" onClick={onBack} className="flex-1">Voltar</Button><Button disabled={!valid || loading} onClick={() => onSubmit({ report, evidence_photo: photos[0] })} className="flex-1">Confirmar</Button></div></div>;
}