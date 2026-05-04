import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PreviewAndTestModal from "../../components/dashboard/PreviewAndTestModal.jsx";
import OverviewTrendChart from "../../components/dashboard/OverviewTrendChart.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import LoadingState from "../../components/ui/LoadingState.jsx";
import Modal from "../../components/ui/Modal.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import { ToastContext } from "../../context/ToastContext.jsx";
import { api } from "../../lib/api.js";
import { formatCampaignTypeLabel } from "../../data/campaigns.js";
import {
  toDateTimeLocalInput,
  toIsoStringFromLocalInput,
} from "../../lib/datetime.js";
import { formatCurrency } from "../../lib/formatters.js";

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Not set";

const formatRecurringRule = (campaign) => {
  if (!campaign?.isRecurring) {
    return "Not recurring";
  }

  const unit = campaign.recurrenceUnit || "week";
  const quantity = Number(campaign.recurrenceInterval || 1);
  const suffix = quantity === 1 ? unit : `${unit}s`;

  return `Every ${quantity} ${suffix}`;
};

const stripTags = (value = "") =>
  String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const formatClickMapLabel = (item = {}) => item.section || "Other links";

const getClickMapMax = (rows = []) =>
  rows.reduce((max, row) => Math.max(max, Number(row.totalClicks || 0)), 0);

const getClickShare = (item = {}, max = 0) =>
  max ? Number(((Number(item.totalClicks || 0) / max) * 100).toFixed(1)) : 0;

const getHeatIntensity = (share = 0) => {
  if (share >= 90) return 1;
  if (share >= 70) return 0.88;
  if (share >= 50) return 0.75;
  if (share >= 30) return 0.62;
  if (share >= 15) return 0.48;
  return 0.34;
};

const parseTemplateHtml = (html = "") => {
  if (!html) {
    return {};
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const heading = doc.querySelector("h1, h2, h3")?.textContent?.trim() || "";
    const body = doc.querySelector("p")?.textContent?.trim() || "";
    const link = doc.querySelector("a");
    const image = doc.querySelector("img");

    return {
      headline: heading || undefined,
      bodyText: body || stripTags(doc.body.textContent || "") || undefined,
      ctaText: link?.textContent?.trim() || undefined,
      ctaUrl: link?.getAttribute("href") || undefined,
      imageUrl: image?.getAttribute("src") || undefined,
      imageAlt: image?.getAttribute("alt") || undefined,
    };
  } catch {
    return {};
  }
};

const buildPreviewHtmlDoc = (html = "", fallbackTitle = "Campaign") => {
  const cleanedHtml = String(html || "").trim();

  if (cleanedHtml) {
    return cleanedHtml;
  }

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f8fafc;color:#0f172a;font-family:Arial,sans-serif;">
    <div style="max-width:640px;margin:0 auto;border:1px solid #e5e7eb;border-radius:20px;background:#fff;padding:28px;">
      <div style="height:12px;width:92px;border-radius:999px;background:#cbd5e1;margin:0 auto 24px;"></div>
      <div style="height:160px;border-radius:18px;background:linear-gradient(180deg,#eef2ff 0%,#f8fafc 100%);display:flex;align-items:center;justify-content:center;">
        <div style="text-align:center;">
          <div style="font-size:18px;font-weight:700;color:#1e293b;">${fallbackTitle}</div>
          <div style="margin-top:8px;font-size:14px;color:#64748b;">Preview not available</div>
        </div>
      </div>
    </div>
  </body>
</html>`;
};

const buildCampaignPreview = (campaign, template) => {
  const parsed = parseTemplateHtml(template?.htmlContent || "");
  const design = template?.designJson || {};
  const displayName = campaign?.fromName?.trim() || "Your brand";
  const subject = campaign?.subject?.trim() || template?.subject || "Campaign subject";
  const previewText =
    campaign?.previewText?.trim() || template?.previewText || "Preview text appears here";

  return {
    campaignName: campaign?.name || "Untitled campaign",
    fromLine: `${displayName} <${campaign?.fromEmail?.trim() || "sender@example.com"}>`,
    subject,
    previewText,
    templateName: template?.name || "No template selected",
    campaignType: campaign?.type || "—",
    goal: campaign?.goal || "—",
    audience: campaign?.segmentId?.name || "All subscribers",
    status: campaign?.status || "draft",
    headline: design.headline || parsed.headline || subject,
    bodyText:
      design.bodyText ||
      parsed.bodyText ||
      "This is a live preview of the campaign email as it will look in an inbox.",
    ctaText: design.ctaText || parsed.ctaText || "Shop now",
    ctaUrl: design.ctaUrl || parsed.ctaUrl || "#",
    imageUrl:
      design.imageUrl ||
      parsed.imageUrl ||
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    imageAlt: design.imageAlt || parsed.imageAlt || "Campaign visual",
    footerNote:
      design.footerNote ||
      "You are receiving this because you subscribed to updates.",
  };
};

function DesktopIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8" />
      <path d="M12 16v4" />
    </svg>
  );
}

function MobileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
      <rect x="8" y="2.5" width="8" height="19" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}

function CampaignDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useContext(ToastContext);
  const [campaign, setCampaign] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewTestModalOpen, setIsPreviewTestModalOpen] = useState(false);
  const [previewModalTab, setPreviewModalTab] = useState("preview");
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [showFullTimeline, setShowFullTimeline] = useState(false);
  const [showAllRecentEvents, setShowAllRecentEvents] = useState(false);
  const campaignPreview = useMemo(
    () => buildCampaignPreview(campaign, previewTemplate),
    [campaign, previewTemplate],
  );
  const clickMapRows = useMemo(() => campaign?.clickMap || [], [campaign]);
  const clickMapMax = useMemo(() => getClickMapMax(clickMapRows), [clickMapRows]);

  const previewStats = [
    ["Campaign", campaignPreview.campaignName],
    ["Type", formatCampaignTypeLabel(campaignPreview.campaignType)],
    ["Template", campaignPreview.templateName],
    ["Audience", campaignPreview.audience],
    ["Goal", campaignPreview.goal],
    ["Status", campaignPreview.status],
  ];

  const loadCampaign = async ({ silent = false } = {}) => {
    if (!silent) {
      setIsLoading(true);
    }

    try {
      const { data } = await api.get(`/campaigns/${id}`);
      setCampaign(data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load campaign");
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadCampaign();
  }, [id]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadCampaign({ silent: true }).catch(() => {});
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [id]);

  useEffect(() => {
    setShowFullTimeline(false);
    setShowAllRecentEvents(false);
  }, [id, campaign?._id]);

  useEffect(() => {
    if (!isPreviewTestModalOpen) {
      setPreviewTemplate(null);
    }
  }, [isPreviewTestModalOpen]);

  useEffect(() => {
    if (isScheduleModalOpen) {
      setScheduledAt(toDateTimeLocalInput(campaign?.scheduledAt));
    }
  }, [campaign?.scheduledAt, isScheduleModalOpen]);

  const summaryStats = useMemo(() => {
    const totals = campaign?.totals || {};

    return [
      ["People reached", campaign?.totalRecipients || 0],
      ["Emails sent", totals.sent || 0],
      ["Delivered", totals.delivered || 0],
      ["Opened", totals.opens || 0],
      ["Unique opens", totals.uniqueOpens || 0],
      ["Clicked", totals.clicks || 0],
      ["Unique clicks", totals.uniqueClicks || 0],
      ["Bounced", totals.bounces || 0],
      ["Complaints", totals.complaints || 0],
      ["Unsubscribed", totals.unsubscribes || 0],
      ["Conversions", totals.conversions || 0],
      ["Revenue", formatCurrency(totals.revenue || 0)],
    ];
  }, [campaign]);

  const getRecentEventDetail = (event) =>
    event.section ||
    event.blockId ||
    event.clickedLink ||
    event.bounceType ||
    event.complaintFeedbackType ||
    event.deviceType ||
    event.ipAddress ||
    "-";

  const sendProgress = campaign?.sendProgress || {
    percentage: 0,
    sent: 0,
    totalRecipients: 0,
    remaining: 0,
  };

  const metadata = useMemo(() => {
    if (!campaign) return [];

    return [
      ["Type", campaign.type],
      ["Goal", campaign.goal],
      ["Recurring", formatRecurringRule(campaign)],
      ["Subject", campaign.subject],
      ["Preview text", campaign.previewText || "Not set"],
      ["From name", campaign.fromName],
      ["From email", campaign.fromEmail],
      ["Reply-to", campaign.replyTo || "Not set"],
      ["Template", campaign.templateId?.name || "Unknown"],
      ["Segment", campaign.segmentId?.name || "All subscribers"],
      [
        campaign.isRecurring ? "Next run" : "Scheduled at",
        formatDateTime(campaign.scheduledAt),
      ],
      ["Runs completed", campaign.recurrenceRunCount || 0],
      ["Last run", formatDateTime(campaign.recurrenceLastRunAt)],
      ["Sent at", formatDateTime(campaign.sentAt)],
      ["Created", formatDateTime(campaign.createdAt)],
    ];
  }, [campaign]);

  const visibleActivityTimeline = useMemo(() => {
    const timeline = campaign?.activityTimeline || [];
    return showFullTimeline ? timeline : timeline.slice(0, 6);
  }, [campaign?.activityTimeline, showFullTimeline]);

  const visibleRecentEvents = useMemo(() => {
    const events = campaign?.recentEvents || [];
    return showAllRecentEvents ? events : events.slice(0, 6);
  }, [campaign?.recentEvents, showAllRecentEvents]);

  const handleSchedule = async (event) => {
    event.preventDefault();
    setIsSavingSchedule(true);

    try {
      await api.post(`/campaigns/${id}/schedule`, {
        scheduledAt:
          toIsoStringFromLocalInput(scheduledAt) || new Date().toISOString(),
      });
      toast.success("Campaign scheduled");
      setIsScheduleModalOpen(false);
      loadCampaign();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to schedule campaign",
      );
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleSendTest = async (emails) => {
    const recipientEmails = Array.isArray(emails)
      ? emails
          .map((email) => String(email || "").trim().toLowerCase())
          .filter(Boolean)
      : [];

    if (!recipientEmails.length) {
      toast.error("Enter a test email address");
      return;
    }

    try {
      await api.post(`/email/campaigns/${id}/send-test`, { emails: recipientEmails });
      toast.success("Test email sent");
      setIsPreviewTestModalOpen(false);
      loadCampaign();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to send test email");
      throw error;
    }
  };

  const handleSendNow = async () => {
    try {
      await api.post(`/email/campaigns/${id}/send`);
      toast.success("Campaign send started");
      loadCampaign();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to send campaign");
    }
  };

  const handleOpenPreview = async (initialTab = "preview") => {
    try {
      const templateId = campaign?.templateId?._id;

      if (!templateId) {
        setPreviewTemplate(null);
      } else {
        const { data } = await api.get(`/templates/${templateId}`);
        setPreviewTemplate(data);
      }
    } catch (error) {
      setPreviewTemplate(null);
      toast.error(error.response?.data?.message || "Unable to load campaign preview");
      return;
    }

    setPreviewModalTab(initialTab);
    setIsPreviewTestModalOpen(true);
  };

  const handlePauseResume = async () => {
    try {
      await api.post(
        `/campaigns/${id}/${campaign.status === "paused" ? "resume" : "pause"}`,
      );
      toast.success(
        campaign.status === "paused" ? "Campaign resumed" : "Campaign paused",
      );
      loadCampaign();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to update campaign status",
      );
    }
  };

  const handleArchive = async () => {
    try {
      await api.post(`/campaigns/${id}/archive`);
      toast.success("Campaign archived");
      loadCampaign();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to archive campaign",
      );
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete "${campaign.name}"? This will remove its recipients, events, and activity logs.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/campaigns/${id}`);
      toast.success("Campaign deleted");
      navigate("/campaigns");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete campaign");
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading campaign..." />;
  }

  if (!campaign) {
    return (
      <div className="shell-card p-6 text-sm text-slate-500">
        Campaign not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="shell-card-strong p-6 md:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={campaign.status} />
              <span className="soft-pill capitalize">{campaign.goal}</span>
              <span className="soft-pill">
                {formatCampaignTypeLabel(campaign.type)}
              </span>
              {campaign.isRecurring ? (
                <span className="soft-pill">Recurring</span>
              ) : null}
            </div>
            <PageHeader
              eyebrow="Campaign detail"
              title={campaign.name}
              description={campaign.subject}
            />
            <p className="max-w-3xl text-[13px] leading-6 text-[#7b7592]">
              This page shows how many people received the email, opened it,
              clicked it, and where the campaign is in its sending journey.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleOpenPreview("preview")}
              className="rounded-xl border border-[#ddd4f2] px-4 py-3 text-sm font-medium text-[#5f5878]"
            >
              Preview
            </button>
            <Link
              to={`/campaigns/${campaign._id}/edit`}
              className="rounded-xl border border-[#ddd4f2] px-4 py-3 text-sm font-medium text-[#5f5878]"
            >
              Edit
            </Link>
            <button
              type="button"
              onClick={() => void handleOpenPreview("send")}
              className="rounded-xl border border-[#ddd4f2] px-4 py-3 text-sm font-medium text-[#5f5878]"
            >
              Send test
            </button>
            <button
              type="button"
              onClick={() => setIsScheduleModalOpen(true)}
              className="rounded-xl border border-[#ddd4f2] px-4 py-3 text-sm font-medium text-[#5f5878]"
            >
              Schedule
            </button>
            <button
              type="button"
              onClick={handleSendNow}
              className="primary-button"
            >
              Send now
            </button>
            {["scheduled", "paused"].includes(campaign.status) ? (
              <button
                type="button"
                onClick={handlePauseResume}
                className="rounded-xl border border-amber-200 px-4 py-3 text-sm font-medium text-amber-700"
              >
                {campaign.status === "paused" ? "Resume" : "Pause"}
              </button>
            ) : null}
            {campaign.status !== "archived" ? (
              <button
                type="button"
                onClick={handleArchive}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600"
              >
                Archive
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-xl border border-rose-200 px-4 py-3 text-sm font-medium text-rose-600"
            >
              Delete
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryStats.map(([label, value]) => (
          <article
            key={label}
            className="metric-card bg-gradient-to-br from-white to-[#faf7ff]"
          >
            <div className="p-5">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#7a7296]">
                {label}
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-[#2f2b3d]">
                {value}
              </p>
            </div>
          </article>
        ))}
      </section>

      <section className="shell-card-strong p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#2f2b3d]">
              Delivery progress
            </h3>
            <p className="mt-2 text-[13px] text-[#7b7592]">
              Live progress of how many emails have been sent and how many are
              still waiting.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="soft-pill">{sendProgress.sent} sent</span>
            <span className="soft-pill">
              {sendProgress.remaining} remaining
            </span>
            <span className="soft-pill">
              {sendProgress.totalRecipients} total recipients
            </span>
          </div>
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#efe8ff]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#7c3aed,#a78bfa)] transition-all"
            style={{ width: `${sendProgress.percentage}%` }}
          />
        </div>
        <p className="mt-3 text-sm font-medium text-[#5f5878]">
          {sendProgress.percentage}% complete
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="shell-card-strong p-6">
          <h3 className="text-lg font-semibold text-[#2f2b3d]">
            Campaign details
          </h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {metadata.map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[#faf7ff] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a94b2]">
                  {label}
                </p>
                <p className="mt-2 text-[13px] leading-5 text-[#4f4865]">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="shell-card-strong p-6">
          <h3 className="mb-4 text-lg font-semibold text-[#2f2b3d]">
            Delivery, open, and click trend
          </h3>
          {campaign.trendData?.length ? (
            <OverviewTrendChart data={campaign.trendData} />
          ) : (
            <EmptyState
              title="No trend data yet"
              description="Trend lines will appear after people start receiving and interacting with the email."
            />
          )}
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="shell-card-strong p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#2f2b3d]">
              Campaign timeline
            </h3>
            <span className="soft-pill">
              {campaign.activityTimeline?.length || 0} entries
            </span>
          </div>

          {campaign.activityTimeline?.length ? (
            <div className="space-y-4">
              {visibleActivityTimeline.map((entry) => (
                <div
                  key={entry._id}
                  className="rounded-2xl border border-[#ece6f8] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[13px] font-semibold text-[#2f2b3d]">
                        {entry.message}
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#9a94b2]">
                        {entry.type}
                      </p>
                    </div>
                    <p className="text-[11px] text-[#8b84a5]">
                      {formatDateTime(entry.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              {campaign.activityTimeline.length > 6 ? (
                <button
                  type="button"
                  className="w-full rounded-2xl border border-[#ddd4f2] px-4 py-3 text-sm font-semibold text-[#6d28d9] transition hover:bg-[#faf7ff]"
                  onClick={() => setShowFullTimeline((current) => !current)}
                >
                  {showFullTimeline
                    ? "Show less"
                    : `See more (${campaign.activityTimeline.length - 6} more)`}
                </button>
              ) : null}
            </div>
          ) : (
            <EmptyState
              title="No timeline yet"
              description="Actions like create, schedule, send, open, and click will appear here."
            />
          )}
        </article>

        <article className="shell-card-strong overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-5">
            <h3 className="text-lg font-semibold text-[#2f2b3d]">
              Recipient progress
            </h3>
          </div>
          {campaign.recipientProgress?.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[13px]">
                <thead className="bg-[#faf7ff] text-[#7a7296]">
                  <tr>
                    <th className="px-6 py-4 font-medium">Recipient</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Sent</th>
                    <th className="px-6 py-4 font-medium">Opened</th>
                    <th className="px-6 py-4 font-medium">Clicked</th>
                  </tr>
                </thead>
                <tbody>
                  {campaign.recipientProgress.map((recipient) => (
                    <tr
                      key={recipient._id}
                      className="border-t border-slate-100"
                    >
                      <td className="px-6 py-4 text-[#4f4865]">
                        {recipient.email}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={recipient.status} />
                      </td>
                      <td className="px-6 py-4 text-[#6e6787]">
                        {formatDateTime(recipient.sentAt)}
                      </td>
                      <td className="px-6 py-4 text-[#6e6787]">
                        {formatDateTime(recipient.openedAt)}
                      </td>
                      <td className="px-6 py-4 text-[#6e6787]">
                        {formatDateTime(recipient.clickedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No recipient progress yet"
                description="Once the campaign starts, you’ll see who received, opened, and clicked the email."
              />
            </div>
          )}
        </article>
      </section>

      <section className="space-y-6">
        <article className="shell-card-strong overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-5">
            <h3 className="text-base font-semibold text-[#2f2b3d]">
              Recent activity
            </h3>
          </div>
          {campaign.recentEvents?.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[12px]">
                <thead className="bg-[#faf7ff] text-[#7a7296]">
                  <tr>
                    <th className="px-6 py-4 font-medium">Event</th>
                    <th className="px-6 py-4 font-medium">Recipient</th>
                    <th className="px-6 py-4 font-medium">Detail</th>
                    <th className="px-6 py-4 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRecentEvents.map((event) => (
                    <tr key={event._id} className="border-t border-slate-100">
                      <td className="px-6 py-4 capitalize text-[#2f2b3d]">
                        {event.eventType}
                      </td>
                      <td className="px-6 py-4 text-[#6e6787]">
                        {event.recipientEmail}
                      </td>
                      <td className="px-6 py-4 text-[#6e6787]">
                        {getRecentEventDetail(event)}
                      </td>
                      <td className="px-6 py-4 text-[#6e6787]">
                        {formatDateTime(event.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No recent activity"
                description="This will fill in as people receive, open, and click the email."
              />
            </div>
          )}
          {campaign.recentEvents?.length > 6 ? (
            <div className="px-6 pb-5 pt-3 text-right">
              <button
                type="button"
                className="text-sm font-medium text-[#6d28d9] transition hover:underline"
                onClick={() => setShowAllRecentEvents((current) => !current)}
              >
                {showAllRecentEvents
                  ? "Show less"
                  : `See more (${campaign.recentEvents.length - 6} more)`}
              </button>
            </div>
          ) : null}
        </article>

        <article className="shell-card-strong overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-5">
            <h3 className="text-base font-semibold text-[#2f2b3d]">
              Top links
            </h3>
          </div>
          {campaign.topLinks?.length ? (
            <div className="space-y-4 p-6">
              {campaign.topLinks.map((link) => (
                <div key={link.url} className="rounded-2xl bg-[#faf7ff] p-4">
                  <p className="truncate text-[13px] font-semibold text-[#2f2b3d]">
                    {link.url}
                  </p>
                  <p className="mt-2 text-[12px] text-[#6e6787]">
                    {link.totalClicks} clicks
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No link activity"
                description="Link rollups will appear when click events start carrying URL metadata."
              />
            </div>
          )}
        </article>

        <article className="shell-card-strong overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-5">
            <h3 className="text-base font-semibold text-[#2f2b3d]">Heatmap</h3>
            <p className="mt-1 text-[12px] text-[#6e6787]">
              Section-wise clicks show which part of the email people engaged with most.
            </p>
          </div>
          {clickMapRows.length ? (
            <div className="space-y-4 p-6">
              {clickMapRows.map((item, index) => {
                const share = getClickShare(item, clickMapMax);
                const intensity = getHeatIntensity(share);
                const width = clickMapMax
                  ? Math.max(10, Math.round((Number(item.totalClicks || 0) / clickMapMax) * 100))
                  : 0;
                const isTop = index === 0;

                return (
                  <div
                    key={`${item.blockId || item.section || "click-map"}-${item.totalClicks}-${index}`}
                    className={`rounded-2xl border p-4 transition ${
                      isTop
                        ? "border-[#d8c8ff] bg-gradient-to-br from-[#faf7ff] via-[#f4edff] to-[#ece3ff]"
                        : "border-[#efe6ff] bg-[#faf7ff]"
                    }`}
                    style={{
                      boxShadow: `0 0 0 1px rgba(109, 40, 217, ${0.04 + intensity * 0.08}) inset`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[13px] font-semibold text-[#2f2b3d]">
                          {formatClickMapLabel(item)}
                        </p>
                        <p className="mt-1 text-[12px] text-[#6e6787]">
                          {item.uniqueRecipients} unique people · {item.totalClicks} clicks
                        </p>
                      </div>
                      <span className="soft-pill">{item.blockId ? "Tracked block" : "Tracked link"}</span>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#ebe4fb]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${width}%`,
                          background: `linear-gradient(90deg, rgba(109,40,217,${0.52 + intensity * 0.38}) 0%, rgba(168,85,247,${0.48 + intensity * 0.32}) 100%)`,
                        }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-[#7b7592]">
                      <span>{share}% of top click intensity</span>
                      {isTop ? <span className="font-semibold text-[#6d28d9]">Top clicked area</span> : <span>Heat intensity {Math.round(intensity * 100)}%</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No click map yet"
                description="Once tracked links include section metadata, this card will show which email blocks drive the most clicks."
              />
            </div>
          )}
        </article>

        <article className="shell-card-strong p-6">
          <h3 className="text-base font-semibold text-[#2f2b3d]">
            Revenue and conversions
          </h3>
          <div className="mt-4 rounded-2xl bg-[#faf7ff] p-5">
            <p className="text-xl font-semibold text-[#2f2b3d]">
              {campaign.totals?.conversions || 0}
            </p>
            <p className="mt-2 text-[12px] text-[#6e6787]">
              Conversions attributed
            </p>
            <p className="mt-6 text-xl font-semibold text-[#2f2b3d]">
              {formatCurrency(campaign.totals?.revenue || 0)}
            </p>
            <p className="mt-2 text-[12px] text-[#6e6787]">
              Revenue attributed
            </p>
          </div>
          <p className="mt-4 text-[12px] leading-6 text-[#7b7592]">
            The structure is ready for future purchase attribution and revenue
            sync once commerce-side conversion data is connected.
          </p>
        </article>
      </section>

      {isScheduleModalOpen ? (
        <Modal
          title="Schedule campaign"
          description="Choose the intended send time. This keeps the campaign in a clear scheduled state for future automation."
          onClose={() => setIsScheduleModalOpen(false)}
        >
          <form className="space-y-4" onSubmit={handleSchedule}>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-[#2f2b3d]">
                Send time
              </span>
              <input
                className="field"
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
              />
            </label>
            <div className="flex justify-end">
              <button
                type="submit"
                className="primary-button"
                disabled={isSavingSchedule}
              >
                {isSavingSchedule ? "Saving..." : "Schedule campaign"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      <PreviewAndTestModal
        open={isPreviewTestModalOpen}
        initialTab={previewModalTab}
        title="Preview & test"
        subject={campaignPreview.subject}
        previewText={campaignPreview.previewText}
        previewHtml={buildPreviewHtmlDoc(
          previewTemplate?.htmlContent || "",
          campaign?.name || "Campaign",
        )}
        bodyWidth={760}
        onClose={() => setIsPreviewTestModalOpen(false)}
        onSendTest={({ emails }) => handleSendTest(emails)}
      />
    </div>
  );
}

export default CampaignDetailsPage;
