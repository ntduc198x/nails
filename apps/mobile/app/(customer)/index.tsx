import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { FALLBACK_SERVICES, NEWS_ITEMS, OFFERS } from "@/src/features/customer/data";
import { CustomerScreen } from "@/src/features/customer/ui";
import { useLookbookServices } from "@/src/hooks/use-lookbook-services";
import { premiumTheme } from "@/src/design/premium-theme";

const { colors, radius, shadow, spacing } = premiumTheme;

const HOME_FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "trend", label: "Xu hướng" },
  { key: "nails", label: "Nail đẹp" },
  { key: "offers", label: "Ưu đãi" },
  { key: "care", label: "Chăm sóc" },
  { key: "news", label: "Tin tức" },
] as const;

type HomeFilterKey = (typeof HOME_FILTERS)[number]["key"];

type HomeCard =
  | {
      id: string;
      kind: "story";
      title: string;
      description: string;
      image: string;
      badge: string;
      tones: HomeFilterKey[];
      footer: string;
      action: "save" | "play";
      onPress: () => void;
    }
  | {
      id: string;
      kind: "offer";
      title: string;
      description: string;
      eyebrow: string;
      image: string;
      tones: HomeFilterKey[];
      onPress: () => void;
    };

function splitIntoColumns<T>(items: T[]) {
  return items.reduce<[T[], T[]]>(
    (columns, item, index) => {
      columns[index % 2].push(item);
      return columns;
    },
    [[], []],
  );
}

export default function CustomerHomeScreen() {
  const [activeFilter, setActiveFilter] = useState<HomeFilterKey>("all");
  const { services } = useLookbookServices(FALLBACK_SERVICES);
  const servicePool = services.length ? services : FALLBACK_SERVICES;

  const cards = useMemo<HomeCard[]>(() => {
    const featured = servicePool[4] ?? servicePool[0];
    const glossy = servicePool[5] ?? servicePool[1] ?? servicePool[0];
    const soft = servicePool[2] ?? servicePool[0];
    const neutral = servicePool[3] ?? servicePool[0];

    return [
      {
        id: `story-${featured.id}`,
        kind: "story",
        title: NEWS_ITEMS[0]?.title ?? "Chrome olive và cat-eye nude đang là tông màu được đặt nhiều nhất tuần này",
        description:
          "Khách hàng đang ưu tiên tông nude sáng tay, mix thêm chi tiết chrome mỏng để tạo điểm nhấn tinh tế.",
        image: featured.image,
        badge: "Tin nổi bật",
        tones: ["all", "trend", "nails", "news"],
        footer: "Cham Beauty",
        action: "save",
        onPress: () =>
          router.push({
            pathname: "/(customer)/booking",
            params: { service: featured.title },
          }),
      },
      {
        id: "offer-april",
        kind: "offer",
        eyebrow: "Ưu đãi tháng 4",
        title: OFFERS[0]?.title ?? "Giảm 20%",
        description: "Combo nail & gội đầu dưỡng sinh dành cho lịch đặt sớm trong tuần này.",
        image: glossy.image,
        tones: ["all", "offers", "care"],
        onPress: () => router.push("/(customer)/offers"),
      },
      {
        id: `story-${soft.id}`,
        kind: "story",
        title: "Nail Hàn Quốc nhẹ nhàng cho mùa hè",
        description:
          "Những mẫu nail tone sáng, nhẹ nhàng giúp đôi tay trông thanh thoát và nữ tính hơn.",
        image: soft.image,
        badge: "Video",
        tones: ["all", "trend", "nails"],
        footer: "Cham Beauty",
        action: "play",
        onPress: () => router.push("/(customer)/explore"),
      },
      {
        id: `story-${glossy.id}`,
        kind: "story",
        title: "Top 5 màu nail được yêu thích nhất tháng 4",
        description:
          "Bảng màu hot trend: hồng sữa, nude đất, trắng ngọc trai, be sữa và cam san hô.",
        image: glossy.image,
        badge: "Xu hướng",
        tones: ["all", "trend", "nails", "news"],
        footer: "Cham Beauty",
        action: "save",
        onPress: () => router.push("/(customer)/explore"),
      },
      {
        id: `story-${neutral.id}`,
        kind: "story",
        title: "Mẫu nail nâu đất - Đơn giản nhưng không đơn điệu",
        description:
          "Sự lựa chọn hoàn hảo cho những ai yêu thích phong cách tối giản, tinh tế.",
        image: neutral.image,
        badge: "Chăm sóc",
        tones: ["all", "care", "nails"],
        footer: "Cham Beauty",
        action: "save",
        onPress: () =>
          router.push({
            pathname: "/(customer)/booking",
            params: { service: neutral.title },
          }),
      },
    ];
  }, [servicePool]);

  const visibleCards = useMemo(() => {
    if (activeFilter === "all") return cards;
    return cards.filter((card) => card.tones.includes(activeFilter));
  }, [activeFilter, cards]);

  const [leftColumn, rightColumn] = useMemo(() => splitIntoColumns(visibleCards), [visibleCards]);

  return (
    <CustomerScreen hideHeader title="Trang chủ" contentContainerStyle={styles.screenContent}>
      <View style={styles.headerBlock}>
        <View style={styles.headerCopy}>
          <Text style={styles.brandLabel}>CHAM BEAUTY</Text>
          <Text style={styles.pageTitle}>Trang chủ</Text>
          <Text style={styles.pageSubtitle}>
            Tin mới, lịch hẹn gần nhất và cập nhật ưu đãi cho khách hàng.
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel="Thông báo"
            style={styles.headerCircle}
            onPress={() => router.push("/(customer)/notifications")}
          >
            <Text style={styles.headerBell}>🔔</Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Hồ sơ"
            style={styles.profileBadge}
            onPress={() => router.push("/(customer)/profile")}
          >
            <Text style={styles.profileBadgeText}>TB</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
      >
        {HOME_FILTERS.map((item) => {
          const active = item.key === activeFilter;

          return (
            <Pressable
              key={item.key}
              style={[styles.filterChip, active ? styles.filterChipActive : null]}
              onPress={() => setActiveFilter(item.key)}
            >
              <Text style={[styles.filterChipText, active ? styles.filterChipTextActive : null]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.columns}>
        <View style={styles.column}>
          {leftColumn.map((card) => renderCard(card))}
        </View>
        <View style={styles.column}>
          {rightColumn.map((card) => renderCard(card))}
        </View>
      </View>
    </CustomerScreen>
  );
}

function renderCard(card: HomeCard) {
  if (card.kind === "offer") {
    return (
      <Pressable key={card.id} style={[styles.cardBase, styles.offerCard]} onPress={card.onPress}>
        <Image alt={card.title} source={{ uri: card.image }} style={styles.offerImage} />
        <View style={styles.offerContent}>
          <View style={styles.offerTextPanel}>
          <Text style={styles.offerEyebrow}>{card.eyebrow}</Text>
          <Text style={styles.offerTitle}>{card.title}</Text>
          <Text style={styles.offerDescription}>{card.description}</Text>

          <View style={styles.offerCta}>
            <Text style={styles.offerCtaText}>Đặt lịch ngay</Text>
          </View>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable key={card.id} style={styles.cardBase} onPress={card.onPress}>
      <View style={styles.imageWrap}>
        <Image alt={card.title} source={{ uri: card.image }} style={styles.storyImage} />
        <View style={styles.cardBadgeWrap}>
          <Text style={styles.cardBadgeText}>{card.badge}</Text>
        </View>

        {card.action === "play" ? (
          <View style={styles.playBadge}>
            <Text style={styles.playBadgeText}>▶</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{card.title}</Text>
        <Text style={styles.cardDescription}>{card.description}</Text>

        <View style={styles.cardFooter}>
          <View style={styles.cardFooterBrand}>
            <View style={styles.footerAvatar}>
              <Text style={styles.footerAvatarText}>C</Text>
            </View>
            <Text style={styles.footerBrandText}>{card.footer}</Text>
          </View>

          <Text style={styles.footerActionText}>{card.action === "save" ? "⌑" : "▶"}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingTop: spacing.sm,
  },
  headerBlock: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  headerCopy: {
    flex: 1,
    gap: 6,
    paddingRight: spacing.md,
  },
  brandLabel: {
    color: "#bf8b62",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.8,
  },
  pageTitle: {
    color: "#352b23",
    fontSize: 29,
    fontWeight: "800",
    letterSpacing: -0.82,
    lineHeight: 34,
  },
  pageSubtitle: {
    color: "#8a7c70",
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 240,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingTop: 18,
  },
  headerCircle: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#eadfd4",
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  headerBell: {
    color: "#5a4b40",
    fontSize: 16,
  },
  profileBadge: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#eadfd4",
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  profileBadgeText: {
    color: "#74665b",
    fontSize: 12,
    fontWeight: "800",
  },
  filtersRow: {
    gap: 8,
    paddingBottom: spacing.sm,
    paddingRight: spacing.lg,
    paddingTop: spacing.sm,
  },
  filterChip: {
    alignItems: "center",
    backgroundColor: "#fffaf6",
    borderColor: "#eadfd4",
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterChipActive: {
    backgroundColor: "#4a392f",
    borderColor: "#4a392f",
  },
  filterChipText: {
    color: "#76675b",
    fontSize: 12,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: "#fff9f4",
  },
  columns: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  column: {
    flex: 1,
    gap: 12,
  },
  cardBase: {
    ...shadow.card,
    backgroundColor: "#fffdfa",
    borderColor: "#eadfd4",
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },
  imageWrap: {
    position: "relative",
  },
  storyImage: {
    aspectRatio: 0.92,
    width: "100%",
  },
  cardBadgeWrap: {
    left: 10,
    position: "absolute",
    top: 10,
  },
  cardBadgeText: {
    backgroundColor: "rgba(255, 248, 240, 0.96)",
    borderRadius: radius.pill,
    color: "#c19a79",
    fontSize: 10,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 6,
    textTransform: "uppercase",
  },
  playBadge: {
    alignItems: "center",
    backgroundColor: "rgba(66, 52, 42, 0.82)",
    borderRadius: radius.pill,
    bottom: 10,
    height: 28,
    justifyContent: "center",
    left: 10,
    position: "absolute",
    width: 28,
  },
  playBadgeText: {
    color: "#fffaf5",
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 1,
  },
  cardBody: {
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 11,
  },
  cardTitle: {
    color: "#41362d",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  cardDescription: {
    color: "#877a6e",
    fontSize: 12,
    lineHeight: 17,
  },
  cardFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  cardFooterBrand: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  footerAvatar: {
    alignItems: "center",
    backgroundColor: "#2f241d",
    borderRadius: radius.pill,
    height: 18,
    justifyContent: "center",
    width: 18,
  },
  footerAvatarText: {
    color: "#fff8f2",
    fontSize: 10,
    fontWeight: "800",
  },
  footerBrandText: {
    color: "#5f5349",
    fontSize: 11,
    fontWeight: "700",
  },
  footerActionText: {
    color: "#85786d",
    fontSize: 14,
    fontWeight: "700",
  },
  offerCard: {
    backgroundColor: "#f2e3d1",
    minHeight: 274,
    position: "relative",
  },
  offerContent: {
    minHeight: 274,
    justifyContent: "flex-start",
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 14,
    position: "relative",
    zIndex: 2,
  },
  offerTextPanel: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 248, 241, 0.62)",
    borderRadius: 18,
    maxWidth: "84%",
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 10,
  },
  offerEyebrow: {
    color: "#d3a37b",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  offerTitle: {
    color: "#40342b",
    fontSize: 23,
    fontWeight: "900",
    lineHeight: 30,
    marginTop: 6,
  },
  offerDescription: {
    color: "#6f6156",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    maxWidth: "82%",
  },
  offerCta: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#4a392f",
    borderRadius: radius.pill,
    justifyContent: "center",
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  offerCtaText: {
    color: "#fff8f2",
    fontSize: 11,
    fontWeight: "800",
  },
  offerImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 1,
    zIndex: 0,
  },
});
