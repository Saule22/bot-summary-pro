import { useAuth } from "./useAuth";

const TRIAL_DAYS = 5;

export const useTrial = () => {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return { isExpired: false, daysLeft: TRIAL_DAYS, loading };
  }

  const createdAt = new Date(user.created_at);
  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const daysLeft = Math.max(0, Math.ceil(TRIAL_DAYS - diffDays));
  const isExpired = diffDays >= TRIAL_DAYS;

  return { isExpired, daysLeft, loading };
};
