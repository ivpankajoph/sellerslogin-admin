import { useSelector } from "react-redux";
import { useAnalyticsSource } from "@/features/analytics-hub/context/analytics-source-context";

export const useAnalyticsContext = () => {
  const user = useSelector((state: any) => state.auth?.user);
  const role = user?.role || "admin";
  const vendorId = role === "vendor" ? user?._id || user?.id || "" : "";
  const { source, templateId } = useAnalyticsSource();

  return { role, vendorId, source, templateId };
};
