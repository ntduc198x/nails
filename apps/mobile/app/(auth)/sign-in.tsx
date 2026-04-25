import Feather from "@expo/vector-icons/Feather";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { premiumTheme } from "@/src/design/premium-theme";
import { useSession } from "@/src/providers/session-provider";

const { colors } = premiumTheme;

export default function SignInScreen() {
  const { clearError, error, isBusy, isHydrated, role, requestPasswordReset, signIn, signUp } = useSession();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [registrationMode, setRegistrationMode] = useState<"USER" | "ADMIN">("USER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  if (isHydrated && role) {
    return <Redirect href="/" />;
  }

  async function handleSubmit() {
    setMessage(null);
    clearError();

    if (mode === "signup") {
      await signUp({
        email,
        password,
        name,
        inviteCode,
        registrationMode,
      });
      setMessage(
        registrationMode === "USER"
          ? "Đăng ký khách hàng thành công. Bạn đã có thể vào khu cá nhân."
          : "Đăng ký quản trị thành công. Mobile session đã được khởi tạo.",
      );
      return;
    }

    await signIn({ email, password });
  }

  async function handlePasswordReset() {
    if (!email.trim()) {
      setMessage("Nhập email trước khi gửi yêu cầu reset password.");
      return;
    }

    await requestPasswordReset(email);
    setMessage("Đã gửi email reset password. Kiểm tra inbox của bạn.");
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.shell}>
        {mode === "signup" ? (
          <Pressable style={styles.backButton} onPress={() => setMode("login")}>
            <Feather color={colors.text} name="arrow-left" size={20} />
          </Pressable>
        ) : (
          <View style={styles.backButtonPlaceholder} />
        )}

        <View style={styles.accountMark}>
          <Text style={styles.markLetter}>C</Text>
        </View>
        <Text style={styles.brand}>CHAM BEAUTY</Text>
        <Text style={styles.brandSub}>ACCOUNT</Text>

        <Text style={styles.title}>
          {mode === "login"
            ? "Đăng nhập để quản lý lịch hẹn và thông tin cá nhân."
            : "Đăng ký để quản lý lịch hẹn và thông tin cá nhân."}
        </Text>

        <Text style={styles.description}>
          Role USER vào khu khách hàng. Mọi role còn lại vào khu quản trị.
        </Text>

        <Pressable style={styles.customerAppButton} onPress={() => router.push("/(customer)")}>
          <View style={styles.customerAppLeft}>
            <Feather color="#7e6957" name="smartphone" size={15} />
            <Text style={styles.customerAppText}>Xem app khách hàng</Text>
          </View>
          <Feather color="#9b826b" name="chevron-right" size={15} />
        </Pressable>

        <View style={styles.segmentWrap}>
          <Pressable
            style={[styles.segmentItem, mode === "login" ? styles.segmentItemActive : null]}
            onPress={() => {
              setMode("login");
              setMessage(null);
              clearError();
            }}
          >
            <Text style={[styles.segmentText, mode === "login" ? styles.segmentTextActive : null]}>
              Đăng nhập
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentItem, mode === "signup" ? styles.segmentItemActive : null]}
            onPress={() => {
              setMode("signup");
              setMessage(null);
              clearError();
            }}
          >
            <Text style={[styles.segmentText, mode === "signup" ? styles.segmentTextActive : null]}>
              Đăng ký
            </Text>
          </Pressable>
        </View>

        {mode === "signup" ? (
          <View style={styles.segmentWrap}>
            <Pressable
              style={[styles.roleItem, registrationMode === "USER" ? styles.roleItemActive : null]}
              onPress={() => setRegistrationMode("USER")}
            >
              <Feather color={registrationMode === "USER" ? colors.text : "#8b7766"} name="user" size={15} />
              <Text style={[styles.roleText, registrationMode === "USER" ? styles.roleTextActive : null]}>
                Khách hàng
              </Text>
            </Pressable>

            <Pressable
              style={[styles.roleItem, registrationMode === "ADMIN" ? styles.roleItemActive : null]}
              onPress={() => setRegistrationMode("ADMIN")}
            >
              <Feather color={registrationMode === "ADMIN" ? colors.text : "#8b7766"} name="shield" size={15} />
              <Text style={[styles.roleText, registrationMode === "ADMIN" ? styles.roleTextActive : null]}>
                Quản trị
              </Text>
            </Pressable>
          </View>
        ) : null}

        {mode === "signup" ? (
          <InputRow
            autoCapitalize="words"
            icon="user"
            onChangeText={setName}
            placeholder="Tên của bạn"
            value={name}
          />
        ) : null}

        {mode === "signup" && registrationMode === "ADMIN" ? (
          <InputRow
            autoCapitalize="characters"
            icon="tag"
            onChangeText={(value) => setInviteCode(value.toUpperCase())}
            placeholder="Mã mời quản trị"
            value={inviteCode}
          />
        ) : null}

        <InputRow
          autoCapitalize="none"
          icon="mail"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          value={email}
        />

        <InputRow
          icon="lock"
          onChangeText={setPassword}
          placeholder="Mật khẩu"
          rightSlot={
            <Pressable onPress={() => setShowPassword((current) => !current)}>
              <Feather color="#8f7a69" name={showPassword ? "eye" : "eye-off"} size={16} />
            </Pressable>
          }
          secureTextEntry={!showPassword}
          value={password}
        />

        {mode === "signup" && registrationMode === "USER" ? (
          <Text style={styles.helperText}>Tài khoản khách hàng không cần mã mời.</Text>
        ) : null}

        <Pressable disabled={isBusy} style={styles.primaryButton} onPress={() => void handleSubmit()}>
          <Text style={styles.primaryButtonText}>
            {isBusy ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
          </Text>
        </Pressable>

        {mode === "login" ? (
          <Pressable disabled={isBusy} style={styles.forgotButton} onPress={() => void handlePasswordReset()}>
            <Text style={styles.forgotButtonText}>Quên mật khẩu?</Text>
          </Pressable>
        ) : null}

        {message ? <Text style={styles.notice}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

function InputRow({
  icon,
  placeholder,
  rightSlot,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  icon: React.ComponentProps<typeof Feather>["name"];
  rightSlot?: React.ReactNode;
}) {
  return (
    <View style={styles.inputRow}>
      <Feather color="#8f7a69" name={icon} size={16} />
      <TextInput placeholder={placeholder} placeholderTextColor="#a89686" style={styles.input} {...props} />
      {rightSlot ? <View style={styles.inputRight}>{rightSlot}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  shell: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 360,
    gap: 12,
    backgroundColor: "#fffdfa",
    borderColor: "#eadfd2",
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    shadowColor: "#2a1e14",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  backButton: {
    alignItems: "flex-start",
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  backButtonPlaceholder: {
    height: 22,
    width: 22,
  },
  accountMark: {
    alignItems: "center",
    alignSelf: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    marginTop: 1,
    borderRadius: 999,
    borderWidth: 1.25,
    borderColor: "#b58763",
  },
  markLetter: {
    color: "#b58763",
    fontSize: 21,
    fontWeight: "400",
    lineHeight: 22,
    marginTop: -2,
  },
  brand: {
    alignSelf: "center",
    color: "#9d785c",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 3,
    lineHeight: 18,
    marginTop: -4,
  },
  brandSub: {
    alignSelf: "center",
    color: "#7c6655",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2.2,
    lineHeight: 12,
    marginTop: -4,
  },
  title: {
    color: "#332821",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
    lineHeight: 35,
    marginTop: 6,
  },
  description: {
    color: "#6f6155",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 21,
  },
  customerAppButton: {
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    minHeight: 44,
    paddingHorizontal: 14,
    backgroundColor: "#f7ecdf",
    borderRadius: 17,
  },
  customerAppLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  customerAppText: {
    color: "#6d5a4a",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 17,
  },
  segmentWrap: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    backgroundColor: "#f9efe4",
    borderRadius: 17,
  },
  segmentItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    minHeight: 40,
    borderRadius: 14,
  },
  segmentItemActive: {
    backgroundColor: "#4a3424",
  },
  segmentText: {
    color: "#7e6959",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 17,
  },
  segmentTextActive: {
    color: "#fff",
  },
  roleItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eadfd2",
    backgroundColor: "#fffaf5",
  },
  roleItemActive: {
    borderWidth: 1.5,
    borderColor: "#4a3424",
  },
  roleText: {
    color: "#7f6d5c",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 17,
  },
  roleTextActive: {
    color: colors.text,
  },
  inputRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 46,
    paddingHorizontal: 14,
    backgroundColor: "#fffdfa",
    borderColor: "#eadfd2",
    borderRadius: 15,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 40,
    paddingVertical: 0,
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  inputRight: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 18,
  },
  helperText: {
    color: "#7b6b5f",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
    marginTop: -2,
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    marginTop: 4,
    backgroundColor: "#4a3424",
    borderRadius: 15,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 18,
  },
  forgotButton: {
    alignItems: "center",
    paddingVertical: 2,
  },
  forgotButtonText: {
    color: "#78685b",
    fontSize: 13,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  notice: {
    backgroundColor: colors.successBg,
    borderRadius: 14,
    color: colors.successText,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  error: {
    backgroundColor: colors.dangerBg,
    borderRadius: 14,
    color: colors.dangerText,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
