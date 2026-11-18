import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { supabase } from '@/lib/supabase';

const BUCKET = 'receipts';

/** Turns a saved file path (or an old public link) into a path inside the private bucket. */
export function toStoragePath(value: string): string | null {
  if (!value) return null;
  if (value.startsWith('blob:') || value.startsWith('data:')) return null;
  const marker = `/${BUCKET}/`;
  if (value.startsWith('http')) {
    const i = value.indexOf(marker);
    return i === -1 ? null : decodeURIComponent(value.slice(i + marker.length).split('?')[0]!);
  }
  return value;
}

/** Shows an image stored in the private bucket using a short-lived signed link. */
export function StorageImage({ src, ...rest }: ImgHTMLAttributes<HTMLImageElement> & { src: string }) {
  const [url, setUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    let active = true;
    const path = toStoragePath(src);
    if (!path) { setUrl(src); return; }
    supabase.storage.from(BUCKET).createSignedUrl(path, 3600).then(({ data }) => {
      if (active) setUrl(data?.signedUrl);
    });
    return () => { active = false; };
  }, [src]);
  if (!url) return <div className={rest.className} aria-label={rest.alt} />;
  return <img src={url} {...rest} />;
}
