'use client';

import { dicebearAvatarUrl } from '@/lib/privacy';
import { useEffect, useMemo, useState } from 'react';

type AvatarProps = {
  src?: string | null;
  seed: string;
  alt?: string;
  size?: number;
  className?: string;
  /** When true, always use Dicebear and ignore src */
  forceDicebear?: boolean;
};

export default function Avatar({
  src,
  seed,
  alt = 'Avatar',
  size = 40,
  className,
  forceDicebear = false,
}: AvatarProps) {
  const fallback = useMemo(() => dicebearAvatarUrl(seed), [seed]);
  const [currentSrc, setCurrentSrc] = useState<string>(() =>
    forceDicebear ? fallback : (src || '').trim() || fallback,
  );

  useEffect(() => {
    setCurrentSrc(forceDicebear ? fallback : (src || '').trim() || fallback);
  }, [src, fallback, forceDicebear]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      width={size}
      height={size}
      className={className}
      onError={() => {
        if (currentSrc !== fallback) setCurrentSrc(fallback);
      }}
    />
  );
}



