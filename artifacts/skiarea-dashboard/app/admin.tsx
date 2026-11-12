import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
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
  getGetUsersQueryKey,
  getGetEmailSettingsQueryKey,
  useGetEmailSettings,
} from "@workspace/api-client-react";
import type { User } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useResponsive } from "@/hooks/useResponsive";
import { SendCredentialsCell, SendCredentialsDialog } from "@/components/email/SendCredentials";

type Role = "admin" | "operator" | "viewer";

interface FormState {
  name: string;
  email: string;
  password: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
}

const EMPTY_FORM: FormState = { name: "", email: "", password: "", role: "viewer", isActive: true, mustChangePassword: false };

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

type SortColumn = "name" | "email" | "role" | "status" | "password" | "id";
const COLS = { name: 200, email: 230, role: 150, status: 125, password: 160, id: 310, send: 190, actions: 96 };
const TABLE_WIDTH = Object.values(COLS).reduce((sum, width) => sum + width, 24);

function UserRow({ user, onEdit, onDelete, onSend, currentUserId, colors, t, last }: {
  user: User;
  onEdit: (u: User) => void;
  onDelete: (u: User) => void;
  onSend: (u: User) => void;
  currentUserId: string;
  colors: ReturnType<typeof useColors>;
  t: ReturnType<typeof useTranslation>["t"];
  last: boolean;
}) {
  const isSelf = user.id === currentUserId;
  const roleColor = user.role === "admin" ? colors.primary : user.role === "operator" ? colors.warning : colors.mutedForeground;
  const roleLabel = user.role === "admin" ? t.roleAdmin : user.role === "operator" ? t.roleOperator : t.roleViewer;

  return (
    <View
      testID={`user-row-${user.id}`}
      style={[styles.tr, { borderBottomColor: colors.border, borderBottomWidth: last ? 0 : 1 }]}
    >
      <View style={[styles.td, { width: COLS.name, flexDirection: "row", alignItems: "center", gap: 10 }]}>
        <View style={[styles.avatar, { backgroundColor: roleColor + "20" }]}>
          <Text style={[styles.initials, { color: roleColor }]}>{initials(user.name)}</Text>
        </View>
        <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
          {user.name}
          {isSelf ? <Text style={[styles.selfTag, { color: colors.mutedForeground }]}>{` (${t.adminYou})`}</Text> : null}
        </Text>
      </View>
      <View style={[styles.td, { width: COLS.email }]}>
        <Text style={[styles.userEmail, { color: colors.mutedForeground }]} numberOfLines={1}>{user.email}</Text>
      </View>
      <View style={[styles.td, { width: COLS.role }]}>
        <View style={[styles.roleBadge, { backgroundColor: roleColor + "18" }]}>
          <Text style={[styles.roleBadgeText, { color: roleColor }]} numberOfLines={1}>{roleLabel}</Text>
        </View>
      </View>
      <View style={[styles.td, { width: COLS.status, flexDirection: "row", alignItems: "center", gap: 6 }]}>
        <View style={[styles.statusDot, { backgroundColor: user.isActive ? colors.success : colors.mutedForeground }]} />
        <Text style={[styles.statusLabel, { color: user.isActive ? colors.foreground : colors.mutedForeground }]}>
          {user.isActive ? t.adminActive : t.adminInactive}
        </Text>
      </View>
      <View testID={`user-pwd-flag-${user.id}`} style={[styles.td, { width: COLS.password, flexDirection: "row", alignItems: "center", gap: 6 }]}>
        <Feather name={user.mustChangePassword ? "key" : "check"} size={13} color={user.mustChangePassword ? colors.warning : colors.mutedForeground} />
        <Text style={[styles.statusLabel, { color: user.mustChangePassword ? colors.warning : colors.mutedForeground }]} numberOfLines={1}>
          {user.mustChangePassword ? t.adminPwdRequired : t.adminPwdOk}
        </Text>
      </View>
      <View style={[styles.td, { width: COLS.id }]}>
        <Text selectable style={[styles.userEmail, { color: colors.mutedForeground }]}>{user.id}</Text>
      </View>
      <SendCredentialsCell user={user} onSend={onSend} colors={colors} width={COLS.send} />
      <View style={[styles.td, { width: COLS.actions, flexDirection: "row", gap: 6, justifyContent: "flex-end" }]}>
        <TouchableOpacity
          testID={`edit-user-${user.id}`}
          accessibilityRole="button"
          accessibilityLabel={`${t.adminEditUser}: ${user.name}`}
          onPress={() => onEdit(user)}
          style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          activeOpacity={0.7}
        >
          <Feather name="edit-2" size={15} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          testID={`delete-user-${user.id}`}
          accessibilityRole="button"
          accessibilityLabel={isSelf ? t.adminDeleteSelf : `${t.adminDelete}: ${user.name}`}
          accessibilityState={{ disabled: isSelf }}
          disabled={isSelf}
          onPress={() => onDelete(user)}
          style={[styles.iconBtn, { borderColor: isSelf ? colors.border : colors.destructive + "50", backgroundColor: colors.card, opacity: isSelf ? 0.35 : 1 }]}
          activeOpacity={0.7}
        >
          <Feather name="trash-2" size={15} color={isSelf ? colors.mutedForeground : colors.destructive} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DeleteDialog({ user, pending, error, onCancel, onConfirm, colors, t }: {
  user: User | null;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  colors: ReturnType<typeof useColors>;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  if (!user) return null;
  return (
    <View style={styles.overlay} testID="delete-user-dialog" accessibilityViewIsModal accessibilityLabel={t.adminDeleteTitle}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onCancel} accessibilityLabel={t.adminCancel} />
      <View style={[styles.dialog, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.dialogIcon, { backgroundColor: colors.destructive + "15" }]}>
          <Feather name="trash-2" size={20} color={colors.destructive} />
        </View>
        <Text style={[styles.dialogTitle, { color: colors.foreground }]} accessibilityRole="header">{t.adminDeleteTitle}</Text>
        <View style={[styles.dialogUser, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>{user.name}</Text>
          <Text style={[styles.userEmail, { color: colors.mutedForeground }]} numberOfLines={1}>{user.email}</Text>
        </View>
        <Text style={[styles.dialogBody, { color: colors.mutedForeground }]}>{t.adminDeleteConfirm}</Text>
        {error ? (
          <View testID="delete-user-error" style={[styles.errorBox, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "40" }]}>
            <Feather name="alert-circle" size={14} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        ) : null}
        <View style={styles.dialogActions}>
          <TouchableOpacity
            testID="delete-user-cancel"
            accessibilityRole="button"
            accessibilityLabel={t.adminCancel}
            disabled={pending}
            onPress={onCancel}
            style={[styles.dialogBtn, { borderColor: colors.border, opacity: pending ? 0.5 : 1 }]}
          >
            <Text style={[styles.dialogBtnText, { color: colors.foreground }]}>{t.adminCancel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="delete-user-confirm"
            accessibilityRole="button"
            accessibilityLabel={`${t.adminDelete}: ${user.name}`}
            accessibilityState={{ disabled: pending, busy: pending }}
            disabled={pending}
            onPress={onConfirm}
            style={[styles.dialogBtn, { backgroundColor: colors.destructive, borderColor: colors.destructive }]}
          >
            {pending ? <ActivityIndicator size="small" color={colors.destructiveForeground} /> : null}
            <Text style={[styles.dialogBtnText, { color: colors.destructiveForeground }]}>
              {pending ? t.adminDeleting : t.adminDelete}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function AdminScreen() {
  const colors = useColors();
  const { t, language } = useTranslation();
  const { user: me } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isWide } = useResponsive();

  const { data: users = [], isLoading, isError, refetch } = useGetUsers();
  const [sort, setSort] = useState<{ column: SortColumn; direction: "asc" | "desc" }>({
    column: "name", direction: "asc",
  });
  const sortedUsers = useMemo(() => {
    const roleLabels = { admin: t.roleAdmin, operator: t.roleOperator, viewer: t.roleViewer };
    const value = (user: User): string => {
      if (sort.column === "status") return user.isActive ? t.adminActive : t.adminInactive;
      if (sort.column === "role") return roleLabels[user.role];
      if (sort.column === "password") return user.mustChangePassword ? "0" : "1";
      return user[sort.column];
    };
    const collator = new Intl.Collator(language === "it" ? "it-IT" : "en-GB", {
      sensitivity: "base", numeric: true,
    });
    return [...users].sort((a, b) => {
      const compared = collator.compare(value(a), value(b)) || collator.compare(a.id, b.id);
      return sort.direction === "asc" ? compared : -compared;
    });
  }, [users, sort, language, t]);

  function sortBy(column: SortColumn) {
    setSort((current) => ({
      column,
      direction: current.column === column && current.direction === "asc" ? "desc" : "asc",
    }));
  }
  const isAdmin = me?.role === "admin";
  const { data: emailSettings, isError: emailSettingsError, isFetching: emailSettingsFetching, refetch: refetchEmailSettings } = useGetEmailSettings({
    query: { enabled: !!isAdmin, queryKey: getGetEmailSettingsQueryKey(), staleTime: 0 },
  });
  const [sendTarget, setSendTarget] = useState<User | null>(null);
  const [sendBlocked, setSendBlocked] = useState(false);
  function requestSend(u: User) {
    if (!u.isActive) return;
    if (emailSettingsError || (!emailSettings && emailSettingsFetching)) { setSendBlocked(true); if (emailSettingsError) refetchEmailSettings(); return; }
    setSendBlocked(false);
    if (!emailSettings?.configured || !emailSettings.hasPassword) { router.push("/email-settings"); return; }
    setSendTarget(u);
  }
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openCreate() {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalVisible(true);
  }

  function openEdit(u: User) {
    setEditingUser(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role as Role, isActive: u.isActive, mustChangePassword: u.mustChangePassword });
    setFormError(null);
    setModalVisible(true);
  }

  function resetModal() {
    setModalVisible(false);
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  function closeModal() {
    if (saving || deleting) return;
    if (deleteTarget) { cancelDelete(); return; }
    resetModal();
  }

  async function refreshUsers() {
    await queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
  }

  async function handleSave() {
    if (saving) return;
    setFormError(null);
    const { name, email, password, role, isActive, mustChangePassword } = form;
    if (!name.trim()) { setFormError(t.adminName); return; }
    if (!editingUser && !email.trim()) { setFormError(t.adminEmail); return; }
    if (!editingUser && password.length < 8) { setFormError(t.adminPasswordMin); return; }
    if (editingUser && password && password.length < 8) { setFormError(t.adminPasswordMin); return; }

    setSaving(true);
    try {
      if (editingUser) {
        const data: { name: string; role: Role; isActive: boolean; mustChangePassword: boolean; password?: string } = { name: name.trim(), role, isActive, mustChangePassword };
        if (password) data.password = password;
        try { await updateMutation.mutateAsync({ id: editingUser.id, data }); }
        catch { throw new Error(t.adminErrorUpdate); }
      } else {
        try { await createMutation.mutateAsync({ data: { email: email.trim(), name: name.trim(), password, role, mustChangePassword } }); }
        catch { throw new Error(t.adminErrorCreate); }
      }
      await refreshUsers();
      setSaving(false);
      resetModal();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : t.adminErrorUpdate);
      setSaving(false);
    }
  }

  function requestDelete(u: User) {
    if (u.id === me?.id) return;
    setDeleteError(null);
    setDeleteTarget(u);
  }

  function cancelDelete() {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    const target = deleteTarget;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync({ id: target.id });
      queryClient.setQueryData<User[]>(getGetUsersQueryKey(), (old) => old?.filter((x) => x.id !== target.id));
      await refreshUsers();
      setDeleting(false);
      setDeleteTarget(null);
      if (editingUser?.id === target.id) resetModal();
    } catch {
      setDeleting(false);
      setDeleteError(t.adminErrorDelete);
    }
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
        <TouchableOpacity testID="admin-back" accessibilityRole="button" accessibilityLabel={t.back} onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, flex: 1, marginLeft: 8 }]}>{t.adminTitle}</Text>
        <TouchableOpacity testID="email-settings-link" accessibilityRole="button" accessibilityLabel={t.emLink} onPress={() => router.push("/email-settings")} style={[styles.addBtn, { borderWidth: 1, borderColor: colors.border, marginRight: 8 }]} activeOpacity={0.7}>
          <Feather name="mail" size={18} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity testID="add-user" accessibilityRole="button" accessibilityLabel={t.adminCreateUser} onPress={openCreate} style={[styles.addBtn, { backgroundColor: colors.primary }]} activeOpacity={0.7}>
          <Feather name="plus" size={20} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      {sendBlocked && (emailSettingsError || emailSettingsFetching) ? (
        <View testID="email-settings-load-error" style={[styles.errorBox, { margin: 16, marginBottom: 0, backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "40" }]}>
          <Feather name="alert-circle" size={14} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>{emailSettingsFetching ? t.emSendPreviewLoading : t.emLoadError}</Text>
          <TouchableOpacity testID="email-settings-retry" accessibilityRole="button" disabled={emailSettingsFetching} onPress={() => refetchEmailSettings()}>
            <Text style={[styles.errorText, { color: colors.primary, flex: 0, fontFamily: "Inter_600SemiBold" }]}>{t.emRetry}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {/* User table */}
      <ScrollView
        contentContainerStyle={[styles.list, isWide && { maxWidth: TABLE_WIDTH + 32, alignSelf: "center", width: "100%" }]}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        {isLoading && users.length === 0 ? (
          <View style={styles.empty}><ActivityIndicator color={colors.primary} /></View>
        ) : isError ? (
          <View style={styles.empty}>
            <Feather name="alert-circle" size={28} color={colors.destructive} />
            <TouchableOpacity testID="users-retry" accessibilityRole="button" onPress={() => refetch()}>
              <Text style={[styles.emptyText, { color: colors.primary }]}>{t.errorTryAgain}</Text>
            </TouchableOpacity>
          </View>
        ) : users.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="users" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.adminNoUsers}</Text>
          </View>
        ) : (
          <View style={[styles.tableWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator testID="users-table-scroll">
              <View style={{ width: TABLE_WIDTH }}>
                <View style={[styles.tr, styles.thead, { backgroundColor: colors.secondary, borderBottomColor: colors.border }]}>
                  {([
                    ["name", t.adminName], ["email", t.adminEmail], ["role", t.adminRole],
                    ["status", t.adminStatus], ["password", t.adminPwdColumn], ["id", "ID"],
                  ] as [SortColumn, string][]).map(([column, label]) => (
                    <TouchableOpacity
                      key={column}
                      testID={`sort-users-${column}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${label}: ${sort.column === column && sort.direction === "asc" ? t.adminSortDescending : t.adminSortAscending}`}
                      onPress={() => sortBy(column)}
                      style={{ width: COLS[column], flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 12 }}
                    >
                      <Text style={[styles.th, { color: sort.column === column ? colors.primary : colors.mutedForeground, paddingRight: 0 }]}>
                        {label.toUpperCase()}
                      </Text>
                      <Feather
                        name={sort.column === column ? (sort.direction === "asc" ? "arrow-up" : "arrow-down") : "chevrons-up"}
                        size={12}
                        color={sort.column === column ? colors.primary : colors.mutedForeground}
                      />
                    </TouchableOpacity>
                  ))}
                  <Text style={[styles.th, { width: COLS.send, color: colors.mutedForeground }]}>
                    {t.emSendColumn.toUpperCase()}
                  </Text>
                  <Text style={[styles.th, { width: COLS.actions, color: colors.mutedForeground, textAlign: "right" }]}>
                    {t.adminActions.toUpperCase()}
                  </Text>
                </View>
                {sortedUsers.map((u, i) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    onEdit={openEdit}
                    onDelete={requestDelete}
                    onSend={requestSend}
                    currentUserId={me?.id ?? ""}
                    colors={colors}
                    t={t}
                    last={i === sortedUsers.length - 1}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Create / Edit modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeModal} testID="user-form-modal">
        <KeyboardAvoidingView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Modal header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity testID="user-form-cancel" accessibilityRole="button" onPress={closeModal} activeOpacity={0.7} disabled={saving}>
              <Text style={[styles.modalCancel, { color: colors.mutedForeground, opacity: saving ? 0.4 : 1 }]}>{t.adminCancel}</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {isEditing ? t.adminEditUser : t.adminCreateUser}
            </Text>
            <TouchableOpacity testID="user-form-save" accessibilityRole="button" accessibilityState={{ disabled: saving, busy: saving }} onPress={handleSave} activeOpacity={0.7} disabled={saving}>
              <Text style={[styles.modalSave, { color: saving ? colors.mutedForeground : colors.primary }]}>{saving ? t.adminSaving : t.adminSave}</Text>
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

            {/* Force password change */}
            <View style={[styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.toggleInfo, { flex: 1, paddingRight: 12 }]}>
                <Text style={[styles.toggleLabel, { color: colors.foreground }]}>{t.adminForceChange}</Text>
                <Text style={[styles.toggleHint, { color: colors.mutedForeground }]}>{t.adminForceChangeHint}</Text>
              </View>
              <Switch
                testID="user-form-force-password-change"
                accessibilityLabel={t.adminForceChange}
                value={form.mustChangePassword}
                onValueChange={(v) => setField("mustChangePassword", v)}
                trackColor={{ false: colors.border, true: colors.primary + "80" }}
                thumbColor={form.mustChangePassword ? colors.primary : colors.mutedForeground}
              />
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
                onPress={() => editingUser && requestDelete(editingUser)}
                disabled={saving}
                testID="user-form-delete"
                accessibilityRole="button"
                accessibilityLabel={`${t.adminDelete}: ${editingUser?.name ?? ""}`}
                activeOpacity={0.7}
              >
                <Feather name="trash-2" size={16} color={colors.destructive} />
                <Text style={[styles.deleteBtnText, { color: colors.destructive }]}>{t.adminDelete}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
        {modalVisible ? <DeleteDialog
          user={deleteTarget}
          pending={deleting}
          error={deleteError}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
          colors={colors}
          t={t}
        /> : null}
      </Modal>
      {!modalVisible ? <DeleteDialog
        user={deleteTarget}
        pending={deleting}
        error={deleteError}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        colors={colors}
        t={t}
      /> : null}
      <SendCredentialsDialog
        user={sendTarget}
        settings={emailSettings}
        isSelf={sendTarget?.id === me?.id}
        onClose={() => setSendTarget(null)}
        colors={colors}
      />
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

  list: { padding: 16, paddingBottom: Platform.OS === "web" ? 50 : 24 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },

  tableWrap: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  tr: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, minHeight: 56 },
  thead: { minHeight: 38, borderBottomWidth: 1 },
  th: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, paddingRight: 12 },
  td: { paddingRight: 12, paddingVertical: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 12, fontFamily: "Inter_700Bold" },
  userName: { fontSize: 14, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  selfTag: { fontSize: 12, fontFamily: "Inter_400Regular" },
  userEmail: { fontSize: 13, fontFamily: "Inter_400Regular" },
  roleBadge: { alignSelf: "flex-start", borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  roleBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.3 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  iconBtn: { width: 34, height: 34, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  overlay: {
    ...StyleSheet.absoluteFillObject, zIndex: 50, elevation: 50,
    backgroundColor: "rgba(7,30,42,0.55)", alignItems: "center", justifyContent: "center", padding: 20,
  },
  dialog: { width: "100%", maxWidth: 400, borderRadius: 16, borderWidth: 1, padding: 20, gap: 12 },
  dialogIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  dialogTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  dialogUser: { borderRadius: 10, padding: 12, gap: 2 },
  dialogBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  dialogActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  dialogBtn: {
    flex: 1, height: 44, borderRadius: 10, borderWidth: 1,
    flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center",
  },
  dialogBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

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
