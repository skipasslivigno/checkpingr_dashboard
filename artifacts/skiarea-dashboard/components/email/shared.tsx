import { Feather } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export type Colors = ReturnType<typeof useColors>;

/** Prefer the API's `error` string, then the error message, then a fallback. */
export function apiErrorMessage(e: unknown, fallback: string): string {
  if (typeof e === "object" && e !== null) {
    const data = (e as { data?: unknown }).data;
    if (typeof data === "object" && data !== null) {
      const err = (data as { error?: unknown }).error;
      if (typeof err === "string" && err.trim()) return err;
    }
    const msg = (e as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return fallback;
}

export function formatStamp(iso: string, language: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(language === "it" ? "it-IT" : "en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function Notice({ tone, text, colors, testID }: {
  tone: "error" | "success" | "warning" | "info"; text: string; colors: Colors; testID?: string;
}) {
  const c = tone === "error" ? colors.destructive : tone === "success" ? colors.success : tone === "warning" ? colors.warning : colors.primary;
  const icon = tone === "error" ? "alert-circle" : tone === "success" ? "check-circle" : tone === "warning" ? "alert-triangle" : "info";
  return (
    <View testID={testID} style={[s.notice, { backgroundColor: c + "15", borderColor: c + "40" }]}>
      <Feather name={icon} size={14} color={c} style={{ marginTop: 2 }} />
      <Text style={[s.noticeText, { color: tone === "info" ? colors.foreground : c }]}>{text}</Text>
    </View>
  );
}

/** Cross-platform confirmation dialog (no Alert.alert, works on web). */
export function ConfirmDialog({
  visible, title, icon, tone = "primary", pending, error, confirmLabel, pendingLabel, cancelLabel,
  onCancel, onConfirm, confirmDisabled, children, colors, testIDPrefix,
}: {
  visible: boolean; title: string; icon: React.ComponentProps<typeof Feather>["name"];
  tone?: "primary" | "destructive"; pending: boolean; error: string | null;
  confirmLabel: string; pendingLabel: string; cancelLabel: string;
  onCancel: () => void; onConfirm: (() => void) | null; confirmDisabled?: boolean;
  children?: React.ReactNode; colors: Colors; testIDPrefix: string;
}) {
  const c = tone === "destructive" ? colors.destructive : colors.primary;
  const fg = tone === "destructive" ? colors.destructiveForeground : colors.primaryForeground;
  const close = () => { if (!pending) onCancel(); };
  const disabled = pending || !!confirmDisabled;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={s.overlay} testID={`${testIDPrefix}-dialog`} accessibilityViewIsModal>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel={cancelLabel} />
        <View style={[s.dialog, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[s.icon, { backgroundColor: c + "15" }]}>
            <Feather name={icon} size={20} color={c} />
          </View>
          <Text style={[s.title, { color: colors.foreground }]} accessibilityRole="header">{title}</Text>
          {children}
          {error ? <Notice tone="error" text={error} colors={colors} testID={`${testIDPrefix}-error`} /> : null}
          <View style={s.actions}>
            <Pressable
              testID={`${testIDPrefix}-cancel`} accessibilityRole="button" disabled={pending} onPress={close}
              style={[s.btn, { borderColor: colors.border, opacity: pending ? 0.5 : 1 }]}
            >
              <Text style={[s.btnText, { color: colors.foreground }]}>{onConfirm ? cancelLabel : confirmLabel}</Text>
            </Pressable>
            {onConfirm ? (
              <Pressable
                testID={`${testIDPrefix}-confirm`} accessibilityRole="button"
                accessibilityState={{ disabled, busy: pending }} disabled={disabled} onPress={onConfirm}
                style={[s.btn, { backgroundColor: c, borderColor: c, opacity: disabled && !pending ? 0.45 : 1 }]}
              >
                {pending ? <ActivityIndicator size="small" color={fg} /> : null}
                <Text style={[s.btnText, { color: fg }]} numberOfLines={1}>{pending ? pendingLabel : confirmLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export const s = StyleSheet.create({
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 10, borderWidth: 1, padding: 12 },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: "Inter_400Regular" },
  overlay: { flex: 1, backgroundColor: "rgba(7,30,42,0.55)", alignItems: "center", justifyContent: "center", padding: 20 },
  dialog: { width: "100%", maxWidth: 460, maxHeight: "90%", borderRadius: 16, borderWidth: 1, padding: 20, gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  btn: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  btnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  kvRow: { borderRadius: 10, padding: 12, gap: 2 },
  kvLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.5 },
  kvValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  body: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  previewBox: { borderRadius: 10, borderWidth: 1, padding: 12, gap: 6 },
  previewText: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
});
