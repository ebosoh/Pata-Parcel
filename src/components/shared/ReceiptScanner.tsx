import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, RotateCcw, X, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MAX_SIDE = 1400;
const QUALITY = 0.6;

/** Turns any image source into a small, high-contrast grayscale scan. */
async function toScan(source: CanvasImageSource, w: number, h: number): Promise<File> {
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Scan unavailable');
  ctx.drawImage(source, 0, 0, cw, ch);
  const img = ctx.getImageData(0, 0, cw, ch);
  const d = img.data;
  let min = 255, max = 0;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * (d[i] ?? 0) + 0.587 * (d[i + 1] ?? 0) + 0.114 * (d[i + 2] ?? 0);
    d[i] = g;
    if (g < min) min = g;
    if (g > max) max = g;
  }
  const range = Math.max(1, max - min);
  for (let i = 0; i < d.length; i += 4) {
    let v = (((d[i] ?? 0) - min) / range) * 255;
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
  const bitmap = typeof createImageBitmap === 'function'
    ? await createImageBitmap(file).catch(() => null)
    : null;
  if (bitmap) {
    try {
      return await toScan(bitmap, bitmap.width, bitmap.height);
    } finally {
      bitmap.close();
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return await toScan(image, image.naturalWidth, image.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface Props {
  file: File | null;
  onChange: (file: File | null, previewUrl: string | null) => void;
}

export function ReceiptScanner({ file, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!file) setPreview(null); }, [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const processFile = async (source: File) => {
    setBusy(true);
    setScanError(null);
    try {
      const scan = await fileToScan(source);
      const url = URL.createObjectURL(scan);
      setPreview(url);
      onChange(scan, url);
    } catch {
      setScanError('Could not scan this photo. Retake it or choose another image from your gallery.');
    } finally {
      setBusy(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const source = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (source) void processFile(source);
  };

  return (
    <div className="space-y-2" aria-busy={busy}>
      {preview && file && (
        <div className="flex items-center gap-3 rounded-lg border border-border p-2">
          <img src={preview} alt="Scanned receipt" className="h-20 w-16 shrink-0 rounded-md border border-border object-contain" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground">Receipt scanned</p>
            <p className="text-xs text-muted-foreground">{Math.max(1, Math.round(file.size / 1024))} KB</p>
          </div>
          <Button type="button" size="icon" variant="ghost" className="h-11 w-11 shrink-0" aria-label="Remove scan" disabled={busy} onClick={() => { setScanError(null); onChange(null, null); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={() => cameraRef.current?.click()}
          className="h-auto min-h-11 whitespace-normal border-dashed border-primary/40 px-2 py-2 text-xs text-primary">
          {file ? <RotateCcw className="h-4 w-4 shrink-0" /> : <ScanLine className="h-4 w-4 shrink-0" />}
          {file ? 'Rescan' : 'Scan Receipt'}
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => galleryRef.current?.click()}
          className="h-auto min-h-11 whitespace-normal border-dashed px-2 py-2 text-xs">
          <ImageIcon className="h-4 w-4 shrink-0" /> From Gallery
        </Button>
      </div>
      {busy && <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Scanning receipt…</p>}
      {scanError && <p role="alert" className="text-xs text-destructive">{scanError}</p>}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  );
}
