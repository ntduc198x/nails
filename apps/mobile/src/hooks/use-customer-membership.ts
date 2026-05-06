import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { listCustomerMembershipSummary, type CustomerMembershipSummary } from "@nails/shared";
import { mobileSupabase } from "@/src/lib/supabase";

const EMPTY_MEMBERSHIP: CustomerMembershipSummary = {
  hasMembership: false,
  membershipId: null,
  currentTier: null,
  nextTier: null,
  pointsBalance: 0,
  lifetimePoints: 0,
  totalSpent: 0,
  totalVisits: 0,
  joinedAt: null,
  expiresAt: null,
  progress: 0,
  perks: [],
  offers: [],
};

export function useCustomerMembership() {
  const [summary, setSummary] = useState<CustomerMembershipSummary>(EMPTY_MEMBERSHIP);
  const [isLoading, setIsLoading] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  const refresh = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) {
      setIsLoading(true);
    }

    setLastError(null);

    try {
      if (!mobileSupabase) {
        setSummary(EMPTY_MEMBERSHIP);
        return;
      }

      const nextSummary = await listCustomerMembershipSummary(mobileSupabase);
      setSummary(nextSummary);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Khong tai duoc the thanh vien");
      setSummary(EMPTY_MEMBERSHIP);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    ...summary,
    isLoading,
    lastError,
    refresh: () => refresh({ silent: true }),
  };
}
