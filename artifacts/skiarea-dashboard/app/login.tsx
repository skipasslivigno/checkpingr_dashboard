import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";

export default function LoginScreen() {
  const colors = useColors();
  const { login } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.loginError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primary }]}>
              <Feather name="activity" size={36} color={colors.primaryForeground} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {t.loginTitle}
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {t.loginSubtitle}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                {t.loginEmail}
              </Text>
              <View style={[styles.inputWrap, { borderColor: colors.input, backgroundColor: colors.background }]}>
                <Feather name="mail" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="next"
                  placeholderTextColor={colors.mutedForeground}
                  placeholder={t.loginEmail}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                {t.loginPassword}
              </Text>
              <View style={[styles.inputWrap, { borderColor: colors.input, backgroundColor: colors.background }]}>
                <Feather name="lock" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  placeholderTextColor={colors.mutedForeground}
                  placeholder={t.loginPassword}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={16}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              </View>
            </View>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.destructive + "18", borderColor: colors.destructive + "40" }]}>
                <Feather name="alert-circle" size={14} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              style={[
                styles.button,
                { backgroundColor: colors.primary },
                (loading || !email || !password) && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading || !email || !password}
            >
              {loading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
                  {t.loginButton}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 28,
  },
  header: {
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  field: { gap: 6 },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  eyeBtn: { padding: 4 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  button: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
