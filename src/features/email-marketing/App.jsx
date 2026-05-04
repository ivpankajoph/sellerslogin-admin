import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import PermissionGate from "./components/auth/PermissionGate.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import DashboardLayout from "./components/layout/DashboardLayout.jsx";
import CampaignDetailsPage from "./pages/dashboard/CampaignDetailsPage.jsx";
import CampaignFormPage from "./pages/dashboard/CampaignFormPage.jsx";
import CampaignsListPage from "./pages/dashboard/CampaignsListPage.jsx";
import { navigationItems } from "./data/navigation.js";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import AnalyticsPage from "./pages/dashboard/AnalyticsPage.jsx";
import AutomationDetailsPage from "./pages/dashboard/AutomationDetailsPage.jsx";
import AutomationExecutionsPage from "./pages/dashboard/AutomationExecutionsPage.jsx";
import AutomationFormPage from "./pages/dashboard/AutomationFormPage.jsx";
import AutomationListPage from "./pages/dashboard/AutomationListPage.jsx";
import AudienceListPage from "./pages/dashboard/AudienceListPage.jsx";
import DeliverabilityPage from "./pages/dashboard/DeliverabilityPage.jsx";
import EmailBuilderPage from "./pages/dashboard/EmailBuilderPage.jsx";
import OverviewPage from "./pages/dashboard/OverviewPage.jsx";
import PlaceholderPage from "./pages/dashboard/PlaceholderPage.jsx";
import ReportsPage from "./pages/dashboard/ReportsPage.jsx";
import HtmlCustomCodeEditorPage from "./pages/dashboard/HtmlCustomCodeEditorPage.jsx";
import SimpleEmailEditorPage from "./pages/dashboard/SimpleEmailEditorPage.jsx";
import SegmentFormPage from "./pages/dashboard/SegmentFormPage.jsx";
import SegmentsListPage from "./pages/dashboard/SegmentsListPage.jsx";
import TeamUsersPage from "./pages/dashboard/TeamUsersPage.jsx";
import SubscriberDetailsPage from "./pages/dashboard/SubscriberDetailsPage.jsx";
import SubscriberFormPage from "./pages/dashboard/SubscriberFormPage.jsx";
import SuppressionListPage from "./pages/dashboard/SuppressionListPage.jsx";
import TemplateFormPage from "./pages/dashboard/TemplateFormPage.jsx";
import TemplatesListPage from "./pages/dashboard/TemplatesListPage.jsx";

function App() {
  return (
    <BrowserRouter basename="/email-marketing">
      <Routes>
        <Route path="/login" element={<Navigate to="/overview" replace />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route
            path="analytics"
            element={
              <PermissionGate permission="view_analytics">
                <AnalyticsPage />
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
                <DeliverabilityPage />
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
                  "/deliverability",
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
              <Navigate to="/email-builder/new" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/email-builder/new"
          element={
            <ProtectedRoute>
              <PermissionGate permission="edit_content">
                <EmailBuilderPage />
              </PermissionGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/email-builder/:id"
          element={
            <ProtectedRoute>
              <PermissionGate permission="edit_content">
                <EmailBuilderPage />
              </PermissionGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/simple-editor/new"
          element={
            <ProtectedRoute>
              <PermissionGate permission="edit_content">
                <SimpleEmailEditorPage />
              </PermissionGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/simple-editor/:id"
          element={
            <ProtectedRoute>
              <PermissionGate permission="edit_content">
                <SimpleEmailEditorPage />
              </PermissionGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/html-editor/new"
          element={
            <ProtectedRoute>
              <PermissionGate permission="edit_content">
                <HtmlCustomCodeEditorPage />
              </PermissionGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/html-editor/:id"
          element={
            <ProtectedRoute>
              <PermissionGate permission="edit_content">
                <HtmlCustomCodeEditorPage />
              </PermissionGate>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
