import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import EmptyState from "../../components/ui/EmptyState.jsx";
import LoadingState from "../../components/ui/LoadingState.jsx";
import { ToastContext } from "../../context/ToastContext.jsx";
import { api } from "../../lib/api.js";

const VIEW_COPY = {
  domains: {
    title: "My Domains",
    description: "Add, review, and manage verified business domains for email sending.",
  },
  dns: {
    title: "Setup DNS Records",
    description: "Copy SPF, DKIM, DMARC, and tracking records into your domain provider.",
  },
  health: {
    title: "Domain Health",
    description: "Monitor delivery, bounces, complaints, and engagement by sending domain.",
  },
  "dedicated-ip": {
    title: "Dedicated IP",
    description: "Request an advanced dedicated IP option for high-volume sending.",
  },
};

const STATUS_STYLES = {
  verified: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
  missing: "border-rose-200 bg-rose-50 text-rose-700",
  requested: "border-sky-200 bg-sky-50 text-sky-700",
  assigned: "border-emerald-200 bg-emerald-50 text-emerald-700",
  none: "border-slate-200 bg-slate-50 text-slate-600",
};

const getErrorMessage = (error, fallback = "Something went wrong. Please try again.") =>
  error?.response?.data?.message || error?.message || fallback;

const getDomainId = (domain) => domain?.id || domain?._id || "";

const formatStatus = (status) =>
  String(status || "pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

function StatusBadge({ status }) {
  const normalized = String(status || "pending").toLowerCase();
  return (
    <span
      className={`inline-flex border px-2.5 py-1 text-[11px] font-semibold ${
        STATUS_STYLES[normalized] || STATUS_STYLES.none
      }`}
    >
      {formatStatus(normalized)}
    </span>
  );
}

function MetricTile({ label, value, hint }) {
  return (
    <article className="metric-card p-5">
      <p className="text-sm font-semibold text-ui-body">{label}</p>
      <p className="mt-5 text-3xl font-semibold text-ui-strong">{value}</p>
      {hint ? <p className="mt-2 text-sm text-ui-body">{hint}</p> : null}
    </article>
  );
}

function DomainSelector({ domains, selectedDomainId, onChange }) {
  if (!domains.length) {
    return null;
  }

  return (
    <label className="block max-w-sm">
      <span className="mb-2 block text-sm font-semibold text-ui-body">Select domain</span>
      <select
        className="field"
        value={selectedDomainId}
        onChange={(event) => onChange(event.target.value)}
      >
        {domains.map((domain) => (
          <option key={getDomainId(domain)} value={getDomainId(domain)}>
            {domain.domain}
          </option>
        ))}
      </select>
    </label>
  );
}

function DomainConnectionPage({ view = "domains" }) {
  const toast = useContext(ToastContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [domains, setDomains] = useState([]);
  const [dnsRecords, setDnsRecords] = useState([]);
  const [health, setHealth] = useState(null);
  const [newDomain, setNewDomain] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const selectedDomainId = searchParams.get("domainId") || getDomainId(domains[0]);
  const selectedDomain = useMemo(
    () => domains.find((domain) => getDomainId(domain) === selectedDomainId) || domains[0] || null,
    [domains, selectedDomainId],
  );

  const setSelectedDomainId = useCallback(
    (domainId) => {
      const nextParams = new URLSearchParams(searchParams);
      if (domainId) {
        nextParams.set("domainId", domainId);
      } else {
        nextParams.delete("domainId");
      }
      setSearchParams(nextParams);
    },
    [searchParams, setSearchParams],
  );

  const loadDomains = useCallback(async () => {
    const response = await api.get("/email/domains");
    const list = response.data?.data || [];
    setDomains(list);

    if (!searchParams.get("domainId") && list[0]) {
      setSelectedDomainId(getDomainId(list[0]));
    }
  }, [searchParams, setSelectedDomainId]);

  const loadDnsRecords = useCallback(async (domainId) => {
    if (!domainId) {
      setDnsRecords([]);
      return;
    }
    const response = await api.get(`/email/domains/${domainId}/dns-records`);
    setDnsRecords(response.data?.records || response.data?.data?.records || []);
  }, []);

  const loadHealth = useCallback(async (domainId) => {
    if (!domainId) {
      setHealth(null);
      return;
    }
    const response = await api.get(`/email/domains/${domainId}/health`);
    setHealth(response.data?.health || response.data?.data?.health || null);
  }, []);

  const refreshPageData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadDomains();
      if (view === "dns") {
        await loadDnsRecords(selectedDomainId);
      }
      if (view === "health") {
        await loadHealth(selectedDomainId);
      }
    } catch (error) {
      toast?.error(getErrorMessage(error, "Could not refresh domain data."));
    } finally {
      setIsRefreshing(false);
    }
  }, [loadDnsRecords, loadDomains, loadHealth, selectedDomainId, toast, view]);

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const response = await api.get("/email/domains");
        const list = response.data?.data || [];
        if (!isMounted) {
          return;
        }
        setDomains(list);

        const initialDomainId = searchParams.get("domainId") || getDomainId(list[0]);
        if (initialDomainId && !searchParams.get("domainId")) {
          const nextParams = new URLSearchParams(searchParams);
          nextParams.set("domainId", initialDomainId);
          setSearchParams(nextParams, { replace: true });
        }
      } catch (error) {
        toast?.error(getErrorMessage(error, "Could not load connected domains."));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [searchParams, setSearchParams, toast]);

  useEffect(() => {
    if (!selectedDomainId || isLoading) {
      return;
    }

    if (view === "dns") {
      loadDnsRecords(selectedDomainId).catch((error) => {
        toast?.error(getErrorMessage(error, "Could not load DNS records."));
      });
    }

    if (view === "health") {
      loadHealth(selectedDomainId).catch((error) => {
        toast?.error(getErrorMessage(error, "Could not load domain health."));
      });
    }
  }, [isLoading, loadDnsRecords, loadHealth, selectedDomainId, toast, view]);

  const handleAddDomain = async (event) => {
    event.preventDefault();
    const domain = newDomain.trim().toLowerCase();

    if (!domain) {
      toast?.error("Please enter your business domain.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post("/email/domains", { domain });
      const addedDomain = response.data?.data;
      const addedId = getDomainId(addedDomain);
      setNewDomain("");
      toast?.success("Domain added. Copy the DNS records to your domain provider.");
      await loadDomains();
      navigate(`/connect-domain/dns-records${addedId ? `?domainId=${addedId}` : ""}`);
    } catch (error) {
      toast?.error(getErrorMessage(error, "Could not add domain."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyDomain = async (domainId = selectedDomainId) => {
    if (!domainId) {
      toast?.error("Please add a domain first.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/email/domains/${domainId}/verify`);
      toast?.success("Verification checked. Status has been updated.");
      await loadDomains();
      if (view === "dns") {
        await loadDnsRecords(domainId);
      }
    } catch (error) {
      toast?.error(getErrorMessage(error, "Domain verification failed."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDomain = async (domainId) => {
    if (!window.confirm("Remove this domain from email sending?")) {
      return;
    }

    setIsSubmitting(true);
    try {
      await api.delete(`/email/domains/${domainId}`);
      toast?.success("Domain removed.");
      await loadDomains();
    } catch (error) {
      toast?.error(getErrorMessage(error, "Could not remove domain."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDedicatedIpRequest = async () => {
    if (!selectedDomainId) {
      toast?.error("Please add a domain first.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/email/domains/${selectedDomainId}/dedicated-ip/request`);
      toast?.success("Dedicated IP request submitted.");
      await loadDomains();
    } catch (error) {
      toast?.error(getErrorMessage(error, "Could not request dedicated IP."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast?.success("Copied to clipboard.");
    } catch {
      toast?.error("Copy failed. Please select the value manually.");
    }
  };

  const copy = VIEW_COPY[view] || VIEW_COPY.domains;

  if (isLoading) {
    return <LoadingState message="Loading connected domains..." />;
  }

  return (
    <div className="space-y-6">
      <section className="shell-card-strong p-6 md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ui-muted">
              Connect Your Domain
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-ui-strong">{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-ui-body">{copy.description}</p>
          </div>
          <button
            type="button"
            className="secondary-button w-full lg:w-auto"
            onClick={refreshPageData}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </section>

      {view === "domains" ? (
        <>
          <section className="shell-card-strong p-6">
            <form className="grid gap-4 lg:grid-cols-[1fr_auto]" onSubmit={handleAddDomain}>
              <label>
                <span className="mb-2 block text-sm font-semibold text-ui-body">
                  Business domain
                </span>
                <input
                  className="field"
                  value={newDomain}
                  onChange={(event) => setNewDomain(event.target.value)}
                  placeholder="yourdomain.com"
                  inputMode="url"
                />
              </label>
              <div className="flex items-end">
                <button type="submit" className="primary-button w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Adding..." : "Add Domain"}
                </button>
              </div>
            </form>
            <p className="mt-3 text-sm text-ui-body">
              Vendor sirf domain name dalega. Platform automatically required SPF, DKIM, DMARC,
              aur tracking DNS records generate karega.
            </p>
          </section>

          <section className="shell-card-strong overflow-hidden">
            {domains.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#e6def4] text-left text-sm">
                  <thead className="bg-[#fbf9ff] text-xs font-semibold uppercase tracking-[0.12em] text-ui-muted">
                    <tr>
                      <th className="px-5 py-4">Domain</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Tracking domain</th>
                      <th className="px-5 py-4">Records</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eee7f7]">
                    {domains.map((domain) => {
                      const domainId = getDomainId(domain);
                      return (
                        <tr key={domainId}>
                          <td className="px-5 py-4 font-semibold text-ui-strong">{domain.domain}</td>
                          <td className="px-5 py-4">
                            <StatusBadge status={domain.status} />
                          </td>
                          <td className="px-5 py-4 text-ui-body">
                            {domain.trackingSubdomain || `track.${domain.domain}`}
                          </td>
                          <td className="px-5 py-4 text-ui-body">
                            {domain.dnsRecords?.length || 0} DNS records
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Link
                                className="secondary-button"
                                to={`/connect-domain/dns-records?domainId=${domainId}`}
                              >
                                View DNS
                              </Link>
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => handleVerifyDomain(domainId)}
                                disabled={isSubmitting}
                              >
                                Verify
                              </button>
                              <button
                                type="button"
                                className="ghost-button text-rose-700"
                                onClick={() => handleDeleteDomain(domainId)}
                                disabled={isSubmitting}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6">
                <EmptyState
                  title="No domains connected yet"
                  description="Add your business domain to generate verification DNS records."
                />
              </div>
            )}
          </section>
        </>
      ) : null}

      {view === "dns" ? (
        <section className="shell-card-strong p-6">
          {domains.length ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <DomainSelector
                  domains={domains}
                  selectedDomainId={selectedDomainId}
                  onChange={setSelectedDomainId}
                />
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => handleVerifyDomain()}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Checking..." : "Verify Domain"}
                </button>
              </div>

              <div className="grid gap-3 text-sm text-ui-body md:grid-cols-4">
                {["Copy records", "Login to provider", "Add DNS records", "Click Verify"].map(
                  (step, index) => (
                    <div key={step} className="border border-ui bg-[#fbf9ff] p-4">
                      <span className="font-semibold text-ui-strong">Step {index + 1}</span>
                      <p className="mt-1">{step}</p>
                    </div>
                  ),
                )}
              </div>

              <div className="overflow-x-auto border border-ui">
                <table className="min-w-full divide-y divide-[#e6def4] text-left text-sm">
                  <thead className="bg-[#fbf9ff] text-xs font-semibold uppercase tracking-[0.12em] text-ui-muted">
                    <tr>
                      <th className="px-5 py-4">Type</th>
                      <th className="px-5 py-4">Host / Name</th>
                      <th className="px-5 py-4">Value</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Copy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eee7f7]">
                    {dnsRecords.map((record, index) => (
                      <tr key={`${record.type}-${record.name}-${index}`}>
                        <td className="px-5 py-4 font-semibold text-ui-strong">
                          {record.type}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-ui-body">
                          {record.name}
                        </td>
                        <td className="max-w-xl px-5 py-4">
                          <code className="block whitespace-pre-wrap break-all bg-[#f7f2ff] p-3 text-xs text-ui-strong">
                            {record.value}
                          </code>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={record.status} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => handleCopy(record.value)}
                          >
                            Copy Value
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Add a domain first"
              description="DNS records are generated after a business domain is added."
              action={
                <Link className="primary-button" to="/connect-domain/my-domains">
                  Add Domain
                </Link>
              }
            />
          )}
        </section>
      ) : null}

      {view === "health" ? (
        <section className="shell-card-strong p-6">
          {domains.length ? (
            <div className="space-y-6">
              <DomainSelector
                domains={domains}
                selectedDomainId={selectedDomainId}
                onChange={setSelectedDomainId}
              />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricTile label="Domain status" value={formatStatus(selectedDomain?.status)} />
                <MetricTile label="Sent emails" value={health?.sent ?? 0} />
                <MetricTile
                  label="Delivery rate"
                  value={`${health?.deliveryRate ?? 0}%`}
                  hint="Delivered emails divided by total sent"
                />
                <MetricTile
                  label="Bounce rate"
                  value={`${health?.bounceRate ?? 0}%`}
                  hint="Keep this as low as possible"
                />
                <MetricTile
                  label="Complaint rate"
                  value={`${health?.complaintRate ?? 0}%`}
                  hint="Spam complaints from recipients"
                />
                <MetricTile label="Open rate" value={`${health?.openRate ?? 0}%`} />
                <MetricTile label="Click rate" value={`${health?.clickRate ?? 0}%`} />
                <MetricTile
                  label="Health"
                  value={formatStatus(health?.health || selectedDomain?.health?.status || "pending")}
                />
              </div>
            </div>
          ) : (
            <EmptyState
              title="No health data yet"
              description="Connect and verify a domain before reputation signals can be calculated."
            />
          )}
        </section>
      ) : null}

      {view === "dedicated-ip" ? (
        <section className="shell-card-strong p-6">
          {domains.length ? (
            <div className="space-y-6">
              <DomainSelector
                domains={domains}
                selectedDomainId={selectedDomainId}
                onChange={setSelectedDomainId}
              />
              <div className="grid gap-4 md:grid-cols-3">
                <MetricTile
                  label="Current option"
                  value={formatStatus(selectedDomain?.dedicatedIp?.status || "none")}
                  hint="Shared pool is default for normal sending volume"
                />
                <MetricTile
                  label="Assigned IP"
                  value={selectedDomain?.dedicatedIp?.ipAddress || "Not assigned"}
                />
                <MetricTile label="Domain" value={selectedDomain?.domain || "-"} />
              </div>
              <div className="border border-ui bg-[#fbf9ff] p-5">
                <h2 className="text-base font-semibold text-ui-strong">When to use Dedicated IP</h2>
                <p className="mt-2 max-w-3xl text-sm text-ui-body">
                  High-volume vendors can request a dedicated IP after the sending domain is stable
                  and verified. Admin team can review volume, reputation, and pricing before assigning
                  an IP.
                </p>
                <button
                  type="button"
                  className="primary-button mt-5"
                  onClick={handleDedicatedIpRequest}
                  disabled={isSubmitting || selectedDomain?.dedicatedIp?.status === "requested"}
                >
                  {selectedDomain?.dedicatedIp?.status === "requested"
                    ? "Request Submitted"
                    : "Request Dedicated IP"}
                </button>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No domain selected"
              description="Add and verify a domain before requesting dedicated IP access."
            />
          )}
        </section>
      ) : null}
    </div>
  );
}

export default DomainConnectionPage;
