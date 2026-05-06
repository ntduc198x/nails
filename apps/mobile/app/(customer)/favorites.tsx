import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { FALLBACK_SERVICES } from "@/src/features/customer/data";
import { CustomerScreen, SegmentedTabs, SurfaceCard } from "@/src/features/customer/ui";
import { useCustomerFavorites } from "@/src/hooks/use-customer-favorites";
import { useLookbookServices } from "@/src/hooks/use-lookbook-services";
import { premiumTheme } from "@/src/design/premium-theme";

const { colors, spacing } = premiumTheme;

const FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "services", label: "Dịch vụ" },
  { key: "lookbook", label: "Lookbook" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default function FavoritesScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("lookbook");
  const { isLoading, refresh, services } = useLookbookServices(FALLBACK_SERVICES);
  const { favoriteIds, isHydrated, toggleFavorite } = useCustomerFavorites();

  const items = useMemo(
    () => services.filter((service) => favoriteIds.includes(service.id)),
    [favoriteIds, services],
  );

  return (
    <CustomerScreen title="Yêu thích" onRefresh={() => void refresh()} refreshing={isLoading}>
      <SegmentedTabs activeKey={activeFilter} items={FILTERS} onChange={setActiveFilter} />

      <View style={styles.list}>
        {items.map((service) => (
          <Pressable
            key={service.id}
            onPress={() =>
              router.push({
                pathname: "/(customer)/booking",
                params: { service: service.title },
              })
            }
          >
            <SurfaceCard style={styles.card}>
            <Image alt={service.title} source={{ uri: service.image }} style={styles.image} />

            <View style={styles.copy}>
              <Text style={styles.title}>{service.title}</Text>
              <Text style={styles.price}>{service.price}</Text>
            </View>

              <Pressable
                style={styles.heartWrap}
                onPress={(event) => {
                  event.stopPropagation();
                  void toggleFavorite(service.id);
                }}
              >
              <Text style={styles.heart}>♥</Text>
            </Pressable>
            </SurfaceCard>
          </Pressable>
        ))}

        {isHydrated && !items.length ? (
          <SurfaceCard>
            <Text style={styles.emptyTitle}>Chưa có mẫu yêu thích</Text>
            <Text style={styles.emptyText}>Nhấn vào biểu tượng tim ở màn Khám phá để lưu các mẫu bạn muốn xem lại.</Text>
          </SurfaceCard>
        ) : null}
      </View>
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
  card: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  image: {
    borderRadius: 16,
    height: 88,
    width: 110,
  },
  copy: {
    flex: 1,
    gap: 10,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  price: {
    color: colors.text,
    fontSize: 15,
  },
  heartWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 28,
  },
  heart: {
    color: colors.accent,
    fontSize: 22,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  emptyText: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 20,
  },
});
