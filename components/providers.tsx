"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_PROFILE,
  isValidProfile,
  type Profile,
} from "@/lib/health";
import { getCopy, getNearbyCopy, type Copy, type Locale, type NearbyCopy } from "@/lib/i18n";

const LOCALE_KEY = "healthier-locale";
const PROFILE_KEY = "healthier-profile";

type LocaleContextValue = {
  locale: Locale;
  dir: "ltr" | "rtl";
  setLocale: (locale: Locale) => void;
  t: Copy;
  tn: NearbyCopy;
};

type HealthContextValue = {
  profile: Profile;
  hasProfile: boolean;
  setProfile: (profile: Profile) => void;
  useStarterProfile: () => void;
  resetProfile: () => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);
const HealthContext = createContext<HealthContextValue | null>(null);

export function AppProviders({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [profile, setProfileState] = useState<Profile>(DEFAULT_PROFILE);
  const [hasProfile, setHasProfile] = useState(false);
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    try {
      const storedLocale = window.localStorage.getItem(LOCALE_KEY);
      if (storedLocale === "ar" || storedLocale === "en") {
        setLocaleState(storedLocale);
      }

      const storedProfile = window.localStorage.getItem(PROFILE_KEY);
      if (storedProfile) {
        const parsed = JSON.parse(storedProfile) as Profile;
        if (isValidProfile(parsed)) {
          setProfileState(parsed);
          setHasProfile(true);
        }
      }
    } catch {
      // A blocked storage API should not stop the app from working.
    } finally {
      setProfileReady(true);
    }
  }, []);

  const dir = locale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    try {
      window.localStorage.setItem(LOCALE_KEY, nextLocale);
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const setProfile = useCallback((nextProfile: Profile) => {
    setProfileState(nextProfile);
    setHasProfile(true);
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const resetProfile = useCallback(() => {
    setProfileState(DEFAULT_PROFILE);
    setHasProfile(false);
    try {
      window.localStorage.removeItem(PROFILE_KEY);
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const useStarterProfile = useCallback(() => {
    setHasProfile(true);
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(DEFAULT_PROFILE));
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const localeValue = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dir,
      setLocale,
      t: getCopy(locale),
      tn: getNearbyCopy(locale),
    }),
    [locale, dir, setLocale],
  );

  const healthValue = useMemo<HealthContextValue>(
    () => ({
      profile,
      hasProfile: profileReady && hasProfile,
      setProfile,
      useStarterProfile,
      resetProfile,
    }),
    [profile, hasProfile, profileReady, setProfile, useStarterProfile, resetProfile],
  );

  return (
    <LocaleContext.Provider value={localeValue}>
      <HealthContext.Provider value={healthValue}>
        {children}
      </HealthContext.Provider>
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used inside AppProviders");
  }
  return context;
}

export function useHealth(): HealthContextValue {
  const context = useContext(HealthContext);
  if (!context) {
    throw new Error("useHealth must be used inside AppProviders");
  }
  return context;
}
