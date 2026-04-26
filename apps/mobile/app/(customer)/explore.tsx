import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CATEGORY_ITEMS, matchesCategory } from "@/src/features/customer/data";
import { CustomerScreen, SurfaceCard } from "@/src/features/customer/ui";
import { useCustomerFavorites } from "@/src/hooks/use-customer-favorites";
import { useLookbookServices, type LookbookService } from "@/src/hooks/use-lookbook-services";
import { premiumTheme } from "@/src/design/premium-theme";

const { colors, radius, shadow, spacing } = premiumTheme;

const CARD_WIDTH = 140;
const DOT_GAP = 12;
const AUTO_SCROLL_INTERVAL = 4000;

function splitIntoColumns<T>(items: T[]) {
  return items.reduce<[T[], T[]]>(
    (columns, item, index) => {
      columns[index % 2].push(item);
      return columns;
    },
    [[], []],
  );
}

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORY_ITEMS)[number]["key"]>("all");
  const [previewService, setPreviewService] = useState<LookbookService | null>(null);
  const [activeLookbookIndex, setActiveLookbookIndex] = useState(0);
  const lookbookScrollerRef = useRef<ScrollView>(null);
  const { isLoading, services } = useLookbookServices([], { allowFallback: true });
  const { isFavorite, toggleFavorite } = useCustomerFavorites();

  const filteredServices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return services.filter((service) => {
      const haystack = `${service.title} ${service.blurb} ${service.tone}`.toLowerCase();
      return (!query || haystack.includes(query)) && matchesCategory(service, activeCategory);
    });
  }, [activeCategory, searchQuery, services]);

  const onScroll = useCallback(
    (event: any) => {
      const scrollX = event.nativeEvent.contentOffset.x;
      const cardWidth = CARD_WIDTH + DOT_GAP;
      const nextIndex = Math.max(0, Math.min(filteredServices.length - 1, Math.round(scrollX / cardWidth)));
      setActiveLookbookIndex(nextIndex);
    },
    [filteredServices.length],
  );

  useEffect(() => {
    let cancelled = false;
    const interval = setInterval(() => {
      if (cancelled || !filteredServices.length) return;

      const nextIndex = (activeLookbookIndex + 1) % filteredServices.length;
      lookbookScrollerRef.current?.scrollTo({ x: nextIndex * (CARD_WIDTH + DOT_GAP), animated: true });
      setActiveLookbookIndex(nextIndex);
    }, AUTO_SCROLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeLookbookIndex, filteredServices.length]);

  const [leftColumn, rightColumn] = useMemo(() => splitIntoColumns(filteredServices), [filteredServices]);

  return (
    <CustomerScreen title="Khám phá" hideHeader contentContainerStyle={styles.content}>
      <View style={styles.headerBlock}>
        <Text style={styles.eyebrow}>CHAM BEAUTY</Text>
        <Text style={styles.pageTitle}>Khám phá</Text>
      </View>

      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          placeholder="Tìm kiếm mẫu nail, màu sắc..."
          placeholderTextColor="#b7aa9d"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Pressable style={styles.filterButton}>
          <Text style={styles.filterIcon}>⚙</Text>
        </Pressable>
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
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                {formatCategoryLabel(item.key, item.label)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {!isLoading && filteredServices.length > 0 && (
        <View style={styles.lookbookSection}>
          <Text style={styles.lookbookTitle}>Mẫu nail</Text>
          <ScrollView
            ref={lookbookScrollerRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.lookbookScroll}
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            {filteredServices.map((service) => (
              <View key={service.id} style={styles.lookbookCard}>
                {renderLookbookCard(service, isFavorite(service.id), toggleFavorite, setPreviewService)}
              </View>
            ))}
          </ScrollView>
          <View style={styles.lookbookDots}>
            {filteredServices.map((_, index) => (
              <View
                key={index}
                style={[styles.lookbookDot, index === activeLookbookIndex ? styles.lookbookDotActive : null]}
              />
            ))}
          </View>
        </View>
      )}

      {!isLoading && filteredServices.length === 0 ? (
        <SurfaceCard style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Chưa có lookbook để hiển thị</Text>
          <Text style={styles.emptyDescription}>
            Hãy quay lại sau khi dữ liệu lookbook được cập nhật từ hệ thống.
          </Text>
        </SurfaceCard>
      ) : null}

      <Modal animationType="fade" transparent visible={Boolean(previewService)} onRequestClose={() => setPreviewService(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalCloseLayer} onPress={() => setPreviewService(null)} />

          {previewService ? (
            <View style={styles.modalCard}>
              <Image alt={previewService.title} source={{ uri: previewService.image }} style={styles.modalImage} />
              <View style={styles.modalCopy}>
                <Text style={styles.modalTitle}>{previewService.title}</Text>
                <Text style={styles.modalPrice}>{previewService.price}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </CustomerScreen>
  );
}

function renderLookbookCard(
  service: LookbookService,
  favorite: boolean,
  toggleFavorite: (serviceId: string) => Promise<void>,
  setPreviewService: (service: LookbookService | null) => void,
) {
  return (
    <Pressable onPress={() => setPreviewService(service)}>
      <Image source={{ uri: service.image }} style={styles.lookbookCardImage} />
      <Pressable style={styles.lookbookFavoriteButton} onPress={() => void toggleFavorite(service.id)}>
        <Text style={[styles.lookbookFavoriteIcon, favorite ? styles.lookbookFavoriteIconActive : null]}>
          {favorite ? "♥" : "♡"}
        </Text>
      </Pressable>
      <View style={styles.lookbookCardBody}>
        <Text style={styles.lookbookCardTitle} numberOfLines={1}>
          {service.title}
        </Text>
        <Text style={styles.lookbookCardPrice}>{service.price}</Text>
      </View>
    </Pressable>
  );
}

function renderServiceCard(
  service: LookbookService,
  favorite: boolean,
  toggleFavorite: (serviceId: string) => Promise<void>,
  setPreviewService: (service: LookbookService | null) => void,
) {
  return (
    <SurfaceCard key={service.id} style={styles.card}>
      <View style={styles.imageWrap}>
        <Pressable onPress={() => setPreviewService(service)}>
          <Image alt={service.title} source={{ uri: service.image }} style={styles.cardImage} />
        </Pressable>

        <Pressable style={styles.favoriteButton} onPress={() => void toggleFavorite(service.id)}>
          <Text style={[styles.favoriteIcon, favorite ? styles.favoriteIconActive : null]}>
            {favorite ? "♥" : "♡"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {service.title}
          </Text>
          <Text style={styles.cardPrice}>{service.price}</Text>
        </View>

        <View style={styles.brandRow}>
          <View style={styles.brandMeta}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandInitial}>C</Text>
            </View>
            <Text style={styles.brandText}>Cham Beauty</Text>
          </View>

          <Pressable
            style={styles.chooseButton}
            onPress={() =>
              router.push({
                pathname: "/(customer)/booking",
                params: { service: service.title },
              })
            }
          >
            <Text style={styles.chooseButtonText}>Chọn</Text>
          </Pressable>
        </View>
      </View>
    </SurfaceCard>
  );
}

function formatCategoryLabel(key: (typeof CATEGORY_ITEMS)[number]["key"], label: string) {
  if (key === "don-gian") return "Nail đơn giản";
  if (key === "sang-trong") return "Nail sang trọng";
  if (key === "ca-tinh") return "Nail cá tính";
  if (key === "noi-bat") return "Nail Hàn Quốc";
  return label;
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
    paddingTop: 0,
  },
  headerBlock: {
    gap: 4,
    paddingTop: 2,
  },
  eyebrow: {
    color: "#4f4034",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.6,
  },
  pageTitle: {
    color: colors.text,
    fontSize: 29,
    fontWeight: "800",
    letterSpacing: -0.82,
    lineHeight: 34,
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
  searchIcon: {
    color: "#8f8174",
    fontSize: 17,
    marginTop: -1,
  },
  searchInput: {
    color: "#40342b",
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    minHeight: 40,
    paddingVertical: 0,
  },
  filterButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 26,
  },
  filterIcon: {
    color: "#7d6d5e",
    fontSize: 16,
  },
  filterRow: {
    gap: 8,
    paddingRight: spacing.lg,
    paddingTop: 1,
  },
  chip: {
    alignItems: "center",
    backgroundColor: "#fbf4ec",
    borderColor: "#eadfd3",
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 35,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: "#4a392f",
    borderColor: "#4a392f",
  },
  chipText: {
    color: "#69594c",
    fontSize: 11,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#fff8f2",
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
  card: {
    ...shadow.card,
    borderRadius: 18,
    gap: 0,
    overflow: "hidden",
    padding: 0,
  },
  imageWrap: {
    position: "relative",
  },
  cardImage: {
    aspectRatio: 0.83,
    width: "100%",
  },
  favoriteButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 250, 245, 0.96)",
    borderRadius: radius.pill,
    height: 30,
    justifyContent: "center",
    position: "absolute",
    right: 10,
    top: 10,
    width: 30,
  },
  favoriteIcon: {
    color: "#8b7b6d",
    fontSize: 15,
    lineHeight: 16,
  },
  favoriteIconActive: {
    color: "#4a392f",
  },
  cardBody: {
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 12,
  },
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  cardTitle: {
    color: "#41362d",
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  cardPrice: {
    color: "#a67a52",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 20,
    paddingTop: 1,
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 26,
  },
  brandMeta: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: 6,
    paddingRight: 8,
  },
  brandBadge: {
    alignItems: "center",
    backgroundColor: "#2f241d",
    borderRadius: radius.pill,
    height: 18,
    justifyContent: "center",
    width: 18,
  },
  brandInitial: {
    color: "#fff8f2",
    fontSize: 10,
    fontWeight: "800",
  },
  brandText: {
    color: "#6d5f54",
    fontSize: 11,
    fontWeight: "600",
  },
  chooseButton: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    justifyContent: "center",
    minHeight: 25,
    paddingHorizontal: 10,
  },
  chooseButtonText: {
    color: "#4a392f",
    fontSize: 11,
    fontWeight: "800",
  },
  lookbookSection: {
    gap: spacing.md,
  },
  lookbookTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  lookbookScroll: {
    gap: DOT_GAP,
    paddingVertical: spacing.sm,
  },
  lookbookCard: {
    width: CARD_WIDTH,
  },
  lookbookCardImage: {
    aspectRatio: 0.83,
    borderRadius: radius.lg,
    width: CARD_WIDTH,
  },
  lookbookFavoriteButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 250, 245, 0.96)",
    borderRadius: radius.pill,
    height: 28,
    justifyContent: "center",
    position: "absolute",
    right: 8,
    top: 8,
    width: 28,
  },
  lookbookFavoriteIcon: {
    color: "#8b7b6d",
    fontSize: 14,
    lineHeight: 15,
  },
  lookbookFavoriteIconActive: {
    color: "#4a392f",
  },
  lookbookCardBody: {
    gap: 4,
    paddingTop: spacing.sm,
  },
  lookbookCardTitle: {
    color: "#41362d",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  lookbookCardPrice: {
    color: "#a67a52",
    fontSize: 12,
    fontWeight: "800",
  },
  lookbookDots: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingTop: spacing.xs,
  },
  lookbookDot: {
    backgroundColor: "#e7d9ca",
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  lookbookDotActive: {
    backgroundColor: "#4a392f",
    borderRadius: 6,
    height: 10,
    width: 10,
  },
  emptyCard: {
    borderRadius: 18,
    gap: 6,
    marginTop: 2,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyTitle: {
    color: "#41362d",
    fontSize: 15,
    fontWeight: "800",
  },
  emptyDescription: {
    color: "#7b6d61",
    fontSize: 13,
    lineHeight: 19,
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(28, 22, 18, 0.72)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  modalCloseLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    overflow: "hidden",
    width: "100%",
  },
  modalImage: {
    aspectRatio: 0.82,
    width: "100%",
  },
  modalCopy: {
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  modalPrice: {
    color: "#a7744d",
    fontSize: 16,
    fontWeight: "700",
  },
});
