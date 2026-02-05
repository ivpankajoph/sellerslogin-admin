import { createFileRoute } from "@tanstack/react-router";
import RealtimeDashboard from "@/features/analytics-hub/pages/realtime-dashboard";

export const Route = createFileRoute("/_authenticated/analytics/")({
  component: RealtimeDashboard,
});
