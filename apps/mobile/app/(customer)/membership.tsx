import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MEMBERSHIP } from "@/src/features/customer/data";
import { CustomerScreen, CustomerTopActions, SurfaceCard } from "@/src/features/customer/ui";
import { premiumTheme } from "@/src/design/premium-theme";

const { colors, radius } = premiumTheme;

const PERKS = [
  { icon: "star", title: "Tich diem doi qua", detail: "Nhan diem moi khi su dung dich vu va doi qua trong tai khoan thanh vien." },
  { icon: "gift", title: "Qua tang sinh nhat", detail: "Nhan quyen loi rieng trong thang sinh nhat cua ban." },
  { icon: "calendar", title: "Uu tien dat lich", detail: "Dat lich nhanh hon va uu tien ho tro trong cac khung gio cao diem." },
  { icon: "tag", title: "Gia thanh vien", detail: "Tat ca uu dai va voucher se duoc tap trung tai day." },
] as const;

export default function MembershipScreen() {
  return (
    <CustomerScreen hideHeader title="The thanh vien" contentContainerStyle={styles.content} onRefresh={() => {}} refreshing={false}>
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
          Member <Text style={styles.tierAccent}>{MEMBERSHIP.tier.replace("Member ", "")}</Text>
        </Text>

        <Text style={styles.pointsLabel}>Diem hien tai</Text>
        <Text style={styles.points}>{MEMBERSHIP.points} diem</Text>

        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(MEMBERSHIP.progress, 1)) * 100}%` }]} />
          </View>

          <View style={styles.heroBadge}>
            <Feather color="#f1c56d" name="award" size={14} />
            <Text style={styles.heroBadgeText}>Quyen loi</Text>
          </View>
        </View>

        <Text style={styles.helper}>{MEMBERSHIP.renewal}</Text>

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
          {PERKS.map((perk) => (
            <SurfaceCard key={perk.title} style={styles.perkCard}>
              <View style={styles.perkIcon}>
                <Feather color={colors.text} name={perk.icon} size={18} />
              </View>

              <View style={styles.perkCopy}>
                <Text style={styles.perkTitle}>{perk.title}</Text>
                <Text style={styles.perkDetail}>{perk.detail}</Text>
              </View>

              <Feather color={colors.textSoft} name="chevron-right" size={18} />
            </SurfaceCard>
          ))}
        </View>
      </View>

      <SurfaceCard style={styles.ctaCard}>
        <Text style={styles.ctaTitle}>Tat ca uu dai da duoc chuyen vao the thanh vien</Text>
        <Text style={styles.ctaText}>Tu nay, moi voucher va quyen loi se duoc xem tai day thay vi mot vi uu dai rieng.</Text>
      </SurfaceCard>
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
