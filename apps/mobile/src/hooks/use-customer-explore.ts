import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  getCustomerScopedContext,
  listCustomerExploreForContext,
} from "@nails/shared";
import type {
  CustomerExplorePayload,
} from "@nails/shared";
import { mobileEnv } from "@/src/lib/env";
import { mobileSupabase } from "@/src/lib/supabase";

const EMPTY_EXPLORE_PAYLOAD: CustomerExplorePayload = {
  storefront: null,
  stats: [],
  featuredServices: [],
  products: [],
  team: [],
  gallery: [],
  offers: [],
  map: null,
};

function hasRealExploreData(payload: CustomerExplorePayload | null | undefined) {
  return Boolean(
    payload &&
      (payload.storefront ||
        payload.featuredServices.length ||
        payload.products.length ||
        payload.team.length ||
        payload.gallery.length ||
        payload.offers.length),
  );
}

export function useCustomerExplore() {
  const [payload, setPayload] = useState<CustomerExplorePayload>(EMPTY_EXPLORE_PAYLOAD);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const loadFromApi = useCallback(async () => {
    if (!mobileEnv.apiBaseUrl || !mobileSupabase) return null;

    const {
      data: { session },
    } = await mobileSupabase.auth.getSession();

    if (!session?.access_token) {
      return null;
    }

    const response = await fetch(`${mobileEnv.apiBaseUrl.replace(/\/$/, "")}/api/customer/explore`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const json = (await response.json()) as {
      ok?: boolean;
      data?: CustomerExplorePayload;
      error?: string;
    };

    if (!response.ok || !json.ok || !json.data) {
      return null;
    }

    return json.data;
  }, []);

  const loadFromSupabase = useCallback(async () => {
    if (!mobileSupabase) return null;
    const scope = await getCustomerScopedContext(mobileSupabase);
    if (!scope) return null;
    return listCustomerExploreForContext(mobileSupabase, scope);
  }, []);

  const refresh = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (options.silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setLastError(null);

      try {
        const apiPayload = await loadFromApi();
        if (apiPayload && hasRealExploreData(apiPayload)) {
          setPayload(apiPayload);
          return;
        }

        const supabasePayload = await loadFromSupabase();
        if (supabasePayload) {
          setPayload(supabasePayload);
          return;
        }

        setPayload(EMPTY_EXPLORE_PAYLOAD);
      } catch (error) {
        setLastError(error instanceof Error ? error.message : "Khong tai duoc Explore");
        setPayload(EMPTY_EXPLORE_PAYLOAD);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [loadFromApi, loadFromSupabase],
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void refresh();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh({ silent: true });
    }, [refresh]),
  );

  return {
    ...payload,
    isLoading,
    isRefreshing,
    lastError,
    refresh: () => refresh({ silent: true }),
  };
}
