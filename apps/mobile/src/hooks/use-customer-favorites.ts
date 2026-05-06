import { useCallback, useEffect, useMemo, useState } from "react";
import { listCustomerFavoriteServiceIds, setCustomerFavoriteService } from "@nails/shared";
import { mobileSupabase } from "@/src/lib/supabase";
import { useSession } from "@/src/providers/session-provider";

export function useCustomerFavorites() {
  const { isHydrated: sessionHydrated, user } = useSession();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const refresh = useCallback(async () => {
    if (!sessionHydrated) {
      return;
    }

    if (!mobileSupabase || !user) {
      setFavoriteIds([]);
      setIsHydrated(true);
      return;
    }

    setIsSyncing(true);

    try {
      const nextIds = await listCustomerFavoriteServiceIds(mobileSupabase);
      setFavoriteIds(nextIds);
    } catch {
      setFavoriteIds([]);
    } finally {
      setIsHydrated(true);
      setIsSyncing(false);
    }
  }, [sessionHydrated, user]);

  useEffect(() => {
    const handle = setTimeout(() => {
      void refresh();
    }, 0);

    return () => clearTimeout(handle);
  }, [refresh]);

  const toggleFavorite = useCallback(
    async (serviceId: string) => {
      if (!mobileSupabase || !user) {
        return;
      }

      const nextFavoriteState = !favoriteIds.includes(serviceId);
      const optimisticIds = nextFavoriteState
        ? [...favoriteIds, serviceId]
        : favoriteIds.filter((id) => id !== serviceId);

      setFavoriteIds(optimisticIds);

      try {
        await setCustomerFavoriteService(mobileSupabase, {
          serviceId,
          isFavorite: nextFavoriteState,
        });
      } catch {
        setFavoriteIds(favoriteIds);
      }
    },
    [favoriteIds, user],
  );

  const favoritesSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  return {
    favoriteIds,
    favoritesSet,
    isFavorite: (serviceId: string) => favoritesSet.has(serviceId),
    isHydrated,
    isSyncing,
    refresh,
    toggleFavorite,
  };
}
