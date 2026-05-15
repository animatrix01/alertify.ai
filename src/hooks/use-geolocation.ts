import { useEffect, useRef, useState } from "react";

export type GeoFix = { lat: number; lng: number; accuracy: number; at: number };

export type GeoState =
  | { status: "idle" | "loading" }
  | { status: "denied" | "error"; message: string }
  | { status: "ok"; lat: number; lng: number; accuracy: number };

const CACHE_KEY = "alertify:last-location";

function readCache(): GeoFix | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as GeoFix;
    if (typeof v?.lat === "number" && typeof v?.lng === "number") return v;
  } catch {
    /* ignore */
  }
  return null;
}

function writeCache(fix: GeoFix) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(fix));
  } catch {
    /* ignore */
  }
}

/**
 * Live geolocation with a localStorage-backed fallback.
 * `lastKnown` is the most recent successful fix from this or any previous
 * session, so consumers can keep filtering by distance when the live
 * watcher is denied, errors out, or hasn't reported yet.
 */
export function useGeolocation(watch = true): GeoState & {
  lastKnown: GeoFix | null;
} {
  const [state, setState] = useState<GeoState>({ status: "idle" });
  const [lastKnown, setLastKnown] = useState<GeoFix | null>(() => readCache());
  const cacheRef = useRef<GeoFix | null>(lastKnown);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("geolocation" in navigator)) {
      setState({ status: "error", message: "Geolocation unavailable" });
      return;
    }
    setState({ status: "loading" });
    const onOk = (p: GeolocationPosition) => {
      const fix: GeoFix = {
        lat: p.coords.latitude,
        lng: p.coords.longitude,
        accuracy: p.coords.accuracy,
        at: Date.now(),
      };
      cacheRef.current = fix;
      writeCache(fix);
      setLastKnown(fix);
      setState({
        status: "ok",
        lat: fix.lat,
        lng: fix.lng,
        accuracy: fix.accuracy,
      });
    };
    const onErr = (e: GeolocationPositionError) =>
      setState({
        status: e.code === 1 ? "denied" : "error",
        message: e.message,
      });

    if (watch) {
      const id = navigator.geolocation.watchPosition(onOk, onErr, {
        enableHighAccuracy: true,
        maximumAge: 10000,
      });
      return () => navigator.geolocation.clearWatch(id);
    }
    navigator.geolocation.getCurrentPosition(onOk, onErr);
  }, [watch]);

  return { ...state, lastKnown };
}
