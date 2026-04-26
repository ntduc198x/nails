import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  CATEGORY_ITEMS,
  EXPLORE_SHOP_PRODUCTS,
  EXPLORE_STATS,
  EXPLORE_STORE_INFO,
  EXPLORE_TEAM,
  matchesCategory,
} from "@/src/features/customer/data";
import { CustomerScreen, CustomerTopActions, SurfaceCard } from "@/src/features/customer/ui";
import { premiumTheme } from "@/src/design/premium-theme";
import { mobileSupabase } from "@/src/lib/supabase";
import { useCustomerFavorites } from "@/src/hooks/use-customer-favorites";
import { useLookbookServices, type LookbookService } from "@/src/hooks/use-lookbook-services";

const { colors, radius, shadow, spacing } = premiumTheme;

type CategoryKey = (typeof CATEGORY_ITEMS)[number]["key"];
type TeamMember = {
  id: string;
  name: string;
  role: string;
  image: string;
};

const SERVICE_CARD_WIDTH = 182;
const SERVICE_CARD_GAP = 14;
const SERVICE_AUTO_SCROLL_INTERVAL = 4000;

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("all");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([...EXPLORE_TEAM]);
  const [activeServiceIndex, setActiveServiceIndex] = useState(0);
  const servicesScrollerRef = useRef<ScrollView>(null);
  const { isLoading, isRefreshing, lastError, refresh, services } = useLookbookServices([], {
    allowFallback: true,
    preferApi: false,
  });
  const { isFavorite, toggleFavorite } = useCustomerFavorites();

  const filteredServices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return services.filter((service) => {
      const haystack = `${service.title} ${service.blurb} ${service.tone}`.toLowerCase();
      return (!query || haystack.includes(query)) && matchesCategory(service, activeCategory);
    });
  }, [activeCategory, searchQuery, services]);

  useEffect(() => {
    let cancelled = false;

    async function loadTeamMembers() {
      if (!mobileSupabase) return;

      try {
        const { data, error } = await mobileSupabase
          .from("profiles")
          .select("user_id, display_name, role, avatar_url")
          .in("role", ["OWNER", "MANAGER", "TECH"])
          .limit(4);

        if (cancelled || error || !data?.length) return;

        setTeamMembers(
          data.map((item, index) => ({
            id: String(item.user_id ?? `staff-${index}`),
            name: item.display_name?.trim() || `Nhân viên ${index + 1}`,
            role: item.role === "TECH" ? "Nail Artist" : item.role === "MANAGER" ? "Quản lý" : "Chủ cửa hàng",
            image: item.avatar_url?.trim() || EXPLORE_TEAM[index % EXPLORE_TEAM.length]?.image || EXPLORE_TEAM[0].image,
          })),
        );
      } catch {
        // giữ fallback tĩnh
      }
    }

    void loadTeamMembers();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!filteredServices.length) return;

    const interval = setInterval(() => {
      const nextIndex = (activeServiceIndex + 1) % filteredServices.length;
      servicesScrollerRef.current?.scrollTo({
        x: nextIndex * (SERVICE_CARD_WIDTH + SERVICE_CARD_GAP),
        animated: true,
      });
      setActiveServiceIndex(nextIndex);
    }, SERVICE_AUTO_SCROLL_INTERVAL);

    return () => clearInterval(interval);
  }, [activeServiceIndex, filteredServices.length]);

  const onServicesScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const nextIndex = Math.max(0, Math.min(filteredServices.length - 1, Math.round(scrollX / (SERVICE_CARD_WIDTH + SERVICE_CARD_GAP))));
    setActiveServiceIndex(nextIndex);
  }, [filteredServices.length]);

  async function openMap() {
    await Linking.openURL(EXPLORE_STORE_INFO.mapUrl);
  }

  return (
    <CustomerScreen
      title="Khám phá"
      hideHeader
      contentContainerStyle={styles.content}
      onRefresh={() => void refresh()}
      refreshing={isRefreshing}
    >
      <View style={styles.topBar}>
        <View style={styles.topBarSpacer} />
        <CustomerTopActions />
      </View>

      <View style={styles.storeHero}>
        <Image alt={EXPLORE_STORE_INFO.name} source={{ uri: EXPLORE_STORE_INFO.coverImage }} style={styles.storeImage} />

        <View style={styles.storeCopy}>
          <Text style={styles.storeName}>{EXPLORE_STORE_INFO.name}</Text>
          <Text style={styles.storeCategory}>{EXPLORE_STORE_INFO.category}</Text>

          <View style={styles.ratingRow}>
            <Feather color="#d7a24c" name="star" size={15} />
            <Text style={styles.ratingText}>
              {EXPLORE_STORE_INFO.rating} ({EXPLORE_STORE_INFO.reviews})
            </Text>
          </View>

          <View style={styles.highlightRow}>
            {EXPLORE_STORE_INFO.highlights.map((item) => (
              <View key={item} style={styles.highlightItem}>
                <Feather color={colors.textSoft} name="shield" size={13} />
                <Text style={styles.highlightText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.statsGrid}>
        {EXPLORE_STATS.map((item) => (
          <SurfaceCard key={item.id} style={styles.statCard}>
            <Feather color={colors.textSoft} name={item.icon as React.ComponentProps<typeof Feather>["name"]} size={16} />
            <Text style={styles.statLabel}>{item.label}</Text>
            <Text style={styles.statValue}>{item.value}</Text>
          </SurfaceCard>
        ))}
      </View>

      <View style={styles.searchBar}>
        <Feather color="#8f8174" name="search" size={16} />
        <TextInput
          placeholder="Tìm mẫu lookbook..."
          placeholderTextColor="#b7aa9d"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {CATEGORY_ITEMS.map((item) => {
          const active = item.key === activeCategory;
          return (
            <Pressable
              key={item.key}
              style={[styles.chip, active ? styles.chipActive : null]}
              onPress={() => setActiveCategory(item.key)}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <SectionHeader title="Dịch vụ nổi bật" actionLabel="Xem tất cả" />

      {isLoading && filteredServices.length === 0 ? (
        <SurfaceCard style={styles.stateCard}>
          <Text style={styles.stateTitle}>Đang tải lookbook…</Text>
          <Text style={styles.stateDescription}>Đang đồng bộ dịch vụ nổi bật từ hệ thống.</Text>
        </SurfaceCard>
      ) : null}

      {!isLoading && filteredServices.length === 0 ? (
        <SurfaceCard style={styles.stateCard}>
          <Text style={styles.stateTitle}>Chưa có dịch vụ phù hợp</Text>
          <Text style={styles.stateDescription}>
            {lastError ? `Không tải được dữ liệu lúc này. ${lastError}` : "Hãy thử đổi bộ lọc hoặc kéo xuống để làm mới."}
          </Text>
          <Pressable style={styles.retryButton} onPress={() => void refresh()}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </Pressable>
        </SurfaceCard>
      ) : null}

      {filteredServices.length > 0 ? (
        <>
          <ScrollView
            ref={servicesScrollerRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.lookbookRow}
            onScroll={onServicesScroll}
            scrollEventThrottle={16}
          >
            {filteredServices.map((service) => (
              <ExploreServiceCard
                key={service.id}
                service={service}
                favorite={isFavorite(service.id)}
                onToggleFavorite={() => void toggleFavorite(service.id)}
              />
            ))}
          </ScrollView>

          <View style={styles.serviceDots}>
            {filteredServices.map((service, index) => (
              <View
                key={service.id}
                style={[styles.serviceDot, index === activeServiceIndex ? styles.serviceDotActive : null]}
              />
            ))}
          </View>

        </>
      ) : null}

      <SectionHeader title="Sản phẩm & phụ kiện" actionLabel="Xem tất cả" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productRow}>
        {EXPLORE_SHOP_PRODUCTS.map((item) => (
          <SurfaceCard key={item.id} style={styles.productCard}>
            <Image alt={item.title} source={{ uri: item.image }} style={styles.productImage} />
            <Text numberOfLines={2} style={styles.productTitle}>{item.title}</Text>
            <Text style={styles.productSubLabel}>Phụ kiện bán tại cửa hàng</Text>
            <View style={styles.productFooter}>
              <Text style={styles.productPrice}>{item.price}</Text>
              <Pressable style={styles.productAddButton}>
                <Feather color={colors.surface} name="plus" size={14} />
              </Pressable>
            </View>
          </SurfaceCard>
        ))}
      </ScrollView>

      <SectionHeader title="Đội ngũ nhân viên" actionLabel="Xem tất cả" />
      <View style={styles.teamRow}>
        {teamMembers.map((member) => (
          <View key={member.id} style={styles.teamCard}>
            <Image alt={member.name} source={{ uri: member.image }} style={styles.teamAvatar} />
            <Text style={styles.teamName}>{member.name}</Text>
            <Text style={styles.teamRole}>{member.role}</Text>
          </View>
        ))}
      </View>

      <SectionHeader title="Địa chỉ cửa hàng" />
      <SurfaceCard style={styles.mapCard}>
        <Image alt="Bản đồ cửa hàng" source={{ uri: EXPLORE_STORE_INFO.mapImage }} style={styles.mapImage} />
        <View style={styles.mapCopy}>
          <Text style={styles.mapAddress}>{EXPLORE_STORE_INFO.address}</Text>
          <View style={styles.mapMetaRow}>
            <Feather color={colors.textSoft} name="clock" size={14} />
            <Text style={styles.mapMetaText}>{EXPLORE_STORE_INFO.openingHours}</Text>
          </View>
        </View>
        <Pressable style={styles.directionButton} onPress={() => void openMap()}>
          <Feather color={colors.accent} name="navigation" size={15} />
          <Text style={styles.directionButtonText}>Chỉ đường</Text>
        </Pressable>
      </SurfaceCard>

      {isRefreshing ? <Text style={styles.refreshHint}>Đang làm mới nội dung khám phá…</Text> : null}
    </CustomerScreen>
  );
}

function SectionHeader({ title, actionLabel }: { title: string; actionLabel?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel ? (
        <View style={styles.sectionActionWrap}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
          <Feather color={colors.textSoft} name="chevron-right" size={16} />
        </View>
      ) : null}
    </View>
  );
}

function ExploreServiceCard({
  service,
  favorite,
  onToggleFavorite,
}: {
  service: LookbookService;
  favorite: boolean;
  onToggleFavorite: () => void;
}) {
  return (
    <Pressable
      style={styles.serviceCard}
      onPress={() =>
        router.push({
          pathname: "/(customer)/booking",
          params: { service: service.title },
        })
      }
    >
      <View>
        <Image alt={service.title} source={{ uri: service.image }} style={styles.serviceImage} />
        <View style={styles.serviceToneBadge}>
          <Text style={styles.serviceToneText}>{service.tone.toUpperCase()}</Text>
        </View>
        <Pressable style={styles.favoriteButton} onPress={onToggleFavorite}>
          <Feather color={favorite ? colors.accent : colors.textSoft} name="heart" size={14} />
        </Pressable>
      </View>

      <View style={styles.serviceBody}>
        <Text numberOfLines={1} style={styles.serviceTitle}>{service.title}</Text>
        <Text numberOfLines={2} style={styles.serviceBlurb}>{service.blurb}</Text>
        <View style={styles.serviceMetaRow}>
          <Text style={styles.servicePrice}>{service.price}</Text>
          <Pressable style={styles.bookButton}>
            <Text style={styles.bookButtonText}>Đặt lịch</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingTop: 0,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  topBarSpacer: {
    flex: 1,
  },
  storeHero: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  storeImage: {
    width: 112,
    height: 112,
    borderRadius: 24,
  },
  storeCopy: {
    flex: 1,
    gap: 7,
    paddingTop: 4,
  },
  storeName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.35,
    lineHeight: 27,
  },
  storeCategory: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  ratingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  ratingText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  highlightRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingTop: 2,
  },
  highlightItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  highlightText: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  statCard: {
    width: "23.5%",
    minHeight: 78,
    justifyContent: "space-between",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderRadius: 20,
    backgroundColor: "#fffaf4",
  },
  statLabel: {
    color: "#9d8a79",
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 13,
  },
  statValue: {
    color: "#2e241d",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.25,
    lineHeight: 19,
  },
  searchBar: {
    alignItems: "center",
    backgroundColor: "#fbf4ec",
    borderColor: "#e7d9ca",
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 15,
  },
  searchInput: {
    color: "#40342b",
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    minHeight: 40,
    paddingVertical: 0,
  },
  filterRow: {
    gap: 8,
    paddingRight: spacing.lg,
  },
  chip: {
    alignItems: "center",
    backgroundColor: "#fbf4ec",
    borderColor: "#eadfd3",
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 15,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: "#69594c",
    fontSize: 12,
    fontWeight: "700",
  },
  chipTextActive: {
    color: colors.surface,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.25,
    lineHeight: 24,
  },
  sectionActionWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
  },
  sectionAction: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  stateCard: {
    borderRadius: 22,
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  stateDescription: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 19,
  },
  retryButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "800",
  },
  lookbookRow: {
    gap: 14,
    paddingRight: 8,
  },
  serviceDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 7,
    marginTop: -2,
  },
  serviceDot: {
    backgroundColor: "#e2d4c6",
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  serviceDotActive: {
    backgroundColor: colors.accent,
    width: 20,
  },
  serviceCard: {
    ...shadow.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    width: 182,
  },
  serviceImage: {
    width: "100%",
    height: 168,
  },
  serviceToneBadge: {
    position: "absolute",
    left: 10,
    bottom: 10,
    backgroundColor: "rgba(255,250,245,0.92)",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  serviceToneText: {
    color: colors.accentWarm,
    fontSize: 10,
    fontWeight: "800",
  },
  favoriteButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,250,245,0.96)",
    borderRadius: radius.pill,
    height: 28,
    justifyContent: "center",
    position: "absolute",
    right: 10,
    top: 10,
    width: 28,
  },
  serviceBody: {
    gap: 8,
    padding: 12,
  },
  serviceTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21,
  },
  serviceBlurb: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
    minHeight: 36,
  },
  serviceMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  servicePrice: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  bookButton: {
    backgroundColor: "#fff7ef",
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  bookButtonText: {
    color: colors.accentWarm,
    fontSize: 11,
    fontWeight: "800",
  },
  productRow: {
    gap: 12,
    paddingRight: 8,
  },
  productCard: {
    width: 138,
    gap: 9,
    padding: 10,
  },
  productImage: {
    width: "100%",
    height: 110,
    borderRadius: 16,
  },
  productTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    minHeight: 34,
  },
  productSubLabel: {
    color: colors.textSoft,
    fontSize: 11,
    lineHeight: 15,
    marginTop: -3,
  },
  productFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  productPrice: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  productAddButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  teamRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  teamCard: {
    width: "22%",
    alignItems: "center",
    gap: 6,
  },
  teamAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  teamName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 16,
  },
  teamRole: {
    color: colors.textSoft,
    fontSize: 11,
    textAlign: "center",
  },
  mapCard: {
    gap: 12,
    padding: 10,
  },
  mapImage: {
    width: "100%",
    height: 120,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
  },
  mapCopy: {
    gap: 6,
  },
  mapAddress: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  mapMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  mapMetaText: {
    color: colors.textSoft,
    fontSize: 12,
  },
  directionButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  directionButtonText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "800",
  },
  refreshHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: -2,
  },
});
