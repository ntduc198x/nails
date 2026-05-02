import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { CustomerContentPost, LookbookItem, MarketingOfferCard } from "@nails/shared";
import { CustomerScreen, CustomerTopActions, PrimaryButton, SectionTitle, SurfaceCard } from "@/src/features/customer/ui";
import { useCustomerHomeFeed } from "@/src/hooks/use-customer-home-feed";
import { premiumTheme } from "@/src/design/premium-theme";

const { colors, radius, shadow } = premiumTheme;

const HOME_FILTERS = [
  { key: "all", label: "Tất cả", icon: "clock" },
  { key: "newest", label: "Mới nhất", icon: "clock" },
  { key: "hot", label: "Hot", icon: "zap" },
  { key: "featured", label: "Nổi bật", icon: "star" },
  { key: "offers", label: "Ưu đãi", icon: "tag" },
] as const;

type HomeFilterKey = (typeof HOME_FILTERS)[number]["key"];

function getLookbookTags(item: LookbookItem): HomeFilterKey[] {
  const tags: HomeFilterKey[] = ["newest"];
  const badge = item.badge.toLowerCase();
  const category = item.category?.toLowerCase() ?? "";

  if (badge.includes("hot") || category === "hot") {
    tags.push("hot");
  }

  if (badge.includes("noi bat") || badge.includes("best") || category === "noi-bat" || category === "sang-trong") {
    tags.push("featured");
  }

  return tags;
}

function getPostViewCount(post: CustomerContentPost) {
  const candidates = [
    post.metadata?.viewCount,
    post.metadata?.views,
    post.metadata?.view_count,
    post.metadata?.totalViews,
    post.metadata?.total_views,
  ];

  for (const value of candidates) {
    const nextValue = typeof value === "number" ? value : Number(value ?? Number.NaN);
    if (Number.isFinite(nextValue)) return nextValue;
  }

  return 0;
}

function isHotPost(post: CustomerContentPost) {
  const hotFlag = post.metadata?.isHot ?? post.metadata?.hot ?? post.metadata?.featured;
  if (hotFlag === true || hotFlag === "true" || hotFlag === 1 || hotFlag === "1") {
    return true;
  }

  return post.priority <= 50;
}

export default function CustomerHomeScreen() {
  const [activeFilter, setActiveFilter] = useState<HomeFilterKey>("all");
  const [postsExpanded, setPostsExpanded] = useState(false);
  const { contentPosts, dataSource, isLoading, lastError, lookbook, offers, refresh } = useCustomerHomeFeed();

  const heroImage = lookbook[1]?.image ?? lookbook[0]?.image ?? null;

  const visibleLookbook = useMemo(() => {
    if (activeFilter === "all" || activeFilter === "newest") return lookbook.slice(0, 6);
    return lookbook.filter((item) => getLookbookTags(item).includes(activeFilter)).slice(0, 6);
  }, [activeFilter, lookbook]);

  const filteredPosts = useMemo(() => {
    if (activeFilter === "all" || activeFilter === "newest") return contentPosts;
    if (activeFilter === "offers") return contentPosts.filter((post) => post.contentType === "offer_hint");
    if (activeFilter === "hot") {
      const hotPosts = contentPosts.filter((post) => isHotPost(post));
      return hotPosts.length ? hotPosts : contentPosts;
    }
    if (activeFilter === "featured") {
      const rankedPosts = [...contentPosts].sort((left, right) => getPostViewCount(right) - getPostViewCount(left));
      const postsWithViews = rankedPosts.filter((post) => getPostViewCount(post) > 0);
      return postsWithViews.length ? postsWithViews : rankedPosts;
    }
    return contentPosts;
  }, [activeFilter, contentPosts]);

  const visiblePosts = useMemo(() => {
    if (postsExpanded) return filteredPosts;
    return filteredPosts.slice(0, 4);
  }, [filteredPosts, postsExpanded]);

  const visibleOffers = useMemo(() => {
    if (activeFilter === "all" || activeFilter === "offers") return offers.slice(0, 2);
    return [];
  }, [activeFilter, offers]);

  const isEmpty = !isLoading && lookbook.length === 0 && contentPosts.length === 0 && offers.length === 0;

  return (
    <CustomerScreen
      hideHeader
      title="Trang chủ"
      contentContainerStyle={styles.content}
      onRefresh={() => void refresh()}
      refreshing={isLoading}
    >
      <View style={styles.topBar}>
        <View style={styles.brandBlock}>
          <Text style={styles.brand}>CHAM BEAUTY</Text>
          {__DEV__ ? <Text style={styles.debugBadge}>Home · {dataSource.toUpperCase()}</Text> : null}
        </View>

        <CustomerTopActions />
      </View>

      <SurfaceCard style={styles.heroCard}>
        <View style={styles.heroTextColumn}>
          <View style={styles.heroMiniBadge}>
            <Feather color="#b98258" name="briefcase" size={12} />
          </View>
          <Text style={styles.heroTitle}>Đẹp mỗi ngày, đặt lịch nhanh.</Text>
          <Text style={styles.heroSubtitle}>
            {isLoading
              ? "Đang cập nhật nội dung mới..."
              : "Mẫu hot, xu hướng mới và ưu đãi nổi bật."}
          </Text>

          <View style={styles.heroActions}>
            <PrimaryButton label="Đặt lịch ngay" onPress={() => router.push("/(customer)/booking")} />
            <PrimaryButton label="Khám phá" subtle onPress={() => router.push("/(customer)/explore")} />
          </View>
        </View>

        {heroImage ? <Image alt="Hero nail design" source={{ uri: heroImage }} style={styles.heroImage} /> : null}
      </SurfaceCard>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
        {HOME_FILTERS.map((item) => {
          const active = item.key === activeFilter;
          return (
            <Pressable
              key={item.key}
              style={[styles.filterChip, active ? styles.filterChipActive : null]}
              onPress={() => setActiveFilter(item.key)}
            >
              <Feather color={active ? colors.surface : "#9f8d7c"} name={item.icon} size={14} />
              <Text style={[styles.filterChipText, active ? styles.filterChipTextActive : null]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isEmpty ? (
        <SurfaceCard style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Trang chủ chưa có dữ liệu hiển thị</Text>
          <Text style={styles.emptyText}>
            {lastError
              ? `Chưa tải được dữ liệu trang chủ. ${lastError}`
              : "Cần thêm lookbook, bài viết hoặc ưu đãi để hiển thị tại đây."}
          </Text>
          {__DEV__ ? <Text style={styles.emptyDebug}>Nguồn hiện tại: {dataSource}</Text> : null}
        </SurfaceCard>
      ) : null}

      {visibleLookbook.length ? (
        <View style={styles.sectionBlock}>
          <SectionTitle
            title="Mẫu đang hot"
            subtitle="Lookbook nổi bật, dễ chọn và dễ đặt lịch."
            actionLabel="Xem tất cả"
            onPress={() => router.push("/(customer)/explore")}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>
            {visibleLookbook.map((item) => (
              <LookbookCard key={item.id} item={item} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {visiblePosts.length ? (
        <View style={styles.sectionBlock}>
          <SectionTitle
            title="Xu hướng làm đẹp hôm nay"
            subtitle="Nội dung ngắn gọn, sẵn sàng cho khách xem."
            actionLabel={filteredPosts.length > 4 ? (postsExpanded ? "Thu gọn" : "Xem thêm") : undefined}
            onPress={filteredPosts.length > 4 ? () => setPostsExpanded((current) => !current) : undefined}
          />

          <View style={styles.postList}>
            {visiblePosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </View>
        </View>
      ) : null}

      {visibleOffers.length ? (
        <View style={styles.sectionBlock}>
          <SectionTitle
            title="Quyền lợi thành viên"
            subtitle="Toàn bộ ưu đãi và quyền lợi được lưu trong Thẻ thành viên."
            actionLabel="Mở thẻ"
            onPress={() => router.replace("/(customer)/membership")}
          />

          <View style={styles.offerList}>
            {visibleOffers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </View>
        </View>
      ) : null}
    </CustomerScreen>
  );
}

function LookbookCard({ item }: { item: LookbookItem }) {
  return (
    <Pressable
      style={styles.lookbookCard}
      onPress={() =>
        router.push({
          pathname: "/(customer)/booking",
          params: { service: item.title },
        })
      }
    >
      <View>
        <Image alt={item.title} source={{ uri: item.image }} style={styles.lookbookImage} />
        <Pressable style={styles.favoriteButton}>
          <Feather color="#f5f0ea" name="heart" size={14} />
        </Pressable>
      </View>

      <View style={styles.lookbookBody}>
        <Text style={styles.lookbookTone}>{item.tone}</Text>
        <Text numberOfLines={1} style={styles.lookbookTitle}>{item.title}</Text>
        <Text numberOfLines={2} style={styles.lookbookBlurb}>{item.blurb}</Text>

        <View style={styles.lookbookFooter}>
          <Text style={styles.lookbookPrice}>{item.price}</Text>
          <View style={styles.bookButton}>
            <Text style={styles.bookButtonText}>Đặt lịch</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function PostCard({ post }: { post: CustomerContentPost }) {
  return (
    <SurfaceCard style={styles.postCard}>
      {post.coverImageUrl ? <Image alt={post.title} source={{ uri: post.coverImageUrl }} style={styles.postImage} /> : null}

      <View style={styles.postCopy}>
        <View style={styles.postMetaRow}>
          <Text style={styles.postTag}>{post.sourcePlatform}</Text>
          <Pressable>
            <Feather color="#ae9d8d" name="bookmark" size={15} />
          </Pressable>
        </View>
        <Text style={styles.postTitle}>{post.title}</Text>
        <Text numberOfLines={3} style={styles.postSummary}>{post.summary}</Text>
      </View>
    </SurfaceCard>
  );
}

function OfferCard({ offer }: { offer: MarketingOfferCard }) {
  return (
    <Pressable style={styles.offerCard} onPress={() => router.replace("/(customer)/membership")}>
      <View style={styles.offerIcon}>
        <Feather color="#a7744d" name="percent" size={16} />
      </View>
      <View style={styles.offerCopy}>
        <Text style={styles.offerTitle}>{offer.title}</Text>
        <Text style={styles.offerDescription}>{offer.description}</Text>
      </View>
      <Feather color="#aa9785" name="chevron-right" size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
    paddingTop: 4,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  brandBlock: {
    gap: 4,
  },
  brand: {
    color: "#b27d58",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 3,
  },
  debugBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f5eee7",
    borderRadius: radius.pill,
    color: "#8c6f57",
    fontSize: 10,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  heroCard: {
    backgroundColor: "#fdf2e8",
    flexDirection: "row",
    overflow: "hidden",
    padding: 14,
    gap: 10,
  },
  emptyCard: {
    gap: 8,
    padding: 18,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  emptyText: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 19,
  },
  emptyDebug: {
    color: "#9f8b79",
    fontSize: 11,
    fontWeight: "700",
  },
  heroTextColumn: {
    flex: 1,
    gap: 10,
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingRight: 4,
    zIndex: 2,
  },
  heroMiniBadge: {
    alignItems: "center",
    backgroundColor: "#fff7f0",
    borderRadius: 10,
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  heroTitle: {
    color: "#3b2d23",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.4,
    lineHeight: 26,
    maxWidth: 180,
  },
  heroSubtitle: {
    color: "#8c7b6d",
    fontSize: 12,
    lineHeight: 18,
    maxWidth: 178,
  },
  heroActions: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 2,
  },
  heroImage: {
    alignSelf: "flex-end",
    borderRadius: 24,
    height: 178,
    marginLeft: -4,
    width: 138,
  },
  filtersRow: {
    gap: 10,
    paddingRight: 12,
  },
  filterChip: {
    alignItems: "center",
    backgroundColor: "#fffdf9",
    borderColor: "#efe2d6",
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    minHeight: 38,
    paddingHorizontal: 14,
  },
  filterChipActive: {
    backgroundColor: "#4a3424",
    borderColor: "#4a3424",
  },
  filterChipText: {
    color: "#8c7c6e",
    fontSize: 12,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: colors.surface,
  },
  sectionBlock: {
    gap: 12,
  },
  cardsRow: {
    gap: 12,
    paddingRight: 8,
  },
  lookbookCard: {
    ...shadow.card,
    backgroundColor: "#fffdfa",
    borderColor: "#ebdfd3",
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    width: 152,
  },
  lookbookImage: {
    height: 148,
    width: "100%",
  },
  favoriteButton: {
    alignItems: "center",
    backgroundColor: "rgba(92, 70, 54, 0.42)",
    borderRadius: radius.pill,
    height: 28,
    justifyContent: "center",
    position: "absolute",
    right: 10,
    top: 10,
    width: 28,
  },
  lookbookBody: {
    gap: 8,
    padding: 10,
  },
  lookbookTone: {
    color: "#be8a63",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  lookbookTitle: {
    color: "#3d3027",
    fontSize: 16,
    fontWeight: "800",
  },
  lookbookBlurb: {
    color: "#877668",
    fontSize: 12,
    lineHeight: 18,
    minHeight: 36,
  },
  lookbookFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  lookbookPrice: {
    color: "#3a2d23",
    fontSize: 14,
    fontWeight: "800",
  },
  bookButton: {
    backgroundColor: "#fff7ef",
    borderColor: "#eadccf",
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  bookButtonText: {
    color: "#7b5f48",
    fontSize: 11,
    fontWeight: "800",
  },
  postList: {
    gap: 10,
  },
  postCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    padding: 10,
  },
  postImage: {
    borderRadius: 14,
    height: 86,
    width: 86,
  },
  postCopy: {
    flex: 1,
    gap: 4,
  },
  postMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  postTag: {
    color: "#c09167",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  postTitle: {
    color: "#3d3027",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21,
  },
  postSummary: {
    color: "#847366",
    fontSize: 12,
    lineHeight: 18,
  },
  offerList: {
    gap: 10,
  },
  offerCard: {
    ...shadow.card,
    alignItems: "center",
    backgroundColor: "#fff4e9",
    borderColor: "#ebdfd0",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  offerIcon: {
    alignItems: "center",
    backgroundColor: "#fffaf4",
    borderRadius: 14,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  offerCopy: {
    flex: 1,
    gap: 3,
  },
  offerTitle: {
    color: "#3c3026",
    fontSize: 14,
    fontWeight: "800",
  },
  offerDescription: {
    color: "#847265",
    fontSize: 12,
    lineHeight: 18,
  },
});
