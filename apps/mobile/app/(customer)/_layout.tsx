import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { isCustomerRole } from "@nails/shared";
import { premiumTheme } from "@/src/design/premium-theme";
import { useSession } from "@/src/providers/session-provider";

const { colors, radius, spacing } = premiumTheme;

export default function CustomerLayout() {
  const { isHydrated, role } = useSession();

  if (!isHydrated) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Cham Beauty</Text>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.label}>Dang tai khong gian khach hang...</Text>
        </View>
      </View>
    );
  }

  if (role && !isCustomerRole(role)) {
    return <Redirect href="/(admin)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  eyebrow: {
    color: colors.accentWarm,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  label: {
    color: colors.textSoft,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
});
