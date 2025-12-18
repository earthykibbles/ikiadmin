'use client';

import { useEffect, useState } from 'react';

export const PRIVACY_MODE_STORAGE_KEY = 'iki_gen_privacy_mode';

// Default: privacy mode ON (mask PII)
const DEFAULT_PRIVACY_MODE = process.env.NEXT_PUBLIC_PRIVACY_MODE_DEFAULT !== 'false';

export function usePrivacyMode() {
  const [privacyMode, setPrivacyModeState] = useState<boolean>(DEFAULT_PRIVACY_MODE);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRIVACY_MODE_STORAGE_KEY);
      if (raw === null) return;
      setPrivacyModeState(raw === 'true');
    } catch {
      // ignore
    }
  }, []);

  const setPrivacyMode = (next: boolean) => {
    setPrivacyModeState(next);
    try {
      localStorage.setItem(PRIVACY_MODE_STORAGE_KEY, String(next));
    } catch {
      // ignore
    }
  };

  return { privacyMode, setPrivacyMode };
}



