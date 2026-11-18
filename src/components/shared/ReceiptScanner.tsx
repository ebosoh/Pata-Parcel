import { useEffect, useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Loader2, RotateCcw, Check, X, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const MAX_SIDE = 1400;
const QUALITY = 0.6;

/** Turns any image source into a small, high-contrast black & white "scan". */
async function toScan(source: CanvasImageSource, w: number, h: number): Promise<File> {
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const cw = Math.round(w * scale);
  const ch = Math.round(h * scale);
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0, cw, ch);
  const img = ctx.getImageData(0, 0, cw, ch);
  const d = img.data;
  // grayscale + find range for contrast stretch
  let min = 255, max = 0;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;
    d[i] = g;
    if (g < min) min = g;
    if (g > max) max = g;
  }
  const range = Math.max(1, max - min);
  for (let i = 0; i < d.length; i += 4) {
    let v = ((d[i]! - min) / range) * 255;
    // push paper to white, ink to black
    v = v > 170 ? 255 : v < 60 ? v * 0.6 : v;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Scan failed'))), 'image/jpeg', QUALITY),
  );
  return new File([blob], `receipt-scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
}

async function fileToScan(file: File): Promise<File> {
  const bmp = await createImageBitmap(file);
  return toScan(bmp, bmp.width, bmp.height);
}

interface Props {
  file: File | null;
  onChange: (file: File | null, previewUrl: string | null) => void;
}

export function ReceiptScanner({ file, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (!open) { stop(); return; }
    setCamError(null);
    navigator.mediaDevices?.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    }).then((s) => {
      streamRef.current = s;
      if (videoRef.current) { videoRef.current.srcObject = s; void videoRef.current.play(); }
    }).catch(() => setCamError('Camera not available. Allow camera access or pick from gallery.'));
    return stop;
  }, [open]);

  useEffect(() => { if (!file) setPreview(null); }, [file]);

  const finish = (scan: File) => {
    const url = URL.createObjectURL(scan);
    setPreview(url);
    onChange(scan, url);
    setOpen(false);
  };

  const capture = async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    setBusy(true);
    try { finish(await toScan(v, v.videoWidth, v.videoHeight)); } finally { setBusy(false); }
  };

  const fromGallery = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try { finish(await fileToScan(f)); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-2">
      {preview && file ? (
        <div className="flex items-center gap-3 rounded-xl border border-border p-2">
          <img src={preview} alt="Scanned receipt" className="h-20 w-16 rounded-md object-cover border border-border" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">Receipt scanned</p>
            <p className="text-[11px] text-muted-foreground">{Math.round(file.size / 1024)} KB</p>
          </div>
          <Button type="button" size="sm" variant="outline" className="text-xs" onClick={() => setOpen(true)}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Rescan
          </Button>
          <Button type="button" size="icon" variant="ghost" aria-label="Remove scan" onClick={() => onChange(null, null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setOpen(true)}
            className="border-2 border-dashed border-primary/40 rounded-xl p-4 text-center hover:bg-primary/5 transition-colors">
            <ScanLine className="h-6 w-6 mx-auto text-primary mb-1" />
            <span className="text-xs font-semibold text-primary block">Scan Receipt</span>
            <span className="text-[10px] text-muted-foreground">Uses phone camera</span>
          </button>
          <button type="button" onClick={() => galleryRef.current?.click()} disabled={busy}
            className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:bg-muted transition-colors">
            {busy ? <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground mb-1" /> : <ImageIcon className="h-6 w-6 mx-auto text-muted-foreground mb-1" />}
            <span className="text-xs font-semibold text-foreground block">From Gallery</span>
            <span className="text-[10px] text-muted-foreground">Also compressed</span>
          </button>
        </div>
      )}
      <input ref={galleryRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { void fromGallery(e.target.files?.[0]); e.target.value = ''; }} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-3">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2"><Camera className="h-4 w-4" /> Scan receipt</DialogTitle>
          </DialogHeader>
          {camError ? (
            <p className="text-xs text-destructive bg-destructive/10 p-3 rounded-lg">{camError}</p>
          ) : (
            <div className="relative overflow-hidden rounded-lg bg-muted aspect-[3/4]">
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-6 rounded-lg border-2 border-primary/80" />
              <p className="absolute bottom-2 inset-x-0 text-center text-[11px] font-semibold text-primary-foreground drop-shadow">
                Fit the receipt inside the frame
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1 text-xs" onClick={() => galleryRef.current?.click()}>
              <ImageIcon className="mr-1 h-4 w-4" /> Gallery
            </Button>
            <Button type="button" className="flex-1 text-xs font-bold" disabled={busy || !!camError} onClick={capture}>
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />} Capture
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
