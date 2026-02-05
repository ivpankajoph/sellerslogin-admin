import { createFileRoute } from "@tanstack/react-router";
import EcommerceAnalytics from "@/features/analytics-hub/pages/ecommerce-analytics";

export const Route = createFileRoute("/_authenticated/analytics/ecommerce")({
  component: EcommerceAnalytics,
});
