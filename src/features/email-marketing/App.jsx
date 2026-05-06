import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import PermissionGate from "./components/auth/PermissionGate.jsx";
import { useContext } from "react";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import DashboardLayout from "./components/layout/DashboardLayout.jsx";
import { AuthContext } from "./context/AuthContext.jsx";
import CampaignDetailsPage from "./pages/dashboard/CampaignDetailsPage.jsx";
import CampaignFormPage from "./pages/dashboard/CampaignFormPage.jsx";
import CampaignAnalyticsPage from "./pages/dashboard/CampaignAnalyticsPage.jsx";
import CampaignsListPage from "./pages/dashboard/CampaignsListPage.jsx";
import { navigationItems } from "./data/navigation.js";
import AdminDashboardPage from "./pages/AdminDashboardPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import AutomationDetailsPage from "./pages/dashboard/AutomationDetailsPage.jsx";
import AutomationExecutionsPage from "./pages/dashboard/AutomationExecutionsPage.jsx";
import AutomationFormPage from "./pages/dashboard/AutomationFormPage.jsx";
import AutomationListPage from "./pages/dashboard/AutomationListPage.jsx";
import AudienceListPage from "./pages/dashboard/AudienceListPage.jsx";
import BillingPlanPage from "./pages/dashboard/BillingPlanPage.jsx";
import DeliverabilityPage from "./pages/dashboard/DeliverabilityPage.jsx";
import DomainConnectionPage from "./pages/dashboard/DomainConnectionPage.jsx";
import DeviceLocationTrackingPage from "./pages/dashboard/DeviceLocationTrackingPage.jsx";
import EmailOpenedClickedPage from "./pages/dashboard/EmailOpenedClickedPage.jsx";
import ConversionRevenuePage from "./pages/dashboard/ConversionRevenuePage.jsx";
import EmailBuilderPage from "./pages/dashboard/EmailBuilderPage.jsx";
import OverviewPage from "./pages/dashboard/OverviewPage.jsx";
import PlaceholderPage from "./pages/dashboard/PlaceholderPage.jsx";
import ReportsPage from "./pages/dashboard/ReportsPage.jsx";
import HtmlCustomCodeEditorPage from "./pages/dashboard/HtmlCustomCodeEditorPage.jsx";
import SimpleEmailEditorPage from "./pages/dashboard/SimpleEmailEditorPage.jsx";
import SegmentFormPage from "./pages/dashboard/SegmentFormPage.jsx";
import SegmentsListPage from "./pages/dashboard/SegmentsListPage.jsx";
import TeamUsersPage from "./pages/dashboard/TeamUsersPage.jsx";
import TimeAnalyticsPage from "./pages/dashboard/TimeAnalyticsPage.jsx";
import SubscriberDetailsPage from "./pages/dashboard/SubscriberDetailsPage.jsx";
import SubscriberFormPage from "./pages/dashboard/SubscriberFormPage.jsx";
import SuppressionListPage from "./pages/dashboard/SuppressionListPage.jsx";
import TemplateFormPage from "./pages/dashboard/TemplateFormPage.jsx";
import TemplatesListPage from "./pages/dashboard/TemplatesListPage.jsx";

function RoleLanding() {
  const { admin } = useContext(AuthContext);

  return <Navigate to={admin?.role === "super_admin" ? "/admin" : "/overview"} replace />;
}

function VendorExperienceRoute({ children }) {
  const { admin } = useContext(AuthContext);

  if (admin?.role === "super_admin") {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

function SuperAdminRoute({ children }) {
  const { admin } = useContext(AuthContext);

  if (admin?.role !== "super_admin") {
    return <Navigate to="/overview" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter basename="/email-marketing">
      <Routes>
        <Route
          path="/login"
          element={
            <ProtectedRoute>
              <RoleLanding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <SuperAdminRoute>
                <AdminDashboardPage />
              </SuperAdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <VendorExperienceRoute>
                <DashboardLayout />
              </VendorExperienceRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route
            path="analytics/email-opened-clicked"
            element={
              <PermissionGate permission="view_analytics">
                <EmailOpenedClickedPage />
              </PermissionGate>
            }
          />
          <Route
            path="analytics/conversion-revenue"
            element={
              <PermissionGate permission="view_analytics">
                <ConversionRevenuePage />
              </PermissionGate>
            }
          />
          <Route
            path="analytics/device-location"
            element={
              <PermissionGate permission="view_analytics">
                <DeviceLocationTrackingPage />
              </PermissionGate>
            }
          />
          <Route
            path="analytics/time-analytics"
            element={
              <PermissionGate permission="view_analytics">
                <TimeAnalyticsPage />
              </PermissionGate>
            }
          />
          <Route
            path="analytics/campaign-analytics"
            element={
              <PermissionGate permission="view_analytics">
                <CampaignAnalyticsPage />
              </PermissionGate>
            }
          />
          <Route
            path="automations"
            element={
              <PermissionGate permission="manage_automations">
                <AutomationListPage />
              </PermissionGate>
            }
          />
          <Route
            path="automations/new"
            element={
              <PermissionGate permission="manage_automations">
                <AutomationFormPage />
              </PermissionGate>
            }
          />
          <Route
            path="automations/:id"
            element={
              <PermissionGate permission="manage_automations">
                <AutomationDetailsPage />
              </PermissionGate>
            }
          />
          <Route
            path="automations/:id/edit"
            element={
              <PermissionGate permission="manage_automations">
                <AutomationFormPage />
              </PermissionGate>
            }
          />
          <Route
            path="automations/:id/executions"
            element={
              <PermissionGate permission="manage_automations">
                <AutomationExecutionsPage />
              </PermissionGate>
            }
          />
          <Route
            path="deliverability"
            element={
              <PermissionGate permission="view_analytics">
                <Navigate to="/deliverability/bounces" replace />
              </PermissionGate>
            }
          />
          <Route
            path="deliverability/bounces"
            element={
              <PermissionGate permission="view_analytics">
                <DeliverabilityPage type="bounces" />
              </PermissionGate>
            }
          />
          <Route
            path="deliverability/complaints-suppressions"
            element={
              <PermissionGate permission="view_analytics">
                <DeliverabilityPage type="complaints-suppressions" />
              </PermissionGate>
            }
          />
          <Route
            path="deliverability/unsubscribes"
            element={
              <PermissionGate permission="view_analytics">
                <DeliverabilityPage type="unsubscribes" />
              </PermissionGate>
            }
          />
          <Route
            path="connect-domain"
            element={
              <PermissionGate permission="manage_settings">
                <Navigate to="/connect-domain/my-domains" replace />
              </PermissionGate>
            }
          />
          <Route
            path="connect-domain/my-domains"
            element={
              <PermissionGate permission="manage_settings">
                <DomainConnectionPage view="domains" />
              </PermissionGate>
            }
          />
          <Route
            path="connect-domain/dns-records"
            element={
              <PermissionGate permission="manage_settings">
                <DomainConnectionPage view="dns" />
              </PermissionGate>
            }
          />
          <Route
            path="connect-domain/domain-health"
            element={
              <PermissionGate permission="manage_settings">
                <DomainConnectionPage view="health" />
              </PermissionGate>
            }
          />
          <Route
            path="connect-domain/dedicated-ip"
            element={
              <PermissionGate permission="manage_settings">
                <DomainConnectionPage view="dedicated-ip" />
              </PermissionGate>
            }
          />
          <Route
            path="reports"
            element={
              <PermissionGate permission="view_reports">
                <ReportsPage />
              </PermissionGate>
            }
          />
          <Route
            path="billing"
            element={
              <PermissionGate permission="view_billing">
                <BillingPlanPage />
              </PermissionGate>
            }
          />
          <Route
            path="team-users"
            element={
              <PermissionGate permission="manage_team_access">
                <TeamUsersPage />
              </PermissionGate>
            }
          />
          <Route
            path="campaigns"
            element={
              <PermissionGate permission="manage_campaigns">
                <CampaignsListPage />
              </PermissionGate>
            }
          />
          <Route
            path="campaigns/new"
            element={
              <PermissionGate permission="manage_campaigns">
                <CampaignFormPage />
              </PermissionGate>
            }
          />
          <Route
            path="campaigns/:id"
            element={
              <PermissionGate permission="manage_campaigns">
                <CampaignDetailsPage />
              </PermissionGate>
            }
          />
          <Route
            path="campaigns/:id/edit"
            element={
              <PermissionGate permission="manage_campaigns">
                <CampaignFormPage />
              </PermissionGate>
            }
          />
          <Route
            path="templates"
            element={
              <PermissionGate permission="edit_content">
                <TemplatesListPage />
              </PermissionGate>
            }
          />
          <Route
            path="templates/new"
            element={
              <PermissionGate permission="edit_content">
                <TemplateFormPage />
              </PermissionGate>
            }
          />
          <Route
            path="templates/:id/edit"
            element={
              <PermissionGate permission="edit_content">
                <TemplateFormPage />
              </PermissionGate>
            }
          />
          <Route
            path="audience"
            element={
              <PermissionGate permission="manage_audience">
                <AudienceListPage />
              </PermissionGate>
            }
          />
          <Route
            path="audience/new"
            element={
              <PermissionGate permission="manage_audience">
                <SubscriberFormPage />
              </PermissionGate>
            }
          />
          <Route
            path="audience/:id"
            element={
              <PermissionGate permission="manage_audience">
                <SubscriberDetailsPage />
              </PermissionGate>
            }
          />
          <Route
            path="audience/:id/edit"
            element={
              <PermissionGate permission="manage_audience">
                <SubscriberFormPage />
              </PermissionGate>
            }
          />
          <Route
            path="suppressions"
            element={
              <PermissionGate permission="manage_audience">
                <SuppressionListPage />
              </PermissionGate>
            }
          />
          <Route
            path="segments"
            element={
              <PermissionGate permission="manage_audience">
                <SegmentsListPage />
              </PermissionGate>
            }
          />
          <Route
            path="segments/new"
            element={
              <PermissionGate permission="manage_audience">
                <SegmentFormPage />
              </PermissionGate>
            }
          />
          <Route
            path="segments/:id/edit"
            element={
              <PermissionGate permission="manage_audience">
                <SegmentFormPage />
              </PermissionGate>
            }
          />
          {navigationItems
            .filter(
              (item) =>
                ![
                  "/overview",
                  "/campaigns",
                  "/templates",
                  "/audience",
                  "/segments",
                  "/automations",
                  "/team-users",
                ].includes(item.path) &&
                ![
                  "/analytics",
                  "/billing",
                  "/deliverability",
                  "/connect-domain",
                  "/suppressions",
                  "/reports",
                ].includes(item.path),
            )
            .map((item) => (
              <Route
                key={item.path}
                path={item.path.slice(1)}
                element={
                  <PermissionGate permission={item.permission}>
                    <PlaceholderPage
                      title={item.label}
                      description={item.description}
                    />
                  </PermissionGate>
                }
              />
            ))}
        </Route>
        <Route
          path="/email-builder"
          element={
            <ProtectedRoute>
              <VendorExperienceRoute>
                <Navigate to="/email-builder/new" replace />
              </VendorExperienceRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/email-builder/new"
          element={
            <ProtectedRoute>
              <VendorExperienceRoute>
                <PermissionGate permission="edit_content">
                  <EmailBuilderPage />
                </PermissionGate>
              </VendorExperienceRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/email-builder/:id"
          element={
            <ProtectedRoute>
              <VendorExperienceRoute>
                <PermissionGate permission="edit_content">
                  <EmailBuilderPage />
                </PermissionGate>
              </VendorExperienceRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/simple-editor/new"
          element={
            <ProtectedRoute>
              <VendorExperienceRoute>
                <PermissionGate permission="edit_content">
                  <SimpleEmailEditorPage />
                </PermissionGate>
              </VendorExperienceRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/simple-editor/:id"
          element={
            <ProtectedRoute>
              <VendorExperienceRoute>
                <PermissionGate permission="edit_content">
                  <SimpleEmailEditorPage />
                </PermissionGate>
              </VendorExperienceRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/html-editor/new"
          element={
            <ProtectedRoute>
              <VendorExperienceRoute>
                <PermissionGate permission="edit_content">
                  <HtmlCustomCodeEditorPage />
                </PermissionGate>
              </VendorExperienceRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/html-editor/:id"
          element={
            <ProtectedRoute>
              <VendorExperienceRoute>
                <PermissionGate permission="edit_content">
                  <HtmlCustomCodeEditorPage />
                </PermissionGate>
              </VendorExperienceRoute>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
