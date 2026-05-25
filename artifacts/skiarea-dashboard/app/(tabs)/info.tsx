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

const sqlExample = `-- Chunked HTTP POST — sends 50 rows per call, safe for full history loads
-- Replace SKP_PASSAGGI / SKP_IMPIANTI / SKP_SOCIETA with your table names

DECLARE @url        NVARCHAR(512) = N'${syncUrl}'
DECLARE @chunkSize  INT           = 50   -- rows per POST; keep <= 100
DECLARE @offset     INT           = 0
DECLARE @total      INT
DECLARE @json       NVARCHAR(MAX)
DECLARE @http       INT
DECLARE @status     INT
DECLARE @resp       NVARCHAR(MAX)

-- Stage rows — deduplicate by (dupd, ggnr) in case LEFT JOIN produces
-- multiple rows per lift snapshot (one per company relation).
-- Remove the WHERE date filter to load full history across all seasons.
;WITH src AS (
    SELECT
        RTRIM(CAST(p.idin AS NVARCHAR(50)))       AS idin,
        RTRIM(CAST(p.dupd AS NVARCHAR(20)))       AS dupd,
        CONVERT(NVARCHAR(20), p.dtgg, 120)        AS dtgg,
        p.ggnr,
        p.ggbz,
        p.nsoc,
        p.npin,
        p.npic,
        p.nuin,
        p.npas,
        p.eser,
        s.nome      AS nome_societa,
        s.descr_grp AS descr_grp,
        s.id        AS id_societa,
        s.codgrp    AS codgrp,
        ROW_NUMBER() OVER (
            PARTITION BY RTRIM(CAST(p.dupd AS NVARCHAR(20))), p.ggnr
            ORDER BY s.id
        ) AS rn
    FROM ACCESSI_IMPIANTI p
    JOIN SKP_IMPIANTI i     ON p.ggnr    = i.ggnr
    LEFT JOIN SKP_SOCIETA s ON i.id_soc  = s.id
    WHERE p.dupd IS NOT NULL
      AND p.dtgg IS NOT NULL
      AND p.ggnr IS NOT NULL
      AND p.ggbz IS NOT NULL
      AND p.eser IS NOT NULL
    -- AND CAST(p.dtgg AS DATE) = CAST(GETDATE() AS DATE)  -- today only
)
SELECT idin, dupd, dtgg, ggnr, ggbz, nsoc, npin, npic, nuin, npas,
       eser, nome_societa, descr_grp, id_societa, codgrp
INTO #rows
FROM src
WHERE rn = 1

SELECT @total = COUNT(*) FROM #rows
PRINT CONCAT('Rows to sync: ', @total)

WHILE @offset < @total
BEGIN
    SELECT @json = N'{"snapshots":' +
        (SELECT *
         FROM   #rows
         ORDER  BY (SELECT NULL)
         OFFSET @offset ROWS
         FETCH  NEXT @chunkSize ROWS ONLY
         FOR JSON PATH, INCLUDE_NULL_VALUES) +
        N'}'

    EXEC sp_OACreate      'MSXML2.ServerXMLHTTP.6.0', @http OUT
    EXEC sp_OAMethod       @http, 'open',             NULL, 'POST', @url, false
    EXEC sp_OAMethod       @http, 'setRequestHeader', NULL, 'Content-Type', 'application/json'
    EXEC sp_OAMethod       @http, 'send',             NULL, @json
    EXEC sp_OAGetProperty  @http, 'status',           @status OUT
    EXEC sp_OAGetProperty  @http, 'responseText',     @resp   OUT
    EXEC sp_OADestroy      @http

    IF @status NOT IN (200, 201)
    BEGIN
        DROP TABLE #rows
        RAISERROR('Chunk failed. HTTP %d at offset %d. Body: %s',
                  16, 1, @status, @offset, @resp)
        RETURN
    END

    PRINT CONCAT('  offset=', @offset, ' -> ok (', @status, ')')
    SET @offset = @offset + @chunkSize
END

DROP TABLE #rows
PRINT 'Sync complete'`;

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
          <Text style={[styles.stepTitle, { color: colors.foreground }]}>SQL Server Agent Script</Text>
        </View>
        <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
          Paste this into your Agent job step. It stages today's rows into a temp table, then POSTs them in chunks of 50 to avoid OLE Automation size limits. Includes the company/group fields from the SKP_SOCIETA join.
        </Text>
        <CopyBlock label="T-SQL — chunked sync with company fields" content={sqlExample} />
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
