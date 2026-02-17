import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

const TRIAL_DAYS = 5;

export const useTrial = () => {
  const { user, loading } = useAuth();
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setHasActiveSubscription(null);
      return;
    }

    supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle()
      .then(({ data }) => {
        setHasActiveSubscription(!!data);
      });
  }, [user]);

  if (loading || !user || hasActiveSubscription === null) {
    return { isExpired: false, daysLeft: TRIAL_DAYS, loading: loading || hasActiveSubscription === null };
  }

  if (hasActiveSubscription) {
    return { isExpired: false, daysLeft: 0, loading: false };
  }

  const createdAt = new Date(user.created_at);
  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const daysLeft = Math.max(0, Math.ceil(TRIAL_DAYS - diffDays));
  const isExpired = diffDays >= TRIAL_DAYS;

  return { isExpired, daysLeft, loading: false };
};
