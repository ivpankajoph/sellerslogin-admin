import { useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../../components/ui/EmptyState.jsx";
import LoadingState from "../../components/ui/LoadingState.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import { ToastContext } from "../../context/ToastContext.jsx";
import {
  campaignGoals,
  campaignTypes,
  formatCampaignTypeLabel,
} from "../../data/campaigns.js";
import { api } from "../../lib/api.js";

const statusTabs = [
  {
    value: "all",
    label: "All campaigns",
    help: "See every campaign in one place, regardless of status or type.",
  },
  {
    value: "draft",
    label: "Draft",
    help: "Campaigns being written or reviewed before they are scheduled.",
  },
  {
    value: "scheduled",
    label: "Scheduled",
    help: "Campaigns planned for a future date and waiting to be sent.",
  },
  {
    value: "sending",
    label: "Sending",
    help: "Campaigns that are actively being delivered right now.",
  },
  {
    value: "sent",
    label: "Sent",
    help: "Campaigns that have already gone out to recipients.",
  },
  {
    value: "paused",
    label: "Paused",
    help: "Campaigns temporarily stopped before they finish sending.",
  },
  {
    value: "failed",
    label: "Failed",
    help: "Campaigns that ran into an error and need attention.",
  },
  {
    value: "archived",
    label: "Archived",
    help: "Older campaigns kept for reference without using them again.",
  },
];

const initialFilters = {
  search: "",
  type: "",
  goal: "",
};

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Not scheduled";

const formatRecurringRule = (campaign) => {
  if (!campaign?.isRecurring) {
    return "";
  }

  const unit = campaign.recurrenceUnit || "week";
  const quantity = Number(campaign.recurrenceInterval || 1);
  const suffix = quantity === 1 ? unit : `${unit}s`;

  return `Every ${quantity} ${suffix}`;
};

function DotsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 fill-current"
      aria-hidden="true"
    >
      <circle cx="12" cy="5" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="12" cy="19" r="1.7" />
    </svg>
  );
}

function CampaignsListPage() {
  const toast = useContext(ToastContext);
  const actionMenuRef = useRef(null);
  const [campaigns, setCampaigns] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [filters, setFilters] = useState(initialFilters);
  const [statusTab, setStatusTab] = useState("all");
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [broadcastOnly, setBroadcastOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMenuCampaignId, setActionMenuCampaignId] = useState(null);

  const loadCampaigns = async (
    page = 1,
    nextStatus = statusTab,
    nextFilters = filters,
    nextRecurringOnly = recurringOnly,
    nextBroadcastOnly = broadcastOnly,
  ) => {
    setIsLoading(true);

    try {
      const activeType = nextBroadcastOnly
        ? "broadcast"
        : nextFilters.type || undefined;

      const { data } = await api.get("/campaigns", {
        params: {
          page,
          limit: 10,
          status: nextStatus,
          search: nextFilters.search || undefined,
          type: activeType,
          goal: nextFilters.goal || undefined,
          recurring: nextRecurringOnly ? "true" : undefined,
        },
      });

      setCampaigns(data.data);
      setPagination(data.pagination);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load campaigns");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns(1);
  }, []);

  useEffect(() => {
    if (!actionMenuCampaignId) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setActionMenuCampaignId(null);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setActionMenuCampaignId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [actionMenuCampaignId]);

  const handleArchive = async (campaignId) => {
    try {
      await api.post(`/campaigns/${campaignId}/archive`);
      toast.success("Campaign archived");
      loadCampaigns(pagination.page);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to archive campaign",
      );
    }
  };

  const handlePauseResume = async (campaign) => {
    try {
      await api.post(
        `/campaigns/${campaign._id}/${campaign.status === "paused" ? "resume" : "pause"}`,
      );
      toast.success(
        campaign.status === "paused" ? "Campaign resumed" : "Campaign paused",
      );
      loadCampaigns(pagination.page);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to update campaign status",
      );
    }
  };

  const handleDelete = async (campaign) => {
    const confirmed = window.confirm(
      `Delete "${campaign.name}"? This will remove its recipients, events, and activity logs.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/campaigns/${campaign._id}`);
      toast.success("Campaign deleted");

      const nextPage =
        campaigns.length === 1 && pagination.page > 1
          ? pagination.page - 1
          : pagination.page;

      loadCampaigns(nextPage);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete campaign");
    }
  };

  return (
    <div className="space-y-6">
      <section className="shell-card-strong p-6 md:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <PageHeader
              
              title="Campaign's center"
              
            />
            <div className="flex flex-wrap gap-2">
              <span className="soft-pill">
                {pagination.total} campaigns in workspace
              </span>
              <span className="soft-pill">Draft-to-send workflow ready</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/campaigns/new?type=broadcast"
              className="rounded-xl border border-[#ddd4f2] px-5 py-3 text-center text-sm font-semibold text-[#6d28d9]"
            >
              Create broadcast
            </Link>
            <Link
              to="/campaigns/new"
              className="primary-button shrink-0 min-w-[146px] whitespace-nowrap px-5 text-center"
            >
              Create campaign
            </Link>
          </div>
        </div>
      </section>

      <section className="shell-card-strong p-5 md:p-6">
        <div className="flex flex-wrap gap-2">
          {statusTabs.map((tab) => (
            <div key={tab.value} className="group relative">
              <button
                type="button"
                onClick={() => {
                  setRecurringOnly(false);
                  setBroadcastOnly(false);
                  setStatusTab(tab.value);
                  loadCampaigns(1, tab.value, filters, false, false);
                }}
                className={`rounded-[3px] border px-4 py-2 text-sm font-semibold capitalize transition ${
                  !recurringOnly && statusTab === tab.value
                    ? "border-[#7c3aed] bg-[#7c3aed] text-white"
                    : "border-[#ddd4f2] bg-white text-[#6e6787]"
                }`}
              >
                {tab.label}
              </button>
              <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-64 rounded-2xl border border-[#e7def8] bg-white px-4 py-3 text-xs leading-5 text-[#5f5878] opacity-0 shadow-[0_12px_32px_rgba(15,23,42,0.12)] transition group-hover:opacity-100">
                {tab.help}
              </div>
            </div>
          ))}
          <div className="group relative">
            <button
              type="button"
              onClick={() => {
                const nextRecurringOnly = !recurringOnly;
                const nextBroadcastOnly = false;

                setRecurringOnly(nextRecurringOnly);
                setBroadcastOnly(nextBroadcastOnly);
                if (nextRecurringOnly) {
                  setStatusTab("all");
                }
                loadCampaigns(
                  1,
                  nextRecurringOnly ? "all" : statusTab,
                  filters,
                  nextRecurringOnly,
                  nextBroadcastOnly,
                );
              }}
              className={`rounded-[3px] border px-4 py-2 text-sm font-semibold transition ${
                recurringOnly
                  ? "border-[#7c3aed] bg-[#7c3aed] text-white"
                  : "border-[#ddd4f2] bg-white text-[#6e6787]"
              }`}
            >
              Recurring campaigns
            </button>
            <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-64 rounded-2xl border border-[#e7def8] bg-white px-4 py-3 text-xs leading-5 text-[#5f5878] opacity-0 shadow-[0_12px_32px_rgba(15,23,42,0.12)] transition group-hover:opacity-100">
              Show campaigns that repeat automatically on a schedule.
            </div>
          </div>
          <div className="group relative">
            <button
              type="button"
              onClick={() => {
                const nextBroadcastOnly = !broadcastOnly;
                const nextRecurringOnly = false;

                setBroadcastOnly(nextBroadcastOnly);
                setRecurringOnly(nextRecurringOnly);
                if (nextBroadcastOnly) {
                  setStatusTab("all");
                }
                loadCampaigns(
                  1,
                  nextBroadcastOnly ? "all" : statusTab,
                  filters,
                  nextRecurringOnly,
                  nextBroadcastOnly,
                );
              }}
              className={`rounded-[3px] border px-4 py-2 text-sm font-semibold transition ${
                broadcastOnly
                  ? "border-[#7c3aed] bg-[#7c3aed] text-white"
                  : "border-[#ddd4f2] bg-white text-[#6e6787]"
              }`}
            >
              Broadcast campaigns
            </button>
            <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-64 rounded-2xl border border-[#e7def8] bg-white px-4 py-3 text-xs leading-5 text-[#5f5878] opacity-0 shadow-[0_12px_32px_rgba(15,23,42,0.12)] transition group-hover:opacity-100">
              Show one-time campaigns that are not recurring.
            </div>
          </div>
        </div>

        <form
          className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1.4fr)_220px_220px_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            loadCampaigns(1, statusTab, filters, recurringOnly, broadcastOnly);
          }}
        >
          <input
            className="field"
            placeholder="Search by campaign name, subject, or sender"
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                search: event.target.value,
              }))
            }
          />
          <select
            className="field"
            value={filters.type}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                type: event.target.value,
              }))
            }
          >
            <option value="">All types</option>
            {campaignTypes.map((type) => (
              <option key={type} value={type}>
                {formatCampaignTypeLabel(type)}
              </option>
            ))}
          </select>
          <select
            className="field"
            value={filters.goal}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                goal: event.target.value,
              }))
            }
          >
            <option value="">All goals</option>
            {campaignGoals.map((goal) => (
              <option key={goal} value={goal}>
                {goal}
              </option>
            ))}
          </select>
          <button type="submit" className="primary-button">
            Apply filters
          </button>
        </form>
      </section>

      <section className="shell-card-strong overflow-hidden">
        {isLoading ? (
          <LoadingState message="Loading campaigns..." />
        ) : campaigns.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-[#faf7ff] text-[#7a7296]">
                  <tr>
                    <th className="px-6 py-4 font-medium">Campaign</th>
                    <th className="px-6 py-4 font-medium">Goal</th>
                    <th className="px-6 py-4 font-medium">Audience</th>
                    <th className="px-6 py-4 font-medium">Schedule</th>
                    <th className="px-6 py-4 font-medium">Performance</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr
                      key={campaign._id}
                      className="border-b border-slate-100 align-top last:border-b-0"
                    >
                      <td className="px-6 py-5">
                        <div>
                          <Link
                            to={`/campaigns/${campaign._id}`}
                            className="text-base font-semibold text-[#2f2b3d]"
                          >
                            {campaign.name}
                          </Link>
                          <p className="mt-1 text-sm text-[#6e6787]">
                            {campaign.subject}
                          </p>
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#9a94b2]">
                            {formatCampaignTypeLabel(campaign.type)}
                          </p>
                          {campaign.isRecurring ? (
                            <p className="mt-2 inline-flex rounded-full bg-[#f1eaff] px-3 py-1 text-xs font-semibold text-[#6d28d9]">
                              Recurring
                            </p>
                          ) : null}
                          <p className="mt-2 text-xs text-[#9a94b2]">
                            Created on {formatDateTime(campaign.createdAt)}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-5 capitalize text-[#5f5878]">
                        {campaign.goal}
                      </td>
                      <td className="px-6 py-5 text-[#5f5878]">
                        <p>{campaign.segmentId?.name || "All subscribers"}</p>
                        <p className="mt-1 text-xs text-[#9a94b2]">
                          {campaign.totalRecipients || 0} recipients
                        </p>
                      </td>
                      <td className="px-6 py-5 text-[#5f5878]">
                        <p>
                          {campaign.isRecurring ? "Next run: " : ""}
                          {formatDateTime(campaign.scheduledAt)}
                        </p>
                        {campaign.isRecurring ? (
                          <p className="mt-1 text-xs text-[#9a94b2]">
                            {formatRecurringRule(campaign)}
                            {campaign.recurrenceRunCount
                              ? ` · ${campaign.recurrenceRunCount} run(s)`
                              : ""}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-[#9a94b2]">
                            Sent on:{" "}
                            {campaign.sentAt
                              ? formatDateTime(campaign.sentAt)
                              : "Not sent"}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-5 text-[#5f5878]">
                        <p>{campaign.totals?.delivered || 0} delivered</p>
                        <p className="mt-1 text-xs text-[#9a94b2]">
                          {campaign.totals?.opens || 0} opens |{" "}
                          {campaign.totals?.clicks || 0} clicks
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge status={campaign.status} />
                      </td>
                      <td className="px-6 py-5">
                        <div
                          className="relative inline-flex"
                          ref={actionMenuCampaignId === campaign._id ? actionMenuRef : null}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setActionMenuCampaignId((current) =>
                                current === campaign._id ? null : campaign._id,
                              )
                            }
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                            aria-label={`Actions for ${campaign.name}`}
                            aria-haspopup="menu"
                            aria-expanded={actionMenuCampaignId === campaign._id}
                            title="More actions"
                          >
                            <DotsIcon />
                          </button>

                          {actionMenuCampaignId === campaign._id ? (
                            <div
                              role="menu"
                              className="absolute right-0 top-12 z-20 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
                            >
                              <Link
                                role="menuitem"
                                className="block rounded-xl px-3 py-2 text-sm font-medium text-[#2f2b3d] hover:bg-slate-50"
                                to={`/campaigns/${campaign._id}`}
                                onClick={() => setActionMenuCampaignId(null)}
                              >
                                View
                              </Link>
                              <Link
                                role="menuitem"
                                className="block rounded-xl px-3 py-2 text-sm font-medium text-[#6d28d9] hover:bg-slate-50"
                                to={`/campaigns/${campaign._id}/edit`}
                                onClick={() => setActionMenuCampaignId(null)}
                              >
                                Edit
                              </Link>
                              {["scheduled", "paused"].includes(campaign.status) ? (
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-[#c77b08] hover:bg-slate-50"
                                  onClick={() => {
                                    setActionMenuCampaignId(null);
                                    handlePauseResume(campaign);
                                  }}
                                >
                                  {campaign.status === "paused" ? "Resume" : "Pause"}
                                </button>
                              ) : null}
                              {campaign.status !== "archived" ? (
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-[#8b84a5] hover:bg-slate-50"
                                  onClick={() => {
                                    setActionMenuCampaignId(null);
                                    handleArchive(campaign._id);
                                  }}
                                >
                                  Archive
                                </button>
                              ) : null}
                              <button
                                type="button"
                                role="menuitem"
                                className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
                                onClick={() => {
                                  setActionMenuCampaignId(null);
                                  handleDelete(campaign);
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 px-6 py-4 text-sm text-[#6e6787] md:flex-row md:items-center md:justify-between">
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-[#ddd4f2] px-4 py-2 disabled:opacity-50"
                  disabled={pagination.page <= 1}
                  onClick={() => loadCampaigns(pagination.page - 1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-[#ddd4f2] px-4 py-2 disabled:opacity-50"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadCampaigns(pagination.page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-6">
            <EmptyState
              title={
                broadcastOnly
                  ? "No broadcast campaigns yet"
                  : recurringOnly
                    ? "No recurring campaigns yet"
                    : "No campaigns match these filters"
              }
              description={
                broadcastOnly
                  ? "Create a broadcast campaign to see it here."
                  : recurringOnly
                    ? "Create a recurring campaign from the form, or switch back to all campaigns to continue."
                    : "Create a new campaign, loosen the filters, or switch to another status tab to continue."
              }
              action={
                <Link
                  to={
                    broadcastOnly
                      ? "/campaigns/new?type=broadcast"
                      : "/campaigns/new"
                  }
                  className="primary-button"
                >
                  {broadcastOnly ? "Create broadcast" : "Create campaign"}
                </Link>
              }
            />
          </div>
        )}
      </section>
    </div>
  );
}

export default CampaignsListPage;
