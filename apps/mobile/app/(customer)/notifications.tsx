import Feather from "@expo/vector-icons/Feather";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { NOTIFICATIONS } from "@/src/features/customer/data";
import { CustomerScreen, SurfaceCard } from "@/src/features/customer/ui";
import { premiumTheme } from "@/src/design/premium-theme";

const { colors, radius, shadow } = premiumTheme;

const FILTERS = [
  { key: "Tất cả", label: "Tất cả", icon: "bell" },
  { key: "Hệ thống", label: "Hệ thống", icon: "message-square" },
  { key: "Khuyến mãi", label: "Khuyến mãi", icon: "gift" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];
type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

function normalizeVietnamese(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function normalizeGroup(value: string): FilterKey {
  const normalized = normalizeVietnamese(value);

  if (normalized.includes("he thong")) return "Hệ thống";
  if (normalized.includes("khuyen mai")) return "Khuyến mãi";
  return "Tất cả";
}

function getNotificationContent(item: (typeof NOTIFICATIONS)[number]) {
  switch (item.id) {
    case "notify-1":
      return {
        title: "Đặt lịch thành công",
        body: "Bạn đã đặt lịch với Nguyễn Khánh Ly\nvào 19:00 18/04",
        time: "2 phút trước",
      };
    case "notify-2":
      return {
        title: "Nhắc lịch hẹn",
        body: "Bạn có lịch hẹn vào 19:00 18/04\nvới Nguyễn Khánh Ly",
        time: "10 phút trước",
      };
    case "notify-3":
      return {
        title: "Ưu đãi đặc biệt",
        body: "Giảm 20% tất cả dịch vụ nail art\ntrong tuần này!",
        time: "1 giờ trước",
      };
    default:
      return {
        title: "Đánh giá dịch vụ",
        body: "Cảm ơn bạn đã sử dụng dịch vụ.\nHãy đánh giá để giúp chúng tôi cải thiện nhé!",
        time: "2 giờ trước",
      };
  }
}

function getNotificationVisual(item: (typeof NOTIFICATIONS)[number]): {
  accent: string;
  icon: FeatherIconName;
  surface: string;
} {
  switch (item.id) {
    case "notify-1":
      return {
        accent: "#c97137",
        icon: "calendar",
        surface: "#f8ece3",
      };
    case "notify-2":
      return {
        accent: "#4287c8",
        icon: "calendar",
        surface: "#eef5fb",
      };
    case "notify-3":
      return {
        accent: "#f39a24",
        icon: "tag",
        surface: "#fdf2e5",
      };
    default:
      return {
        accent: "#78a541",
        icon: "star",
        surface: "#eef5e7",
      };
  }
}

export default function NotificationsScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("Tất cả");

  const items = useMemo(() => {
    if (activeFilter === "Tất cả") return NOTIFICATIONS;
    return NOTIFICATIONS.filter((item) => normalizeGroup(item.group) === activeFilter);
  }, [activeFilter]);

  return (
    <CustomerScreen hideHeader title="Thông báo" contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>CHAM BEAUTY</Text>
          <Text style={styles.pageTitle}>Thông báo</Text>
        </View>

        <Pressable style={styles.settingsButton}>
          <Feather color={colors.text} name="settings" size={18} />
        </Pressable>
      </View>

      <View style={styles.segmentWrap}>
        {FILTERS.map((item) => {
          const active = activeFilter === item.key;

          return (
            <Pressable
              key={item.key}
              onPress={() => setActiveFilter(item.key)}
              style={[styles.segmentItem, active ? styles.segmentItemActive : null]}
            >
              <Feather color={active ? "#fffaf5" : "#857568"} name={item.icon} size={14} />
              <Text style={[styles.segmentLabel, active ? styles.segmentLabelActive : null]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.list}>
        {items.map((item) => {
          const content = getNotificationContent(item);
          const visual = getNotificationVisual(item);

          return (
            <SurfaceCard key={item.id} style={styles.card}>
              <View style={[styles.notificationIconWrap, { backgroundColor: visual.surface }]}>
                <View style={[styles.notificationDot, { backgroundColor: visual.accent }]} />
                <Feather color={visual.accent} name={visual.icon} size={20} />
              </View>

              <View style={styles.cardCopy}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>{content.title}</Text>
                  <Text style={styles.cardTime}>{content.time}</Text>
                </View>

                <Text style={styles.cardBody}>{content.body}</Text>
              </View>

              <View style={styles.chevronWrap}>
                <Feather color="#9c8c7d" name="chevron-right" size={18} />
              </View>
            </SurfaceCard>
          );
        })}
      </View>

      <Pressable style={styles.readAllButton}>
        <View style={styles.readAllCopy}>
          <Feather color="#8d7d6f" name="inbox" size={15} />
          <Text style={styles.readAllText}>Đánh dấu tất cả đã đọc</Text>
        </View>
        <Feather color="#9c8c7d" name="chevron-right" size={18} />
      </Pressable>
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 11,
    paddingTop: 6,
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
    paddingRight: 12,
  },
  eyebrow: {
    color: "#4f4034",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.6,
    lineHeight: 15,
  },
  pageTitle: {
    color: colors.text,
    fontSize: 29,
    fontWeight: "800",
    letterSpacing: -0.82,
    lineHeight: 34,
  },
  settingsButton: {
    alignItems: "center",
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  segmentWrap: {
    alignItems: "center",
    backgroundColor: "#fffaf5",
    borderColor: colors.border,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    minHeight: 43,
    padding: 4,
  },
  segmentItem: {
    alignItems: "center",
    borderRadius: 13,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 35,
    paddingHorizontal: 7,
  },
  segmentItemActive: {
    backgroundColor: colors.accent,
  },
  segmentLabel: {
    color: "#7c6c5f",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: -0.12,
  },
  segmentLabelActive: {
    color: "#fffaf5",
    fontWeight: "700",
  },
  list: {
    gap: 11,
  },
  card: {
    ...shadow.card,
    alignItems: "center",
    borderRadius: 21,
    flexDirection: "row",
    gap: 13,
    minHeight: 93,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  notificationIconWrap: {
    alignItems: "center",
    borderRadius: 21,
    height: 50,
    justifyContent: "center",
    position: "relative",
    width: 50,
  },
  notificationDot: {
    borderRadius: radius.pill,
    height: 7,
    position: "absolute",
    right: -2,
    top: -1,
    width: 7,
  },
  cardCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  cardTitleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  cardTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.22,
    lineHeight: 19,
  },
  cardTime: {
    color: "#9a8a7b",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: -0.08,
    lineHeight: 16,
  },
  cardBody: {
    color: "#6e5f53",
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: -0.1,
    lineHeight: 20,
  },
  chevronWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 18,
  },
  readAllButton: {
    alignItems: "center",
    backgroundColor: "#fffdfa",
    borderColor: colors.border,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 50,
    paddingHorizontal: 16,
  },
  readAllCopy: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  readAllText: {
    color: "#7b6c60",
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: -0.14,
  },
});
