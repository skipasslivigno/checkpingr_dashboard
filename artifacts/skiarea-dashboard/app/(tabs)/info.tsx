import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "your-app.replit.app";

const syncUrl = `https://${DOMAIN}/api/lifts/sync`;

const examplePayload = `{
  "snapshots": [
    {
      "idin": "20211219 103001",
      "dupd": "20211219103000",
      "dtgg": "2021-12-19 00:00:00",
      "ggnr": 197918858,
      "ggbz": "L R Telec. Mottolino",
      "nsoc": 10001,
      "npin": null,
      "npic": null,
      "nuin": 1,
      "npas": 1,
      "eser": "2021-2022"
    }
  ]
}`;

const sqlExample = `-- Add to your extraction script:
INSERT INTO extraction_push
SELECT idin, dupd, dtgg, ggnr, ggbz, nsoc,
       npin, npic, nuin, npas, eser
FROM your_lift_table
WHERE dtgg = CAST(GETDATE() AS DATE);

-- Then POST via HTTP to:
-- ${syncUrl}`;

function CopyBlock({ label, content }: { label: string; content: string }) {
  const colors = useColors();
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    await Clipboard.setStringAsync(content);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={[styles.copyBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.copyHeader}>
        <Text style={[styles.copyLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <TouchableOpacity onPress={onCopy} style={styles.copyBtn} activeOpacity={0.7}>
          <Feather name={copied ? "check" : "copy"} size={14} color={copied ? colors.success : colors.primary} />
          <Text style={[styles.copyBtnText, { color: copied ? colors.success : colors.primary }]}>
            {copied ? "Copied" : "Copy"}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.code, { color: colors.foreground }]}>{content}</Text>
    </View>
  );
}

export default function InfoScreen() {
  const colors = useColors();
  const topPadding = Platform.OS === "web" ? 67 : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPadding + 16, paddingBottom: Platform.OS === "web" ? 34 : 100 }]}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Integration</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Push extraction data from your on-site MSSQL script to this dashboard
      </Text>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.stepRow}>
          <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
            <Text style={[styles.stepNumText, { color: colors.primaryForeground }]}>1</Text>
          </View>
          <Text style={[styles.stepTitle, { color: colors.foreground }]}>Sync Endpoint</Text>
        </View>
        <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
          Add an HTTP POST step to your existing MSSQL extraction script. Send your data to:
        </Text>
        <CopyBlock label="POST URL" content={syncUrl} />
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.stepRow}>
          <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
            <Text style={[styles.stepNumText, { color: colors.primaryForeground }]}>2</Text>
          </View>
          <Text style={[styles.stepTitle, { color: colors.foreground }]}>JSON Payload</Text>
        </View>
        <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
          Send a JSON body with your snapshot rows. Field names match your existing table columns:
        </Text>
        <CopyBlock label="Request Body (JSON)" content={examplePayload} />
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.stepRow}>
          <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
            <Text style={[styles.stepNumText, { color: colors.primaryForeground }]}>3</Text>
          </View>
          <Text style={[styles.stepTitle, { color: colors.foreground }]}>MSSQL Script Guide</Text>
        </View>
        <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
          After your extraction runs, add a step to POST the data using a tool like PowerShell, Python, or a SQL Server Agent job:
        </Text>
        <CopyBlock label="PowerShell example" content={`$url = "${syncUrl}"\n$body = @{\n  snapshots = @(\n    # ... your rows from MSSQL here\n  )\n} | ConvertTo-Json -Depth 5\nInvoke-RestMethod -Method Post -Uri $url -Body $body -ContentType 'application/json'`} />
      </View>

      <View style={[styles.noteBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Feather name="info" size={16} color={colors.primary} />
        <Text style={[styles.noteText, { color: colors.foreground }]}>
          Data is upserted by row ID — pushing the same extraction twice is safe and idempotent.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 12 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 8 },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  stepTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  stepDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  copyBlock: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  copyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
  },
  copyLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  copyBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  code: {
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    paddingHorizontal: 12,
    paddingBottom: 12,
    lineHeight: 18,
  },
  noteBox: {
    flexDirection: "row",
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    alignItems: "flex-start",
  },
  noteText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
