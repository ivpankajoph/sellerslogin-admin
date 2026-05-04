import { useContext, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import EmptyState from "../../components/ui/EmptyState.jsx";
import LoadingState from "../../components/ui/LoadingState.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import { ToastContext } from "../../context/ToastContext.jsx";
import { subscriberStatuses } from "../../data/audience.js";
import { api } from "../../lib/api.js";
import { formatCurrency } from "../../lib/formatters.js";

const formatLabel = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const formatDeviceType = (value) => {
  const deviceType = String(value || "").trim();

  if (!deviceType) {
    return "Unknown";
  }

  return formatLabel(deviceType);
};

const getEngagementTier = (score = 0) => {
  const value = Number(score || 0);

  if (value >= 80) {
    return { label: "Highly active", tone: "bg-emerald-100 text-emerald-700" };
  }

  if (value >= 55) {
    return { label: "Active", tone: "bg-sky-100 text-sky-700" };
  }

  if (value >= 30) {
    return { label: "At risk", tone: "bg-amber-100 text-amber-700" };
  }

  return { label: "Inactive", tone: "bg-rose-100 text-rose-700" };
};

function SubscriberDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useContext(ToastContext);
  const [subscriber, setSubscriber] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editStatus, setEditStatus] = useState("subscribed");
  const [editTags, setEditTags] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadSubscriber = async () => {
    setIsLoading(true);

    try {
      const { data } = await api.get(`/subscribers/${id}`);
      setSubscriber(data);
      setEditStatus(data.status || "subscribed");
      setEditTags((data.tags || []).join(", "));
      setEditNotes(data.notes || "");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriber();
  }, [id]);

  const handleDelete = async () => {
    try {
      await api.delete(`/subscribers/${id}`);
      toast.success("Subscriber deleted");
      navigate("/audience");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to delete subscriber",
      );
    }
  };

  const handleUnsubscribe = async () => {
    try {
      await api.post(`/email/subscribers/${id}/unsubscribe`);
      toast.success("Subscriber unsubscribed");
      loadSubscriber();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to unsubscribe subscriber",
      );
    }
  };

  const handleSuppress = async () => {
    try {
      await api.post(`/email/subscribers/${id}/suppress`, { reason: "manual" });
      toast.success("Subscriber suppressed");
      loadSubscriber();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to suppress subscriber",
      );
    }
  };

  const handleBlock = async () => {
    try {
      await api.post(`/email/subscribers/${id}/block`);
      toast.success("Subscriber blocked");
      loadSubscriber();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to block subscriber");
    }
  };

  const handleUnblock = async () => {
    try {
      await api.post(`/email/subscribers/${id}/unblock`);
      toast.success("Subscriber unblocked");
      loadSubscriber();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to unblock subscriber");
    }
  };

  const handleSaveMetadata = async (event) => {
    event.preventDefault();

    if (!subscriber) {
      return;
    }

    setIsSaving(true);

    try {
      await api.put(`/subscribers/${id}`, {
        ...subscriber,
        status: editStatus,
        tags: editTags,
        notes: editNotes,
      });
      toast.success("Contact metadata updated");
      loadSubscriber();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update contact");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading subscriber..." />;
  }

  if (!subscriber) {
    return (
      <div className="shell-card p-6 text-sm text-slate-500">
        Subscriber not found.
      </div>
    );
  }

  const profileFields = [
    ["Email", subscriber.email],
    ["Phone", subscriber.phone || "Not set"],
    ["Source", formatLabel(subscriber.source)],
    [
      "Location",
      [subscriber.city, subscriber.state, subscriber.country]
        .filter(Boolean)
        .join(", ") || "Not set",
    ],
    ["Total orders", subscriber.totalOrders],
    ["Total spent", formatCurrency(subscriber.totalSpent || 0)],
  ];

  const engagementFields = [
    ["Engagement score", subscriber.engagementScore || 0],
    [
      "Last activity",
      subscriber.lastActivityAt
        ? new Date(subscriber.lastActivityAt).toLocaleString()
        : "Never",
    ],
    [
      "Last order",
      subscriber.lastOrderDate
        ? new Date(subscriber.lastOrderDate).toLocaleString()
        : "Never",
    ],
    [
      "Last email sent",
      subscriber.lastEmailSentAt
        ? new Date(subscriber.lastEmailSentAt).toLocaleString()
        : "Never",
    ],
    [
      "Last open",
      subscriber.lastOpenAt
        ? new Date(subscriber.lastOpenAt).toLocaleString()
        : "Never",
    ],
    [
      "Last open device",
      subscriber.engagementDevices?.lastOpen
        ? formatDeviceType(subscriber.engagementDevices.lastOpen.deviceType)
        : "Never",
    ],
    [
      "Last click",
      subscriber.lastClickAt
        ? new Date(subscriber.lastClickAt).toLocaleString()
        : "Never",
    ],
    [
      "Last click device",
      subscriber.engagementDevices?.lastClick
        ? formatDeviceType(subscriber.engagementDevices.lastClick.deviceType)
        : "Never",
    ],
  ];
  const engagementTier = getEngagementTier(subscriber.engagementScore || 0);

  return (
    <div className="space-y-6">
      <section className="shell-card-strong p-6 md:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={subscriber.status} />
              {subscriber.status === "blocked" ? (
                <span className="soft-pill">
                  {subscriber.blockedReason === "spam"
                    ? "Spam blocked"
                    : "Manually blocked"}
                </span>
              ) : null}
              {subscriber.suppressionStatus?.isSuppressed ? (
                <span className="soft-pill">
                  Suppressed: {subscriber.suppressionStatus.reason}
                </span>
              ) : null}
            </div>
            <PageHeader
              eyebrow="Subscriber profile"
              title={`${subscriber.firstName} ${subscriber.lastName}`}
              description="CRM-style subscriber detail with engagement context, send history, and suppression visibility."
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to={`/audience/${subscriber._id}/edit`}
              className="rounded-xl border border-[#ddd4f2] px-4 py-3 text-sm font-medium text-[#5f5878]"
            >
              Edit
            </Link>
            {subscriber.status === "blocked" ? (
              <button
                type="button"
                onClick={
                  subscriber.blockedReason === "spam" ? undefined : handleUnblock
                }
                disabled={subscriber.blockedReason === "spam"}
                className="rounded-xl border border-rose-200 px-4 py-3 text-sm font-medium text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {subscriber.blockedReason === "spam" ? "Spam blocked" : "Unblock"}
              </button>
            ) : (
              <>
                {subscriber.status === "subscribed" ? (
                  <button
                    type="button"
                    onClick={handleUnsubscribe}
                    className="rounded-xl border border-amber-200 px-4 py-3 text-sm font-medium text-amber-700"
                  >
                    Unsubscribe
                  </button>
                ) : null}
                {subscriber.status !== "suppressed" ? (
                  <button
                    type="button"
                    onClick={handleSuppress}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600"
                  >
                    Suppress
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleBlock}
                  className="rounded-xl border border-rose-200 px-4 py-3 text-sm font-medium text-rose-700"
                >
                  Block
                </button>
              </>
            )}
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

      <section className="shell-card-strong p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-[#2f2b3d]">Quick edit</h3>
            <p className="mt-1 text-sm text-[#6e6787]">
              Update status, tags, and notes without opening the full edit form.
            </p>
          </div>
          <span className="soft-pill">Contact management</span>
        </div>
        <form
          className="mt-5 grid gap-4 xl:grid-cols-[180px_minmax(0,1fr)]"
          onSubmit={handleSaveMetadata}
        >
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[#2f2b3d]">Status</span>
            <select
              className="field"
              value={editStatus}
              onChange={(event) => setEditStatus(event.target.value)}
              disabled={subscriber.status === "blocked" && subscriber.blockedReason === "spam"}
            >
              {subscriberStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatLabel(status)}
                </option>
              ))}
            </select>
            {subscriber.status === "blocked" && subscriber.blockedReason === "spam" ? (
              <p className="text-xs text-[#9a94b2]">
                Spam-blocked contacts are locked and cannot be manually unblocked here.
              </p>
            ) : null}
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[#2f2b3d]">Tags</span>
            <input
              className="field"
              value={editTags}
              onChange={(event) => setEditTags(event.target.value)}
              placeholder="VIP, newsletter, repeat-buyer"
            />
          </label>
          <label className="block space-y-2 xl:col-span-2">
            <span className="text-sm font-semibold text-[#2f2b3d]">Notes</span>
            <textarea
              className="field min-h-[120px] resize-y"
              value={editNotes}
              onChange={(event) => setEditNotes(event.target.value)}
              placeholder="Add internal context or follow-up reminders"
            />
          </label>
          <div className="xl:col-span-2 flex justify-end">
            <button
              type="submit"
              className="primary-button"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save contact changes"}
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="shell-card-strong p-6">
          <div className="mb-6 flex flex-wrap gap-2">
            {(subscriber.tags || []).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[#f1eaff] px-3 py-1 text-xs font-medium text-[#6d28d9]"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {profileFields.map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[#faf7ff] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a94b2]">
                  {label}
                </p>
                <p className="mt-2 text-sm text-[#4f4865]">{value}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="shell-card-strong p-6">
          <h3 className="text-xl font-semibold text-[#2f2b3d]">
            Engagement summary
          </h3>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${engagementTier.tone}`}>
              {engagementTier.label}
            </span>
            <span className="soft-pill">
              Score is based on opens, clicks, orders, spend, and recency.
            </span>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {engagementFields.map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[#faf7ff] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a94b2]">
                  {label}
                </p>
                <p className="mt-2 text-sm text-[#4f4865]">{value}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <article className="shell-card-strong overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-5">
            <h3 className="text-xl font-semibold text-[#2f2b3d]">
              Campaign history
            </h3>
          </div>
          {subscriber.campaignHistory?.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#faf7ff] text-[#7a7296]">
                  <tr>
                    <th className="px-6 py-4 font-medium">Campaign</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Sent</th>
                    <th className="px-6 py-4 font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriber.campaignHistory.map((item) => (
                    <tr key={item._id} className="border-t border-slate-100">
                      <td className="px-6 py-4 text-[#2f2b3d]">
                        {item.campaignId?.name || "Unknown campaign"}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-6 py-4 text-[#6e6787]">
                        {item.sentAt
                          ? new Date(item.sentAt).toLocaleString()
                          : "Not sent"}
                      </td>
                      <td className="px-6 py-4 text-[#6e6787]">
                        {formatCurrency(item.revenueAttributed || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No campaign history"
                description="Campaign recipient history will appear once this contact is targeted by sends."
              />
            </div>
          )}
        </article>

        <article className="shell-card-strong overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-5">
            <h3 className="text-xl font-semibold text-[#2f2b3d]">
              Activity timeline
            </h3>
            <p className="mt-1 text-sm text-[#6e6787]">
              Open, click, bounce, and complaint events in one place.
            </p>
          </div>
          {subscriber.recentEmailEvents?.length ? (
            <div className="space-y-4 p-6">
              {subscriber.recentEmailEvents.map((event) => (
                <div key={event._id} className="rounded-2xl bg-[#faf7ff] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold capitalize text-[#2f2b3d]">
                      {event.eventType}
                    </p>
                    <p className="text-xs text-[#8b84a5]">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-[#6e6787]">
                    {event.clickedLink ||
                      event.bounceType ||
                      event.complaintFeedbackType ||
                      event.deviceType ||
                      "No extra detail"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No recent email events"
                description="Open, click, bounce, and complaint activity will show up here over time."
              />
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="shell-card-strong p-6">
          <h3 className="text-xl font-semibold text-[#2f2b3d]">Notes</h3>
          <div className="mt-4 rounded-2xl bg-[#faf7ff] p-4 text-sm text-[#5f5878]">
            {subscriber.notes || "No notes recorded yet."}
          </div>
        </article>

        <article className="shell-card-strong p-6">
          <h3 className="text-xl font-semibold text-[#2f2b3d]">
            Record metadata
          </h3>
          <div className="mt-4 space-y-4 text-sm text-[#5f5878]">
            <p>Created: {new Date(subscriber.createdAt).toLocaleString()}</p>
            <p>Updated: {new Date(subscriber.updatedAt).toLocaleString()}</p>
            <p>
              Suppression:{" "}
              {subscriber.suppressionStatus?.isSuppressed
                ? `${subscriber.suppressionStatus.reason} via ${subscriber.suppressionStatus.source}`
                : "Active"}
            </p>
            {subscriber.status === "blocked" ? (
              <p>Blocked reason: {subscriber.blockedReason || "manual"}</p>
            ) : null}
            <Link
              to="/audience"
              className="inline-flex font-semibold text-[#2f2b3d]"
            >
              Back to audience
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}

export default SubscriberDetailsPage;
