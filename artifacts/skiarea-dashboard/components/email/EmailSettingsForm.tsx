import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  getGetEmailSettingsQueryKey,
  useDeleteEmailSettings,
  usePreviewCredentialEmail,
  useSaveEmailSettings,
  useSendTestEmail,
} from "@workspace/api-client-react";
import type { EmailPreview, EmailSettings, EmailSettingsInput } from "@workspace/api-client-react";
import { useTranslation } from "@/contexts/LanguageContext";
import { ConfirmDialog, Notice, apiErrorMessage, s } from "./shared";
import type { Colors } from "./shared";

const APP_PASSWORDS_URL = "https://myaccount.google.com/apppasswords";

interface Draft { senderName: string; loginUrl: string; subject: string; body: string }
const toDraft = (x: EmailSettings): Draft => ({ senderName: x.senderName, loginUrl: x.loginUrl, subject: x.subject, body: x.body });
const same = (a: Draft, b: Draft) => a.senderName === b.senderName && a.loginUrl === b.loginUrl && a.subject === b.subject && a.body === b.body;

export function EmailSettingsForm({ settings, colors }: { settings: EmailSettings; colors: Colors }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const save = useSaveEmailSettings();
  const del = useDeleteEmailSettings();
  const test = useSendTestEmail();
  const preview = usePreviewCredentialEmail();

  // Initialize once; later refetches never overwrite in-progress edits.
  const [draft, setDraft] = useState<Draft>(() => toDraft(settings));
  const [baseline, setBaseline] = useState<Draft>(() => toDraft(settings));
  const [appPassword, setAppPassword] = useState("");
  const [saved, setSaved] = useState<EmailSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [previewData, setPreviewData] = useState<EmailPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [testPending, setTestPending] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Never keep the typed secret around after leaving the screen.
  useEffect(() => () => setAppPassword(""), []);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const dirty = !same(draft, baseline) || appPassword.length > 0;
  const canTest = saved.configured && saved.hasPassword && !dirty && !saving;

  function set<K extends keyof Draft>(k: K, v: string) {
    setDraft((d) => ({ ...d, [k]: v }));
    setNotice(null); setTestResult(null);
  }

  async function handleSave() {
    if (saving) return;
    const d = { senderName: draft.senderName.trim(), loginUrl: draft.loginUrl.trim(), subject: draft.subject, body: draft.body };
    if (!d.senderName || !d.loginUrl || !d.subject.trim() || !d.body.trim()) {
      setNotice({ tone: "error", text: t.emRequired }); return;
    }
    const data: EmailSettingsInput = { ...d };
    if (appPassword) data.appPassword = appPassword;
    setSaving(true); setNotice(null);
    try {
      const res = await save.mutateAsync({ data });
      if (!mounted.current) return;
      setAppPassword("");
      setSaved(res);
      setDraft(toDraft(res)); setBaseline(toDraft(res));
      queryClient.setQueryData(getGetEmailSettingsQueryKey(), res);
      setNotice({ tone: "success", text: t.emSaved });
    } catch (e) {
      if (mounted.current) setNotice({ tone: "error", text: apiErrorMessage(e, t.emErrorGeneric) });
    } finally {
      if (mounted.current) setSaving(false);
    }
  }

  async function handlePreview() {
    if (previewing) return;
    setPreviewing(true); setPreviewError(null);
    try {
      const p = await preview.mutateAsync({ data: { loginUrl: draft.loginUrl.trim(), subject: draft.subject, body: draft.body } });
      setPreviewData(p);
    } catch (e) {
      setPreviewData(null);
      setPreviewError(apiErrorMessage(e, t.emErrorGeneric));
    } finally { setPreviewing(false); }
  }

  async function confirmTest() {
    if (testPending) return;
    setTestPending(true); setTestError(null);
    try {
      const r = await test.mutateAsync();
      setTestResult(t.emTestSent.replace("{email}", r.recipient || saved.senderEmail));
      setTestOpen(false);
    } catch (e) {
      setTestError(apiErrorMessage(e, t.emErrorGeneric));
    } finally { setTestPending(false); }
  }

  async function confirmDelete() {
    if (deletePending) return;
    setDeletePending(true); setDeleteError(null);
    try {
      await del.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: getGetEmailSettingsQueryKey() });
      const fresh = queryClient.getQueryData<EmailSettings>(getGetEmailSettingsQueryKey());
      const next: EmailSettings = fresh ?? { ...saved, senderName: "", loginUrl: "", subject: saved.defaultSubject, body: saved.defaultBody, hasPassword: false, configured: false };
      setSaved(next); setDraft(toDraft(next)); setBaseline(toDraft(next));
      setAppPassword(""); setPreviewData(null); setTestResult(null);
      setNotice({ tone: "success", text: t.emDeleted });
      setDeleteOpen(false);
    } catch (e) {
      setDeleteError(apiErrorMessage(e, t.emErrorGeneric));
    } finally { setDeletePending(false); }
  }

  const input = [st.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }];
  const label = [st.label, { color: colors.mutedForeground }];
  const card = [st.card, { backgroundColor: colors.card, borderColor: colors.border }];

  return (
    <View style={{ gap: 16 }}>
      {/* Status */}
      <View testID="email-settings-status" style={card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={[st.dot, { backgroundColor: saved.configured ? colors.success : colors.mutedForeground }]} />
          <Text style={[st.h, { color: colors.foreground }]}>{saved.configured ? t.emStatusConfigured : t.emStatusNotConfigured}</Text>
          {dirty ? <Text testID="email-settings-unsaved" style={[st.pill, { color: colors.warning, borderColor: colors.warning + "60" }]}>{t.emUnsaved}</Text> : null}
        </View>
        <Text style={[st.hint, { color: colors.mutedForeground }]}>{t.emStatusNote}</Text>
        <Text style={[st.hint, { color: colors.mutedForeground }]}>{t.emSmtpInfo}</Text>
      </View>

      {/* Guidance */}
      <View style={card}>
        <Text style={[st.h, { color: colors.foreground }]}>{t.emGuideTitle}</Text>
        <Text style={[st.p, { color: colors.foreground }]}>{t.emGuide1}</Text>
        <Text style={[st.p, { color: colors.foreground }]}>{t.emGuide2}</Text>
        <Pressable testID="email-settings-apppasswords-link" accessibilityRole="link" onPress={() => Linking.openURL(APP_PASSWORDS_URL)}>
          <Text style={[st.p, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>{APP_PASSWORDS_URL}</Text>
        </Pressable>
        <Text style={[st.p, { color: colors.foreground }]}>{t.emGuide3}</Text>
        <Notice tone="warning" text={t.emGuideWorkspace} colors={colors} />
      </View>

      {notice ? <Notice tone={notice.tone} text={notice.text} colors={colors} testID={`email-settings-${notice.tone}`} /> : null}

      {/* Account */}
      <View style={card}>
        <View style={st.field}>
          <Text style={label}>{t.emSender.toUpperCase()}</Text>
          <View style={[st.input, st.readonly, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Text testID="email-settings-sender-email" style={{ color: colors.foreground, fontFamily: "Inter_500Medium" }} numberOfLines={1}>{saved.senderEmail}</Text>
          </View>
          <Text style={[st.hint, { color: colors.mutedForeground }]}>{t.emSenderHint}</Text>
        </View>
        <View style={st.field}>
          <Text style={label}>{t.emSenderName.toUpperCase()}</Text>
          <TextInput testID="email-settings-sender-name" style={input} value={draft.senderName} onChangeText={(v) => set("senderName", v)}
            maxLength={120} placeholder={t.emSenderName} placeholderTextColor={colors.mutedForeground} />
        </View>
        <View style={st.field}>
          <Text style={label}>{t.emAppPassword.toUpperCase()}</Text>
          <TextInput testID="email-settings-app-password" style={input} value={appPassword}
            onChangeText={(v) => { setAppPassword(v); setNotice(null); }}
            secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="off" textContentType="none"
            maxLength={64} placeholder="xxxx xxxx xxxx xxxx" placeholderTextColor={colors.mutedForeground} />
          <Text style={[st.hint, { color: colors.mutedForeground }]}>{t.emAppPasswordHint}</Text>
          <Text testID="email-settings-has-password" style={[st.hint, { color: saved.hasPassword ? colors.success : colors.warning }]}>
            {saved.hasPassword ? t.emAppPasswordSaved : t.emAppPasswordMissing}
          </Text>
        </View>
        <View style={st.field}>
          <Text style={label}>{t.emLoginUrl.toUpperCase()}</Text>
          <TextInput testID="email-settings-login-url" style={input} value={draft.loginUrl} onChangeText={(v) => set("loginUrl", v)}
            autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://" placeholderTextColor={colors.mutedForeground} />
          <Text style={[st.hint, { color: colors.mutedForeground }]}>{t.emLoginUrlHint}</Text>
        </View>
      </View>

      {/* Template */}
      <View style={card}>
        <View style={st.field}>
          <Text style={label}>{t.emSubject.toUpperCase()}</Text>
          <TextInput testID="email-settings-subject" style={input} value={draft.subject} onChangeText={(v) => set("subject", v)}
            maxLength={200} placeholderTextColor={colors.mutedForeground} />
        </View>
        <View style={st.field}>
          <Text style={label}>{t.emBody.toUpperCase()}</Text>
          <TextInput testID="email-settings-body" style={[input, st.textarea]} value={draft.body} onChangeText={(v) => set("body", v)}
            multiline maxLength={12000} textAlignVertical="top" placeholderTextColor={colors.mutedForeground} />
        </View>
        {saved.placeholders.length ? (
          <View style={st.field}>
            <Text style={label}>{t.emPlaceholders.toUpperCase()}</Text>
            <View style={st.chips}>
              {saved.placeholders.map((p) => (
                <Text key={p} testID={`email-settings-placeholder-${p}`} selectable style={[st.chip, { color: colors.primary, backgroundColor: colors.primary + "12" }]}>{`{{${p}}}`}</Text>
              ))}
            </View>
          </View>
        ) : null}
        <Pressable testID="email-settings-reset-defaults" accessibilityRole="button"
          onPress={() => { setDraft((d) => ({ ...d, subject: saved.defaultSubject, body: saved.defaultBody })); setNotice(null); }}
          style={[st.ghost, { borderColor: colors.border }]}>
          <Feather name="rotate-ccw" size={14} color={colors.foreground} />
          <Text style={[st.btnText, { color: colors.foreground }]}>{t.emResetDefaults}</Text>
        </Pressable>
      </View>

      {/* Preview */}
      <View style={card}>
        <Pressable testID="email-settings-preview" accessibilityRole="button" disabled={previewing} onPress={handlePreview}
          style={[st.ghost, { borderColor: colors.primary + "60", opacity: previewing ? 0.6 : 1 }]}>
          {previewing ? <ActivityIndicator size="small" color={colors.primary} /> : <Feather name="eye" size={14} color={colors.primary} />}
          <Text style={[st.btnText, { color: colors.primary }]}>{previewing ? t.emPreviewing : t.emPreview}</Text>
        </Pressable>
        {previewError ? <Notice tone="error" testID="email-settings-preview-error" text={previewError} colors={colors} /> : null}
        {previewData ? (
          <View testID="email-settings-preview-result" style={[s.previewBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Notice tone="info" text={t.emPreviewNote} colors={colors} />
            <Text style={[s.kvLabel, { color: colors.mutedForeground }]}>{t.emPreviewSubject.toUpperCase()}</Text>
            <Text style={[s.kvValue, { color: colors.foreground }]}>{previewData.subject}</Text>
            <Text style={[s.previewText, { color: colors.foreground }]}>{previewData.text}</Text>
          </View>
        ) : null}
      </View>

      {/* Actions */}
      <Pressable testID="email-settings-save" accessibilityRole="button" accessibilityState={{ disabled: saving, busy: saving }}
        disabled={saving} onPress={handleSave} style={[st.primary, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}>
        {saving ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : <Feather name="save" size={16} color={colors.primaryForeground} />}
        <Text style={[st.btnText, { color: colors.primaryForeground }]}>{saving ? t.emSaving : t.emSave}</Text>
      </Pressable>

      <View style={card}>
        <Pressable testID="email-settings-test" accessibilityRole="button" accessibilityState={{ disabled: !canTest }}
          disabled={!canTest} onPress={() => { setTestError(null); setTestOpen(true); }}
          style={[st.ghost, { borderColor: colors.primary + "60", opacity: canTest ? 1 : 0.4 }]}>
          <Feather name="send" size={14} color={colors.primary} />
          <Text style={[st.btnText, { color: colors.primary }]}>{t.emTest}</Text>
        </Pressable>
        {!canTest ? <Text style={[st.hint, { color: colors.mutedForeground }]}>{t.emTestDisabled}</Text> : null}
        {testResult ? <Notice tone="success" testID="email-settings-test-result" text={testResult} colors={colors} /> : null}
      </View>

      <Pressable testID="email-settings-delete" accessibilityRole="button" disabled={!saved.configured && !saved.hasPassword}
        onPress={() => { setDeleteError(null); setDeleteOpen(true); }}
        style={[st.ghost, { borderColor: colors.destructive + "50", opacity: !saved.configured && !saved.hasPassword ? 0.4 : 1 }]}>
        <Feather name="trash-2" size={14} color={colors.destructive} />
        <Text style={[st.btnText, { color: colors.destructive }]}>{t.emDelete}</Text>
      </Pressable>

      <ConfirmDialog visible={testOpen} title={t.emTestConfirmTitle} icon="send" pending={testPending} error={testError}
        confirmLabel={t.emTest} pendingLabel={t.emTesting} cancelLabel={t.emCancel}
        onCancel={() => setTestOpen(false)} onConfirm={confirmTest} colors={colors} testIDPrefix="email-test">
        <Text style={[s.body, { color: colors.mutedForeground }]}>{t.emTestConfirmBody}</Text>
        <View style={[s.kvRow, { backgroundColor: colors.secondary }]}>
          <Text testID="email-test-recipient" style={[s.kvValue, { color: colors.foreground }]}>{saved.senderEmail}</Text>
        </View>
      </ConfirmDialog>

      <ConfirmDialog visible={deleteOpen} title={t.emDeleteTitle} icon="trash-2" tone="destructive" pending={deletePending} error={deleteError}
        confirmLabel={t.emDelete} pendingLabel={t.emDeleting} cancelLabel={t.emCancel}
        onCancel={() => setDeleteOpen(false)} onConfirm={confirmDelete} colors={colors} testIDPrefix="email-delete">
        <Text style={[s.body, { color: colors.mutedForeground }]}>{t.emDeleteBody}</Text>
      </ConfirmDialog>
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  h: { fontSize: 15, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  p: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  hint: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pill: { fontSize: 11, fontFamily: "Inter_600SemiBold", borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginLeft: "auto" },
  field: { gap: 6 },
  label: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.5 },
  input: { minHeight: 44, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  readonly: { justifyContent: "center" },
  textarea: { minHeight: 200, paddingTop: 10, paddingBottom: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { fontSize: 12, fontFamily: "Inter_500Medium", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, overflow: "hidden" },
  ghost: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 44, borderRadius: 10, borderWidth: 1 },
  primary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 12 },
  btnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
