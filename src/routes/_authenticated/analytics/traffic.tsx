import { createFileRoute } from "@tanstack/react-router";
import TrafficReport from "@/features/analytics-hub/pages/traffic-report";

export const Route = createFileRoute("/_authenticated/analytics/traffic")({
  component: TrafficReport,
});
