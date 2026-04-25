import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PERKS = [
  {
    icon: "star" as const,
    title: "Tích điểm đổi quà",
    detail: "Tích điểm khi sử dụng dịch vụ và đổi quà hấp dẫn",
  },
  {
    icon: "gift" as const,
    title: "Ưu đãi sinh nhật",
    detail: "Nhận ưu đãi đặc biệt trong tháng sinh nhật",
  },
  {
    icon: "calendar" as const,
    title: "Ưu tiên đặt lịch",
    detail: "Đặt lịch nhanh chóng, ưu tiên hỗ trợ",
  },
  {
    icon: "tag" as const,
    title: "Giảm giá đặc biệt",
    detail: "Nhận các ưu đãi độc quyền dành riêng cho hội viên",
  },
] as const;

export default function MembershipScreen() {
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView bounces={false} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Thẻ thành viên</Text>
            <Pressable style={styles.helpButton}>
              <Feather color="#7b6b5f" name="help-circle" size={20} />
            </Pressable>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.patternPrimary} />
            <View style={styles.patternSecondary} />

            <Text style={styles.brand}>CHAM BEAUTY</Text>
            <Text style={styles.tier}>
              Member <Text style={styles.tierAccent}>Gold</Text>
            </Text>

            <Text style={styles.pointsLabel}>Điểm hiện tại</Text>
            <Text style={styles.points}>
              1.250 <Text style={styles.pointsSuffix}>điểm</Text>
            </Text>

            <View style={styles.heroActionRow}>
              <View style={styles.progressTrack}>
                <View style={styles.progressFill} />
              </View>

              <Pressable style={styles.heroActionButton} onPress={() => router.push("/(customer)/offers")}>
                <Feather color="#f0c36f" name="tag" size={15} />
                <Text style={styles.heroActionText}>Ưu đãi</Text>
                <Feather color="#f0c36f" name="chevron-right" size={16} />
              </Pressable>
            </View>

            <Text style={styles.heroHelper}>Bạn cần thêm 750 điểm để lên hạng Platinum</Text>

            <View style={styles.medalWrap}>
              <View style={styles.medalOuter}>
                <View style={styles.medalInner}>
                  <Feather color="#bd7623" name="award" size={28} />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quyền lợi thành viên</Text>

            <View style={styles.perkList}>
              {PERKS.map((perk) => (
                <Pressable key={perk.title} style={styles.perkRow}>
                  <View style={styles.perkIcon}>
                    <Feather color="#4a382c" name={perk.icon} size={20} />
                  </View>

                  <View style={styles.perkCopy}>
                    <Text style={styles.perkTitle}>{perk.title}</Text>
                    <Text style={styles.perkDetail}>{perk.detail}</Text>
                  </View>

                  <Feather color="#75685d" name="chevron-right" size={20} />
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.historyButton}>
              <Feather color="#fff" name="calendar" size={16} />
              <Text style={styles.historyButtonText}>Xem lịch sử điểm</Text>
              <Feather color="#fff" name="chevron-right" size={18} />
            </Pressable>
          </View>
        </ScrollView>

        <View style={styles.bottomNav}>
          <Pressable style={styles.navItem} onPress={() => router.push("/(customer)")}>
            <Feather color="#7d6f64" name="home" size={20} />
            <Text style={styles.navLabel}>Trang chủ</Text>
          </Pressable>

          <Pressable style={styles.navItem} onPress={() => router.push("/(customer)/explore")}>
            <Feather color="#7d6f64" name="compass" size={19} />
            <Text style={styles.navLabel}>Khám phá</Text>
          </Pressable>

          <Pressable style={styles.centerButton} onPress={() => router.push("/(customer)/booking")}>
            <Feather color="#fff" name="plus" size={25} />
          </Pressable>

          <Pressable style={styles.navItem} onPress={() => router.push("/(customer)/notifications")}>
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>2</Text>
            </View>
            <Feather color="#7d6f64" name="bell" size={19} />
            <Text style={styles.navLabel}>Thông báo</Text>
          </Pressable>

          <Pressable style={[styles.navItem, styles.navItemActive]} onPress={() => router.push("/(customer)/profile")}>
            <Feather color="#5e442e" name="user" size={19} />
            <Text style={[styles.navLabel, styles.navLabelActive]}>Cá nhân</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fbf6ef",
  },
  screen: {
    flex: 1,
    backgroundColor: "#fbf6ef",
  },
  content: {
    paddingBottom: 112,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  title: {
    color: "#15110d",
    fontSize: 29,
    fontWeight: "800",
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  helpButton: {
    alignItems: "center",
    backgroundColor: "#fffaf5",
    borderColor: "#ece0d4",
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    shadowColor: "#2a1e14",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    width: 44,
  },
  heroCard: {
    backgroundColor: "#34291d",
    borderRadius: 22,
    minHeight: 238,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingVertical: 18,
    position: "relative",
  },
  patternPrimary: {
    borderColor: "rgba(236, 180, 93, 0.08)",
    borderRadius: 44,
    borderWidth: 1,
    height: 160,
    position: "absolute",
    right: -8,
    top: -10,
    transform: [{ rotate: "18deg" }],
    width: 160,
  },
  patternSecondary: {
    borderColor: "rgba(236, 180, 93, 0.08)",
    borderRadius: 54,
    borderWidth: 1,
    height: 210,
    position: "absolute",
    right: 32,
    top: -28,
    transform: [{ rotate: "18deg" }],
    width: 210,
  },
  brand: {
    color: "#efc26d",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
    lineHeight: 17,
    marginBottom: 14,
  },
  tier: {
    color: "#fff",
    fontSize: 31,
    fontWeight: "800",
    letterSpacing: -0.8,
    lineHeight: 35,
    marginBottom: 14,
  },
  tierAccent: {
    color: "#efc26d",
  },
  pointsLabel: {
    color: "#e7dcd1",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 17,
    marginBottom: 6,
  },
  points: {
    color: "#fff",
    fontSize: 29,
    fontWeight: "900",
    letterSpacing: -0.8,
    lineHeight: 32,
    marginBottom: 14,
  },
  pointsSuffix: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  heroActionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  progressTrack: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    flex: 1,
    height: 9,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: "#f4c56f",
    borderRadius: 999,
    height: "100%",
    width: "58%",
  },
  heroActionButton: {
    alignItems: "center",
    backgroundColor: "rgba(111, 81, 44, 0.76)",
    borderColor: "#d1a45d",
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  heroActionText: {
    color: "#fff4e5",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 16,
  },
  heroHelper: {
    color: "#eadfd1",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
    maxWidth: "82%",
  },
  medalWrap: {
    position: "absolute",
    right: 18,
    top: 18,
  },
  medalOuter: {
    alignItems: "center",
    backgroundColor: "#eea848",
    borderRadius: 999,
    height: 78,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    width: 78,
  },
  medalInner: {
    alignItems: "center",
    backgroundColor: "#ffd58e",
    borderColor: "#f5b557",
    borderRadius: 999,
    borderWidth: 5,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  section: {
    marginTop: 22,
  },
  sectionTitle: {
    color: "#201913",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.4,
    lineHeight: 21,
    marginBottom: 14,
  },
  perkList: {
    gap: 8,
  },
  perkRow: {
    alignItems: "center",
    backgroundColor: "#fffdfa",
    borderColor: "#eee2d6",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 74,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  perkIcon: {
    alignItems: "center",
    backgroundColor: "#f6efe7",
    borderRadius: 18,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  perkCopy: {
    flex: 1,
    gap: 2,
  },
  perkTitle: {
    color: "#1f1914",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  perkDetail: {
    color: "#6a5f57",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 17,
  },
  historyButton: {
    alignItems: "center",
    backgroundColor: "#4a3424",
    borderRadius: 16,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 14,
    minHeight: 56,
  },
  historyButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 18,
  },
  bottomNav: {
    alignItems: "flex-start",
    backgroundColor: "#fffdfa",
    borderTopColor: "#eadfd2",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 12,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  navItem: {
    alignItems: "center",
    borderRadius: 20,
    gap: 5,
    justifyContent: "center",
    minHeight: 56,
    minWidth: 66,
    paddingHorizontal: 8,
    position: "relative",
  },
  navItemActive: {
    backgroundColor: "#f3e9df",
  },
  navLabel: {
    color: "#7a6d63",
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 12,
  },
  navLabelActive: {
    color: "#5e442e",
    fontWeight: "700",
  },
  centerButton: {
    alignItems: "center",
    backgroundColor: "#4a3424",
    borderRadius: 29,
    height: 58,
    justifyContent: "center",
    marginTop: -18,
    shadowColor: "#2a1e14",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    width: 58,
  },
  notificationBadge: {
    alignItems: "center",
    backgroundColor: "#f14d43",
    borderColor: "#fffdfa",
    borderRadius: 9,
    borderWidth: 1.5,
    height: 16,
    justifyContent: "center",
    minWidth: 16,
    paddingHorizontal: 3,
    position: "absolute",
    right: 14,
    top: 3,
    zIndex: 2,
  },
  notificationBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 10,
  },
});
