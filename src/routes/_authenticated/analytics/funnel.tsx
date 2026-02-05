import { createFileRoute } from "@tanstack/react-router";
import FunnelAnalysis from "@/features/analytics-hub/pages/funnel-analysis";

export const Route = createFileRoute("/_authenticated/analytics/funnel")({
  component: FunnelAnalysis,
});
