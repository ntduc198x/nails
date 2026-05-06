import { useCallback, useEffect, useState } from "react";
import { listCustomerHistory, type CustomerHistoryItem } from "@nails/shared";
import { mobileSupabase } from "@/src/lib/supabase";
import { useSession } from "@/src/providers/session-provider";

export function useCustomerHistory(limit = 24) {
  const { isHydrated: sessionHydrated, user } = useSession();
  const [historyItems, setHistoryItems] = useState<CustomerHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const refresh = useCallback(async () => {
    if (!sessionHydrated) {
      return;
    }

    if (!mobileSupabase || !user) {
      setHistoryItems([]);
      setIsHydrated(true);
      return;
    }

    setIsLoading(true);

    try {
      const nextItems = await listCustomerHistory(mobileSupabase, { limit });
      setHistoryItems(nextItems);
    } catch {
      setHistoryItems([]);
    } finally {
      setIsHydrated(true);
      setIsLoading(false);
    }
  }, [limit, sessionHydrated, user]);

  useEffect(() => {
    const handle = setTimeout(() => {
      void refresh();
    }, 0);

    return () => clearTimeout(handle);
  }, [refresh]);

  return {
    historyItems,
    isHydrated,
    isLoading,
    refresh,
  };
}
