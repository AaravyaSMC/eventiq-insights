import { useEffect, useRef, useState } from "react";
import { UploadCloud, ZoomIn, Loader2, X } from "lucide-react";

// Canvas dimensions: 16:9. Preview backing store is 800x450; export is 2x (1600x900).
const CW = 800;
const CH = 450;
const OUT_SCALE = 2;

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;
  onSave: (dataUrl: string) => Promise<void> | void;
};

export function CoverCropper({ open, title = "Set cover image", onClose, onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const [dims, setDims] = useState<{ iw: number; ih: number } | null>(null);
  const [minScale, setMinScale] = useState(1);
  const [zoom, setZoom] = useState(1); // multiplier over minScale
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scale = minScale * zoom;

  const clampOffset = (nx: number, ny: number, s: number, iw: number, ih: number) => ({
    tx: Math.min(0, Math.max(CW - iw * s, nx)),
    ty: Math.min(0, Math.max(CH - ih * s, ny)),
  });

  // Redraw whenever position/zoom/image changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !dims) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, CW, CH);
    ctx.drawImage(img, tx, ty, dims.iw * scale, dims.ih * scale);
  }, [tx, ty, scale, dims]);

  function loadFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const ms = Math.max(CW / iw, CH / ih);
      setDims({ iw, ih });
      setMinScale(ms);
      setZoom(1);
      const centered = clampOffset((CW - iw * ms) / 2, (CH - ih * ms) / 2, ms, iw, ih);
      setTx(centered.tx);
      setTy(centered.ty);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      setError("Could not read that image.");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  function onZoom(next: number) {
    if (!dims) return;
    const nextScale = minScale * next;
    // Keep the image point currently under the canvas center fixed while zooming.
    const cx = CW / 2;
    const cy = CH / 2;
    const imgX = (cx - tx) / scale;
    const imgY = (cy - ty) / scale;
    const nt = clampOffset(cx - imgX * nextScale, cy - imgY * nextScale, nextScale, dims.iw, dims.ih);
    setZoom(next);
    setTx(nt.tx);
    setTy(nt.ty);
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dims) return;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, tx, ty };
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const d = dragRef.current;
    if (!d || !dims) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const factor = CW / rect.width;
    const nx = d.tx + (e.clientX - d.x) * factor;
    const ny = d.ty + (e.clientY - d.y) * factor;
    const c = clampOffset(nx, ny, scale, dims.iw, dims.ih);
    setTx(c.tx);
    setTy(c.ty);
  }
  function onPointerUp() {
    dragRef.current = null;
  }

  async function save() {
    const img = imgRef.current;
    if (!img || !dims) {
      setError("Choose an image first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const out = document.createElement("canvas");
      out.width = CW * OUT_SCALE;
      out.height = CH * OUT_SCALE;
      const ctx = out.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        img,
        tx * OUT_SCALE,
        ty * OUT_SCALE,
        dims.iw * scale * OUT_SCALE,
        dims.ih * scale * OUT_SCALE,
      );
      const dataUrl = out.toDataURL("image/jpeg", 0.85);
      await onSave(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save cover.");
      setSaving(false);
    }
  }

  // Reset state each time the modal is opened.
  useEffect(() => {
    if (open) {
      imgRef.current = null;
      setDims(null);
      setZoom(1);
      setTx(0);
      setTy(0);
      setError(null);
      setSaving(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-hover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!dims ? (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-background px-6 py-16 text-center transition hover:bg-secondary/40">
            <UploadCloud className="h-7 w-7 text-muted-foreground" />
            <div className="text-sm font-medium">Choose an image</div>
            <div className="text-xs text-muted-foreground">JPG, PNG or WebP · you'll crop it to 16:9 next</div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])}
            />
          </label>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-border">
              <canvas
                ref={canvasRef}
                width={CW}
                height={CH}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="block w-full cursor-grab touch-none active:cursor-grabbing"
              />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                type="range"
                min={1}
                max={4}
                step={0.01}
                value={zoom}
                onChange={(e) => onZoom(parseFloat(e.target.value))}
                className="w-full accent-navy"
              />
              <label className="shrink-0 cursor-pointer text-xs font-medium text-sky hover:underline">
                Change
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
              </label>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Drag to reposition · slider to zoom.</div>
          </>
        )}

        {error && <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">{error}</div>}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!dims || saving}
            className="inline-flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save cover
          </button>
        </div>
      </div>
    </div>
  );
}
