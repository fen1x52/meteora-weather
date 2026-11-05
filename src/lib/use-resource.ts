"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clearApiCache } from "./api";

interface Snapshot<T> { key: string; version: number; data?: T; error?: string }
/** Key-driven requests: outdated responses cannot overwrite a newly selected city. */
export function useResource<T>(key: string | null, loader: () => Promise<T>) {
  const loaderRef = useRef(loader);
  const [version, setVersion] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot<T>>();
  useEffect(() => { loaderRef.current = loader; });
  const refresh = useCallback(() => { clearApiCache(); setVersion(previous => previous + 1); }, []);
  useEffect(() => {
    if (key === null) return;
    let active = true;
    const load = async () => {
      try {
        const data = await loaderRef.current();
        if (active) setSnapshot({ key, version, data });
      } catch (error) {
        if (active) setSnapshot({ key, version, error: error instanceof Error ? error.message : "Не удалось загрузить данные. / Unable to load data." });
      }
    };
    void load();
    return () => { active = false; };
  }, [key, version]);
  useEffect(() => {
    if (key === null) return;
    let last = Date.now();
    const check = () => {
      if (document.visibilityState === "visible" && Date.now() - last >= 10 * 60_000) {
        last = Date.now();
        setVersion(previous => previous + 1);
      }
    };
    const timer = window.setInterval(check, 60_000);
    window.addEventListener("focus", check);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", check); };
  }, [key]);
  const matches = snapshot?.key === key;
  return {
    data: matches ? snapshot?.data : undefined,
    error: matches && snapshot?.version === version ? snapshot.error : undefined,
    loading: key !== null && (!matches || snapshot?.version !== version),
    refresh,
  };
}

