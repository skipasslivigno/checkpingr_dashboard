import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";

type FieldKey = "current" | "next" | "confirm";

function utf8Bytes(s: string): number {
  return unescape(encodeURIComponent(s)).length;
}

export default function ChangePasswordScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { user, mustChangePassword, changeOwnPassword, logout } = useAuth();

  const [values, setValues] = useState<Record<FieldKey, string>>({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState<Record<FieldKey, boolean>>({ current: false, next: false, confirm: false });
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function setValue(k: FieldKey, v: string) {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
    setFormError(null);
  }

  function validate(): boolean {
    const e: Partial<Record<FieldKey, string>> = {};
    if (!mustChangePassword && !values.current) e.current = t.cpErrCurrent;
    if (values.next.length < 8) e.next = t.cpErrMin;
    else if (utf8Bytes(values.next) > 72) e.next = t.cpErrMax;
    else if (!mustChangePassword && values.next === values.current) e.next = t.cpErrSame;
    if (!e.next && values.confirm !== values.next) e.confirm = t.cpErrMatch;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (saving || !validate()) return;
    setSaving(true);
    setFormError(null);
    try {
      await changeOwnPassword(mustChangePassword ? undefined : values.current, values.next);
      // AuthGuard redirects to the dashboard once the flag is cleared.
    } catch (e) {
      const code = (e as { data?: { code?: string } })?.data?.code;
      if (code === "INVALID_CURRENT_PASSWORD") setErrors({ current: t.cpErrWrong });
      else if (code === "PASSWORD_REUSED") setErrors({ next: t.cpErrSame });
      else if (code === "INVALID_PASSWORD") setErrors({ next: t.cpErrMax });
      else setFormError(t.cpErrGeneric);
      setSaving(false);
    }
  }

  const fields: { key: FieldKey; label: string; testID: string }[] = [
    ...(!mustChangePassword ? [{ key: "current" as const, label: t.cpCurrent, testID: "cp-current" }] : []),
    { key: "next", label: t.cpNew, testID: "cp-new" },
    { key: "confirm", label: t.cpConfirm, testID: "cp-confirm" },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={styles.container}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primary }]}>
            <Feather name="key" size={30} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]} accessibilityRole="header">{t.cpTitle}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t.cpSubtitle}</Text>
          {user ? <Text style={[styles.email, { color: colors.foreground }]}>{user.email}</Text> : null}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {fields.map(({ key, label, testID }, i) => {
            const err = errors[key];
            return (
              <View key={key} style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
                <View style={[styles.inputWrap, { borderColor: err ? colors.destructive : colors.input, backgroundColor: colors.background }]}>
                  <Feather name="lock" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                  <TextInput
                    testID={testID}
                    accessibilityLabel={label}
                    style={[styles.input, { color: colors.foreground }]}
                    value={values[key]}
                    onChangeText={(v) => setValue(key, v)}
                    secureTextEntry={!show[key]}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType={key === "current" ? "password" : "newPassword"}
                    autoComplete={key === "current" ? "current-password" : "new-password"}
                    returnKeyType={i === fields.length - 1 ? "done" : "next"}
                    onSubmitEditing={i === fields.length - 1 ? submit : undefined}
                    placeholder={label}
                    placeholderTextColor={colors.mutedForeground}
                    editable={!saving}
                  />
                  <Pressable
                    testID={`${testID}-toggle`}
                    accessibilityRole="button"
                    onPress={() => setShow((s) => ({ ...s, [key]: !s[key] }))}
                    style={styles.eyeBtn}
                  >
                    <Feather name={show[key] ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
                  </Pressable>
                </View>
                {err ? (
                  <Text testID={`${testID}-error`} style={[styles.fieldError, { color: colors.destructive }]}>{err}</Text>
                ) : null}
              </View>
            );
          })}

          {formError ? (
            <View testID="cp-error" style={[styles.errorBox, { backgroundColor: colors.destructive + "18", borderColor: colors.destructive + "40" }]}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{formError}</Text>
            </View>
          ) : null}

          <Pressable
            testID="cp-submit"
            accessibilityRole="button"
            accessibilityState={{ disabled: saving, busy: saving }}
            style={[styles.button, { backgroundColor: colors.primary }, saving && styles.buttonDisabled]}
            onPress={submit}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color={colors.primaryForeground} /> : null}
            <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>{saving ? t.cpSaving : t.cpSubmit}</Text>
          </Pressable>
        </View>

        <Pressable testID="cp-logout" accessibilityRole="button" onPress={() => logout()} disabled={saving} style={styles.logout}>
          <Feather name="log-out" size={15} color={colors.mutedForeground} />
          <Text style={[styles.logoutText, { color: colors.mutedForeground }]}>{t.logout}</Text>
        </Pressable>
      </KeyboardAwareScrollViewCompat>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, gap: 24,
    paddingTop: Platform.OS === "web" ? 67 : 24, paddingBottom: Platform.OS === "web" ? 34 : 24,
    width: "100%", maxWidth: 480, alignSelf: "center",
  },
  header: { alignItems: "center", gap: 8 },
  iconWrap: { width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.5, textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  email: { fontSize: 13, fontFamily: "Inter_500Medium" },
  card: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, height: 46 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  eyeBtn: { padding: 4 },
  fieldError: { fontSize: 12, fontFamily: "Inter_400Regular" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 8, borderWidth: 1, padding: 10 },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  button: { height: 48, borderRadius: 12, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 4 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  logout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 10 },
  logoutText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
