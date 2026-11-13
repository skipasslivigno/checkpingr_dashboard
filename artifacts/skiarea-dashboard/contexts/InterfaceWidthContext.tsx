import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_INTERFACE_WIDTH,
  createInterfaceWidthWriter,
  INTERFACE_WIDTH_PX,
  INTERFACE_WIDTH_STORAGE_KEY,
  InterfaceWidth,
  parseInterfaceWidth,
} from "@/lib/interface-width";

export type InterfaceWidthStatus = "loading" | "ready" | "saving" | "readError" | "writeError";

interface InterfaceWidthValue {
  width: InterfaceWidth;
  maxWidth: number | null;
  status: InterfaceWidthStatus;
  setWidth: (w: InterfaceWidth) => void;
  retrySave: () => void;
}

const Ctx = createContext<InterfaceWidthValue | null>(null);

/** Stored locally per browser/device only; never synced to the account. */
export function InterfaceWidthProvider({ children }: { children: React.ReactNode }) {
  const [width, setWidthState] = useState<InterfaceWidth>(DEFAULT_INTERFACE_WIDTH);
  const [status, setStatus] = useState<InterfaceWidthStatus>("loading");
  const userChose = useRef(false);
  const writeSeq = useRef(0);
  const latest = useRef<InterfaceWidth>(DEFAULT_INTERFACE_WIDTH);
  const writeWidth = useMemo(() => createInterfaceWidthWriter(
    (value) => AsyncStorage.setItem(INTERFACE_WIDTH_STORAGE_KEY, value),
  ), []);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(INTERFACE_WIDTH_STORAGE_KEY)
      .then((raw) => {
        if (!alive || userChose.current) return; // never overwrite a choice made during hydration
        const parsed = parseInterfaceWidth(raw);
        if (parsed) { latest.current = parsed; setWidthState(parsed); }
        setStatus("ready");
      })
      .catch(() => {
        if (!alive || userChose.current) return;
        setStatus("readError");
      });
    return () => { alive = false; };
  }, []);

  const persist = useCallback((value: InterfaceWidth) => {
    const seq = ++writeSeq.current;
    setStatus("saving");
    // Writes are chained so the newest selection is always the last one written.
    writeWidth(value)
      .then(() => {
        if (seq !== writeSeq.current) return;
        if (latest.current !== value) return;
        setStatus("ready");
      })
      .catch(() => {
        if (seq === writeSeq.current) setStatus("writeError");
      });
  }, [writeWidth]);

  const setWidth = useCallback((value: InterfaceWidth) => {
    userChose.current = true;
    latest.current = value;
    setWidthState(value);
    persist(value);
  }, [persist]);

  const retrySave = useCallback(() => persist(latest.current), [persist]);

  const value = useMemo<InterfaceWidthValue>(() => ({
    width, maxWidth: INTERFACE_WIDTH_PX[width], status, setWidth, retrySave,
  }), [width, status, setWidth, retrySave]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useInterfaceWidth(): InterfaceWidthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useInterfaceWidth must be used within InterfaceWidthProvider");
  return v;
}
