import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CustomerScreen, CustomerTopActions, SurfaceCard } from "@/src/features/customer/ui";
import { premiumTheme } from "@/src/design/premium-theme";
import { useCustomerMembership } from "@/src/hooks/use-customer-membership";

const { colors, radius } = premiumTheme;

function formatNumber(value: number) {
  return value.toLocaleString("vi-VN");
}

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("vi-VN");
}

function buildHelperText(input: {
  hasMembership: boolean;
  nextTierName: string | null;
  pointsBalance: number;
  totalSpent: number;
  totalVisits: number;
  expiresAt: string | null;
}) {
  if (!input.hasMembership) {
    return "Dang san sang kich hoat the thanh vien that tu du lieu cua cua hang.";
  }

  if (input.nextTierName) {
    return `Dang tich luy ${formatNumber(input.pointsBalance)} diem. Muc chi tieu hien tai ${formatNumber(input.totalSpent)} va ${formatNumber(input.totalVisits)} luot hen, muc tieu tiep theo la ${input.nextTierName}.`;
  }

  const expiresText = formatDate(input.expiresAt);
  if (expiresText) {
    return `Ban dang o hang cao nhat. Quyen loi hien tai co hieu luc den ${expiresText}.`;
  }

  return "Ban dang o hang cao nhat va co the tiep tuc su dung cac quyen loi hien co.";
}

export default function MembershipScreen() {
  const {
    currentTier,
    expiresAt,
    hasMembership,
    isLoading,
    offers,
    perks,
    pointsBalance,
    progress,
    refresh,
    totalSpent,
    totalVisits,
    nextTier,
  } = useCustomerMembership();

  const tierName = currentTier?.name || "Thanh vien";
  const tierAccent = currentTier?.accentColor || "#efc26d";
  const helperText = buildHelperText({
    hasMembership,
    nextTierName: nextTier?.name ?? null,
    pointsBalance,
    totalSpent,
    totalVisits,
    expiresAt,
  });
  const progressWidth = `${Math.max(0, Math.min(progress, 1)) * 100}%` as `${number}%`;

  return (
    <CustomerScreen hideHeader title="The thanh vien" contentContainerStyle={styles.content} onRefresh={() => void refresh()} refreshing={isLoading}>
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Feather color={colors.text} name="chevron-left" size={22} />
        </Pressable>
        <Text style={styles.title}>The thanh vien</Text>
        <CustomerTopActions />
      </View>

      <View style={styles.heroCard}>
        <View style={styles.patternLarge} />
        <View style={styles.patternSmall} />

        <Text style={styles.brand}>CHAM BEAUTY</Text>
        <Text style={styles.tier}>
          Member <Text style={[styles.tierAccent, { color: tierAccent }]}>{tierName}</Text>
        </Text>

        <Text style={styles.pointsLabel}>Diem hien tai</Text>
        <Text style={styles.points}>{formatNumber(pointsBalance)} diem</Text>

        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: progressWidth }]} />
          </View>

          <View style={styles.heroBadge}>
            <Feather color="#f1c56d" name="award" size={14} />
            <Text style={styles.heroBadgeText}>{nextTier?.name ? `Len ${nextTier.name}` : "Quyen loi"}</Text>
          </View>
        </View>

        <Text style={styles.helper}>{helperText}</Text>

        <View style={styles.medalShell}>
          <View style={styles.medalOuter}>
            <View style={styles.medalInner}>
              <Feather color="#bb7723" name="award" size={26} />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Quyen loi cua ban</Text>

        <View style={styles.perkList}>
          {(perks.length ? perks : ["Khong co quyen loi nao duoc cau hinh cho hang hien tai."]).map((perk) => (
            <SurfaceCard key={perk} style={styles.perkCard}>
              <View style={styles.perkIcon}>
                <Feather color={colors.text} name="star" size={18} />
              </View>

              <View style={styles.perkCopy}>
                <Text style={styles.perkTitle}>{perk}</Text>
                <Text style={styles.perkDetail}>Du lieu quyen loi dang doc truc tiep tu hang thanh vien that.</Text>
              </View>
            </SurfaceCard>
          ))}
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Uu dai dang ap dung</Text>

        <View style={styles.perkList}>
          {offers.length ? (
            offers.map((offer) => (
              <SurfaceCard key={offer.id} style={styles.perkCard}>
                <View style={styles.perkIcon}>
                  <Feather color={colors.text} name="tag" size={18} />
                </View>

                <View style={styles.perkCopy}>
                  <Text style={styles.perkTitle}>{offer.title}</Text>
                  <Text style={styles.perkDetail}>{offer.description}</Text>
                </View>
              </SurfaceCard>
            ))
          ) : (
            <SurfaceCard style={styles.ctaCard}>
              <Text style={styles.ctaTitle}>Chua co uu dai dang bat</Text>
              <Text style={styles.ctaText}>Khi admin cap nhat Landing Feed, uu dai se tu dong hien tai day.</Text>
            </SurfaceCard>
          )}
        </View>
      </View>
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
    paddingTop: 4,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  backButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.6,
    textAlign: "center",
  },
  heroCard: {
    backgroundColor: "#34291d",
    borderRadius: 24,
    minHeight: 238,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingVertical: 18,
    position: "relative",
  },
  patternLarge: {
    borderColor: "rgba(236, 180, 93, 0.08)",
    borderRadius: 52,
    borderWidth: 1,
    height: 210,
    position: "absolute",
    right: 28,
    top: -30,
    transform: [{ rotate: "18deg" }],
    width: 210,
  },
  patternSmall: {
    borderColor: "rgba(236, 180, 93, 0.08)",
    borderRadius: 42,
    borderWidth: 1,
    height: 160,
    position: "absolute",
    right: -12,
    top: -12,
    transform: [{ rotate: "18deg" }],
    width: 160,
  },
  brand: {
    color: "#efc26d",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 14,
  },
  tier: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 35,
    marginBottom: 14,
  },
  tierAccent: {
    color: "#efc26d",
  },
  pointsLabel: {
    color: "#e7dcd1",
    fontSize: 14,
    marginBottom: 6,
  },
  points: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 14,
  },
  progressRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  progressTrack: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: radius.pill,
    flex: 1,
    height: 9,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: "#f4c56f",
    borderRadius: radius.pill,
    height: "100%",
  },
  heroBadge: {
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
  heroBadgeText: {
    color: "#fff4e5",
    fontSize: 14,
    fontWeight: "700",
  },
  helper: {
    color: "#eadfd1",
    fontSize: 13,
    lineHeight: 18,
    maxWidth: "82%",
  },
  medalShell: {
    position: "absolute",
    right: 18,
    top: 18,
  },
  medalOuter: {
    alignItems: "center",
    backgroundColor: "#eea848",
    borderRadius: radius.pill,
    height: 78,
    justifyContent: "center",
    width: 78,
  },
  medalInner: {
    alignItems: "center",
    backgroundColor: "#ffd58e",
    borderColor: "#f5b557",
    borderRadius: radius.pill,
    borderWidth: 5,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  sectionBlock: {
    gap: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  perkList: {
    gap: 10,
  },
  perkCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    padding: 14,
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
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  perkDetail: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  ctaCard: {
    backgroundColor: "#fff7ef",
    borderColor: "#eaded1",
    gap: 8,
  },
  ctaTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  ctaText: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 19,
  },
});
