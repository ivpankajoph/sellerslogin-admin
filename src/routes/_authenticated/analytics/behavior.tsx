import { createFileRoute } from "@tanstack/react-router";
import BehaviorAnalytics from "@/features/analytics-hub/pages/behavior-analytics";

export const Route = createFileRoute("/_authenticated/analytics/behavior")({
  component: BehaviorAnalytics,
});
