import React from "react";
import { View } from "./_native";
import { PeriodComparison } from "./_PeriodComparison";
import "./_group.css";

/** Actual component extraction with clearly isolated API/context preview fixtures. */
export function Periods() {
  return <div className="ski-extraction">
    <View style={{ paddingTop: 20, maxWidth: 640, width: "100%", alignSelf: "center" }}>
      <PeriodComparison date="2025-12-08" season="2025-2026" extraction="20251208140000" />
    </View>
  </div>;
}
