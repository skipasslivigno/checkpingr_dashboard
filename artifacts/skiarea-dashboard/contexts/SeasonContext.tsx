import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useGetSeasons } from "@workspace/api-client-react";

export function formatSeason(s: string): string {
  return s.replace(/^(\d{4})-\d{2}(\d{2})$/, "$1-$2");
}

interface SeasonContextValue {
  seasons: string[];
  selectedSeason: string | undefined;
  setSelectedSeason: (s: string | undefined) => void;
}

const SeasonContext = createContext<SeasonContextValue | undefined>(undefined);

export function SeasonProvider({ children }: { children: React.ReactNode }) {
  const { data: seasons = [] } = useGetSeasons();
  const [selectedSeason, setSelectedSeasonRaw] = useState<string | undefined>(undefined);

  const setSelectedSeason = useCallback(
    (s: string | undefined) => setSelectedSeasonRaw(s === seasons[0] ? undefined : s),
    [seasons]
  );

  const value = useMemo(
    () => ({ seasons, selectedSeason, setSelectedSeason }),
    [seasons, selectedSeason, setSelectedSeason]
  );

  return <SeasonContext.Provider value={value}>{children}</SeasonContext.Provider>;
}

export function useSeason(): SeasonContextValue {
  const ctx = useContext(SeasonContext);
  if (!ctx) throw new Error("useSeason must be used within SeasonProvider");
  return ctx;
}
