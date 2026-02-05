import { createFileRoute } from "@tanstack/react-router";
import { AnalyticsHubLayout } from "@/features/analytics-hub/layout";

export const Route = createFileRoute("/_authenticated/analytics")({
  component: AnalyticsHubLayout,
});
