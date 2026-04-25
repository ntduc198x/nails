import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  BOOKING_HISTORY,
  FALLBACK_SERVICES,
  OFFERS,
  PROFILE_SUMMARY,
} from "@/src/features/customer/data";
import { CustomerScreen, SurfaceCard } from "@/src/features/customer/ui";
import { premiumTheme } from "@/src/design/premium-theme";
import { useCustomerFavorites } from "@/src/hooks/use-customer-favorites";
import { mobileSupabase } from "@/src/lib/supabase";
import { useSession } from "@/src/providers/session-provider";

const { colors, radius, shadow, spacing } = premiumTheme;

const TABS = [
  { key: "history", label: "Lịch sử hẹn", icon: "calendar" },
  { key: "favorites", label: "Yêu thích", icon: "heart" },
  { key: "info", label: "Thông tin", icon: "file-text" },
] as const;

type TabKey = (typeof TABS)[number]["key"];
type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

const SERVICE_LOOKUP = new Map(
  FALLBACK_SERVICES.map((service) => [
    service.title.toLowerCase(),
    { image: service.image, price: service.price },
  ]),
);

function splitHistoryTime(value: string) {
  const [time, date] = value.split(" ");
  return { date: date ?? value, time: time ?? "" };
}

function normalizeVietnamese(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function getHistoryTone(status: string): "success" | "warning" | "danger" {
  const normalized = normalizeVietnamese(status);
  if (normalized.includes("huy")) return "danger";
  if (normalized.includes("xac nhan")) return "warning";
  return "success";
}

export default function ProfileScreen() {
  const { isBusy, signOut, user } = useSession();
  const { favoriteIds } = useCustomerFavorites();
  const [activeTab, setActiveTab] = useState<TabKey>("history");
  const [form, setForm] = useState(() => ({
    name: user?.email?.split("@")[0] ?? PROFILE_SUMMARY.name,
    birthDate: PROFILE_SUMMARY.birthDate,
    phone: PROFILE_SUMMARY.phone,
    email: user?.email ?? PROFILE_SUMMARY.email,
    address: PROFILE_SUMMARY.address,
  }));
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const summary = useMemo(() => {
    const totalSpent = BOOKING_HISTORY.reduce((sum, item) => {
      const service = SERVICE_LOOKUP.get(item.service.toLowerCase());
      const numericPrice = Number((service?.price ?? "0").replace(/[^\d]/g, ""));
      return sum + numericPrice;
    }, 0);

    const latestBooking = BOOKING_HISTORY[0];
    const latestDate = latestBooking ? splitHistoryTime(latestBooking.time).date : "--/--/----";

    return {
      totalSpent: `${totalSpent.toLocaleString("vi-VN")}đ`,
      totalVisits: String(BOOKING_HISTORY.length),
      lastVisit: latestDate,
      offerWallet: String(Math.max(1, OFFERS.length - 1)),
    };
  }, []);

  const favoriteServices = useMemo(
    () => FALLBACK_SERVICES.filter((service) => favoriteIds.includes(service.id)),
    [favoriteIds],
  );

  async function handleSaveProfile() {
    if (!mobileSupabase) {
      Alert.alert(
        "Chưa cấu hình",
        "Ứng dụng chưa kết nối được Supabase để cập nhật thông tin.",
      );
      return;
    }

    setIsSavingProfile(true);

    try {
      const { error } = await mobileSupabase.auth.updateUser({
        email: form.email.trim(),
        data: {
          display_name: form.name.trim(),
          birth_date: form.birthDate.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
        },
      });

      if (error) throw error;
      Alert.alert("Đã lưu", "Thông tin cá nhân đã được cập nhật.");
    } catch (error) {
      Alert.alert(
        "Không thể cập nhật",
        error instanceof Error ? error.message : "Đã có lỗi xảy ra khi lưu thông tin cá nhân.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      Alert.alert(
        "Không thể đăng xuất",
        error instanceof Error ? error.message : "Đã có lỗi xảy ra khi đăng xuất.",
      );
    }
  }

  return (
    <CustomerScreen hideHeader scroll contentContainerStyle={styles.content} title="Cá nhân">
      <View style={styles.topBar}>
        <Pressable hitSlop={12} onPress={() => router.back()} style={styles.topIconButton}>
          <Feather color={colors.text} name="chevron-left" size={22} />
        </Pressable>

        <Pressable hitSlop={12} onPress={() => router.push("/(customer)/settings")} style={styles.topIconButton}>
          <Feather color={colors.text} name="settings" size={18} />
        </Pressable>
      </View>

      <View style={styles.profileHero}>
        <View style={styles.avatarWrap}>
          <Image
            alt="Ảnh đại diện khách hàng"
            source={{ uri: PROFILE_SUMMARY.avatar }}
            style={styles.avatar}
          />
          <Pressable style={styles.cameraBadge}>
            <Feather color={colors.textSoft} name="camera" size={15} />
          </Pressable>
        </View>

        <Text style={styles.name}>{form.name}</Text>

        <View style={styles.contactList}>
          <View style={styles.contactRow}>
            <Feather color={colors.textSoft} name="phone" size={13} />
            <Text style={styles.contact}>{form.phone}</Text>
          </View>

          <View style={styles.contactRow}>
            <Feather color={colors.textSoft} name="mail" size={13} />
            <Text style={styles.contact}>{form.email}</Text>
          </View>
        </View>
      </View>

      <SurfaceCard style={styles.metricsCard}>
        <View style={styles.metricsRow}>
          <ProfileMetric icon="credit-card" label="Tổng chi tiêu" value={summary.totalSpent} />
          <View style={styles.metricDivider} />
          <ProfileMetric icon="calendar" label="Tổng lượt hẹn" value={summary.totalVisits} />
          <View style={styles.metricDivider} />
          <ProfileMetric icon="clock" label="Lần cuối" value={summary.lastVisit} />
          <View style={styles.metricDivider} />
          <ProfileMetric
            compact
            icon="credit-card"
            label="Ví ưu đãi"
            onPress={() => router.push("/(customer)/offers")}
            value={summary.offerWallet}
          />
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.tabsCard}>
        {TABS.map((tab) => {
          const active = tab.key === activeTab;

          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tabButton, active ? styles.tabButtonActive : null]}
            >
              <Feather color={active ? colors.text : colors.textSoft} name={tab.icon} size={14} />
              <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </SurfaceCard>

      {activeTab === "history" ? (
        <View style={styles.cardList}>
          {BOOKING_HISTORY.map((item) => {
            const service = SERVICE_LOOKUP.get(item.service.toLowerCase());
            const schedule = splitHistoryTime(item.time);

            return (
              <SurfaceCard key={item.id} style={styles.historyCard}>
                <Image
                  alt={item.service}
                  source={{ uri: service?.image ?? PROFILE_SUMMARY.avatar }}
                  style={styles.historyImage}
                />

                <View style={styles.historyCopy}>
                  <Text style={styles.historyTime}>
                    {schedule.date}
                    {schedule.time ? ` • ${schedule.time}` : ""}
                  </Text>
                  <Text numberOfLines={1} style={styles.historyTitle}>
                    {item.service}
                  </Text>
                  <Text style={styles.historyPrice}>{service?.price ?? "0đ"}</Text>
                </View>

                <View style={styles.historyAside}>
                  <HistoryStatus label={item.status} tone={getHistoryTone(item.status)} />
                  <Feather color={colors.textSoft} name="chevron-right" size={18} />
                </View>
              </SurfaceCard>
            );
          })}
        </View>
      ) : null}

      {activeTab === "favorites" ? (
        <View style={styles.cardList}>
          {favoriteServices.map((service) => (
            <SurfaceCard key={service.id} style={styles.favoriteCard}>
              <Image alt={service.title} source={{ uri: service.image }} style={styles.favoriteImage} />
              <View style={styles.favoriteCopy}>
                <Text numberOfLines={1} style={styles.favoriteTitle}>
                  {service.title}
                </Text>
                <Text numberOfLines={2} style={styles.favoriteSubtitle}>
                  {service.blurb}
                </Text>
                <Text style={styles.favoriteMeta}>{service.price}</Text>
              </View>
              <Feather color={colors.textSoft} name="chevron-right" size={18} />
            </SurfaceCard>
          ))}

          {favoriteServices.length === 0 ? (
            <SurfaceCard style={styles.emptyCard}>
              <Feather color={colors.textSoft} name="heart" size={18} />
              <Text style={styles.emptyTitle}>Chưa có mẫu yêu thích</Text>
              <Text style={styles.emptyText}>
                Lưu các mẫu bạn thích ở màn Khám phá để xem lại nhanh tại đây.
              </Text>
            </SurfaceCard>
          ) : null}
        </View>
      ) : null}

      {activeTab === "info" ? (
        <View style={styles.infoStack}>
          <SurfaceCard style={styles.formCard}>
            <EditableField
              label="Họ và tên"
              onChangeText={(value) => setForm((current) => ({ ...current, name: value }))}
              placeholder="Nhập họ và tên"
              value={form.name}
            />
            <EditableField
              label="Ngày sinh"
              onChangeText={(value) => setForm((current) => ({ ...current, birthDate: value }))}
              placeholder="DD/MM/YYYY"
              value={form.birthDate}
            />
            <EditableField
              label="Số điện thoại"
              onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))}
              placeholder="Nhập số điện thoại"
              value={form.phone}
            />
            <EditableField
              autoCapitalize="none"
              keyboardType="email-address"
              label="Email"
              onChangeText={(value) => setForm((current) => ({ ...current, email: value }))}
              placeholder="Nhập email"
              value={form.email}
            />
            <EditableField
              label="Địa chỉ"
              multiline
              onChangeText={(value) => setForm((current) => ({ ...current, address: value }))}
              placeholder="Nhập địa chỉ"
              value={form.address}
            />

            <PrimaryAction
              label={isSavingProfile ? "Đang lưu..." : "Lưu thông tin"}
              onPress={handleSaveProfile}
            />
          </SurfaceCard>
        </View>
      ) : null}

      <Pressable
        disabled={isBusy}
        onPress={handleSignOut}
        style={({ pressed }) => [styles.logoutButton, pressed ? styles.logoutButtonPressed : null]}
      >
        <Feather color="#f05a3b" name="log-out" size={18} />
        <Text style={styles.logoutLabel}>{isBusy ? "Đang đăng xuất..." : "Đăng xuất"}</Text>
      </Pressable>
    </CustomerScreen>
  );
}

function ProfileMetric({
  compact = false,
  icon,
  label,
  onPress,
  value,
}: {
  compact?: boolean;
  icon: FeatherIconName;
  label: string;
  onPress?: () => void;
  value: string;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.metricItem,
        compact ? styles.metricItemCompact : null,
        onPress ? styles.metricItemInteractive : null,
      ]}
    >
      <View style={styles.metricTopRow}>
        <Feather color={onPress ? colors.text : colors.textSoft} name={icon} size={15} />
        {onPress ? <Feather color={colors.textSoft} name="chevron-right" size={13} /> : null}
      </View>
      <Text numberOfLines={1} style={[styles.metricLabel, onPress ? styles.metricLabelInteractive : null]}>
        {label}
      </Text>
      <Text numberOfLines={1} style={[styles.metricValue, onPress ? styles.metricValueInteractive : null]}>
        {value}
      </Text>
    </Pressable>
  );
}

function HistoryStatus({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "warning" | "danger";
}) {
  return (
    <View
      style={[
        styles.statusPill,
        tone === "success" ? styles.statusPillSuccess : null,
        tone === "warning" ? styles.statusPillWarning : null,
        tone === "danger" ? styles.statusPillDanger : null,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.statusPillText,
          tone === "success" ? styles.statusPillTextSuccess : null,
          tone === "warning" ? styles.statusPillTextWarning : null,
          tone === "danger" ? styles.statusPillTextDanger : null,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function EditableField({
  autoCapitalize,
  keyboardType,
  label,
  multiline = false,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  value,
}: {
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  value: string;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        style={[styles.input, multiline ? styles.inputMultiline : null]}
        textAlignVertical={multiline ? "top" : "center"}
        value={value}
      />
    </View>
  );
}

function PrimaryAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.primaryButton, pressed ? styles.primaryButtonPressed : null]}>
      <Text style={styles.primaryButtonLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 148,
    paddingTop: 2,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  topIconButton: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  profileHero: {
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingTop: 6,
  },
  avatarWrap: {
    marginTop: 2,
    position: "relative",
  },
  avatar: {
    borderRadius: 43,
    height: 86,
    width: 86,
  },
  cameraBadge: {
    ...shadow.card,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    bottom: -4,
    height: 32,
    justifyContent: "center",
    position: "absolute",
    right: -10,
    width: 32,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.18,
    lineHeight: 21,
    textAlign: "center",
  },
  contactList: {
    gap: 7,
  },
  contactRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
  },
  contact: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: -0.06,
    lineHeight: 16,
  },
  metricsCard: {
    minHeight: 88,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  metricsRow: {
    alignItems: "stretch",
    flexDirection: "row",
    width: "100%",
  },
  metricItem: {
    flex: 1,
    gap: 4,
    justifyContent: "center",
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metricItemCompact: {
    flex: 0.78,
  },
  metricItemInteractive: {
    backgroundColor: "#f7efe6",
    borderColor: "#ead8c7",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  metricTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricDivider: {
    backgroundColor: "#efe4d8",
    marginVertical: 10,
    width: 1,
  },
  metricLabel: {
    color: colors.textSoft,
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: -0.04,
    lineHeight: 12,
  },
  metricLabelInteractive: {
    color: colors.text,
    fontWeight: "700",
  },
  metricValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.15,
    lineHeight: 17,
  },
  metricValueInteractive: {
    color: "#7b583e",
  },
  tabsCard: {
    flexDirection: "row",
    gap: 6,
    padding: 6,
  },
  tabButton: {
    alignItems: "center",
    borderRadius: 13,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 37,
    paddingHorizontal: 5,
  },
  tabButtonActive: {
    backgroundColor: colors.accentSoft,
  },
  tabLabel: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  tabLabelActive: {
    color: colors.text,
    fontWeight: "700",
  },
  cardList: {
    gap: 11,
  },
  historyCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
    minHeight: 90,
    padding: 10,
  },
  historyImage: {
    borderRadius: 14,
    height: 62,
    width: 62,
  },
  historyCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  historyTime: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: -0.06,
    lineHeight: 14,
  },
  historyTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.16,
    lineHeight: 17,
  },
  historyPrice: {
    color: "#8f7c6e",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: -0.06,
    lineHeight: 16,
  },
  historyAside: {
    alignItems: "flex-end",
    gap: 10,
    justifyContent: "space-between",
    minHeight: 62,
  },
  statusPill: {
    alignItems: "center",
    borderRadius: radius.pill,
    justifyContent: "center",
    minWidth: 88,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillSuccess: {
    backgroundColor: colors.successBg,
  },
  statusPillWarning: {
    backgroundColor: colors.warningBg,
  },
  statusPillDanger: {
    backgroundColor: colors.dangerBg,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: -0.08,
  },
  statusPillTextSuccess: {
    color: colors.successText,
  },
  statusPillTextWarning: {
    color: colors.warningText,
  },
  statusPillTextDanger: {
    color: colors.dangerText,
  },
  favoriteCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 92,
    padding: 12,
  },
  favoriteImage: {
    borderRadius: 14,
    height: 68,
    width: 68,
  },
  favoriteCopy: {
    flex: 1,
    gap: 4,
  },
  favoriteTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.16,
  },
  favoriteSubtitle: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  favoriteMeta: {
    color: "#8f7c6e",
    fontSize: 13,
  },
  emptyCard: {
    alignItems: "center",
    gap: 8,
    padding: 18,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  emptyText: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  infoStack: {
    gap: 12,
  },
  formCard: {
    gap: 12,
    padding: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputMultiline: {
    minHeight: 92,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 48,
    marginTop: 4,
    paddingHorizontal: 14,
  },
  primaryButtonPressed: {
    opacity: 0.88,
  },
  primaryButtonLabel: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "800",
  },
  logoutButton: {
    ...shadow.card,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 2,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  logoutButtonPressed: {
    opacity: 0.88,
  },
  logoutLabel: {
    color: "#f05a3b",
    fontSize: 14,
    fontWeight: "800",
  },
});
