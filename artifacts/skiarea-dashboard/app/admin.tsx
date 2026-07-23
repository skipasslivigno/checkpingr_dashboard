import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useGetUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from "@workspace/api-client-react";
import type { User } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useResponsive, CONTENT_MAX_WIDTH } from "@/hooks/useResponsive";

type Role = "admin" | "operator" | "viewer";

interface FormState {
  name: string;
  email: string;
  password: string;
  role: Role;
  isActive: boolean;
}

const EMPTY_FORM: FormState = { name: "", email: "", password: "", role: "viewer", isActive: true };

function initials(name: string): string {
  return name.split(" ").map((p) => p[0] ?? "").join("").toUpperCase().slice(0, 2) || "?";
}

function RolePicker({ value, onChange, colors, t }: {
  value: Role;
  onChange: (r: Role) => void;
  colors: ReturnType<typeof useColors>;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const roles: Role[] = ["admin", "operator", "viewer"];
  const labels: Record<Role, string> = { admin: t.roleAdmin, operator: t.roleOperator, viewer: t.roleViewer };
  return (
    <View style={pickerStyles.row}>
      {roles.map((r) => {
        const active = r === value;
        return (
          <TouchableOpacity
            key={r}
            style={[
              pickerStyles.btn,
              { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : colors.card },
            ]}
            onPress={() => onChange(r)}
            activeOpacity={0.7}
          >
            <Text style={[pickerStyles.label, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
              {labels[r]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  btn: { flex: 1, height: 36, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
});

function UserRow({ user, onEdit, currentUserId, colors, t }: {
  user: User;
  onEdit: (u: User) => void;
  currentUserId: string;
  colors: ReturnType<typeof useColors>;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const isSelf = user.id === currentUserId;
  const roleColor = user.role === "admin" ? colors.primary : user.role === "operator" ? "#E07B00" : colors.mutedForeground;
  const roleLabel = user.role === "admin" ? t.roleAdmin : user.role === "operator" ? t.roleOperator : t.roleViewer;

  return (
    <TouchableOpacity
      style={[styles.userRow, { backgroundColor: colors.card, borderColor: colors.border, opacity: user.isActive ? 1 : 0.55 }]}
      onPress={() => onEdit(user)}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: roleColor + "20" }]}>
        <Text style={[styles.initials, { color: roleColor }]}>{initials(user.name)}</Text>
      </View>
      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>{user.name}</Text>
          {isSelf && <Text style={[styles.selfTag, { color: colors.mutedForeground }]}> (tu)</Text>}
        </View>
        <Text style={[styles.userEmail, { color: colors.mutedForeground }]} numberOfLines={1}>{user.email}</Text>
        <View style={styles.badgesRow}>
          <View style={[styles.roleBadge, { backgroundColor: roleColor + "18" }]}>
            <Text style={[styles.roleBadgeText, { color: roleColor }]}>{roleLabel}</Text>
          </View>
          <View style={[styles.statusDot, { backgroundColor: user.isActive ? colors.success : colors.border }]} />
          <Text style={[styles.statusLabel, { color: user.isActive ? colors.success : colors.mutedForeground }]}>
            {user.isActive ? t.adminActive : t.adminInactive}
          </Text>
        </View>
      </View>
      <Feather name="edit-2" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

export default function AdminScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isWide } = useResponsive();

  const { data: users = [], isLoading, refetch } = useGetUsers();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalVisible(true);
  }

  function openEdit(u: User) {
    setEditingUser(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role as Role, isActive: u.isActive });
    setFormError(null);
    setModalVisible(true);
  }

  function closeModal() {
    if (saving) return;
    setModalVisible(false);
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["getUsers"] });
  }

  async function handleSave() {
    setFormError(null);
    const { name, email, password, role, isActive } = form;
    if (!name.trim()) { setFormError(t.adminName + " " + t.adminPasswordMin.toLowerCase()); return; }
    if (!editingUser && !email.trim()) { setFormError(t.adminEmail); return; }
    if (!editingUser && password.length < 8) { setFormError(t.adminPasswordMin); return; }
    if (editingUser && password && password.length < 8) { setFormError(t.adminPasswordMin); return; }

    setSaving(true);
    try {
      if (editingUser) {
        const data: { name: string; role: Role; isActive: boolean; password?: string } = { name: name.trim(), role, isActive };
        if (password) data.password = password;
        await new Promise<void>((resolve, reject) => {
          updateMutation.mutate({ id: editingUser.id, data }, {
            onSuccess: () => { invalidate(); resolve(); },
            onError: () => reject(new Error(t.adminErrorUpdate)),
          });
        });
      } else {
        await new Promise<void>((resolve, reject) => {
          createMutation.mutate({ data: { email: email.trim(), name: name.trim(), password, role } }, {
            onSuccess: () => { invalidate(); resolve(); },
            onError: () => reject(new Error(t.adminErrorCreate)),
          });
        });
      }
      closeModal();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : t.adminErrorUpdate);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(u: User) {
    Alert.alert(t.adminDelete, t.adminDeleteConfirm, [
      { text: t.adminCancel, style: "cancel" },
      {
        text: t.adminDelete, style: "destructive",
        onPress: () => {
          deleteMutation.mutate({ id: u.id }, {
            onSuccess: () => { invalidate(); closeModal(); },
            onError: () => Alert.alert("Errore", t.adminErrorDelete),
          });
        },
      },
    ]);
  }

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setFormError(null);
  }

  const isEditing = !!editingUser;
  const isSelf = editingUser?.id === me?.id;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t.adminTitle}</Text>
        <TouchableOpacity onPress={openCreate} style={[styles.addBtn, { backgroundColor: colors.primary }]} activeOpacity={0.7}>
          <Feather name="plus" size={20} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      {/* User list */}
      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        contentContainerStyle={[styles.list, isWide && { maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center", width: "100%" }]}
        refreshing={isLoading}
        onRefresh={refetch}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Feather name="users" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.adminNoUsers}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <UserRow user={item} onEdit={openEdit} currentUserId={me?.id ?? ""} colors={colors} t={t} />
        )}
      />

      {/* Create / Edit modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Modal header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={closeModal} activeOpacity={0.7} disabled={saving}>
              <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>{t.adminCancel}</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {isEditing ? t.adminEditUser : t.adminCreateUser}
            </Text>
            <TouchableOpacity onPress={handleSave} activeOpacity={0.7} disabled={saving}>
              <Text style={[styles.modalSave, { color: saving ? colors.mutedForeground : colors.primary }]}>{t.adminSave}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            {/* Error */}
            {formError ? (
              <View style={[styles.errorBox, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "40" }]}>
                <Feather name="alert-circle" size={14} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{formError}</Text>
              </View>
            ) : null}

            {/* Name */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t.adminName.toUpperCase()}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={form.name}
                onChangeText={(v) => setField("name", v)}
                placeholder={t.adminName}
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            {/* Email (only for create) */}
            {!isEditing && (
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t.adminEmail.toUpperCase()}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  value={form.email}
                  onChangeText={(v) => setField("email", v.toLowerCase())}
                  placeholder={t.adminEmail}
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                />
              </View>
            )}

            {isEditing && (
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t.adminEmail.toUpperCase()}</Text>
                <View style={[styles.input, styles.inputDisabled, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Text style={{ color: colors.mutedForeground }}>{editingUser?.email}</Text>
                </View>
              </View>
            )}

            {/* Password */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t.adminPassword.toUpperCase()}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={form.password}
                onChangeText={(v) => setField("password", v)}
                placeholder={isEditing ? t.adminPasswordHint : t.adminPassword}
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
                autoCapitalize="none"
                returnKeyType="next"
              />
              {isEditing && (
                <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>{t.adminPasswordHint}</Text>
              )}
            </View>

            {/* Role */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t.adminRole.toUpperCase()}</Text>
              <RolePicker value={form.role} onChange={(r) => setField("role", r)} colors={colors} t={t} />
            </View>

            {/* Active toggle (edit only, not for self) */}
            {isEditing && !isSelf && (
              <View style={[styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.toggleInfo}>
                  <Text style={[styles.toggleLabel, { color: colors.foreground }]}>
                    {form.isActive ? t.adminActive : t.adminInactive}
                  </Text>
                  <Text style={[styles.toggleHint, { color: colors.mutedForeground }]}>
                    {form.isActive ? t.adminDeactivate : t.adminActivate}
                  </Text>
                </View>
                <Switch
                  value={form.isActive}
                  onValueChange={(v) => setField("isActive", v)}
                  trackColor={{ false: colors.border, true: colors.primary + "80" }}
                  thumbColor={form.isActive ? colors.primary : colors.mutedForeground}
                />
              </View>
            )}

            {/* Delete (edit only, not for self) */}
            {isEditing && !isSelf && (
              <TouchableOpacity
                style={[styles.deleteBtn, { borderColor: colors.destructive + "50" }]}
                onPress={() => handleDelete(editingUser!)}
                activeOpacity={0.7}
              >
                <Feather name="trash-2" size={16} color={colors.destructive} />
                <Text style={[styles.deleteBtnText, { color: colors.destructive }]}>{t.adminDelete}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },

  list: { padding: 16, gap: 10 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },

  userRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 16, fontFamily: "Inter_700Bold" },
  userInfo: { flex: 1, gap: 3 },
  nameRow: { flexDirection: "row", alignItems: "center" },
  userName: { fontSize: 15, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  selfTag: { fontSize: 13, fontFamily: "Inter_400Regular" },
  userEmail: { fontSize: 12, fontFamily: "Inter_400Regular" },
  badgesRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  roleBadge: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  roleBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.3 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },

  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  modalCancel: { fontSize: 15, fontFamily: "Inter_400Regular" },
  modalSave: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  modalBody: { padding: 20, gap: 20 },

  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 10, borderWidth: 1, padding: 12,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },

  field: { gap: 8 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.5 },
  input: {
    height: 44, borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, fontSize: 15, fontFamily: "Inter_400Regular",
  },
  inputDisabled: { justifyContent: "center" },
  fieldHint: { fontSize: 11, fontFamily: "Inter_400Regular" },

  toggleRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
  },
  toggleInfo: { gap: 2 },
  toggleLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  toggleHint: { fontSize: 12, fontFamily: "Inter_400Regular" },

  deleteBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 12, borderWidth: 1, paddingVertical: 14,
  },
  deleteBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
