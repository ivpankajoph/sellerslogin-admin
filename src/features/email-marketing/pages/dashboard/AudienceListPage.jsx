import { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../../components/ui/EmptyState.jsx";
import LoadingState from "../../components/ui/LoadingState.jsx";
import Modal from "../../components/ui/Modal.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import { ToastContext } from "../../context/ToastContext.jsx";
import { api } from "../../lib/api.js";
import { formatCurrency } from "../../lib/formatters.js";

const initialFilters = {
  search: "",
  status: "",
  source: "",
  tags: "",
};

const quickFilterHelp = {
  Active:
    "These contacts are currently open to receiving emails and have been engaging normally. They are the best audience for sending emails.",
  "At risk":
    "These contacts have not been opening or clicking your emails much lately. They may still receive emails, but they are less active and could stop engaging soon.",
  Suppressed:
    "These contacts are blocked from receiving emails. They are usually removed from sends because of rules, complaints, or other account protections.",
  Unsubscribed:
    "These people chose to stop receiving your emails. They should not be included in regular email sends.",
  Bounced:
    "These are contacts whose emails could not be delivered. This usually happens when the email address is invalid or not accepting messages.",
  Blocked:
    "These contacts were blocked after a spam complaint or a manual review. They are excluded from sends, and spam-blocked contacts stay locked.",
};

const formatLabel = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatSourceLocation = (subscriber) => {
  const customSourceLocations = Array.isArray(subscriber?.customFields?.sourceLocations)
    ? subscriber.customFields.sourceLocations
    : [];
  const sourceLocations = [
    subscriber?.sourceLocation,
    subscriber?.customFields?.audienceSourceLocation,
    ...customSourceLocations,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  if (!sourceLocations.length) {
    return formatLabel(subscriber?.source || "manual");
  }

  const uniqueLocations = Array.from(new Set(sourceLocations));

  return uniqueLocations
    .map((location) =>
      location === "main_website"
        ? "Main website"
        : location === "vendor_website"
          ? "Vendor website"
          : location === "admin"
            ? "Admin"
            : location === "manual"
              ? "Manual"
              : formatLabel(location),
    )
    .join(" • ");
};

const getSubscriberWebsiteLabel = (subscriber = {}) => {
  const fields = subscriber.customFields || {};
  return (
    fields.audienceSourceWebsiteName ||
    fields.audienceSourceWebsiteSlug ||
    fields.audienceSourceWebsiteId ||
    ""
  );
};

const parseCsvPreview = (content = "") => {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return {
      headers: [],
      rows: [],
      duplicates: [],
      invalidRows: [],
      validCount: 0,
    };
  }

  const headers = lines[0].split(",").map((value) => value.trim());
  const rows = [];
  const duplicates = new Set();
  const seenEmails = new Set();
  const invalidRows = [];

  const isEmailOnlyHeader =
    headers.length === 1 && headers[0].toLowerCase() === "email";
  const isSingleColumnEmailList =
    headers.length === 1 && lines[0].includes("@") && lines.length >= 1;

  if (isSingleColumnEmailList) {
    lines.forEach((line, index) => {
      const email = line.trim().toLowerCase();
      const isDuplicate = email && seenEmails.has(email);

      if (email) {
        seenEmails.add(email);
      }

      if (isDuplicate) {
        duplicates.add(email);
      }

      if (!email) {
        invalidRows.push(index + 1);
      }

      rows.push({
        rowNumber: index + 1,
        email,
        isDuplicate,
        isValid: Boolean(email),
      });
    });

    return {
      headers: ["email"],
      rows,
      duplicates: Array.from(duplicates),
      invalidRows,
      validCount: rows.filter((row) => row.isValid).length,
    };
  }

  if (isEmailOnlyHeader) {
    lines.slice(1).forEach((line, index) => {
      const email = line.split(",")[0].trim().toLowerCase();
      const isDuplicate = email && seenEmails.has(email);

      if (email) {
        seenEmails.add(email);
      }

      if (isDuplicate) {
        duplicates.add(email);
      }

      if (!email) {
        invalidRows.push(index + 2);
      }

      rows.push({
        rowNumber: index + 2,
        email,
        isDuplicate,
        isValid: Boolean(email),
      });
    });

    return {
      headers: ["email"],
      rows,
      duplicates: Array.from(duplicates),
      invalidRows,
      validCount: rows.filter((row) => row.isValid).length,
    };
  }

  lines.slice(1).forEach((line, index) => {
    const values = line.split(",").map((value) => value.trim());
    const row = headers.reduce((accumulator, header, headerIndex) => {
      accumulator[header] = values[headerIndex] || "";
      return accumulator;
    }, {});

    const email = String(row.email || "")
      .trim()
      .toLowerCase();
    const hasRequiredFields = Boolean(email);
    const isDuplicate = email && seenEmails.has(email);

    if (email) {
      seenEmails.add(email);
    }

    if (isDuplicate) {
      duplicates.add(email);
    }

    if (!hasRequiredFields) {
      invalidRows.push(index + 2);
    }

    rows.push({
      rowNumber: index + 2,
      email: row.email || "",
      firstName: row.firstName || "",
      lastName: row.lastName || "",
      source: row.source || "",
      isDuplicate,
      isValid: hasRequiredFields,
    });
  });

  return {
    headers,
    rows,
    duplicates: Array.from(duplicates),
    invalidRows,
    validCount: rows.filter((row) => row.isValid).length,
  };
};

const exportSubscribersToCsv = (subscribers) => {
  const headers = [
    "firstName",
    "lastName",
    "email",
    "status",
    "source",
    "tags",
    "city",
    "state",
    "country",
    "totalOrders",
    "totalSpent",
    "engagementScore",
  ];

  const rows = subscribers.map((subscriber) =>
    headers
      .map((header) => {
        const value =
          header === "tags"
            ? (subscriber.tags || []).join("|")
            : subscriber[header];
        return `"${String(value ?? "").replaceAll('"', '""')}"`;
      })
      .join(","),
  );

  const blob = new Blob([`${headers.join(",")}\n${rows.join("\n")}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "selected-subscribers.csv";
  anchor.click();
  URL.revokeObjectURL(url);
};

function AudienceListPage() {
  const toast = useContext(ToastContext);
  const [filters, setFilters] = useState(initialFilters);
  const [subscribers, setSubscribers] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    activeCount: 0,
    riskCount: 0,
    averageEngagementScore: 0,
    totalOrders: 0,
    totalSpent: 0,
    byStatus: {},
    bySource: [],
    websites: [],
  });
  const [websites, setWebsites] = useState([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkTags, setBulkTags] = useState("");
  const [csvContent, setCsvContent] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [csvPreview, setCsvPreview] = useState({
    headers: [],
    rows: [],
    duplicates: [],
    invalidRows: [],
    validCount: 0,
  });
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [openActionMenuId, setOpenActionMenuId] = useState(null);

  const selectedCount = selectedIds.length;

  const loadSubscribers = async (
    page = 1,
    nextFilters = filters,
    nextWebsiteId = selectedWebsiteId,
  ) => {
    setIsLoading(true);
    const website = websites.find((item) => item.id === nextWebsiteId);
    const websiteParams = website
      ? {
          websiteId: website.websiteId || undefined,
          websiteSlug: website.websiteId ? undefined : website.websiteSlug || undefined,
          websiteName:
            website.websiteId || website.websiteSlug
              ? undefined
              : website.websiteName || undefined,
        }
      : {};

    try {
      const [listResult, summaryResult] = await Promise.allSettled([
        api.get("/subscribers", {
          params: {
            page,
            limit: 12,
            search: nextFilters.search || undefined,
            status: nextFilters.status || undefined,
            source: nextFilters.source || undefined,
            tags: nextFilters.tags || undefined,
            ...websiteParams,
          },
        }),
        api.get("/subscribers/summary", {
          params: {
            ...websiteParams,
          },
        }),
      ]);

      if (listResult.status === "fulfilled") {
        setSubscribers(listResult.value.data.data);
        setPagination(listResult.value.data.pagination);
      } else {
        toast.error(
          listResult.reason?.response?.data?.message ||
            "Unable to load subscribers",
        );
      }

      if (summaryResult.status === "fulfilled") {
        setSummary(summaryResult.value.data);
        setWebsites(summaryResult.value.data.websites || []);
      } else {
        console.warn("Subscriber summary failed to load", summaryResult.reason);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to load subscribers",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubscribers(1);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!event.target?.closest?.("[data-action-menu]")) {
        setOpenActionMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const selectedSubscribers = useMemo(
    () =>
      subscribers.filter((subscriber) => selectedIds.includes(subscriber._id)),
    [selectedIds, subscribers],
  );

  const selectedWebsite = useMemo(
    () => websites.find((website) => website.id === selectedWebsiteId),
    [selectedWebsiteId, websites],
  );

  useEffect(() => {
    if (!isImportOpen) {
      return;
    }

    setCsvPreview(parseCsvPreview(csvContent));
    setIsPreviewExpanded(false);
  }, [csvContent, isImportOpen]);

  const handleCsvFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      setCsvFileName(file.name);
      setCsvContent(content);
    } catch {
      toast.error("Unable to read the selected file");
    }
  };

  const handleStatusUpdate = async (subscriberId, status) => {
    try {
      const subscriber = subscribers.find((item) => item._id === subscriberId);
      if (!subscriber) return;

      await api.put(`/subscribers/${subscriberId}`, {
        ...subscriber,
        status,
      });

      toast.success(
        `Subscriber marked as ${formatLabel(status).toLowerCase()}`,
      );
      loadSubscribers(pagination.page, filters, selectedWebsiteId);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to update subscriber status",
      );
    }
  };

  const handleSuppressSubscriber = async (subscriberId) => {
    try {
      await api.post(`/email/subscribers/${subscriberId}/suppress`, {
        reason: "manual",
      });
      toast.success("Subscriber suppressed");
      loadSubscribers(pagination.page, filters, selectedWebsiteId);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to suppress subscriber",
      );
    }
  };

  const handleBlockSubscriber = async (subscriberId) => {
    try {
      await api.post(`/email/subscribers/${subscriberId}/block`);
      toast.success("Subscriber blocked");
      loadSubscribers(pagination.page, filters, selectedWebsiteId);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to block subscriber");
    }
  };

  const handleUnblockSubscriber = async (subscriberId) => {
    try {
      await api.post(`/email/subscribers/${subscriberId}/unblock`);
      toast.success("Subscriber unblocked");
      loadSubscribers(pagination.page, filters, selectedWebsiteId);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to unblock subscriber");
    }
  };

  const handleDeleteSubscriber = async (subscriberId) => {
    const confirmed = window.confirm(
      "Delete this subscriber permanently from audience?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/subscribers/${subscriberId}`);
      toast.success("Subscriber deleted");
      setSelectedIds((current) => current.filter((id) => id !== subscriberId));
      loadSubscribers(pagination.page, filters, selectedWebsiteId);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete subscriber");
    }
  };

  const closeActionMenu = () => setOpenActionMenuId(null);

  const applyQuickFilter = (nextFilters) => {
    setFilters(nextFilters);
    setSelectedIds([]);
    loadSubscribers(1, nextFilters, selectedWebsiteId);
  };

  const handleWebsiteChange = (event) => {
    const websiteId = event.target.value;
    setSelectedWebsiteId(websiteId);
    setSelectedIds([]);
    loadSubscribers(1, filters, websiteId);
  };

  const handleSyncSellersLoginAudience = async () => {
    setIsLoading(true);

    try {
      const { data } = await api.post("/subscribers/sync/sellerslogin", {
        websiteId: selectedWebsite?.websiteId || undefined,
      });
      const result = data.result || {};

      if (result.skipped) {
        toast.error(result.error || "Unable to sync SellersLogin customers");
      } else {
        const details = [
          result.sourceCount && result.sourceCount !== result.total
            ? `${result.sourceCount} source records`
            : "",
          result.duplicateEmailRows
            ? `${result.duplicateEmailRows} duplicate email records merged`
            : "",
          result.skippedWithoutEmail
            ? `${result.skippedWithoutEmail} without email skipped`
            : "",
        ]
          .filter(Boolean)
          .join(", ");

        toast.success(
          `Synced ${result.total || 0} SellersLogin contacts${details ? ` (${details})` : ""}`,
        );
      }

      await loadSubscribers(1, filters, selectedWebsiteId);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to sync SellersLogin customers",
      );
      setIsLoading(false);
    }
  };

  const toggleSelection = (subscriberId) => {
    setSelectedIds((current) =>
      current.includes(subscriberId)
        ? current.filter((id) => id !== subscriberId)
        : [...current, subscriberId],
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = subscribers.map((subscriber) => subscriber._id);

    if (visibleIds.every((id) => selectedIds.includes(id))) {
      setSelectedIds((current) =>
        current.filter((id) => !visibleIds.includes(id)),
      );
      return;
    }

    setSelectedIds((current) =>
      Array.from(new Set([...current, ...visibleIds])),
    );
  };

  const runBulkAction = async (action) => {
    if (!selectedIds.length) {
      toast.error("Select at least one subscriber");
      return;
    }

    try {
      if (action === "tags") {
        await api.post("/subscribers/bulk/tags", {
          subscriberIds: selectedIds,
          tags: bulkTags,
        });
        setBulkTags("");
        toast.success("Bulk tags applied");
      }

      if (action === "unsubscribe") {
        await api.post("/subscribers/bulk/unsubscribe", {
          subscriberIds: selectedIds,
        });
        toast.success("Subscribers unsubscribed");
      }

      if (action === "suppress") {
        await api.post("/subscribers/bulk/suppress", {
          subscriberIds: selectedIds,
        });
        toast.success("Subscribers suppressed");
      }

      if (action === "reactivate") {
        await api.post("/subscribers/bulk/reactivate", {
          subscriberIds: selectedIds,
        });
        toast.success("Subscribers reactivated");
      }

      setSelectedIds([]);
      loadSubscribers(pagination.page, filters, selectedWebsiteId);
    } catch (error) {
      toast.error(error.response?.data?.message || "Bulk action failed");
    }
  };

  const handleExportSelected = () => {
    if (!selectedSubscribers.length) {
      toast.error("Select at least one subscriber");
      return;
    }

    exportSubscribersToCsv(selectedSubscribers);
    toast.success("Selected subscribers exported");
  };

  const handleImportCsv = async (event) => {
    event.preventDefault();

    try {
      const { data } = await api.post("/subscribers/import/csv", {
        csvContent,
      });
      toast.success(
        `${data.importedCount} imported, ${data.updatedCount} updated`,
      );
      setIsImportOpen(false);
      setCsvContent("");
      setCsvFileName("");
      setCsvPreview({
        headers: [],
        rows: [],
        duplicates: [],
        invalidRows: [],
        validCount: 0,
      });
      setIsPreviewExpanded(false);
      loadSubscribers(1, filters, selectedWebsiteId);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to import CSV");
    }
  };

  return (
    <div className="space-y-6">
      <section className="shell-card-strong p-6 md:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-3">
            <PageHeader
              eyebrow="Audience"
              title="Contacts"
              description="Manage contacts, imports, status changes, and engagement context from one CRM-style workspace."
            />
            <div className="flex flex-wrap gap-2">
              <span className="soft-pill">
                {summary.total || pagination.total} contacts
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="min-w-[220px]">
              <span className="sr-only">Website</span>
              <select
                className="h-11 min-w-[220px] rounded-xl border border-[#ddd4f2] bg-white px-4 text-sm font-semibold text-[#5f5878] outline-none transition hover:bg-[#f8f5ff] focus:border-[#7c3aed] focus:ring-2 focus:ring-[#ede7ff]"
                value={selectedWebsiteId}
                onChange={handleWebsiteChange}
                aria-label="Filter audience by website"
              >
                <option value="">All websites</option>
                {websites.map((website) => (
                  <option key={website.id} value={website.id}>
                    {website.label} ({website.count})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="secondary-button shrink-0 whitespace-nowrap"
            >
              Import CSV
            </button>
            <Link
              to="/audience/new"
              className="primary-button shrink-0 whitespace-nowrap"
            >
              Add subscriber
            </Link>
          </div>
        </div>
        {selectedWebsite ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="soft-pill">
              Showing {selectedWebsite.label}
            </span>
            {selectedWebsite.websiteSlug ? (
              <span className="soft-pill">{selectedWebsite.websiteSlug}</span>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total contacts", summary.total || pagination.total],
          ["Active contacts", summary.activeCount],
          ["At-risk contacts", summary.riskCount],
          ["Avg engagement", summary.averageEngagementScore],
        ].map(([label, value]) => (
          <article
            key={label}
            className="metric-card bg-gradient-to-br from-white to-[#faf7ff]"
          >
            <div className="p-4">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#7a7296]">
                {label}
              </p>
              <p className="mt-2 text-xl font-semibold tracking-tight text-[#2f2b3d]">
                {value}
              </p>
            </div>
          </article>
        ))}
      </section>

      <section className="shell-card-strong p-5 md:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#2f2b3d]">
              Quick filters
            </h3>
         
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-xl border border-[#ddd4f2] px-4 py-2 text-sm font-medium text-[#5f5878]"
              onClick={() => applyQuickFilter(initialFilters)}
            >
              Clear filters
            </button>
            <button
              type="button"
              className="rounded-xl border border-[#ddd4f2] px-4 py-2 text-sm font-medium text-[#5f5878]"
                onClick={handleSyncSellersLoginAudience}
              >
                Sync audience
              </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { label: "Active", status: "subscribed", tone: "emerald" },
            {
              label: "At risk",
              status: "unsubscribed,bounced,blocked,complained,suppressed",
              tone: "amber",
            },
            { label: "Suppressed", status: "suppressed", tone: "slate" },
            { label: "Unsubscribed", status: "unsubscribed", tone: "orange" },
            { label: "Bounced", status: "bounced", tone: "rose" },
            { label: "Blocked", status: "blocked", tone: "rose" },
          ].map((filter, index) => (
            <div key={filter.label} className="group relative z-20">
              <button
                type="button"
                className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                  filter.tone === "emerald"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : filter.tone === "amber"
                      ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                      : filter.tone === "slate"
                        ? "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        : filter.tone === "orange"
                          ? "border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                          : "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                }`}
                onClick={() =>
                  applyQuickFilter({
                    ...initialFilters,
                    status: filter.status || "",
                    tags: filter.tags || "",
                  })
                }
                aria-describedby={`quick-filter-help-${filter.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {filter.label}
              </button>
              <div
                id={`quick-filter-help-${filter.label.toLowerCase().replace(/\s+/g, "-")}`}
                role="tooltip"
                className={`pointer-events-none absolute bottom-full z-30 mb-3 w-[280px] rounded-2xl border border-[#e7def8] bg-white p-4 text-left text-sm text-[#5f5878] opacity-0 shadow-[0_18px_50px_rgba(43,29,75,0.14)] transition duration-200 group-hover:-translate-y-0 group-hover:opacity-100 group-focus-within:opacity-100 ${
                  index === 0 ? "left-0 translate-x-0" : "left-1/2 -translate-x-1/2"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a7296]">
                  {filter.label}
                </p>
                <p className="mt-2 leading-6">
                  {quickFilterHelp[filter.label] || ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {selectedCount ? (
        <section className="shell-card-strong p-5 md:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              <span className="soft-pill">{selectedCount} selected</span>
              {selectedSubscribers.slice(0, 3).map((subscriber) => (
                <span key={subscriber._id} className="soft-pill">
                  {subscriber.firstName} {subscriber.lastName}
                </span>
              ))}
            </div>
            <div className="flex flex-col gap-3 md:flex-row">
              <input
                className="field md:w-[240px]"
                placeholder="Add tags to selection"
                value={bulkTags}
                onChange={(event) => setBulkTags(event.target.value)}
              />
              <button
                type="button"
                className="rounded-xl border border-[#ddd4f2] px-4 py-3 text-sm font-semibold text-[#5f5878]"
                onClick={() => runBulkAction("tags")}
              >
                Assign tags
              </button>
              <button
                type="button"
                className="rounded-xl border border-amber-200 px-4 py-3 text-sm font-semibold text-amber-700"
                onClick={() => runBulkAction("unsubscribe")}
              >
                Bulk unsubscribe
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
                onClick={() => runBulkAction("suppress")}
              >
                Bulk suppress
              </button>
              <button
                type="button"
                className="rounded-xl border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-700"
                onClick={() => runBulkAction("reactivate")}
              >
                Bulk reactivate
              </button>
              <button
                type="button"
                className="rounded-xl border border-[#ddd4f2] px-4 py-3 text-sm font-semibold text-[#5f5878]"
                onClick={handleExportSelected}
              >
                Export selected
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="shell-card-strong relative overflow-visible">
        {isLoading ? (
          <LoadingState message="Loading CRM records..." />
        ) : subscribers.length ? (
          <>
            <div className="overflow-x-auto overflow-y-visible">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-[#faf7ff] text-[#7a7296]">
                  <tr>
                    <th className="px-6 py-4 font-medium">
                      <input
                        type="checkbox"
                        checked={
                          subscribers.length > 0 &&
                          subscribers.every((subscriber) =>
                            selectedIds.includes(subscriber._id),
                          )
                        }
                        onChange={toggleSelectAllVisible}
                      />
                    </th>
                    <th className="px-6 py-4 font-medium">Subscriber</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Source / location</th>
                    <th className="px-6 py-4 font-medium">Value</th>
                    <th className="px-6 py-4 font-medium">Engagement</th>
                    <th className="px-6 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((subscriber) => (
                    <tr
                      key={subscriber._id}
                      className="border-b border-slate-100 align-top"
                    >
                      <td className="px-6 py-5">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(subscriber._id)}
                          onChange={() => toggleSelection(subscriber._id)}
                        />
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-semibold text-[#2f2b3d]">
                          {subscriber.firstName} {subscriber.lastName}
                        </div>
                        <div className="mt-1 text-[#6e6787]">
                          {subscriber.email}
                        </div>
                        {subscriber.notes ? (
                          <div className="mt-2 max-w-[320px] text-xs leading-5 text-[#9a94b2]">
                            {subscriber.notes}
                          </div>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(subscriber.tags || []).slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-[#f1eaff] px-3 py-1 text-xs font-medium text-[#6d28d9]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge status={subscriber.status} />
                      </td>
                      <td className="px-6 py-5 text-[#5f5878]">
                        {getSubscriberWebsiteLabel(subscriber) ? (
                          <p className="mb-2 text-sm font-semibold text-[#2f2b3d]">
                            {getSubscriberWebsiteLabel(subscriber)}
                          </p>
                        ) : null}
                        <p>{formatSourceLocation(subscriber)}</p>
                        <p className="mt-2 text-xs text-[#9a94b2]">
                          {formatLabel(subscriber.source) || "No source"}
                        </p>
                        <p className="mt-2 text-xs text-[#9a94b2]">
                          {[
                            subscriber.city,
                            subscriber.state,
                            subscriber.country,
                          ]
                            .filter(Boolean)
                            .join(", ") || "No location"}
                        </p>
                      </td>
                      <td className="px-6 py-5 text-[#5f5878]">
                        <p>{subscriber.totalOrders} orders</p>
                        <p className="mt-2 text-xs text-[#9a94b2]">
                          {formatCurrency(subscriber.totalSpent || 0)} total
                          spent
                        </p>
                      </td>
                      <td className="px-6 py-5 text-[#5f5878]">
                        <p>Score {subscriber.engagementScore || 0}</p>
                        <p className="mt-2 text-xs text-[#9a94b2]">
                          Last activity{" "}
                          {subscriber.lastActivityAt
                            ? new Date(
                                subscriber.lastActivityAt,
                              ).toLocaleDateString()
                            : "not recorded"}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <div
                          className="relative flex justify-end"
                          data-action-menu={subscriber._id}
                          onMouseEnter={() => setOpenActionMenuId(subscriber._id)}
                        >
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#ddd4f2] bg-white text-[#5f5878] transition hover:bg-[#f4f0ff] hover:text-[#2f2b3d]"
                            aria-haspopup="menu"
                            aria-expanded={openActionMenuId === subscriber._id}
                            aria-label={`Open actions for ${subscriber.firstName} ${subscriber.lastName}`}
                            onClick={() =>
                              setOpenActionMenuId((current) =>
                                current === subscriber._id ? null : subscriber._id,
                              )
                            }
                          >
                            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                              <circle cx="12" cy="5" r="1.7" />
                              <circle cx="12" cy="12" r="1.7" />
                              <circle cx="12" cy="19" r="1.7" />
                            </svg>
                          </button>

                          {openActionMenuId === subscriber._id ? (
                            <div
                              role="menu"
                              className="absolute right-[calc(100%+10px)] top-1/2 z-50 min-w-[260px] -translate-y-1/2 overflow-hidden rounded-2xl border border-[#e7def8] bg-white p-1 shadow-[0_18px_42px_rgba(43,29,75,0.14)]"
                            >
                              <div className="grid grid-cols-2 gap-1">
                                <Link
                                  role="menuitem"
                                  className="flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium text-[#2f2b3d] transition hover:bg-[#f4f0ff]"
                                  to={`/audience/${subscriber._id}`}
                                  onClick={closeActionMenu}
                                >
                                  View
                                </Link>
                                <Link
                                  role="menuitem"
                                  className="flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium text-[#6d28d9] transition hover:bg-[#f4f0ff]"
                                  to={`/audience/${subscriber._id}/edit`}
                                  onClick={closeActionMenu}
                                >
                                  Edit
                                </Link>
                                {subscriber.status === "blocked" ? (
                                  subscriber.blockedReason === "spam" ? (
                                    <span className="flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium text-rose-500">
                                      Blocked by spam
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      role="menuitem"
                                      className="flex min-h-11 w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-700 transition hover:bg-[#f4f0ff]"
                                      onClick={() => {
                                        closeActionMenu();
                                        handleUnblockSubscriber(subscriber._id);
                                      }}
                                    >
                                      Unblock
                                    </button>
                                  )
                                ) : subscriber.status !== "subscribed" ? (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="flex min-h-11 w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-emerald-600 transition hover:bg-[#f4f0ff]"
                                    onClick={() => {
                                      closeActionMenu();
                                      handleStatusUpdate(subscriber._id, "subscribed");
                                    }}
                                  >
                                    Reactivate
                                  </button>
                                ) : null}
                                {subscriber.status === "blocked" ? null : (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="flex min-h-11 w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-700 transition hover:bg-[#f4f0ff]"
                                    onClick={() => {
                                      closeActionMenu();
                                      handleBlockSubscriber(subscriber._id);
                                    }}
                                  >
                                    Block
                                  </button>
                                )}
                                {subscriber.status === "blocked" ? null : subscriber.status !== "unsubscribed" ? (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="flex min-h-11 w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-amber-700 transition hover:bg-[#f4f0ff]"
                                    onClick={() => {
                                      closeActionMenu();
                                      handleStatusUpdate(
                                        subscriber._id,
                                        "unsubscribed",
                                      );
                                    }}
                                  >
                                    Unsubscribe
                                  </button>
                                ) : null}
                                {subscriber.status === "blocked" ? null : subscriber.status !== "suppressed" ? (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="flex min-h-11 w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-[#f4f0ff]"
                                    onClick={() => {
                                      closeActionMenu();
                                      handleSuppressSubscriber(subscriber._id);
                                    }}
                                  >
                                    Suppress
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="flex min-h-11 w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-red-700 transition hover:bg-red-50"
                                  onClick={() => {
                                    closeActionMenu();
                                    handleDeleteSubscriber(subscriber._id);
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-6 py-4 text-sm text-[#6e6787]">
              <span>{pagination.total} subscribers</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-[#ddd4f2] px-4 py-2 disabled:opacity-50"
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    loadSubscribers(pagination.page - 1, filters, selectedWebsiteId)
                  }
                >
                  Previous
                </button>
                <span>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  type="button"
                  className="rounded-xl border border-[#ddd4f2] px-4 py-2 disabled:opacity-50"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    loadSubscribers(pagination.page + 1, filters, selectedWebsiteId)
                  }
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-6">
            <EmptyState
              title="No subscribers found"
              description="Import a CSV, add a subscriber manually, or loosen your filters to start building the audience CRM."
              action={
                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsImportOpen(true)}
                    className="rounded-xl border border-[#ddd4f2] px-4 py-3 text-sm font-medium text-[#5f5878]"
                  >
                    Import CSV
                  </button>
                  <Link to="/audience/new" className="primary-button">
                    Add subscriber
                  </Link>
                </div>
              }
            />
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <article className="shell-card-strong p-5 md:p-6">
          <h3 className="text-lg font-semibold text-[#2f2b3d]">Top sources</h3>
          <div className="mt-5 space-y-3">
            {summary.bySource.length ? (
              summary.bySource.map((item) => (
                  <div
                  key={item.source}
                  className="flex items-center justify-between rounded-2xl bg-[#faf7ff] p-4"
                >
                  <p className="text-sm font-medium text-[#2f2b3d]">
                    {formatSourceLocation({ sourceLocation: item.source })}
                  </p>
                  <span className="soft-pill">{item.count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-[#6e6787]">
                Source breakdown will appear once contacts are loaded.
              </p>
            )}
          </div>
        </article>

        <article className="shell-card-strong p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#2f2b3d]">
                Audience health
              </h3>
              <p className="mt-1 text-sm text-[#6e6787]">
                Top contact counts and list quality signals.
              </p>
            </div>
            <span className="soft-pill">{summary.totalOrders || 0} orders</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ["Subscribed", summary.byStatus?.subscribed || 0],
              ["Unsubscribed", summary.byStatus?.unsubscribed || 0],
              ["Bounced", summary.byStatus?.bounced || 0],
              ["Blocked", summary.byStatus?.blocked || 0],
              ["Complained", summary.byStatus?.complained || 0],
              ["Suppressed", summary.byStatus?.suppressed || 0],
              ["Revenue", formatCurrency(summary.totalSpent)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[#faf7ff] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a94b2]">
                  {label}
                </p>
                <p className="mt-2 text-sm font-semibold text-[#2f2b3d]">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      {isImportOpen ? (
        <Modal
          title="Import subscribers from CSV"
          description="Paste a simple CSV with headers like firstName,lastName,email,source,tags,totalOrders,totalSpent."
          className="!w-[min(96vw,88rem)] !max-w-[88rem] h-[min(90vh,800px)]"
          bodyClassName="max-h-[80vh] overflow-hidden"
          onClose={() => {
            setIsImportOpen(false);
            setCsvContent("");
            setCsvFileName("");
            setCsvPreview({
              headers: [],
              rows: [],
              duplicates: [],
              invalidRows: [],
              validCount: 0,
            });
            setIsPreviewExpanded(false);
          }}
        >
          <form
            className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] h-full"
            onSubmit={handleImportCsv}
          >
            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-[#2f2b3d]">
                  Upload CSV
                </span>
                <input
                  className="field h-auto"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvFileChange}
                />
              </label>
              <textarea
                className="field min-h-[160px] resize-y"
                value={csvContent}
                onChange={(event) => {
                  setCsvContent(event.target.value);
                  setCsvFileName("");
                }}
                placeholder="Paste emails one per line, or upload a CSV with an email column."
              />
              <p className="text-xs text-[#9a94b2]">
                {csvFileName
                  ? `Loaded file: ${csvFileName}`
                  : "You can upload a CSV file exported from Excel, or paste emails directly."}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-[#faf7ff] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a94b2]">
                    Rows
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#2f2b3d]">
                    {csvPreview.rows.length}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#faf7ff] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a94b2]">
                    Valid
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#2f2b3d]">
                    {csvPreview.validCount}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#faf7ff] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a94b2]">
                    Duplicates
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#2f2b3d]">
                    {csvPreview.duplicates.length}
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="primary-button">
                  Import CSV
                </button>
              </div>
            </div>

            <aside className="rounded-2xl border border-[#eee7fb] bg-white p-4 self-start xl:max-h-[60vh] xl:overflow-y-auto">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a94b2]">
                Email preview
              </p>
              <div className="mt-3 space-y-3">
                {csvPreview.rows.length ? (
                  <>
                    <div className="space-y-3">
                      {(isPreviewExpanded
                        ? csvPreview.rows
                        : csvPreview.rows.slice(0, 4)
                      ).map((row) => (
                        <div
                          key={row.rowNumber}
                          className="flex items-center justify-between gap-3 rounded-2xl bg-[#faf7ff] p-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#2f2b3d]">
                              Row {row.rowNumber}
                            </p>
                            <p className="mt-1 truncate text-xs text-[#6e6787]">
                              {row.email}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-nowrap gap-2">
                            {row.isValid ? (
                              <span className="soft-pill">Valid</span>
                            ) : (
                              <span className="soft-pill">
                                Missing required fields
                              </span>
                            )}
                            {row.isDuplicate ? (
                              <span className="soft-pill">Duplicate email</span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>

                    {csvPreview.rows.length > 4 ? (
                      <button
                        type="button"
                        className="text-sm font-semibold text-[#635bff]"
                        onClick={() =>
                          setIsPreviewExpanded((current) => !current)
                        }
                      >
                        {isPreviewExpanded
                          ? "Show less"
                          : `See more... `}
                      </button>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-[#6e6787]">
                    Paste CSV content to see a quick import review.
                  </p>
                )}
              </div>
              {isPreviewExpanded &&
              (csvPreview.invalidRows.length || csvPreview.duplicates.length) ? (
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#6e6787]">
                  {csvPreview.invalidRows.length ? (
                    <span className="soft-pill">
                      Invalid rows: {csvPreview.invalidRows.join(", ")}
                    </span>
                  ) : null}
                  {csvPreview.duplicates.length ? (
                    <span className="soft-pill">
                      Duplicate emails: {csvPreview.duplicates.join(", ")}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </aside>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

export default AudienceListPage;
