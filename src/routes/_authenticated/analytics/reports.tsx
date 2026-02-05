import { createFileRoute } from "@tanstack/react-router";
import Reports from "@/features/analytics-hub/pages/reports";

export const Route = createFileRoute("/_authenticated/analytics/reports")({
  component: Reports,
});
