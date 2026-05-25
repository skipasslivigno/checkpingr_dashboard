import React, { createContext, useCallback, useContext, useState } from "react";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface SelectedDateContextValue {
  selectedDate: string;
  selectedExtraction: string | undefined;
  setSelectedDate: (date: string) => void;
  setSelectedExtraction: (extraction: string | undefined) => void;
}

const SelectedDateContext = createContext<SelectedDateContextValue | undefined>(undefined);

export function SelectedDateProvider({ children }: { children: React.ReactNode }) {
  const [selectedDate, setSelectedDateRaw] = useState(todayIso());
  const [selectedExtraction, setSelectedExtraction] = useState<string | undefined>(undefined);

  const setSelectedDate = useCallback((date: string) => {
    setSelectedDateRaw(date);
    setSelectedExtraction(undefined);
  }, []);

  return (
    <SelectedDateContext.Provider value={{ selectedDate, selectedExtraction, setSelectedDate, setSelectedExtraction }}>
      {children}
    </SelectedDateContext.Provider>
  );
}

export function useSelectedDate(): SelectedDateContextValue {
  const ctx = useContext(SelectedDateContext);
  if (!ctx) throw new Error("useSelectedDate must be used within SelectedDateProvider");
  return ctx;
}
