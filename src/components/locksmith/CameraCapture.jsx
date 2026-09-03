import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Camera, RefreshCw, Check, Loader2, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Câmera in-app usando getUserMedia. Abre a câmera do dispositivo com
 * preview ao vivo, permite capturar, refazer e confirmar a foto.
 * Retorna o File da foto capturada via onCapture.
 */
export default function CameraCapture({ onClose, onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState("environment");
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(true);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startStream = useCallback(
    async (mode) => {
      setStarting(true);
      setError("");
      stopStream();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (e) {
        setError(
          e?.name === "NotAllowedError"
            ? "Permissão de câmera negada. Habilite o acesso nas configurações do navegador."
            : e?.name === "NotFoundError"
            ? "Nenhuma câmera encontrada no dispositivo."
            : "Não foi possível acessar a câmera."
        );
      } finally {
        setStarting(false);
      }
    },
    [stopStream]
  );

  useEffect(() => {
    startStream(facingMode);
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth || 720;
    const h = video.videoHeight || 960;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setSnapshot({ url, blob });
    }, "image/jpeg", 0.85);
  };

  const handleConfirm = () => {
    if (!snapshot) return;
    const file = new File([snapshot.blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" });
    onCapture(file);
  };

  const handleSwitch = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    setSnapshot(null);
    startStream(next);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 bg-black/80 text-white">
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10" aria-label="Fechar">
          <X className="w-5 h-5" />
        </button>
        <span className="font-medium text-sm">Câmera</span>
        <button
          onClick={handleSwitch}
          className="p-2 rounded-lg hover:bg-white/10"
          aria-label="Trocar câmera"
          title="Trocar câmera"
        >
          <SwitchCamera className="w-5 h-5" />
        </button>
      </div>

      {/* Preview / Snapshot */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="text-center px-6 text-white/90">
            <p className="text-sm">{error}</p>
          </div>
        ) : snapshot ? (
          <img src={snapshot.url} alt="Foto capturada" className="w-full h-full object-contain" />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {starting && (
              <div className="absolute inset-0 flex items-center justify-center text-white/80">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            )}
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controles */}
      <div className="h-28 bg-black/80 flex items-center justify-center gap-8">
        {error ? (
          <Button variant="outline" onClick={onClose} className="text-white border-white/30">
            Fechar
          </Button>
        ) : snapshot ? (
          <>
            <button
              onClick={() => setSnapshot(null)}
              className="flex flex-col items-center gap-1 text-white/80 hover:text-white"
            >
              <span className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <RefreshCw className="w-5 h-5" />
              </span>
              <span className="text-xs">Refazer</span>
            </button>
            <button
              onClick={handleConfirm}
              className="flex flex-col items-center gap-1 text-white"
            >
              <span className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg ring-4 ring-white/20">
                <Check className="w-7 h-7 text-primary-foreground" />
              </span>
              <span className="text-xs font-medium">Usar foto</span>
            </button>
          </>
        ) : (
          <button
            onClick={handleCapture}
            disabled={starting}
            className="flex flex-col items-center gap-1 text-white disabled:opacity-50"
          >
            <span className="w-16 h-16 rounded-full bg-white/10 border-2 border-white flex items-center justify-center shadow-lg">
              <Camera className="w-7 h-7" />
            </span>
            <span className="text-xs">Capturar</span>
          </button>
        )}
      </div>
    </div>
  );
}