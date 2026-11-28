import { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, RotateCcw, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MAX_SIDE = 1600;
const QUALITY = 0.82;

/** Resizes an image to fit within MAX_SIDE while keeping full color. */
async function toColorImage(source: CanvasImageSource, w: number, h: number): Promise<File> {
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(source, 0, 0, cw, ch);
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Image processing failed'))), 'image/jpeg', QUALITY),
  );
  return new File([blob], `product-scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
}

async function fileToColorImage(file: File): Promise<File> {
  const bitmap = typeof createImageBitmap === 'function'
    ? await createImageBitmap(file).catch(() => null)
    : null;
  if (bitmap) {
    try {
      return await toColorImage(bitmap, bitmap.width, bitmap.height);
    } finally {
      bitmap.close();
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return await toColorImage(image, image.naturalWidth, image.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface Props {
  file: File | null;
  previewUrl: string | null;
  onChange: (file: File | null, previewUrl: string | null) => void;
}

export function ProductScanner({ file, previewUrl, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const processFile = async (source: File) => {
    setBusy(true);
    setScanError(null);
    try {
      const processed = await fileToColorImage(source);
      const url = URL.createObjectURL(processed);
      onChange(processed, url);
    } catch {
      setScanError('Could not process this photo. Try again or choose from your gallery.');
    } finally {
      setBusy(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const source = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (source) void processFile(source);
  };

  const handleClear = () => {
    setScanError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    onChange(null, null);
  };

  return (
    <div className="space-y-2" aria-busy={busy}>
      {previewUrl && file && (
        <div className="relative overflow-hidden rounded-xl border border-border bg-muted/20">
          <img
            src={previewUrl}
            alt="Product screenshot"
            className="h-40 w-full object-cover"
          />
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute right-2 top-2 h-8 w-8 rounded-full shadow"
            aria-label="Remove photo"
            disabled={busy}
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-3 py-1.5">
            <p className="text-xs font-medium text-white">
              {Math.max(1, Math.round(file.size / 1024))} KB · tap × to remove
            </p>
          </div>
        </div>
      )}

      {!file && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => cameraRef.current?.click()}
            className="h-auto min-h-14 flex-col gap-1 whitespace-normal border-dashed border-primary/50 px-2 py-3 text-xs text-primary"
          >
            <Camera className="h-5 w-5" />
            Take Photo
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => galleryRef.current?.click()}
            className="h-auto min-h-14 flex-col gap-1 whitespace-normal border-dashed px-2 py-3 text-xs"
          >
            <ImageIcon className="h-5 w-5" />
            From Gallery
          </Button>
        </div>
      )}

      {file && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => cameraRef.current?.click()}
          className="h-9 w-full border-dashed text-xs text-primary"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Retake Photo
        </Button>
      )}

      {busy && (
        <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Processing image…
        </p>
      )}
      {scanError && <p role="alert" className="text-xs text-destructive">{scanError}</p>}

      {/* Native camera — triggers device camera directly on mobile */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      {/* Gallery fallback — file picker without camera constraint */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
