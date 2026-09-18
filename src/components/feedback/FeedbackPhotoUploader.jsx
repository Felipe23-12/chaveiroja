import React, { useEffect, useRef, useState } from "react";
import { Image } from "@/components/ui/image";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function FeedbackPhotoUploader({ photos, onChange, onError, onUploadingChange }) {
  const [uploading, setUploading] = useState(false);
  const previews = useRef([]);
  const busy = useRef(false);
  useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), []);
  const upload = async (files) => {
    if (busy.current) return;
    const selected = Array.from(files || []);
    if (!selected.length) return;
    if (selected.length + photos.length > 3) return onError("Envie no máximo 3 fotos por relato.");
    if (selected.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || !/\.(jpe?g|png|webp)$/i.test(file.name) || file.size > 5 * 1024 * 1024)) return onError("Use imagens JPG, PNG ou WebP de até 5 MB cada.");
    busy.current = true; setUploading(true); onUploadingChange(true); onError("");
    try {
      const uploaded = await Promise.all(selected.map((file) => base44.integrations.Core.UploadPrivateFile({ file })));
      onChange([...photos, ...uploaded.map((item, index) => {
        const preview = URL.createObjectURL(selected[index]); previews.current.push(preview);
        return { uri: item.file_uri, preview };
      })]);
    } catch { onError("Não foi possível enviar a foto. Tente novamente."); }
    finally { busy.current = false; setUploading(false); onUploadingChange(false); }
  };
  return <div className="space-y-2"><p className="text-sm font-medium">Fotos do erro <span className="font-normal text-muted-foreground">(opcional, até 3)</span></p>
    <div className="flex flex-wrap gap-2">{photos.map((photo, index) => <div key={photo.uri} className="relative h-20 w-20 overflow-hidden rounded-lg border border-border"><Image src={photo.preview} alt={`Anexo ${index + 1}`} className="h-full w-full object-cover" /><button type="button" disabled={uploading} onClick={() => { URL.revokeObjectURL(photo.preview); onChange(photos.filter((_, itemIndex) => itemIndex !== index)); }} className="absolute right-0.5 top-0.5 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-background/90 text-foreground" aria-label={`Remover foto ${index + 1}`}><X className="h-4 w-4" /></button></div>)}</div>
    {photos.length < 3 && <div className="flex gap-2"><label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm font-semibold"><Camera className="h-4 w-4" />Câmera<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" disabled={uploading} onChange={(event) => { upload(event.target.files); event.target.value = ""; }} /></label><label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm font-semibold">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}Galeria<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" disabled={uploading} onChange={(event) => { upload(event.target.files); event.target.value = ""; }} /></label></div>}
  </div>;
}