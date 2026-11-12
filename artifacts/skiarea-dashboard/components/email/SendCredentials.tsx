import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  getGetUsersQueryKey,
  usePreviewCredentialEmail,
  useSendUserCredentials,
} from "@workspace/api-client-react";
import type { EmailPreview, EmailSettings, User } from "@workspace/api-client-react";
import { useTranslation } from "@/contexts/LanguageContext";
import { ConfirmDialog, Notice, apiErrorMessage, formatStamp, s } from "./shared";
import type { Colors } from "./shared";

/** Per-row cell: last-send status + Send credentials action. */
export function SendCredentialsCell({ user, onSend, colors, width }: {
  user: User; onSend: (u: User) => void; colors: Colors; width: number;
}) {
  const { t, language } = useTranslation();
  const disabled = !user.isActive;
  return (
    <View style={{ width, paddingRight: 12, paddingVertical: 8, gap: 4 }}>
      <Pressable
        testID={`send-credentials-${user.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${t.emSendCreds}: ${user.name}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => onSend(user)}
        style={[cs.btn, { borderColor: disabled ? colors.border : colors.primary + "60", backgroundColor: colors.card, opacity: disabled ? 0.4 : 1 }]}
      >
        <Feather name="send" size={13} color={disabled ? colors.mutedForeground : colors.primary} />
        <Text style={[cs.btnText, { color: disabled ? colors.mutedForeground : colors.primary }]} numberOfLines={1}>
          {t.emSendCreds}
        </Text>
      </Pressable>
      <Text testID={`credentials-status-${user.id}`} style={[cs.status, { color: colors.mutedForeground }]} numberOfLines={1}>
        {disabled ? t.emInactive : user.credentialsSentAt ? formatStamp(user.credentialsSentAt, language) : t.emNeverSent}
      </Text>
    </View>
  );
}

/** Confirmation flow: preview targeted at user using saved template, then explicit reset+send. */
export function SendCredentialsDialog({ user, settings, isSelf, onClose, colors }: {
  user: User | null; settings: EmailSettings | undefined; isSelf: boolean; onClose: () => void; colors: Colors;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const preview = usePreviewCredentialEmail();
  const send = useSendUserCredentials();
  const [previewData, setPreviewData] = useState<EmailPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [successFor, setSuccessFor] = useState<string | null>(null);
  const previewRef = useRef(preview.mutateAsync);
  previewRef.current = preview.mutateAsync;
  const [reloadKey, setReloadKey] = useState(0);

  const userId = user?.id;
  useEffect(() => {
    setError(null); setSuccessFor(null); setPreviewData(null); setPreviewError(null);
    if (!userId || !settings) return;
    let alive = true;
    setPreviewLoading(true);
    previewRef.current({ data: { loginUrl: settings.loginUrl, subject: settings.subject, body: settings.body, userId } })
      .then((p) => { if (alive) setPreviewData(p); })
      .catch((e) => { if (alive) setPreviewError(apiErrorMessage(e, t.emErrorGeneric)); })
      .finally(() => { if (alive) setPreviewLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, settings?.loginUrl, settings?.subject, settings?.body, reloadKey]);

  async function confirm() {
    if (!user || pending || previewLoading || previewError || !previewData) return;
    setPending(true); setError(null);
    try {
      const receipt = await send.mutateAsync({ id: user.id, data: { confirmReset: true, expectedEmail: user.email } });
      setSuccessFor(receipt.recipient || user.email);
      await queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
    } catch (e) {
      setError(apiErrorMessage(e, t.emErrorGeneric));
    } finally {
      setPending(false);
    }
  }

  if (!user) return null;
  const sender = previewData?.senderEmail ?? settings?.senderEmail ?? "";

  if (successFor) {
    return (
      <ConfirmDialog
        visible title={t.emSendCreds} icon="check-circle" pending={false} error={null}
        confirmLabel={t.emClose} pendingLabel="" cancelLabel={t.emClose}
        onCancel={onClose} onConfirm={null} colors={colors} testIDPrefix="send-credentials-done"
      >
        <Notice tone="success" testID="send-credentials-success" text={t.emSendSuccess.replace("{email}", successFor)} colors={colors} />
      </ConfirmDialog>
    );
  }

  return (
    <ConfirmDialog
      visible title={t.emSendTitle} icon="send" tone="destructive" pending={pending} error={error}
      confirmLabel={t.emSendConfirm} pendingLabel={t.emSending} cancelLabel={t.emCancel}
      onCancel={onClose} onConfirm={confirm} confirmDisabled={previewLoading || !!previewError || !previewData}
      colors={colors} testIDPrefix="send-credentials"
    >
      <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 10 }}>
        <View style={[s.kvRow, { backgroundColor: colors.secondary }]}>
          <Text style={[s.kvLabel, { color: colors.mutedForeground }]}>{t.emSendFrom.toUpperCase()}</Text>
          <Text testID="send-credentials-sender" style={[s.kvValue, { color: colors.foreground }]}>{sender}</Text>
          <Text style={[s.kvLabel, { color: colors.mutedForeground, marginTop: 8 }]}>{t.emSendTo.toUpperCase()}</Text>
          <Text testID="send-credentials-recipient" style={[s.kvValue, { color: colors.foreground }]}>{user.name} · {user.email}</Text>
        </View>
        <Notice tone="warning" text={t.emSendWarn} colors={colors} />
        {isSelf ? <Notice tone="warning" testID="send-credentials-self-warning" text={t.emSendSelfWarn} colors={colors} /> : null}
        <View testID="send-credentials-preview" style={[s.previewBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <Text style={[s.kvLabel, { color: colors.mutedForeground }]}>{t.emPreview.toUpperCase()}</Text>
          {previewLoading ? (
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[s.previewText, { color: colors.mutedForeground }]}>{t.emSendPreviewLoading}</Text>
            </View>
          ) : previewError ? (
            <View style={{ gap: 6 }}>
              <Text style={[s.previewText, { color: colors.destructive }]}>{previewError}</Text>
              <Pressable testID="send-credentials-preview-retry" onPress={() => setReloadKey((k) => k + 1)}>
                <Text style={[s.previewText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>{t.emRetry}</Text>
              </Pressable>
            </View>
          ) : previewData ? (
            <>
              <Text style={[s.kvValue, { color: colors.foreground }]}>{previewData.subject}</Text>
              <Text style={[s.previewText, { color: colors.foreground }]}>{previewData.text}</Text>
              <Text style={[s.previewText, { color: colors.mutedForeground, fontStyle: "italic" }]}>{t.emPreviewNote}</Text>
            </>
          ) : null}
        </View>
      </ScrollView>
    </ConfirmDialog>
  );
}

const cs = StyleSheet.create({
  btn: { flexDirection: "row", alignItems: "center", gap: 6, height: 30, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, alignSelf: "flex-start" },
  btnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  status: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
