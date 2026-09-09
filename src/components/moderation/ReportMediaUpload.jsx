import React, { useState } from "react";
import { Camera, ImagePlus, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ReportMediaUpload({ onUploaded, onError, disabled }) {
  const [uploading, setUploading] = useState(false);

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await onUploaded(file_url, file.type.startsWith("video/") ? "video" : "image");
    } catch (error) {
      onError(error.message || "Não foi possível enviar o arquivo.");
    } finally {
      setUploading(false);
    }
  };

  const locked = disabled || uploading;
  return <div className="flex gap-1">
    <label className={`flex h-11 w-11 items-center justify-center rounded-md border bg-background ${locked ? "pointer-events-none opacity-50" : "cursor-pointer"}`} title="Tirar foto">
      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={upload} disabled={locked} />
    </label>
    <label className={`flex h-11 w-11 items-center justify-center rounded-md border bg-background ${locked ? "pointer-events-none opacity-50" : "cursor-pointer"}`} title="Foto ou vídeo da galeria">
      <ImagePlus className="h-4 w-4" />
      <input type="file" accept="image/*,video/*" className="hidden" onChange={upload} disabled={locked} />
    </label>
  </div>;
}