import React, { useRef, useState } from "react";
import { Camera, ImageIcon, Loader2, User } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import CameraCapture from "@/components/locksmith/CameraCapture";

/**
 * Seletor de foto de perfil: tirar na hora com a câmera do celular
 * ou escolher uma imagem da galeria. Faz o upload e devolve a URL.
 */
export default function AvatarPicker({ value, onChange, size = 80, label = "Foto de perfil" }) {
  const fileRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file) => {
    setUploading(true);
    setError("");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await onChange(file_url);
    } catch (e) {
      setError(e.message || "Falha ao enviar a foto");
    } finally {
      setUploading(false);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) upload(file);
  };

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative rounded-full overflow-hidden bg-muted border border-border shrink-0 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {value ? (
          <Image src={value} alt={label} className="w-full h-full" />
        ) : (
          <User className="w-1/2 h-1/2 text-muted-foreground" />
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground mb-2">{label}</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCameraOpen(true)}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 min-h-[44px] rounded-xl border border-border bg-card text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50"
          >
            <Camera className="w-4 h-4" /> Tirar foto
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 min-h-[44px] rounded-xl border border-border bg-card text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50"
          >
            <ImageIcon className="w-4 h-4" /> Galeria
          </button>
        </div>
        {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      {cameraOpen && (
        <CameraCapture
          onClose={() => setCameraOpen(false)}
          onCapture={(file) => {
            setCameraOpen(false);
            upload(file);
          }}
        />
      )}
    </div>
  );
}