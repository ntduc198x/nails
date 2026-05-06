import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  getCustomerScopedContext,
  listCustomerHomeFeedForContext,
  type CustomerHomeFeedPayload,
} from "@nails/shared";
import { mobileEnv } from "@/src/lib/env";
import { mobileSupabase } from "@/src/lib/supabase";

const FALLBACK_HOME_FEED: CustomerHomeFeedPayload = {
  lookbook: [],
  contentPosts: [],
  offers: [],
};

function hasRealHomeFeedData(feed: CustomerHomeFeedPayload | null | undefined) {
  return Boolean(feed && (feed.lookbook.length || feed.contentPosts.length || feed.offers.length));
}

export function useCustomerHomeFeed() {
  const [feed, setFeed] = useState<CustomerHomeFeedPayload>(FALLBACK_HOME_FEED);
  const [isLoading, setIsLoading] = useState(true);

  const loadFromApi = useCallback(async () => {
    if (!mobileEnv.apiBaseUrl || !mobileSupabase) return null;

    const {
      data: { session },
    } = await mobileSupabase.auth.getSession();

    if (!session?.access_token) {
      return null;
    }

    const response = await fetch(`${mobileEnv.apiBaseUrl.replace(/\/$/, "")}/api/customer/home-feed`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const json = (await response.json()) as {
      ok?: boolean;
      data?: CustomerHomeFeedPayload;
    };

    if (!response.ok || !json.ok || !json.data) {
      return null;
    }

    return {
      lookbook: json.data.lookbook ?? [],
      contentPosts: json.data.contentPosts ?? [],
      offers: json.data.offers ?? [],
    } satisfies CustomerHomeFeedPayload;
  }, []);

  const loadFromSupabase = useCallback(async () => {
    if (!mobileSupabase) return null;
    const scope = await getCustomerScopedContext(mobileSupabase);
    if (!scope) return null;
    return listCustomerHomeFeedForContext(mobileSupabase, scope);
  }, []);

  const refresh = useCallback(async (options: { silent?: boolean } = {}) => {
    setIsLoading(!options.silent);

    try {
      const apiFeed = await loadFromApi();
      if (apiFeed && hasRealHomeFeedData(apiFeed)) {
        setFeed(apiFeed);
        return;
      }

      const supabaseFeed = await loadFromSupabase();
      if (supabaseFeed) {
        setFeed(supabaseFeed);
        return;
      }

      setFeed(FALLBACK_HOME_FEED);
    } catch {
      setFeed(FALLBACK_HOME_FEED);
    } finally {
      setIsLoading(false);
    }
  }, [loadFromApi, loadFromSupabase]);

  useEffect(() => {
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        void refresh();
      }
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh({ silent: true });
    }, [refresh]),
  );

  return {
    ...feed,
    isLoading,
    refresh: () => refresh({ silent: true }),
  };
}
