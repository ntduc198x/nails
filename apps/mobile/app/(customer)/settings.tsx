import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { CustomerScreen, SurfaceCard } from "@/src/features/customer/ui";
import { premiumTheme } from "@/src/design/premium-theme";
import { mobileSupabase } from "@/src/lib/supabase";
import { useSession } from "@/src/providers/session-provider";

const { colors, radius } = premiumTheme;
type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

export default function SettingsScreen() {
  const { requestPasswordReset, user } = useSession();
  const [toggles, setToggles] = useState({
    notifications: true,
    sound: true,
    vibration: false,
    darkMode: false,
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [secureState, setSecureState] = useState({
    current: true,
    next: true,
    confirm: true,
  });
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  async function handleChangePassword() {
    if (!mobileSupabase) {
      Alert.alert("Chưa cấu hình", "Ứng dụng chưa kết nối được Supabase để đổi mật khẩu.");
      return;
    }

    if (!passwordForm.newPassword.trim() || passwordForm.newPassword.trim().length < 6) {
      Alert.alert("Mật khẩu chưa hợp lệ", "Mật khẩu mới cần có ít nhất 6 ký tự.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert("Chưa khớp", "Mật khẩu mới và xác nhận mật khẩu chưa trùng nhau.");
      return;
    }

    setIsSavingPassword(true);

    try {
      const { error } = await mobileSupabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (error) throw error;

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      Alert.alert("Đã cập nhật", "Mật khẩu tài khoản đã được thay đổi.");
    } catch (error) {
      Alert.alert(
        "Không thể đổi mật khẩu",
        error instanceof Error ? error.message : "Đã có lỗi xảy ra khi đổi mật khẩu.",
      );
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function handleForgotPassword() {
    try {
      await requestPasswordReset(user?.email ?? "");
      Alert.alert("Đã gửi", "Liên kết đặt lại mật khẩu đã được gửi về email tài khoản.");
    } catch (error) {
      Alert.alert(
        "Không thể gửi email",
        error instanceof Error ? error.message : "Không thể gửi email đặt lại mật khẩu.",
      );
    }
  }

  return (
    <CustomerScreen title="Cài đặt" contentContainerStyle={styles.content}>
      <SurfaceCard style={styles.groupCard}>
        <ToggleRow
          icon="bell"
          label="Nhận thông báo"
          onValueChange={(value) => setToggles((current) => ({ ...current, notifications: value }))}
          value={toggles.notifications}
        />
        <ToggleRow
          icon="volume-2"
          label="Âm thanh"
          onValueChange={(value) => setToggles((current) => ({ ...current, sound: value }))}
          value={toggles.sound}
        />
        <ToggleRow
          icon="smartphone"
          label="Rung"
          onValueChange={(value) => setToggles((current) => ({ ...current, vibration: value }))}
          value={toggles.vibration}
        />
        <ToggleRow
          icon="moon"
          label="Chế độ tối"
          last
          onValueChange={(value) => setToggles((current) => ({ ...current, darkMode: value }))}
          value={toggles.darkMode}
        />
      </SurfaceCard>

      <SurfaceCard style={styles.groupCard}>
        <ActionRow icon="globe" label="Ngôn ngữ" value="Tiếng Việt" />
        <ActionRow icon="trash-2" label="Xóa bộ nhớ đệm" last value="12.4 MB" />
      </SurfaceCard>

      <SurfaceCard style={styles.passwordCard}>
        <Text style={styles.passwordTitle}>ĐỔI MẬT KHẨU</Text>

        <PasswordField
          icon="lock"
          onChangeText={(value) => setPasswordForm((current) => ({ ...current, currentPassword: value }))}
          onToggleSecure={() =>
            setSecureState((current) => ({ ...current, current: !current.current }))
          }
          placeholder="Mật khẩu hiện tại"
          secureTextEntry={secureState.current}
          value={passwordForm.currentPassword}
        />
        <PasswordField
          icon="lock"
          onChangeText={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))}
          onToggleSecure={() => setSecureState((current) => ({ ...current, next: !current.next }))}
          placeholder="Mật khẩu mới"
          secureTextEntry={secureState.next}
          value={passwordForm.newPassword}
        />
        <PasswordField
          icon="lock"
          onChangeText={(value) =>
            setPasswordForm((current) => ({ ...current, confirmPassword: value }))
          }
          onToggleSecure={() =>
            setSecureState((current) => ({ ...current, confirm: !current.confirm }))
          }
          placeholder="Nhập lại mật khẩu mới"
          secureTextEntry={secureState.confirm}
          value={passwordForm.confirmPassword}
        />

        <Pressable
          onPress={handleChangePassword}
          style={({ pressed }) => [styles.primaryButton, pressed ? styles.primaryButtonPressed : null]}
        >
          <Text style={styles.primaryButtonText}>
            {isSavingPassword ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
          </Text>
        </Pressable>

        <Pressable onPress={handleForgotPassword} style={styles.forgotPasswordLink}>
          <Text style={styles.forgotPasswordText}>Quên mật khẩu</Text>
        </Pressable>
      </SurfaceCard>

      <Text style={styles.versionText}>Phiên bản 1.0.0</Text>
    </CustomerScreen>
  );
}

function ToggleRow({
  icon,
  label,
  last = false,
  onValueChange,
  value,
}: {
  icon: FeatherIconName;
  label: string;
  last?: boolean;
  onValueChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <View style={[styles.row, !last ? styles.rowDivider : null]}>
      <View style={styles.rowCopy}>
        <Feather color={colors.textSoft} name={icon} size={18} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Switch
        ios_backgroundColor="#e8dfd4"
        onValueChange={onValueChange}
        thumbColor="#fffdfa"
        trackColor={{ false: "#e8dfd4", true: "#44a548" }}
        value={value}
      />
    </View>
  );
}

function ActionRow({
  icon,
  label,
  last = false,
  value,
}: {
  icon: FeatherIconName;
  label: string;
  last?: boolean;
  value: string;
}) {
  return (
    <Pressable style={[styles.row, !last ? styles.rowDivider : null]}>
      <View style={styles.rowCopy}>
        <Feather color={colors.textSoft} name={icon} size={18} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>

      <View style={styles.rowTrailing}>
        <Text style={styles.rowValue}>{value}</Text>
        <Feather color={colors.textSoft} name="chevron-right" size={18} />
      </View>
    </Pressable>
  );
}

function PasswordField({
  icon,
  onChangeText,
  onToggleSecure,
  placeholder,
  secureTextEntry,
  value,
}: {
  icon: FeatherIconName;
  onChangeText: (value: string) => void;
  onToggleSecure: () => void;
  placeholder: string;
  secureTextEntry: boolean;
  value: string;
}) {
  return (
    <View style={styles.passwordField}>
      <Feather color={colors.textSoft} name={icon} size={15} />
      <TextInput
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        style={styles.passwordInput}
        value={value}
      />
      <Pressable hitSlop={10} onPress={onToggleSecure}>
        <Feather color={colors.textSoft} name={secureTextEntry ? "eye-off" : "eye"} size={16} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 10,
    paddingBottom: 136,
    paddingTop: 0,
  },
  groupCard: {
    gap: 0,
    paddingHorizontal: 12,
    paddingVertical: 0,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 64,
  },
  rowDivider: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  rowCopy: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  rowLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "500",
  },
  rowTrailing: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  rowValue: {
    color: colors.textSoft,
    fontSize: 15,
  },
  passwordCard: {
    gap: 10,
    padding: 12,
  },
  passwordTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  passwordField: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 50,
    paddingHorizontal: 12,
  },
  passwordInput: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    minHeight: 42,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    justifyContent: "center",
    minHeight: 46,
    marginTop: 0,
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "800",
  },
  forgotPasswordLink: {
    alignItems: "center",
    paddingBottom: 0,
    paddingTop: 2,
  },
  forgotPasswordText: {
    color: colors.accentWarm,
    fontSize: 11,
    fontWeight: "700",
  },
  versionText: {
    color: colors.textSoft,
    fontSize: 14,
    paddingTop: 0,
    textAlign: "center",
  },
});
