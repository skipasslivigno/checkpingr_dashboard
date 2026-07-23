import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUpdateSettings, useUploadLogo } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/contexts/LanguageContext";
import { useTenantSettings } from "@/contexts/TenantSettingsContext";

const MAX_COLORS = 10;

function hexValid(s: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(s);
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const colors = useColors();
  const [draft, setDraft] = useState(value);
  const valid = hexValid(draft);

  useEffect(() => { setDraft(value); }, [value]);

  return (
    <View style={styles.colorRow}>
      <View style={[styles.colorSwatch, { backgroundColor: valid ? draft : colors.border }]} />
      <Text style={[styles.colorIndex, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[styles.colorInput, { color: colors.foreground, borderColor: valid ? colors.border : colors.destructive, backgroundColor: colors.card }]}
        value={draft}
        onChangeText={(v) => {
          setDraft(v);
          if (hexValid(v)) onChange(v);
        }}
        placeholder="#RRGGBB"
        placeholderTextColor={colors.mutedForeground}
        maxLength={7}
        autoCapitalize="characters"
      />
    </View>
  );
}

function ColorRow({
  index,
  value,
  onChange,
  onRemove,
}: {
  index: number;
  value: string;
  onChange: (v: string) => void;
  onRemove: () => void;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value);
  const valid = hexValid(draft);

  useEffect(() => { setDraft(value); }, [value]);

  return (
    <View style={styles.colorRow}>
      <View style={[styles.colorSwatch, { backgroundColor: valid ? draft : colors.border }]} />
      <Text style={[styles.colorIndex, { color: colors.mutedForeground }]}>
        {`${t.settingsColor} ${index + 1}`}
      </Text>
      <TextInput
        style={[styles.colorInput, { color: colors.foreground, borderColor: valid ? colors.border : colors.destructive, backgroundColor: colors.card }]}
        value={draft}
        onChangeText={(v) => {
          setDraft(v);
          if (hexValid(v)) onChange(v);
        }}
        placeholder="#RRGGBB"
        placeholderTextColor={colors.mutedForeground}
        maxLength={7}
        autoCapitalize="characters"
      />
      <TouchableOpacity onPress={onRemove} style={styles.removeBtn} activeOpacity={0.7}>
        <Feather name="x" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { logoBase64, primaryColor: savedPrimaryColor, colors: savedColors, maxSeasons, queryKey } = useTenantSettings();

  const [localLogo, setLocalLogo] = useState<string | null>(null);
  const [primaryColorInput, setPrimaryColorInput] = useState(savedPrimaryColor ?? "");
  const [colorList, setColorList] = useState<string[]>(savedColors.length ? savedColors : []);
  const [maxSeasonsInput, setMaxSeasonsInput] = useState(String(maxSeasons));
  const [saving, setSaving] = useState(false);

  useEffect(() => { setPrimaryColorInput(savedPrimaryColor ?? ""); }, [savedPrimaryColor]);
  useEffect(() => { setColorList(savedColors.length ? savedColors : []); }, [savedColors]);
  useEffect(() => { setMaxSeasonsInput(String(maxSeasons)); }, [maxSeasons]);

  const { mutateAsync: patchSettings } = useUpdateSettings();
  const { mutateAsync: patchLogo } = useUploadLogo();

  const displayLogo = localLogo ?? logoBase64;

  async function pickLogo() {
    if (Platform.OS !== "web") {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t.settingsLogoPermission);
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 2],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      const mime = result.assets[0].mimeType ?? "image/jpeg";
      setLocalLogo(`data:${mime};base64,${result.assets[0].base64}`);
    }
  }

  function removeLogo() {
    setLocalLogo("__remove__");
  }

  function addColor() {
    if (colorList.length < MAX_COLORS) {
      setColorList([...colorList, "#0070BA"]);
    }
  }

  function updateColor(i: number, v: string) {
    setColorList(colorList.map((c, idx) => (idx === i ? v : c)));
  }

  function removeColor(i: number) {
    setColorList(colorList.filter((_, idx) => idx !== i));
  }

  async function save() {
    const ms = parseInt(maxSeasonsInput, 10);
    if (isNaN(ms) || ms < 1 || ms > 20) {
      Alert.alert(t.settingsMaxSeasonsError);
      return;
    }
    const validPrimary = hexValid(primaryColorInput) ? primaryColorInput : null;
    const validColors = colorList.filter(hexValid);
    setSaving(true);
    try {
      if (localLogo !== null) {
        const logoBase64Val = localLogo === "__remove__" ? null : localLogo;
        await patchLogo({ data: { logoBase64: logoBase64Val } });
      }
      await patchSettings({ data: { primaryColor: validPrimary, colors: validColors, maxSeasons: ms } });
      await qc.invalidateQueries({ queryKey });
      router.back();
    } catch {
      Alert.alert(t.settingsSaveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t.settingsTitle}</Text>
        <TouchableOpacity onPress={save} style={[styles.saveBtn, { backgroundColor: colors.primary }]} activeOpacity={0.8} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>{t.settingsSave}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        {/* Logo */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.settingsLogo}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.logoRow}>
            {displayLogo && displayLogo !== "__remove__" ? (
              <Image source={{ uri: displayLogo }} style={styles.logoPreview} resizeMode="contain" />
            ) : (
              <View style={[styles.logoPlaceholder, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Feather name="image" size={28} color={colors.mutedForeground} />
                <Text style={[styles.logoPlaceholderText, { color: colors.mutedForeground }]}>{t.settingsNoLogo}</Text>
              </View>
            )}
            <View style={styles.logoActions}>
              <TouchableOpacity onPress={pickLogo} style={[styles.actionBtn, { backgroundColor: colors.primary }]} activeOpacity={0.8}>
                <Feather name="upload" size={15} color={colors.primaryForeground} />
                <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>{t.settingsUploadLogo}</Text>
              </TouchableOpacity>
              {(displayLogo && displayLogo !== "__remove__") && (
                <TouchableOpacity onPress={removeLogo} style={[styles.actionBtn, { backgroundColor: colors.destructive + "18", borderWidth: 1, borderColor: colors.destructive + "40" }]} activeOpacity={0.8}>
                  <Feather name="trash-2" size={15} color={colors.destructive} />
                  <Text style={[styles.actionBtnText, { color: colors.destructive }]}>{t.settingsRemoveLogo}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Primary color */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.settingsPrimaryColor}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardHint, { color: colors.mutedForeground }]}>{t.settingsPrimaryColorHint}</Text>
          <ColorInput
            label={t.settingsPrimaryColorLabel}
            value={primaryColorInput}
            onChange={setPrimaryColorInput}
          />
        </View>

        {/* Chart colors */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.settingsColors}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardHint, { color: colors.mutedForeground }]}>{t.settingsColorsHint}</Text>
          {colorList.map((c, i) => (
            <ColorRow key={i} index={i} value={c} onChange={(v) => updateColor(i, v)} onRemove={() => removeColor(i)} />
          ))}
          {colorList.length < MAX_COLORS && (
            <TouchableOpacity onPress={addColor} style={[styles.addColorBtn, { borderColor: colors.border }]} activeOpacity={0.7}>
              <Feather name="plus" size={16} color={colors.primary} />
              <Text style={[styles.addColorText, { color: colors.primary }]}>{t.settingsAddColor}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Max Seasons */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.settingsMaxSeasons}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardHint, { color: colors.mutedForeground }]}>{t.settingsMaxSeasonsHint}</Text>
          <View style={styles.maxSeasonsRow}>
            <Pressable
              onPress={() => setMaxSeasonsInput(String(Math.max(1, parseInt(maxSeasonsInput || "1") - 1)))}
              style={[styles.stepper, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            >
              <Feather name="minus" size={18} color={colors.foreground} />
            </Pressable>
            <TextInput
              style={[styles.maxSeasonsInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={maxSeasonsInput}
              onChangeText={(v) => setMaxSeasonsInput(v.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              maxLength={2}
              textAlign="center"
            />
            <Pressable
              onPress={() => setMaxSeasonsInput(String(Math.min(20, parseInt(maxSeasonsInput || "0") + 1)))}
              style={[styles.stepper, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            >
              <Feather name="plus" size={18} color={colors.foreground} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: "Inter_600SemiBold" },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, minWidth: 70, alignItems: "center" },
  saveBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  content: { padding: 16, gap: 8 },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textTransform: "uppercase", marginTop: 12, marginBottom: 4 },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 12 },
  cardHint: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 16, flexWrap: "wrap" },
  logoPreview: { width: 120, height: 60, borderRadius: 8 },
  logoPlaceholder: { width: 120, height: 60, borderRadius: 8, borderWidth: 1, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 4 },
  logoPlaceholderText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  logoActions: { gap: 8, flex: 1 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: "flex-start" },
  actionBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  colorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  colorSwatch: { width: 28, height: 28, borderRadius: 6 },
  colorIndex: { width: 80, fontSize: 12, fontFamily: "Inter_400Regular" },
  colorInput: { flex: 1, height: 36, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  removeBtn: { padding: 6 },
  addColorBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, borderTopWidth: 1, marginTop: 4, justifyContent: "center" },
  addColorText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  maxSeasonsRow: { flexDirection: "row", alignItems: "center", gap: 12, justifyContent: "center" },
  stepper: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  maxSeasonsInput: { width: 64, height: 44, borderWidth: 1, borderRadius: 10, fontSize: 22, fontFamily: "Inter_600SemiBold" },
});
