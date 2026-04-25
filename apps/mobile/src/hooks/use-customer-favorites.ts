import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FAVORITES } from "@/src/features/customer/data";

const STORAGE_KEY = "@nails/customer-favorites";

function getDefaultFavorites() {
  return FAVORITES.map((item) => item.serviceId);
}

export function useCustomerFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(getDefaultFavorites);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function hydrate() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!isActive) return;

        if (!raw) {
          setFavoriteIds(getDefaultFavorites());
          setIsHydrated(true);
          return;
        }

        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          setFavoriteIds(parsed.filter((item): item is string => typeof item === "string"));
        } else {
          setFavoriteIds(getDefaultFavorites());
        }
      } catch {
        if (isActive) {
          setFavoriteIds(getDefaultFavorites());
        }
      } finally {
        if (isActive) {
          setIsHydrated(true);
        }
      }
    }

    void hydrate();

    return () => {
      isActive = false;
    };
  }, []);

  const persist = useCallback(async (nextIds: string[]) => {
    setFavoriteIds(nextIds);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextIds));
    } catch {
      // Keep UI responsive even if persistence fails.
    }
  }, []);

  const toggleFavorite = useCallback(
    async (serviceId: string) => {
      const exists = favoriteIds.includes(serviceId);
      const nextIds = exists ? favoriteIds.filter((id) => id !== serviceId) : [...favoriteIds, serviceId];
      await persist(nextIds);
    },
    [favoriteIds, persist],
  );

  const favoritesSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  return {
    favoriteIds,
    favoritesSet,
    isFavorite: (serviceId: string) => favoritesSet.has(serviceId),
    isHydrated,
    toggleFavorite,
  };
}
