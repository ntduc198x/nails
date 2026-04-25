import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OFFERS } from "@/src/features/customer/data";

const OFFER_VISUALS = [
  { tone: "#b06f2c", soft: "#f9ebe1", featured: true },
  { tone: "#1e85b7", soft: "#e4f2fa", featured: false },
  { tone: "#6a8b2c", soft: "#e8f1df", featured: false },
] as const;

export default function OffersScreen() {
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView bounces={false} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Ví ưu đãi</Text>
              <Text style={styles.subtitle}>Sử dụng ưu đãi để tiết kiệm chi phí</Text>
            </View>

            <Pressable style={styles.historyWrap}>
              <View style={styles.historyCircle}>
                <Feather color="#8b6950" name="clock" size={20} />
              </View>
              <Text style={styles.historyLabel}>Lịch sử</Text>
            </Pressable>
          </View>

          <View style={styles.segmentWrap}>
            <Pressable style={[styles.segmentItem, styles.segmentItemActive]}>
              <Feather color="#fff" name="tag" size={15} />
              <Text style={[styles.segmentLabel, styles.segmentLabelActive]}>Ưu đãi</Text>
            </Pressable>

            <Pressable style={styles.segmentItem} onPress={() => router.push("/(customer)/membership")}>
              <Feather color="#7f6e61" name="hexagon" size={15} />
              <Text style={styles.segmentLabel}>Thẻ thành viên</Text>
            </Pressable>
          </View>

          <View style={styles.cards}>
            {OFFERS.map((offer, index) => {
              const visual = OFFER_VISUALS[index] ?? OFFER_VISUALS[OFFER_VISUALS.length - 1];
              const featured = visual.featured;

              return (
                <View key={offer.id} style={[styles.card, featured ? styles.cardFeatured : null]}>
                  {featured ? (
                    <View style={styles.featuredBadge}>
                      <Text style={styles.featuredBadgeText}>Nổi bật</Text>
                    </View>
                  ) : null}

                  <View style={[styles.cardInner, featured ? styles.cardInnerFeatured : null]}>
                    <View style={[styles.iconWrap, { backgroundColor: visual.soft }]}>
                      <Feather color={visual.tone} name="tag" size={30} />
                    </View>

                    <View style={styles.copy}>
                      <Text style={styles.offerTitle}>{offer.title}</Text>
                      <Text style={styles.offerDetail}>{offer.detail}</Text>
                      <Text style={styles.offerExpiry}>{offer.expiry}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.aside}>
                      <Pressable style={styles.actionIcon}>
                        <Feather color="#8b6950" name="share-2" size={18} />
                      </Pressable>

                      <Pressable style={[styles.useButton, featured ? styles.useButtonFilled : styles.useButtonGhost]}>
                        <Text style={[styles.useButtonText, featured ? styles.useButtonTextFilled : null]}>Sử dụng</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          <Pressable style={styles.redeemButton}>
            <Feather color="#fff" name="tag" size={16} />
            <Text style={styles.redeemButtonText}>Nhập mã ưu đãi</Text>
          </Pressable>
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
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  headerCopy: {
    flex: 1,
    gap: 8,
    paddingRight: 12,
    paddingTop: 6,
  },
  title: {
    color: "#15110d",
    fontSize: 29,
    fontWeight: "800",
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  subtitle: {
    color: "#6c6157",
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 21,
  },
  historyWrap: {
    alignItems: "center",
    gap: 8,
    minWidth: 68,
    paddingTop: 2,
  },
  historyCircle: {
    alignItems: "center",
    backgroundColor: "#fff8f2",
    borderColor: "#ece0d4",
    borderRadius: 23,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    shadowColor: "#2a1e14",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    width: 46,
  },
  historyLabel: {
    color: "#73675d",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  segmentWrap: {
    backgroundColor: "#fffdfa",
    borderColor: "#eadfd2",
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 20,
    padding: 4,
  },
  segmentItem: {
    alignItems: "center",
    borderRadius: 22,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 46,
  },
  segmentItemActive: {
    backgroundColor: "#4a3424",
  },
  segmentLabel: {
    color: "#78695f",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  segmentLabelActive: {
    color: "#fff",
    fontWeight: "700",
  },
  cards: {
    gap: 14,
  },
  card: {
    backgroundColor: "#fffdfa",
    borderColor: "#eadfd2",
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#2a1e14",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
  },
  cardFeatured: {
    minHeight: 136,
  },
  featuredBadge: {
    backgroundColor: "#ca7b31",
    borderRadius: 999,
    left: 16,
    paddingHorizontal: 13,
    paddingVertical: 6,
    position: "absolute",
    top: 14,
    zIndex: 2,
  },
  featuredBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 13,
  },
  cardInner: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 118,
    paddingLeft: 14,
  },
  cardInnerFeatured: {
    minHeight: 136,
    paddingTop: 14,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 16,
    height: 62,
    justifyContent: "center",
    marginRight: 14,
    width: 62,
  },
  copy: {
    flex: 1,
    gap: 6,
    paddingRight: 8,
    paddingTop: 4,
  },
  offerTitle: {
    color: "#17120f",
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 25,
  },
  offerDetail: {
    color: "#655952",
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 21,
  },
  offerExpiry: {
    color: "#6a5f57",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
  },
  divider: {
    alignSelf: "stretch",
    borderColor: "#efe3d7",
    borderRightWidth: 1,
    borderStyle: "dashed",
    marginVertical: 8,
  },
  aside: {
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 118,
    paddingBottom: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    width: 92,
  },
  actionIcon: {
    alignItems: "center",
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  useButton: {
    alignItems: "center",
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 38,
    minWidth: 72,
    paddingHorizontal: 14,
  },
  useButtonFilled: {
    backgroundColor: "#7a5335",
  },
  useButtonGhost: {
    backgroundColor: "#fffdfa",
    borderColor: "#dcc6b4",
    borderWidth: 1.5,
  },
  useButtonText: {
    color: "#7a5335",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 16,
  },
  useButtonTextFilled: {
    color: "#fff",
  },
  redeemButton: {
    alignItems: "center",
    backgroundColor: "#4a3424",
    borderRadius: 16,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 54,
  },
  redeemButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
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
