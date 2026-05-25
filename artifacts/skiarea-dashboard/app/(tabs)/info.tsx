import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/contexts/LanguageContext";
import type { Translations } from "@/i18n";

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

function buildSqlExample(url: string, t: Translations): string {
  return `${t.sqlComment1}
${t.sqlComment2}

DECLARE @url        NVARCHAR(512) = N'${url}'
DECLARE @chunkSize  INT           = 50   -- rows per POST; keep <= 100
DECLARE @offset     INT           = 0
DECLARE @total      INT
DECLARE @json       NVARCHAR(MAX)
DECLARE @http       INT
DECLARE @status     INT
DECLARE @resp       NVARCHAR(MAX)

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
    -- AND CAST(p.dtgg AS DATE) = CAST(GETDATE() AS DATE)
)
SELECT idin, dupd, dtgg, ggnr, ggbz, nsoc, npin, npic, nuin, npas,
       eser, nome_societa, descr_grp, id_societa, codgrp
INTO #rows
FROM src
WHERE rn = 1

SELECT @total = COUNT(*) FROM #rows
PRINT CONCAT(N'${t.sqlPrintRowsToSync}', @total)

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
        RAISERROR('${t.sqlErrorChunkFailed}', 16, 1, @status, @offset, @resp)
        RETURN
    END

    PRINT CONCAT('  offset=', @offset, ' -> ok (', @status, ')')
    SET @offset = @offset + @chunkSize
END

DROP TABLE #rows
PRINT N'${t.sqlPrintComplete}'`;
}

function CopyBlock({ label, content }: { label: string; content: string }) {
  const colors = useColors();
  const { t } = useTranslation();
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
            {copied ? t.copied : t.copy}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.code, { color: colors.foreground }]}>{content}</Text>
    </View>
  );
}

export default function InfoScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const topPadding = Platform.OS === "web" ? 67 : 0;

  const sqlExample = useMemo(() => buildSqlExample(syncUrl, t), [t]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPadding + 16, paddingBottom: Platform.OS === "web" ? 34 : 100 }]}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>{t.integration}</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        {t.integrationSubtitle}
      </Text>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.stepRow}>
          <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
            <Text style={[styles.stepNumText, { color: colors.primaryForeground }]}>1</Text>
          </View>
          <Text style={[styles.stepTitle, { color: colors.foreground }]}>{t.syncEndpoint}</Text>
        </View>
        <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
          {t.syncEndpointDesc}
        </Text>
        <CopyBlock label={t.postUrl} content={syncUrl} />
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.stepRow}>
          <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
            <Text style={[styles.stepNumText, { color: colors.primaryForeground }]}>2</Text>
          </View>
          <Text style={[styles.stepTitle, { color: colors.foreground }]}>{t.jsonPayload}</Text>
        </View>
        <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
          {t.jsonPayloadDesc}
        </Text>
        <CopyBlock label={t.requestBody} content={examplePayload} />
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.stepRow}>
          <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
            <Text style={[styles.stepNumText, { color: colors.primaryForeground }]}>3</Text>
          </View>
          <Text style={[styles.stepTitle, { color: colors.foreground }]}>{t.sqlAgentScript}</Text>
        </View>
        <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
          {t.sqlAgentScriptDesc}
        </Text>
        <CopyBlock label={t.tsqlLabel} content={sqlExample} />
      </View>

      <View style={[styles.noteBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Feather name="info" size={16} color={colors.primary} />
        <Text style={[styles.noteText, { color: colors.foreground }]}>
          {t.idempotentNote}
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
