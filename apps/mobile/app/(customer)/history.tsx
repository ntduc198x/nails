import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BOOKING_HISTORY } from "@/src/features/customer/data";
import { CustomerScreen, SegmentedTabs, StatusTag, SurfaceCard } from "@/src/features/customer/ui";
import { premiumTheme } from "@/src/design/premium-theme";

const { colors, spacing } = premiumTheme;

const FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "arrived", label: "Đã đến" },
  { key: "cancelled", label: "Đã hủy" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default function HistoryScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const items = useMemo(() => {
    if (activeFilter === "all") return BOOKING_HISTORY;
    if (activeFilter === "arrived") return BOOKING_HISTORY.filter((item) => item.status === "Đã đến");
    return BOOKING_HISTORY.filter((item) => item.status === "Đã hủy");
  }, [activeFilter]);

  return (
    <CustomerScreen title="Lịch sử đặt lịch">
      <SegmentedTabs activeKey={activeFilter} items={FILTERS} onChange={setActiveFilter} />

      <View style={styles.list}>
        {items.map((item) => (
          <SurfaceCard key={item.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.copy}>
                <Text style={styles.time}>{item.time}</Text>
                <Text style={styles.staff}>{item.staff}</Text>
                <Text style={styles.service}>{item.service}</Text>
              </View>
              <StatusTag label={item.status} tone={item.tone} />
            </View>
          </SurfaceCard>
        ))}
      </View>
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
  card: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: 6,
  },
  time: {
    color: colors.textSoft,
    fontSize: 14,
  },
  staff: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  service: {
    color: colors.textSoft,
    fontSize: 15,
  },
});
