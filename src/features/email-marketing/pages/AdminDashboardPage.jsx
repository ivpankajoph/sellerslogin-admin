import {
  AlertTriangle,
  Activity,
  BadgeIndianRupee,
  Ban,
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  FileText,
  Home,
  KeyRound,
  ListChecks,
  Mail,
  Menu,
  MoreHorizontal,
  Receipt,
  RefreshCcw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sun,
  XCircle,
  UserCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../context/AuthContext.jsx";
import { ToastContext } from "../context/ToastContext.jsx";
import { api } from "../lib/api.js";

const navSections = [
  {
    title: "User Management",
    items: [
      ["Users", Users],
      ["Verification / KYC", UserCheck],
      ["User Activity", ListChecks],
      ["Roles & Permissions", KeyRound],
    ],
  },
  {
    title: "Risk & Abuse",
    items: [
      ["Risk Monitoring", ShieldAlert],
      ["Spam Complaints", Bell],
      ["Blocked Domains", Ban],
      ["Suppressions", ShieldCheck],
    ],
  },
  {
    title: "Billing & Credits",
    items: [
      ["Settings", Settings],
      ["Packs", WalletCards],
      ["Wallets", BadgeIndianRupee],
      ["Plans", FileText],
      ["Subscriptions", CreditCard],
      ["Payments", WalletCards],
      ["Invoices", Receipt],
    ],
  },
  {
    title: "System",
    items: [
      ["Email Sending Overview", Mail],
      ["Activity Logs", ListChecks],
      ["Settings", Settings],
    ],
  },
];

const numberFormat = new Intl.NumberFormat("en-IN");
const currencyFormat = new Intl.NumberFormat("en-IN", {
  currency: "INR",
  maximumFractionDigits: 0,
  style: "currency",
});

const formatNumber = (value = 0) => numberFormat.format(value || 0);
const formatCurrency = (value = 0) => currencyFormat.format(value || 0);
const ADMIN_USERS_PAGE_SIZE = 50;
const formatPlanPrice = (value = 0, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value || 0);

const formatDate = (value) => {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const formatNotificationTime = (value) => {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
};

function AdminStatCard({ icon: Icon, label, value, tone, hint }) {
  return (
    <div className="border border-[#ded7ef] bg-white px-6 py-6 shadow-[0_10px_28px_rgba(42,31,72,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={`text-[13px] font-medium ${tone}`}>{label}</p>
          <p className={`mt-9 text-[25px] font-semibold leading-none ${tone}`}>{value}</p>
          <p className="mt-2 text-[13px] text-[#9b8caf]">{hint}</p>
        </div>
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
    </div>
  );
}

function MiniLineChart() {
  return (
    <div className="h-[260px] border border-[#eee9f8] bg-white px-5 py-6">
      <div className="flex h-full items-end gap-2">
        {[28, 46, 39, 66, 54, 82, 74, 92, 68, 86, 78, 98, 72, 62].map((height, index) => (
          <div key={index} className="flex flex-1 flex-col justify-end">
            <div
              className="rounded-t-[4px] bg-gradient-to-t from-[#7e22ce] to-[#8b5cf6]"
              style={{ height: `${height}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ active = 0, suspended = 0 }) {
  const total = Math.max(active + suspended, 1);
  const activePercent = Math.round((active / total) * 100);

  return (
    <div className="flex flex-col items-center justify-center gap-5 border border-[#eee9f8] bg-white p-6">
      <div
        className="h-40 w-40 rounded-full"
        style={{
          background: `conic-gradient(#16b984 0 ${activePercent}%, #f59e0b ${activePercent}% 100%)`,
        }}
      >
        <div className="m-[28px] flex h-[104px] w-[104px] items-center justify-center rounded-full bg-white text-[20px] font-semibold text-[#21192d]">
          {activePercent}%
        </div>
      </div>
      <div className="space-y-3 text-[13px]">
        <div className="flex items-center gap-2 text-[#7f6f96]">
          <span className="h-3 w-3 rounded-full bg-[#16b984]" />
          Active vendors
          <span className="font-semibold text-[#21192d]">{formatNumber(active)}</span>
        </div>
        <div className="flex items-center gap-2 text-[#7f6f96]">
          <span className="h-3 w-3 rounded-full bg-[#f59e0b]" />
          Suspended vendors
          <span className="font-semibold text-[#21192d]">{formatNumber(suspended)}</span>
        </div>
      </div>
    </div>
  );
}

function AccessSummary({ label, values = [], emptyLabel = "No access assigned" }) {
  const count = Array.isArray(values) ? values.length : 0;

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase text-[#9b8caf]">{label}</p>
      <p className="mt-1 text-[12px] font-medium text-[#5a4380]">
        {count ? `${formatNumber(count)} allowed` : emptyLabel}
      </p>
      {count ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {values.slice(0, 6).map((value) => (
            <span key={value} className="bg-[#f5efff] px-2 py-1 text-[11px] font-medium text-[#5a4380]">
              {value}
            </span>
          ))}
          {count > 6 ? (
            <span className="bg-[#f5efff] px-2 py-1 text-[11px] font-medium text-[#5a4380]">
              +{formatNumber(count - 6)}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DetailMenuButton({ isOpen, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center border text-[#5a4380] transition hover:bg-[#f5efff] ${
        isOpen ? "border-[#b99be7] bg-[#f5efff]" : "border-[#ded7ef] bg-white"
      }`}
      title={label}
    >
      <MoreHorizontal className="h-5 w-5" />
    </button>
  );
}

function DetailPopover({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#21192d]/20 px-4 py-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Close details"
      />
      <div className="relative w-full max-w-[420px] border border-[#ded7ef] bg-white shadow-[0_24px_64px_rgba(42,31,72,0.22)]">
        <div className="flex items-center justify-between border-b border-[#eee9f8] px-5 py-4">
          <p className="text-[15px] font-semibold text-[#21192d]">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="border border-[#ded7ef] px-2.5 py-1 text-[12px] font-semibold text-[#5a4380] hover:bg-[#f5efff]"
          >
            Close
          </button>
        </div>
        <div className="space-y-4 p-5">{children}</div>
      </div>
    </div>
  );
}

function MetricDetail({ label, value, tone = "text-[#21192d]" }) {
  return (
    <div className="border border-[#eee9f8] bg-[#fbf9ff] px-3 py-3">
      <p className="text-[11px] font-semibold uppercase text-[#9b8caf]">{label}</p>
      <p className={`mt-1 text-[18px] font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

/*
function VendorProfileModal({ isLoading, onClose, profile }) {
  const vendor = profile?.vendor || {};
  const billing = profile?.billing || {};
  const plan = billing.plan || {};
  const subscription = billing.subscription || {};
  const marketing = profile?.marketing || {};
  const featureUsage = billing.featureUsage || {};
  const recent = profile?.recent || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#21192d]/35 px-4 py-6">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close profile" />
      <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col border border-[#ded7ef] bg-[#fbf9ff] shadow-[0_28px_80px_rgba(42,31,72,0.24)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#ded7ef] bg-white px-5 py-4">
          <div>
            <p className="text-[12px] font-semibold uppercase text-[#9b8caf]">Vendor profile</p>
            <h2 className="mt-1 text-[22px] font-semibold text-[#21192d]">
              {vendor.businessName || vendor.name || "Vendor"}
            </h2>
            <p className="mt-1 text-[13px] text-[#7f6f96]">{vendor.email || "No email"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-[#ded7ef] bg-white px-3 py-2 text-[12px] font-semibold text-[#5a4380] hover:bg-[#f5efff]"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {isLoading ? (
            <div className="border border-[#eee9f8] bg-white p-8 text-center text-[13px] font-semibold text-[#7f6f96]">
              Loading complete vendor profile...
            </div>
          ) : (
            <div className="space-y-5">
              <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                <div className="border border-[#eee9f8] bg-white p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <MetricDetail label="Business" value={vendor.businessName || vendor.name || "Not set"} />
                    <MetricDetail label="Account Status" value={vendor.accountStatus === "inactive" ? "Suspended" : "Active"} />
                    <MetricDetail label="SellersLogin Vendor ID" value={vendor.sellersloginVendorId || "Not linked"} />
                    <MetricDetail label="Account Type" value={vendor.sellersloginAccountType || "vendor_owner"} />
                    <MetricDetail label="Phone" value={vendor.phone || "No phone"} />
                    <MetricDetail label="Last Login" value={formatDate(vendor.lastLoginAt)} />
                  </div>
                </div>

                <div className="border border-[#eee9f8] bg-white p-5">
                  <p className="text-[13px] font-semibold text-[#21192d]">Plan and validity</p>
                  <div className="mt-4 grid gap-3">
                    <MetricDetail label="Current Plan" value={plan.name || "Free Plan"} />
                    <MetricDetail label="Subscription Status" value={subscription.status || "free"} />
                    <MetricDetail label="Billing Cycle" value={subscription.billingCycle || "monthly"} />
                    <MetricDetail label="Valid Until" value={formatDate(subscription.currentPeriodEnd)} />
                  </div>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricDetail label="Subscribers" value={formatNumber(marketing.subscribers)} />
                <MetricDetail label="Campaigns" value={formatNumber(marketing.campaigns)} />
                <MetricDetail label="Emails Sent" value={formatNumber(marketing.sent)} />
                <MetricDetail label="Delivered" value={formatNumber(marketing.delivered)} />
                <MetricDetail label="Templates" value={formatNumber(marketing.templates)} />
                <MetricDetail label="Automations" value={formatNumber(marketing.automations)} />
                <MetricDetail label="Segments" value={formatNumber(marketing.segments)} />
                <MetricDetail label="Risk" value={`${marketing.bounceRate || 0}% bounce`} tone="text-orange-600" />
              </section>

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <UsageMeter label="Templates" usage={featureUsage.templates} />
                <UsageMeter label="Automations" usage={featureUsage.automations} />
                <UsageMeter label="Segments" usage={featureUsage.segments} />
                <UsageMeter label="Team Members" usage={featureUsage.teamMembers} />
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <RecentList
                  title="Recent campaigns"
                  emptyLabel="No campaigns created yet."
                  items={recent.campaigns || []}
                  renderItem={(item) => (
                    <div key={item._id} className="px-4 py-3">
                      <p className="text-[13px] font-semibold text-[#21192d]">{item.name}</p>
                      <p className="mt-1 text-[12px] text-[#7f6f96]">
                        {item.status} · {formatNumber(item.totals?.sent)} sent · {formatDate(item.updatedAt)}
                      </p>
                    </div>
                  )}
                />
                <RecentList
                  title="Recent templates"
                  emptyLabel="No templates created yet."
                  items={recent.templates || []}
                  renderItem={(item) => (
                    <div key={item._id} className="px-4 py-3">
                      <p className="text-[13px] font-semibold text-[#21192d]">{item.name}</p>
                      <p className="mt-1 text-[12px] text-[#7f6f96]">{item.subject || "No subject"} · {formatDate(item.updatedAt)}</p>
                    </div>
                  )}
                />
                <RecentList
                  title="Recent automations"
                  emptyLabel="No automations created yet."
                  items={recent.automations || []}
                  renderItem={(item) => (
                    <div key={item._id} className="px-4 py-3">
                      <p className="text-[13px] font-semibold text-[#21192d]">{item.name}</p>
                      <p className="mt-1 text-[12px] text-[#7f6f96]">
                        {item.status} · {formatNumber(item.executionCount)} runs · {formatDate(item.updatedAt)}
                      </p>
                    </div>
                  )}
                />
                <RecentList
                  title="Recent activity"
                  emptyLabel="No activity recorded yet."
                  items={recent.activity || []}
                  renderItem={(item) => (
                    <div key={item._id} className="px-4 py-3">
                      <p className="text-[13px] font-semibold text-[#21192d]">{item.title}</p>
                      <p className="mt-1 text-[12px] text-[#7f6f96]">{item.message} · {formatDate(item.createdAt)}</p>
                    </div>
                  )}
                />
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <RecentList
                  title="Invoices"
                  emptyLabel="No invoices generated yet."
                  items={billing.invoices || []}
                  renderItem={(item) => (
                    <div key={item._id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div>
                        <p className="text-[13px] font-semibold text-[#21192d]">{item.invoiceNumber}</p>
                        <p className="mt-1 text-[12px] text-[#7f6f96]">{item.status} · {formatDate(item.issuedAt)}</p>
                      </div>
                      <p className="text-[13px] font-semibold text-[#21192d]">{formatPlanPrice(item.total, item.currency)}</p>
                    </div>
                  )}
                />
                <RecentList
                  title="Payments"
                  emptyLabel="No payments recorded yet."
                  items={billing.payments || []}
                  renderItem={(item) => (
                    <div key={item._id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div>
                        <p className="text-[13px] font-semibold text-[#21192d]">{item.gateway}</p>
                        <p className="mt-1 text-[12px] text-[#7f6f96]">{item.status} · {formatDate(item.createdAt)}</p>
                      </div>
                      <p className="text-[13px] font-semibold text-[#21192d]">{formatPlanPrice(item.totalAmount, item.currency)}</p>
                    </div>
                  )}
                />
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

*/
function UsageStatTile({ label, value, hint, tone = "text-[#21192d]" }) {
  return (
    <div className="border border-[#eee9f8] bg-[#fbf9ff] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase text-[#9b8caf]">{label}</p>
      <p className={`mt-2 text-[24px] font-semibold leading-none ${tone}`}>{value}</p>
      {hint ? <p className="mt-2 text-[12px] text-[#7f6f96]">{hint}</p> : null}
    </div>
  );
}

function UsageProgressRow({ label, value, max, suffix = "" }) {
  const hasLimit = Number.isFinite(max) && max > 0;
  const percentage = hasLimit ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div className="border border-[#eee9f8] bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-[#21192d]">{label}</p>
        <p className="text-[12px] font-semibold text-[#5a4380]">
          {formatNumber(value)}
          {hasLimit ? ` / ${formatNumber(max)}` : suffix}
        </p>
      </div>
      {hasLimit ? (
        <>
          <div className="mt-3 h-2 overflow-hidden bg-[#eee9f8]">
            <div className="h-full bg-[#8338ec]" style={{ width: `${percentage}%` }} />
          </div>
          <p className="mt-2 text-[12px] text-[#7f6f96]">{Math.round(percentage)}% used</p>
        </>
      ) : null}
    </div>
  );
}

function VendorUsagePanel({ onClose, vendor }) {
  const deliveredRate = vendor.emailsSent ? Math.round(((vendor.delivered || 0) / vendor.emailsSent) * 100) : 0;
  const engagementHealth =
    vendor.bounceRate > 5 || vendor.complaintRate > 0.2 ? "Needs review" : vendor.emailsSent ? "Healthy" : "No sends yet";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#21192d]/25">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close usage" />
      <aside className="relative flex h-full w-full max-w-[720px] flex-col border-l border-[#ded7ef] bg-white shadow-[0_24px_64px_rgba(42,31,72,0.22)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#eee9f8] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase text-[#9b8caf]">Vendor usage</p>
            <h2 className="mt-1 truncate text-[21px] font-semibold text-[#21192d]">
              {vendor.businessName || vendor.name || "Vendor"}
            </h2>
            <p className="mt-1 truncate text-[13px] text-[#7f6f96]">{vendor.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-[#ded7ef] bg-white px-3 py-2 text-[12px] font-semibold text-[#5a4380] hover:bg-[#f5efff]"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <UsageStatTile label="Emails sent" value={formatNumber(vendor.emailsSent)} hint={`${deliveredRate}% delivered`} />
            <UsageStatTile label="Delivered" value={formatNumber(vendor.delivered)} />
            <UsageStatTile label="Campaigns" value={formatNumber(vendor.campaigns)} />
            <UsageStatTile label="Automations" value={formatNumber(vendor.automations)} />
            <UsageStatTile label="Templates" value={formatNumber(vendor.templates)} />
            <UsageStatTile label="Segments" value={formatNumber(vendor.segments)} />
            <UsageStatTile label="Subscribers" value={formatNumber(vendor.subscribers)} />
            <UsageStatTile label="Bounce rate" value={`${vendor.bounceRate || 0}%`} tone="text-orange-600" />
            <UsageStatTile label="Complaint rate" value={`${vendor.complaintRate || 0}%`} tone="text-rose-600" />
          </section>

          <section className="mt-5 border border-[#eee9f8] bg-[#fbf9ff] p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[13px] font-semibold text-[#21192d]">Usage overview</p>
                <p className="mt-1 text-[12px] text-[#7f6f96]">Quick read of this vendor's marketing footprint.</p>
              </div>
              <span className="inline-flex w-fit bg-white px-3 py-1 text-[12px] font-semibold text-[#5a4380]">
                {engagementHealth}
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              <UsageProgressRow label="Emails delivered" value={vendor.delivered || 0} max={vendor.emailsSent || 0} />
              <UsageProgressRow label="Campaigns created" value={vendor.campaigns || 0} suffix=" total" />
              <UsageProgressRow label="Automations created" value={vendor.automations || 0} suffix=" total" />
              <UsageProgressRow label="Templates created" value={vendor.templates || 0} suffix=" total" />
              <UsageProgressRow label="Segments created" value={vendor.segments || 0} suffix=" total" />
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

function AdminUsersView({
  isLoading,
  openDetail,
  page,
  pageSize,
  query,
  setPage,
  setQuery,
  setOpenDetail,
  stats,
  total,
  totalPages,
  vendors,
}) {
  const toggleDetail = (vendorId, type) => {
    setOpenDetail((current) =>
      current?.vendorId === vendorId && current?.type === type ? null : { vendorId, type },
    );
  };
  const selectedVendor = vendors.find((vendor) => vendor.id === openDetail?.vendorId);

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          icon={Users}
          label="Logged-in Vendors"
          value={formatNumber(stats.total)}
          tone="text-[#665cf5]"
          hint="Synced from SellersLogin"
        />
        <AdminStatCard
          icon={UserCheck}
          label="Active Users"
          value={formatNumber(stats.active)}
          tone="text-[#009b5a]"
          hint="Can access marketing"
        />
        <AdminStatCard
          icon={Ban}
          label="Suspended Users"
          value={formatNumber(stats.suspended)}
          tone="text-[#f97316]"
          hint="Blocked by admin"
        />
        <AdminStatCard
          icon={Mail}
          label="Emails Sent"
          value={formatNumber(stats.emailsSent)}
          tone="text-[#0084c7]"
          hint={`${formatNumber(stats.campaigns)} campaigns`}
        />
      </section>

      <section className="border border-[#ded7ef] bg-white shadow-[0_10px_28px_rgba(42,31,72,0.04)]">
        <div className="flex flex-col gap-4 border-b border-[#ded7ef] p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-[17px] font-semibold text-[#21192d]">Users</h2>
            <p className="mt-1 text-[13px] text-[#9b8caf]">
              Vendors who logged in to Email Marketing with SellersLogin credentials
            </p>
          </div>
          <label className="flex h-9 items-center gap-2 border border-[#ded7ef] bg-white px-3">
            <Search className="h-4 w-4 text-[#9b8caf]" />
            <input
              value={query}
              onChange={(event) => {
                setPage(1);
                setQuery(event.target.value);
              }}
              placeholder="Search users"
              className="w-full min-w-0 border-0 bg-transparent text-[13px] outline-none md:w-64"
            />
          </label>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-[13px] font-medium text-[#7f6f96]">
            Loading vendor users...
          </div>
        ) : null}

        {!isLoading && !vendors.length ? (
          <div className="p-10 text-center">
            <p className="text-[15px] font-semibold text-[#21192d]">No Email Marketing users yet</p>
            <p className="mt-2 text-[13px] text-[#7f6f96]">
              Vendors will appear here after they sign in to Email Marketing.
            </p>
          </div>
        ) : null}

        {vendors.length ? (
          <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-[13px]">
              <thead className="bg-[#fbf9ff] text-[12px] font-semibold text-[#6e5a93]">
                <tr>
                  <th className="px-5 py-3 font-medium">Vendor</th>
                  <th className="px-5 py-3 font-medium">SellersLogin Details</th>
                  <th className="px-5 py-3 font-medium">Contact</th>
                  <th className="px-5 py-3 font-medium">Marketing Usage</th>
                  <th className="px-5 py-3 font-medium">Risk</th>
                  <th className="px-5 py-3 font-medium">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee9f8]">
                {vendors.map((vendor) => (
                  <tr
                    key={vendor.id}
                    className="align-top transition hover:bg-[#fbf9ff]"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#21192d]">{vendor.businessName || vendor.name}</p>
                      <p className="mt-1 text-[12px] text-[#9b8caf]">{vendor.name}</p>
                      <span
                        className={`mt-3 inline-flex px-2.5 py-1 text-[12px] font-semibold ${
                          vendor.accountStatus === "inactive"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {vendor.accountStatus === "inactive" ? "Suspended" : "Active"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-[#21192d]">{vendor.sellersloginVendorId}</p>
                      <p className="mt-1 text-[12px] text-[#7f6f96]">
                        {vendor.sellersloginAccountType || "vendor_owner"}
                      </p>
                      {vendor.sellersloginActorId ? (
                        <p className="mt-1 max-w-[190px] truncate text-[12px] text-[#9b8caf]">
                          Actor: {vendor.sellersloginActorId}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-[#21192d]">{vendor.email}</p>
                      <p className="mt-1 text-[12px] text-[#7f6f96]">{vendor.phone || "No phone"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleDetail(vendor.id, "usage");
                        }}
                        className="border border-[#ded7ef] bg-white px-3 py-2 text-[12px] font-semibold text-[#5a4380] hover:bg-[#f5efff]"
                      >
                        Usage
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <DetailMenuButton
                        isOpen={openDetail?.vendorId === vendor.id && openDetail?.type === "risk"}
                        label="View risk"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleDetail(vendor.id, "risk");
                        }}
                      />
                    </td>
                    <td className="px-5 py-4 text-[#7f6f96]">{formatDate(vendor.lastLoginAt)}</td>
                            </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-[#eee9f8] px-5 py-4 text-[13px] text-[#7f6f96] md:flex-row md:items-center md:justify-between">
            <p>
              Showing {formatNumber((page - 1) * pageSize + 1)}-
              {formatNumber((page - 1) * pageSize + vendors.length)} of {formatNumber(total)}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage(Math.max(page - 1, 1))}
                className="border border-[#ded7ef] px-3 py-2 text-[12px] font-semibold text-[#5a4380] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-2 text-[12px] font-semibold text-[#5a4380]">
                Page {formatNumber(page)} / {formatNumber(totalPages)}
              </span>
              <button
                type="button"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage(Math.min(page + 1, totalPages))}
                className="border border-[#ded7ef] px-3 py-2 text-[12px] font-semibold text-[#5a4380] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
          </>
        ) : null}
      </section>

      {selectedVendor && openDetail?.type === "usage" ? (
        <VendorUsagePanel vendor={selectedVendor} onClose={() => setOpenDetail(null)} />
      ) : null}

      {selectedVendor && openDetail?.type === "risk" ? (
        <DetailPopover title="Risk Signals" onClose={() => setOpenDetail(null)}>
          <div>
            <p className="text-[13px] font-semibold text-[#21192d]">
              {selectedVendor.businessName || selectedVendor.name}
            </p>
            <p className="mt-1 text-[12px] text-[#9b8caf]">{selectedVendor.email}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MetricDetail label="Bounce Rate" value={`${selectedVendor.bounceRate}%`} tone="text-orange-600" />
            <MetricDetail label="Complaint Rate" value={`${selectedVendor.complaintRate}%`} tone="text-rose-600" />
          </div>
          <div className="border border-[#eee9f8] bg-[#fbf9ff] px-3 py-3">
            <p className="text-[11px] font-semibold uppercase text-[#9b8caf]">Status</p>
            <p className="mt-1 text-[13px] font-semibold text-[#21192d]">
              {selectedVendor.accountStatus === "inactive" ? "Suspended by admin" : "No active block"}
            </p>
          </div>
        </DetailPopover>
      ) : null}

    </div>
  );
}

const activityTypeLabels = {
  all: "All activity",
  login: "Login",
  email: "Email events",
  campaign: "Campaigns",
  campaigns: "Campaigns",
  automation: "Automations",
  automations: "Automations",
  subscriber: "Subscribers",
  subscribers: "Subscribers",
  segment: "Segments",
  template: "Templates",
  billing: "Billing",
  settings: "Settings",
  activity: "Vendor actions",
};

const activityDateLabels = {
  all: "All time",
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

const getActivityModule = (item = {}) => item.module || item.category || "activity";

const getActivityTone = (category) => {
  const normalizedCategory = getActivityModule({ module: category });

  if (normalizedCategory === "login") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (normalizedCategory === "email") {
    return "bg-sky-50 text-sky-700";
  }

  if (["campaign", "campaigns"].includes(normalizedCategory)) {
    return "bg-violet-50 text-violet-700";
  }

  if (["automation", "automations"].includes(normalizedCategory)) {
    return "bg-orange-50 text-orange-700";
  }

  if (["subscriber", "subscribers"].includes(normalizedCategory)) {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-[#f5efff] text-[#5a4380]";
};

const getActivityIconTone = (status = "") => {
  const normalizedStatus = String(status || "").toLowerCase();

  if (["failed", "error"].includes(normalizedStatus)) {
    return "bg-red-50 text-red-600";
  }

  if (["new", "read", "recorded"].includes(normalizedStatus)) {
    return "bg-[#f5efff] text-[#5a4380]";
  }

  return "bg-emerald-50 text-emerald-700";
};

const formatActivityClock = (value) => {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const getMetadataEntries = (metadata) =>
  Object.entries(metadata || {}).filter(([, value]) => value !== undefined && value !== null && value !== "");

function AdminActivityView({
  activities,
  activityType,
  activityDateRange,
  isLoading,
  query,
  setActivityDateRange,
  setActivityType,
  setQuery,
  stats,
}) {
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const selectedActivity = activities.find((item) => item.id === selectedActivityId) || null;
  const moduleOptions = [
    ["all", "All activity"],
    ["login", "Login"],
    ["campaigns", "Campaigns"],
    ["subscribers", "Subscribers"],
    ["automations", "Automations"],
    ["segments", "Segments"],
    ["template", "Templates"],
    ["email", "Email events"],
    ["billing", "Billing"],
    ["settings", "Settings"],
  ];

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          icon={Activity}
          label="Total Activities"
          value={formatNumber(stats.totalActivities || activities.length)}
          tone="text-[#665cf5]"
          hint={`${formatNumber(stats.todayActivities)} today`}
        />
        <AdminStatCard
          icon={Users}
          label="Active Vendors"
          value={formatNumber(stats.vendors)}
          tone="text-[#009b5a]"
          hint="With tracked dashboard activity"
        />
        <AdminStatCard
          icon={Mail}
          label="Campaign Actions"
          value={formatNumber(stats.campaignActions)}
          tone="text-[#0084c7]"
          hint={`${formatNumber(stats.subscriberActions)} subscriber actions`}
        />
        <AdminStatCard
          icon={AlertTriangle}
          label="Failed Actions"
          value={formatNumber(stats.failedActivities)}
          tone="text-[#dc2626]"
          hint={`${formatNumber(stats.logins)} login events`}
        />
      </section>

      <section className="border border-[#ded7ef] bg-white shadow-[0_10px_28px_rgba(42,31,72,0.04)]">
        <div className="border-b border-[#ded7ef] p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-[17px] font-semibold text-[#21192d]">User Activity</h2>
              <p className="mt-1 text-[13px] text-[#7f6f96]">
                Complete dashboard actions in simple admin-readable language.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_160px_150px] xl:min-w-[680px]">
              <label className="flex h-10 items-center gap-2 border border-[#ded7ef] bg-white px-3">
                <Search className="h-4 w-4 text-[#9b8caf]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search vendor, action, campaign..."
                  className="w-full min-w-0 border-0 bg-transparent text-[13px] outline-none"
                />
              </label>
              <select
                value={activityType}
                onChange={(event) => setActivityType(event.target.value)}
                className="h-10 border border-[#ded7ef] bg-white px-3 text-[13px] font-semibold text-[#5a4380] outline-none"
              >
                {moduleOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={activityDateRange}
                onChange={(event) => setActivityDateRange(event.target.value)}
                className="h-10 border border-[#ded7ef] bg-white px-3 text-[13px] font-semibold text-[#5a4380] outline-none"
              >
                {Object.entries(activityDateLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-[13px] font-medium text-[#7f6f96]">
            Loading user activity...
          </div>
        ) : null}

        {!isLoading && !activities.length ? (
          <div className="p-10 text-center">
            <p className="text-[15px] font-semibold text-[#21192d]">No activity found</p>
            <p className="mt-2 text-[13px] text-[#7f6f96]">
              Dashboard actions will appear here after users create, edit, send, import, or log in.
            </p>
          </div>
        ) : null}

        {activities.length ? (
          <div className="divide-y divide-[#eee9f8]">
            {activities.map((item) => {
              const module = getActivityModule(item);
              const isSelected = selectedActivityId === item.id;
              const StatusIcon = ["failed", "error"].includes(String(item.status || "").toLowerCase())
                ? XCircle
                : CheckCircle2;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedActivityId(isSelected ? "" : item.id)}
                  className={`grid w-full gap-4 px-5 py-4 text-left transition hover:bg-[#fbf9ff] md:grid-cols-[92px_minmax(0,1fr)_180px_130px] ${
                    isSelected ? "bg-[#fbf9ff]" : "bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2 text-[12px] font-semibold text-[#6e5a93]">
                    <Clock3 className="h-4 w-4" />
                    {formatActivityClock(item.timestamp)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-1 text-[12px] font-semibold ${getActivityTone(module)}`}>
                        {item.moduleLabel || activityTypeLabels[module] || module}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-semibold ${getActivityIconTone(item.status)}`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {item.status || item.action || "completed"}
                      </span>
                    </div>
                    <p className="mt-2 text-[14px] font-semibold text-[#21192d]">{item.title}</p>
                    <p className="mt-1 text-[13px] leading-5 text-[#7f6f96]">{item.message}</p>
                    {item.entityName ? (
                      <p className="mt-1 text-[12px] font-semibold text-[#5a4380]">Target: {item.entityName}</p>
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[#21192d]">{item.vendor?.name || item.actor?.name || "Vendor"}</p>
                    <p className="mt-1 truncate text-[12px] text-[#9b8caf]">{item.vendor?.email || item.actor?.email || item.vendor?.vendorId}</p>
                  </div>
                  <div className="text-[12px] text-[#7f6f96] md:text-right">
                    <p>{formatDate(item.timestamp)}</p>
                    <p className="mt-1 font-semibold text-[#5a4380]">{isSelected ? "Hide details" : "View details"}</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      {selectedActivity ? (
        <section className="border border-[#ded7ef] bg-white p-5 shadow-[0_10px_28px_rgba(42,31,72,0.04)]">
          <div className="flex flex-col gap-2 border-b border-[#eee9f8] pb-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase text-[#7f6f96]">Activity details</p>
              <h3 className="mt-1 text-[17px] font-semibold text-[#21192d]">{selectedActivity.title}</h3>
              <p className="mt-1 text-[13px] text-[#7f6f96]">{selectedActivity.message}</p>
            </div>
            <span className={`self-start px-2.5 py-1 text-[12px] font-semibold ${getActivityTone(getActivityModule(selectedActivity))}`}>
              {selectedActivity.moduleLabel || activityTypeLabels[getActivityModule(selectedActivity)] || getActivityModule(selectedActivity)}
            </span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-[12px] font-semibold text-[#9b8caf]">Vendor</p>
              <p className="mt-1 text-[13px] font-semibold text-[#21192d]">{selectedActivity.vendor?.name || selectedActivity.actor?.name || "Vendor"}</p>
              <p className="mt-1 text-[12px] text-[#7f6f96]">{selectedActivity.vendor?.email || selectedActivity.actor?.email || selectedActivity.vendor?.vendorId}</p>
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[#9b8caf]">Action</p>
              <p className="mt-1 text-[13px] font-semibold text-[#21192d]">{selectedActivity.action || selectedActivity.type}</p>
              <p className="mt-1 text-[12px] text-[#7f6f96]">{selectedActivity.status || "completed"}</p>
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[#9b8caf]">Target</p>
              <p className="mt-1 text-[13px] font-semibold text-[#21192d]">{selectedActivity.entityName || selectedActivity.entityType || "General"}</p>
              <p className="mt-1 text-[12px] text-[#7f6f96]">{selectedActivity.entityId || "No target id"}</p>
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[#9b8caf]">Time</p>
              <p className="mt-1 text-[13px] font-semibold text-[#21192d]">{formatDate(selectedActivity.timestamp)}</p>
              <p className="mt-1 text-[12px] text-[#7f6f96]">{selectedActivity.ipAddress || "IP not captured"}</p>
            </div>
          </div>
          {getMetadataEntries(selectedActivity.metadata).length ? (
            <div className="mt-4 grid gap-2 border-t border-[#eee9f8] pt-4 md:grid-cols-2 xl:grid-cols-3">
              {getMetadataEntries(selectedActivity.metadata).map(([key, value]) => (
                <div key={key} className="bg-[#fbf9ff] px-3 py-2">
                  <p className="text-[12px] font-semibold text-[#9b8caf]">{key}</p>
                  <p className="mt-1 break-words text-[13px] text-[#21192d]">
                    {Array.isArray(value) ? value.join(", ") : String(value)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function AdminActivityViewLegacy({
  activities,
  activityType,
  isLoading,
  query,
  setActivityType,
  setQuery,
  stats,
}) {
  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          icon={Users}
          label="Active Vendors"
          value={formatNumber(stats.vendors)}
          tone="text-[#665cf5]"
          hint="With activity records"
        />
        <AdminStatCard
          icon={Activity}
          label="Login Events"
          value={formatNumber(stats.logins)}
          tone="text-[#009b5a]"
          hint="Recent Email Marketing logins"
        />
        <AdminStatCard
          icon={Mail}
          label="Emails Sent"
          value={formatNumber(stats.emailsSent)}
          tone="text-[#0084c7]"
          hint={`${formatNumber(stats.campaigns)} campaigns`}
        />
        <AdminStatCard
          icon={AlertTriangle}
          label="Bounce Rate"
          value={`${stats.bounceRate || 0}%`}
          tone="text-[#dc2626]"
          hint={`${stats.complaintRate || 0}% complaint rate`}
        />
      </section>

      <section className="border border-[#ded7ef] bg-white shadow-[0_10px_28px_rgba(42,31,72,0.04)]">
        <div className="flex flex-col gap-4 border-b border-[#ded7ef] p-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-[17px] font-semibold text-[#21192d]">User Activity</h2>
            <p className="mt-1 text-[13px] text-[#9b8caf]">
              Login history, email events, campaign changes, and vendor actions
            </p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <label className="flex h-9 items-center gap-2 border border-[#ded7ef] bg-white px-3">
              <Search className="h-4 w-4 text-[#9b8caf]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search activity"
                className="w-full min-w-0 border-0 bg-transparent text-[13px] outline-none md:w-64"
              />
            </label>
            <select
              value={activityType}
              onChange={(event) => setActivityType(event.target.value)}
              className="h-9 border border-[#ded7ef] bg-white px-3 text-[13px] font-semibold text-[#5a4380] outline-none"
            >
              {Object.entries(activityTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-[13px] font-medium text-[#7f6f96]">
            Loading user activity...
          </div>
        ) : null}

        {!isLoading && !activities.length ? (
          <div className="p-10 text-center">
            <p className="text-[15px] font-semibold text-[#21192d]">No activity found</p>
            <p className="mt-2 text-[13px] text-[#7f6f96]">
              Vendor logins and marketing actions will appear here as they happen.
            </p>
          </div>
        ) : null}

        {activities.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-[13px]">
              <thead className="bg-[#fbf9ff] text-[12px] font-semibold text-[#6e5a93]">
                <tr>
                  <th className="px-5 py-3 font-medium">Activity</th>
                  <th className="px-5 py-3 font-medium">Vendor</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Details</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee9f8]">
                {activities.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#21192d]">{item.title}</p>
                      <p className="mt-1 max-w-[320px] truncate text-[12px] text-[#7f6f96]">{item.message}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#21192d]">{item.vendor?.name || "Vendor"}</p>
                      <p className="mt-1 text-[12px] text-[#9b8caf]">{item.vendor?.email || item.vendor?.vendorId}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 text-[12px] font-semibold ${getActivityTone(item.category)}`}>
                        {activityTypeLabels[item.category] || item.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[#7f6f96]">
                      <p>{item.entityType || "General"}</p>
                      {item.metrics ? (
                        <p className="mt-1 text-[12px]">
                          Sent {formatNumber(item.metrics.sent)} · Delivered {formatNumber(item.metrics.delivered)}
                        </p>
                      ) : null}
                      {item.metadata?.bounceType ? (
                        <p className="mt-1 text-[12px]">Bounce: {item.metadata.bounceType}</p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">
                      <span className="bg-[#f5efff] px-2.5 py-1 text-[12px] font-semibold text-[#5a4380]">
                        {item.status || item.action || "recorded"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[#7f6f96]">{formatDate(item.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}

const formatActivityDateGroup = (value) => {
  if (!value) {
    return "Unknown date";
  }

  const date = new Date(value);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startToday - startDate) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) {
    return "Today";
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(date);
};

const toDateInputValue = (date = new Date()) => {
  const value = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isSameLocalDate = (value, dateInputValue) => {
  if (!value || !dateInputValue) {
    return false;
  }

  return toDateInputValue(new Date(value)) === dateInputValue;
};

const getVendorActivityKey = (item = {}) =>
  item.vendor?.id || item.vendor?.vendorId || item.actor?.email || item.vendor?.email || "unknown";

function AdminVendorActivityView({
  activities,
  activityType,
  activityDateRange,
  isLoading,
  query,
  setActivityDateRange,
  setActivityType,
  setQuery,
  stats,
}) {
  const [selectedVendorKey, setSelectedVendorKey] = useState("");
  const [vendorActivityDateFilter, setVendorActivityDateFilter] = useState("today");
  const [vendorActivityCustomDate, setVendorActivityCustomDate] = useState(toDateInputValue());
  const moduleOptions = [
    ["all", "All activity"],
    ["login", "Login"],
    ["campaigns", "Campaigns"],
    ["subscribers", "Subscribers"],
    ["automations", "Automations"],
    ["segments", "Segments"],
    ["template", "Templates"],
    ["email", "Email events"],
    ["billing", "Billing"],
    ["settings", "Settings"],
  ];
  const vendorRows = useMemo(() => {
    const grouped = new Map();

    activities.forEach((item) => {
      const key = getVendorActivityKey(item);
      const current = grouped.get(key) || {
        key,
        vendor: item.vendor || {},
        actor: item.actor || {},
        activities: [],
        modules: new Set(),
        lastActivityAt: item.timestamp,
      };

      current.activities.push(item);
      current.modules.add(item.moduleLabel || activityTypeLabels[getActivityModule(item)] || getActivityModule(item));

      if (new Date(item.timestamp) > new Date(current.lastActivityAt)) {
        current.lastActivityAt = item.timestamp;
      }

      grouped.set(key, current);
    });

    return Array.from(grouped.values())
      .map((row) => ({
        ...row,
        modules: Array.from(row.modules).slice(0, 4),
      }))
      .sort((a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt));
  }, [activities]);
  const selectedVendor = vendorRows.find((row) => row.key === selectedVendorKey) || null;
  const selectedActivities = selectedVendor?.activities || [];
  const filteredSelectedActivities = useMemo(() => {
    if (!selectedActivities.length) {
      return [];
    }

    const todayValue = toDateInputValue();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayValue = toDateInputValue(yesterday);
    const selectedDate =
      vendorActivityDateFilter === "yesterday"
        ? yesterdayValue
        : vendorActivityDateFilter === "custom"
          ? vendorActivityCustomDate
          : todayValue;

    return selectedActivities.filter((item) => isSameLocalDate(item.timestamp, selectedDate));
  }, [selectedActivities, vendorActivityCustomDate, vendorActivityDateFilter]);
  const groupedActivities = filteredSelectedActivities.reduce((groups, item) => {
    const label = formatActivityDateGroup(item.timestamp);
    groups[label] = groups[label] || [];
    groups[label].push(item);
    return groups;
  }, {});

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          icon={Activity}
          label="Total Activities"
          value={formatNumber(stats.totalActivities || activities.length)}
          tone="text-[#665cf5]"
          hint={`${formatNumber(stats.todayActivities)} today`}
        />
        <AdminStatCard
          icon={Users}
          label="Tracked Vendors"
          value={formatNumber(vendorRows.length || stats.vendors)}
          tone="text-[#009b5a]"
          hint="With dashboard activity"
        />
        <AdminStatCard
          icon={Mail}
          label="Campaign Actions"
          value={formatNumber(stats.campaignActions)}
          tone="text-[#0084c7]"
          hint={`${formatNumber(stats.subscriberActions)} subscriber actions`}
        />
        <AdminStatCard
          icon={AlertTriangle}
          label="Failed Actions"
          value={formatNumber(stats.failedActivities)}
          tone="text-[#dc2626]"
          hint={`${formatNumber(stats.logins)} login events`}
        />
      </section>

      <section className="border border-[#ded7ef] bg-white shadow-[0_10px_28px_rgba(42,31,72,0.04)]">
        <div className="border-b border-[#ded7ef] p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-[17px] font-semibold text-[#21192d]">User Activity</h2>
              <p className="mt-1 text-[13px] text-[#7f6f96]">
                Select a vendor to review their complete dashboard activity history.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_160px_150px] xl:min-w-[680px]">
              <label className="flex h-10 items-center gap-2 border border-[#ded7ef] bg-white px-3">
                <Search className="h-4 w-4 text-[#9b8caf]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search vendor name"
                  className="w-full min-w-0 border-0 bg-transparent text-[13px] outline-none"
                />
              </label>
              {/* <select
                value={activityType}
                onChange={(event) => setActivityType(event.target.value)}
                className="h-10 border border-[#ded7ef] bg-white px-3 text-[13px] font-semibold text-[#5a4380] outline-none"
              >
                {moduleOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select> */}
              {/* <select
                value={activityDateRange}
                onChange={(event) => setActivityDateRange(event.target.value)}
                className="h-10 border border-[#ded7ef] bg-white px-3 text-[13px] font-semibold text-[#5a4380] outline-none"
              >
                {Object.entries(activityDateLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select> */}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-[13px] font-medium text-[#7f6f96]">
            Loading user activity...
          </div>
        ) : null}

        {!isLoading && !vendorRows.length ? (
          <div className="p-10 text-center">
            <p className="text-[15px] font-semibold text-[#21192d]">No vendor activity found</p>
            <p className="mt-2 text-[13px] text-[#7f6f96]">
              Activity will appear here once vendors use the dashboard.
            </p>
          </div>
        ) : null}

        {vendorRows.length ? (
          <div className="divide-y divide-[#eee9f8]">
            {vendorRows.map((row) => (
              <div key={row.key} className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1fr)_190px_150px] md:items-center">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-[#21192d]">
                    {row.vendor?.name || row.actor?.name || "Vendor"}
                  </p>
                  <p className="mt-1 truncate text-[12px] text-[#7f6f96]">
                    {row.vendor?.email || row.actor?.email || row.vendor?.vendorId}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {row.modules.map((module) => (
                      <span key={module} className="bg-[#f5efff] px-2.5 py-1 text-[12px] font-semibold text-[#5a4380]">
                        {module}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-[#9b8caf]">Last activity</p>
                  <p className="mt-1 text-[13px] font-semibold text-[#5a4380]">{formatDate(row.lastActivityAt)}</p>
                  <p className="mt-1 text-[12px] text-[#7f6f96]">{formatNumber(row.activities.length)} activities</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedVendorKey(row.key)}
                  className="h-10 border border-[#8338ec] px-4 text-[13px] font-semibold text-[#6d28d9] transition hover:bg-[#f5efff]"
                >
                  See activity
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {selectedVendor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#21192d]/45 p-4">
          <section className="max-h-[88vh] w-full max-w-5xl overflow-hidden border border-[#ded7ef] bg-white shadow-[0_24px_80px_rgba(33,25,45,0.24)]">
            <div className="flex flex-col gap-3 border-b border-[#ded7ef] p-5 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold uppercase text-[#7f6f96]">Vendor activity history</p>
                <h3 className="mt-1 truncate text-[20px] font-semibold text-[#21192d]">
                  {selectedVendor.vendor?.name || selectedVendor.actor?.name || "Vendor"}
                </h3>
                <p className="mt-1 truncate text-[13px] text-[#7f6f96]">
                  {selectedVendor.vendor?.email || selectedVendor.actor?.email || selectedVendor.vendor?.vendorId}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={vendorActivityDateFilter}
                  onChange={(event) => setVendorActivityDateFilter(event.target.value)}
                  className="h-9 border border-[#ded7ef] bg-white px-3 text-[13px] font-semibold text-[#5a4380] outline-none"
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="custom">Custom date</option>
                </select>
                {vendorActivityDateFilter === "custom" ? (
                  <input
                    type="date"
                    value={vendorActivityCustomDate}
                    onChange={(event) => setVendorActivityCustomDate(event.target.value)}
                    className="h-9 border border-[#ded7ef] bg-white px-3 text-[13px] font-semibold text-[#5a4380] outline-none"
                  />
                ) : null}
                <span className="bg-[#f5efff] px-3 py-1.5 text-[12px] font-semibold text-[#5a4380]">
                  {formatNumber(filteredSelectedActivities.length)} activities
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedVendorKey("")}
                  className="h-9 border border-[#ded7ef] px-4 text-[13px] font-semibold text-[#5a4380] hover:bg-[#fbf9ff]"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="max-h-[calc(88vh-105px)] overflow-y-auto p-5">
              {filteredSelectedActivities.length ? (
              Object.entries(groupedActivities).map(([dateLabel, items]) => (
                <div key={dateLabel} className="mb-6 last:mb-0">
                  <div className="mb-3 flex items-center gap-3">
                    <p className="text-[13px] font-semibold text-[#21192d]">{dateLabel}</p>
                    <div className="h-px flex-1 bg-[#eee9f8]" />
                  </div>
                  <div className="space-y-3">
                    {items.map((item) => {
                      const module = getActivityModule(item);
                      const StatusIcon = ["failed", "error"].includes(String(item.status || "").toLowerCase())
                        ? XCircle
                        : CheckCircle2;

                      return (
                        <div key={item.id} className="grid gap-3 border border-[#eee9f8] p-4 md:grid-cols-[82px_minmax(0,1fr)]">
                          <div className="flex items-center gap-2 text-[12px] font-semibold text-[#6e5a93]">
                            <Clock3 className="h-4 w-4" />
                            {formatActivityClock(item.timestamp)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`px-2.5 py-1 text-[12px] font-semibold ${getActivityTone(module)}`}>
                                {item.moduleLabel || activityTypeLabels[module] || module}
                              </span>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-semibold ${getActivityIconTone(item.status)}`}>
                                <StatusIcon className="h-3.5 w-3.5" />
                                {item.status || item.action || "completed"}
                              </span>
                            </div>
                            <p className="mt-2 text-[14px] font-semibold text-[#21192d]">{item.title}</p>
                            <p className="mt-1 text-[13px] leading-5 text-[#7f6f96]">{item.message}</p>
                            {item.entityName || item.ipAddress || getMetadataEntries(item.metadata).length ? (
                              <div className="mt-3 grid gap-2 md:grid-cols-3">
                                {item.entityName ? (
                                  <div className="bg-[#fbf9ff] px-3 py-2">
                                    <p className="text-[12px] font-semibold text-[#9b8caf]">Target</p>
                                    <p className="mt-1 break-words text-[13px] text-[#21192d]">{item.entityName}</p>
                                  </div>
                                ) : null}
                                {item.ipAddress ? (
                                  <div className="bg-[#fbf9ff] px-3 py-2">
                                    <p className="text-[12px] font-semibold text-[#9b8caf]">IP address</p>
                                    <p className="mt-1 break-words text-[13px] text-[#21192d]">{item.ipAddress}</p>
                                  </div>
                                ) : null}
                                {getMetadataEntries(item.metadata).slice(0, 4).map(([key, value]) => (
                                  <div key={key} className="bg-[#fbf9ff] px-3 py-2">
                                    <p className="text-[12px] font-semibold text-[#9b8caf]">{key}</p>
                                    <p className="mt-1 break-words text-[13px] text-[#21192d]">
                                      {Array.isArray(value) ? value.join(", ") : String(value)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
              ) : (
                <div className="border border-[#eee9f8] bg-[#fbf9ff] p-8 text-center">
                  <p className="text-[15px] font-semibold text-[#21192d]">No activity found</p>
                  <p className="mt-2 text-[13px] text-[#7f6f96]">
                    No activity is available for the selected date.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function AdminRiskMonitoringView({
  isLoading,
  query,
  setQuery,
  stats,
  updatingVendorId,
  updateVendorStatus,
  vendors,
}) {
  const highRiskVendors = vendors.filter(
    (vendor) => (vendor.bounceRate || 0) >= 5 || (vendor.complaintRate || 0) >= 1,
  );

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          icon={ShieldAlert}
          label="Risky Vendors"
          value={formatNumber(highRiskVendors.length)}
          tone="text-[#dc2626]"
          hint="Bounce or complaint signals"
        />
        <AdminStatCard
          icon={Ban}
          label="Suspended"
          value={formatNumber(stats.suspended)}
          tone="text-[#f97316]"
          hint="Blocked by admin"
        />
        <AdminStatCard
          icon={Mail}
          label="Emails Sent"
          value={formatNumber(stats.emailsSent)}
          tone="text-[#0084c7]"
          hint="Across monitored vendors"
        />
        <AdminStatCard
          icon={Users}
          label="Monitored Vendors"
          value={formatNumber(stats.total)}
          tone="text-[#665cf5]"
          hint="Logged into marketing"
        />
      </section>

      <section className="border border-[#ded7ef] bg-white shadow-[0_10px_28px_rgba(42,31,72,0.04)]">
        <div className="flex flex-col gap-4 border-b border-[#ded7ef] p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-[17px] font-semibold text-[#21192d]">Risk Monitoring</h2>
            <p className="mt-1 text-[13px] text-[#9b8caf]">
              Vendor-wise risk signals and admin suspension controls
            </p>
          </div>
          <label className="flex h-9 items-center gap-2 border border-[#ded7ef] bg-white px-3">
            <Search className="h-4 w-4 text-[#9b8caf]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search vendors"
              className="w-full min-w-0 border-0 bg-transparent text-[13px] outline-none md:w-64"
            />
          </label>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-[13px] font-medium text-[#7f6f96]">
            Loading risk monitoring...
          </div>
        ) : null}

        {!isLoading && !vendors.length ? (
          <div className="p-10 text-center">
            <p className="text-[15px] font-semibold text-[#21192d]">No monitored vendors found</p>
            <p className="mt-2 text-[13px] text-[#7f6f96]">
              Vendors will appear here after they sign in to Email Marketing.
            </p>
          </div>
        ) : null}

        {vendors.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-[13px]">
              <thead className="bg-[#fbf9ff] text-[12px] font-semibold text-[#6e5a93]">
                <tr>
                  <th className="px-5 py-3 font-medium">Vendor</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Email Volume</th>
                  <th className="px-5 py-3 font-medium">Bounce Rate</th>
                  <th className="px-5 py-3 font-medium">Complaint Rate</th>
                  <th className="px-5 py-3 font-medium">Risk Level</th>
                  <th className="px-5 py-3 font-medium">Last Login</th>
                  <th className="px-5 py-3 font-medium">Admin Power</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee9f8]">
                {vendors.map((vendor) => {
                  const isHighRisk = (vendor.bounceRate || 0) >= 5 || (vendor.complaintRate || 0) >= 1;
                  const isMediumRisk = !isHighRisk && ((vendor.bounceRate || 0) >= 2 || (vendor.complaintRate || 0) > 0);
                  const riskLabel = isHighRisk ? "High" : isMediumRisk ? "Medium" : "Low";
                  const riskClass = isHighRisk
                    ? "bg-rose-50 text-rose-700"
                    : isMediumRisk
                      ? "bg-orange-50 text-orange-700"
                      : "bg-emerald-50 text-emerald-700";

                  return (
                    <tr key={vendor.id} className="align-top">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-[#21192d]">{vendor.businessName || vendor.name}</p>
                        <p className="mt-1 text-[12px] text-[#9b8caf]">{vendor.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`px-2.5 py-1 text-[12px] font-semibold ${
                            vendor.accountStatus === "inactive"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {vendor.accountStatus === "inactive" ? "Suspended" : "Active"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-[#21192d]">{formatNumber(vendor.emailsSent)}</p>
                        <p className="mt-1 text-[12px] text-[#9b8caf]">
                          {formatNumber(vendor.campaigns)} campaigns
                        </p>
                      </td>
                      <td className="px-5 py-4 font-semibold text-orange-600">{vendor.bounceRate}%</td>
                      <td className="px-5 py-4 font-semibold text-rose-600">{vendor.complaintRate}%</td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 text-[12px] font-semibold ${riskClass}`}>{riskLabel}</span>
                      </td>
                      <td className="px-5 py-4 text-[#7f6f96]">{formatDate(vendor.lastLoginAt)}</td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => updateVendorStatus(vendor)}
                          disabled={updatingVendorId === vendor.id}
                          className={`border px-3 py-2 text-[12px] font-semibold transition disabled:opacity-60 ${
                            vendor.accountStatus === "inactive"
                              ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              : "border-rose-200 text-rose-700 hover:bg-rose-50"
                          }`}
                        >
                          {vendor.accountStatus === "inactive" ? "Activate" : "Suspend"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}

const emptyPlanForm = {
  name: "",
  slug: "",
  description: "",
  monthlyPrice: "",
  yearlyPrice: "",
  emailsPerDay: "",
  emailsPerMonth: "",
  features: "",
  automations: "",
  teamMembers: "",
  templates: "",
  segments: "",
  isActive: true,
  isDefault: false,
  sortOrder: "",
};

const emptyCreditPackForm = {
  id: "",
  name: "",
  credits: "",
  price: "",
  isActive: true,
  sortOrder: "",
};

const billingViewHelpText = {
  settings:
    "Set the default rules for using credits, such as when credits expire, when to warn about low balance, how many emails a vendor can send per day, and the maximum recipients allowed in one campaign.",
  packs:
    "Create and manage credit packs that vendors can purchase. Each pack defines how many email credits the vendor gets and how much they pay for it.",
  wallets:
    "Manage each vendor's credit balance. You can add or deduct credits manually, freeze a wallet, freeze email sending, or set custom sending limits for a specific vendor.",
  payments:
    "View all payment records from vendors, including subscription payments and credit pack purchases. This helps you track successful, pending, or failed payments.",
  invoices:
    "View invoices generated for vendor payments. These invoices are linked to plans or credit purchases and can be used for billing and GST records.",
  plans:
    "Create and edit subscription plans for vendors. Plans control pricing, billing cycle options, and feature limits such as templates, automations, segments, or team members.",
  subscriptions:
    "Manage which plan is assigned to each vendor. You can update the vendor's plan, subscription status, billing cycle, and manual billing details.",
};

function AdminBillingView({
  billingView,
  creditPackForm,
  creditPacks,
  invoices,
  isLoading,
  onCreditPackDelete,
  onCreditPackSubmit,
  onPlanSubmit,
  onSettingsSubmit,
  onSubscriptionUpdate,
  onWalletUpdate,
  payments,
  planForm,
  plans,
  paygSettings,
  setBillingView,
  setCreditPackForm,
  setPlanForm,
  setPaygSettings,
  subscriptions,
  updatingSubscriptionId,
  wallets,
}) {
  const [billingTooltip, setBillingTooltip] = useState(null);
  const [walletModal, setWalletModal] = useState(null);
  const [walletForm, setWalletForm] = useState({
    credits: "",
    reason: "",
    customPerEmailPrice: "",
    customDailySendLimit: "",
    customMaxRecipientsPerCampaign: "",
    isFrozen: false,
    sendingFrozen: false,
  });
  const activePlans = plans.filter((plan) => plan.isActive);
  const activeSubscriptions = subscriptions.filter((item) => ["active", "free", "trial"].includes(item.status));
  const monthlyRevenue = subscriptions.reduce((sum, item) => {
    const plan = item.planId || {};
    if (item.status !== "active") {
      return sum;
    }

    return sum + Number(item.billingCycle === "yearly" ? (plan.yearlyPrice || 0) / 12 : plan.monthlyPrice || 0);
  }, 0);
  const showBillingTooltip = (event, item) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = Math.min(420, window.innerWidth - 32);
    const left = Math.min(Math.max(rect.left, 16), window.innerWidth - width - 16);
    const top = rect.bottom + 8;

    setBillingTooltip({ item, left, top, width });
  };
  const openWalletModal = (wallet) => {
    setWalletModal(wallet);
    setWalletForm({
      credits: "",
      reason: "",
      customPerEmailPrice: wallet.customPerEmailPrice ?? "",
      customDailySendLimit: wallet.customDailySendLimit ?? "",
      customMaxRecipientsPerCampaign: wallet.customMaxRecipientsPerCampaign ?? "",
      isFrozen: Boolean(wallet.isFrozen),
      sendingFrozen: Boolean(wallet.sendingFrozen),
    });
  };
  const updateWalletForm = (key, value) => {
    setWalletForm((current) => ({ ...current, [key]: value }));
  };
  const submitWalletAction = async (type) => {
    if (!walletModal) {
      return;
    }

    const didUpdate = await onWalletUpdate(walletModal, type, {
      credits: walletForm.credits,
      reason: walletForm.reason,
    });
    if (didUpdate) {
      setWalletForm((current) => ({ ...current, credits: "", reason: "" }));
    }
  };
  const submitWalletControls = async () => {
    if (!walletModal) {
      return;
    }

    const didUpdate = await onWalletUpdate(walletModal, "controls", {
      customPerEmailPrice: walletForm.customPerEmailPrice,
      customDailySendLimit: walletForm.customDailySendLimit,
      customMaxRecipientsPerCampaign: walletForm.customMaxRecipientsPerCampaign,
      isFrozen: walletForm.isFrozen,
      sendingFrozen: walletForm.sendingFrozen,
      reason: walletForm.reason || "Admin wallet control update",
    });
    if (didUpdate) {
      setWalletModal(null);
    }
  };

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          icon={FileText}
          label="Plans"
          value={formatNumber(plans.length)}
          tone="text-[#665cf5]"
          hint={`${formatNumber(activePlans.length)} active`}
        />
        <AdminStatCard
          icon={CreditCard}
          label="Subscriptions"
          value={formatNumber(subscriptions.length)}
          tone="text-[#009b5a]"
          hint={`${formatNumber(activeSubscriptions.length)} usable`}
        />
        <AdminStatCard
          icon={BadgeIndianRupee}
          label="Monthly Revenue"
          value={formatCurrency(monthlyRevenue)}
          tone="text-[#cf7a00]"
          hint="Projected from active plans"
        />
        <AdminStatCard
          icon={Receipt}
          label="Invoices"
          value={formatNumber(invoices.length)}
          tone="text-[#d9467a]"
          hint={`${formatNumber(payments.length)} payments`}
        />
      </section>

      <section className="border border-[#ded7ef] bg-white shadow-[0_10px_28px_rgba(42,31,72,0.04)]">
        <div className="flex flex-col gap-4 border-b border-[#ded7ef] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[17px] font-semibold text-[#21192d]">Billing & Credits</h2>
            <p className="mt-1 text-[13px] text-[#9b8caf]">
              PAYG settings, credit packs, vendor wallets, payments, and GST-ready invoices
            </p>
          </div>
          <div className="flex max-w-3xl flex-wrap gap-2">
            {["settings", "packs", "wallets", "payments", "invoices", "plans", "subscriptions"].map((item) => (
              <div key={item}>
                <button
                  type="button"
                  onClick={() => setBillingView(item)}
                  onBlur={() => setBillingTooltip(null)}
                  onFocus={(event) => showBillingTooltip(event, item)}
                  onMouseEnter={(event) => showBillingTooltip(event, item)}
                  onMouseLeave={() => setBillingTooltip(null)}
                  aria-describedby={billingTooltip?.item === item ? `billing-view-helper-${item}` : undefined}
                  className={`border px-3 py-2 text-[12px] font-semibold capitalize ${
                    billingView === item
                      ? "border-[#b99be7] bg-[#f5efff] text-[#3b176d]"
                      : "border-[#ded7ef] bg-white text-[#5a4380]"
                  }`}
                >
                  {item}
                </button>
              </div>
            ))}
            {billingTooltip ? (
              <div
                id={`billing-view-helper-${billingTooltip.item}`}
                role="tooltip"
                style={{
                  left: `${billingTooltip.left}px`,
                  top: `${billingTooltip.top}px`,
                  width: `${billingTooltip.width}px`,
                }}
                className="fixed z-50 border border-[#ded7ef] bg-white px-3 py-2 text-[12px] leading-5 text-[#5a4380] shadow-[0_14px_34px_rgba(42,31,72,0.14)]"
              >
                {billingViewHelpText[billingTooltip.item]}
              </div>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-[13px] font-medium text-[#7f6f96]">Loading billing...</div>
        ) : null}

        {billingView === "plans" ? (
          <div className="grid gap-5 p-5 xl:grid-cols-[360px_1fr]">
            <form className="space-y-3 border border-[#ded7ef] p-4" onSubmit={onPlanSubmit}>
              <div>
                <h3 className="text-[15px] font-semibold text-[#21192d]">
                  {planForm.id ? "Edit Plan" : "Create Plan"}
                </h3>
                <p className="mt-1 text-[12px] text-[#9b8caf]">Define quota, pricing, and features.</p>
              </div>
              {[
                ["name", "Plan name"],
                ["slug", "Slug"],
                ["description", "Description"],
                ["monthlyPrice", "Monthly price"],
                ["yearlyPrice", "Yearly price"],
                ["emailsPerDay", "Emails per day"],
                ["emailsPerMonth", "Emails per month"],
                ["automations", "Automation limit"],
                ["teamMembers", "Team members"],
                ["templates", "Template limit"],
                ["segments", "Segment limit"],
                ["sortOrder", "Sort order"],
              ].map(([key, label]) => (
                <label key={key} className="block">
                  <span className="text-[12px] font-semibold text-[#6e5a93]">{label}</span>
                  <input
                    value={planForm[key]}
                    onChange={(event) => setPlanForm((current) => ({ ...current, [key]: event.target.value }))}
                    className="mt-1 h-9 w-full border border-[#ded7ef] px-3 text-[13px] outline-none"
                  />
                </label>
              ))}
              <label className="block">
                <span className="text-[12px] font-semibold text-[#6e5a93]">Features</span>
                <textarea
                  value={planForm.features}
                  onChange={(event) => setPlanForm((current) => ({ ...current, features: event.target.value }))}
                  className="mt-1 min-h-20 w-full border border-[#ded7ef] px-3 py-2 text-[13px] outline-none"
                  placeholder="One feature per line"
                />
              </label>
              <div className="flex gap-4 text-[12px] font-semibold text-[#5a4380]">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={planForm.isActive}
                    onChange={(event) => setPlanForm((current) => ({ ...current, isActive: event.target.checked }))}
                  />
                  Active
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={planForm.isDefault}
                    onChange={(event) => setPlanForm((current) => ({ ...current, isDefault: event.target.checked }))}
                  />
                  Default
                </label>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="border border-[#8338ec] bg-[#8338ec] px-4 py-2 text-[12px] font-semibold text-white">
                  {planForm.id ? "Update Plan" : "Create Plan"}
                </button>
                {planForm.id ? (
                  <button
                    type="button"
                    onClick={() => setPlanForm(emptyPlanForm)}
                    className="border border-[#ded7ef] px-4 py-2 text-[12px] font-semibold text-[#5a4380]"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>

            <div className="grid gap-4 md:grid-cols-2">
              {plans.map((plan) => (
                <div key={plan._id} className="border border-[#ded7ef] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[16px] font-semibold text-[#21192d]">{plan.name}</h3>
                      <p className="mt-1 text-[12px] text-[#9b8caf]">{plan.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setPlanForm({
                          id: plan._id,
                          name: plan.name || "",
                          slug: plan.slug || "",
                          description: plan.description || "",
                          monthlyPrice: plan.monthlyPrice || "",
                          yearlyPrice: plan.yearlyPrice || "",
                          emailsPerDay: plan.emailsPerDay || "",
                          emailsPerMonth: plan.emailsPerMonth || "",
                          features: (plan.features || []).join("\n"),
                          automations: plan.limits?.automations || "",
                          teamMembers: plan.limits?.teamMembers || "",
                          templates: plan.limits?.templates || "",
                          segments: plan.limits?.segments || "",
                          isActive: plan.isActive,
                          isDefault: plan.isDefault,
                          sortOrder: plan.sortOrder || "",
                        })
                      }
                      className="border border-[#ded7ef] px-3 py-1.5 text-[12px] font-semibold text-[#5a4380]"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
                    <MetricDetail label="Monthly" value={formatPlanPrice(plan.monthlyPrice, plan.currency)} />
                    <MetricDetail label="Yearly" value={formatPlanPrice(plan.yearlyPrice, plan.currency)} />
                    <MetricDetail label="Daily Emails" value={formatNumber(plan.emailsPerDay)} />
                    <MetricDetail label="Monthly Emails" value={formatNumber(plan.emailsPerMonth)} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(plan.features || []).slice(0, 5).map((feature) => (
                      <span key={feature} className="bg-[#f5efff] px-2 py-1 text-[11px] font-semibold text-[#5a4380]">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {billingView === "settings" ? (
          <form className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3" onSubmit={onSettingsSubmit}>
            {[
              ["creditExpiryMonths", "Credit expiry months (0 = no expiry)"],
              ["lowBalanceWarningThreshold", "Low balance warning threshold"],
              ["dailySendLimitDefault", "Daily send limit default"],
              ["maxRecipientsPerCampaignDefault", "Max recipients per campaign default"],
            ].map(([key, label]) => (
              <label key={key} className="block">
                <span className="text-[12px] font-semibold text-[#6e5a93]">{label}</span>
                <input
                  type="number"
                  step="1"
                  value={paygSettings[key] ?? ""}
                  onChange={(event) => setPaygSettings((current) => ({ ...current, [key]: event.target.value }))}
                  className="mt-1 h-10 w-full border border-[#ded7ef] px-3 text-[13px] outline-none"
                />
              </label>
            ))}
            <div className="flex items-end">
              <button type="submit" className="border border-[#8338ec] bg-[#8338ec] px-4 py-2.5 text-[12px] font-semibold text-white">
                Save PAYG Settings
              </button>
            </div>
          </form>
        ) : null}

        {billingView === "packs" ? (
          <div className="grid gap-5 p-5 xl:grid-cols-[340px_1fr]">
            <form className="space-y-3 border border-[#ded7ef] p-4" onSubmit={onCreditPackSubmit}>
              <div>
                <h3 className="text-[15px] font-semibold text-[#21192d]">
                  {creditPackForm.id ? "Edit Credit Pack" : "Create Credit Pack"}
                </h3>
                <p className="mt-1 text-[12px] text-[#9b8caf]">Define PAYG credit packs for vendors.</p>
              </div>
              {[
                ["name", "Pack name"],
                ["credits", "Credits"],
                ["price", "Price"],
                ["sortOrder", "Sort order"],
              ].map(([key, label]) => (
                <label key={key} className="block">
                  <span className="text-[12px] font-semibold text-[#6e5a93]">{label}</span>
                  <input
                    value={creditPackForm[key]}
                    onChange={(event) => setCreditPackForm((current) => ({ ...current, [key]: event.target.value }))}
                    className="mt-1 h-9 w-full border border-[#ded7ef] px-3 text-[13px] outline-none"
                  />
                </label>
              ))}
              <label className="flex items-center gap-2 text-[12px] font-semibold text-[#5a4380]">
                <input
                  type="checkbox"
                  checked={creditPackForm.isActive}
                  onChange={(event) => setCreditPackForm((current) => ({ ...current, isActive: event.target.checked }))}
                />
                Active
              </label>
              <div className="flex gap-2">
                <button type="submit" className="border border-[#8338ec] bg-[#8338ec] px-4 py-2 text-[12px] font-semibold text-white">
                  {creditPackForm.id ? "Update Pack" : "Create Pack"}
                </button>
                {creditPackForm.id ? (
                  <button
                    type="button"
                    onClick={() => setCreditPackForm(emptyCreditPackForm)}
                    className="border border-[#ded7ef] px-4 py-2 text-[12px] font-semibold text-[#5a4380]"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
            <div className="grid gap-4 md:grid-cols-2">
              {creditPacks.map((pack) => (
                <div key={pack._id} className="border border-[#ded7ef] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[16px] font-semibold text-[#21192d]">{pack.name}</h3>
                      <p className="mt-1 text-[12px] text-[#9b8caf]">
                        {formatNumber(pack.credits)} credits at {formatPlanPrice(pack.price, pack.currency)}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-[11px] font-semibold ${pack.isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                      {pack.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
                    <MetricDetail label="Per Email" value={`₹${Number(pack.effectiveRate || pack.price / Math.max(pack.credits, 1)).toFixed(3)}`} />
                    <MetricDetail label="Sort Order" value={pack.sortOrder || 0} />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCreditPackForm({
                          id: pack._id,
                          name: pack.name || "",
                          credits: pack.credits || "",
                          price: pack.price || "",
                          isActive: pack.isActive,
                          sortOrder: pack.sortOrder || "",
                        })
                      }
                      className="border border-[#ded7ef] px-3 py-1.5 text-[12px] font-semibold text-[#5a4380]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onCreditPackDelete(pack)}
                      className="border border-rose-200 px-3 py-1.5 text-[12px] font-semibold text-rose-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {billingView === "wallets" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-[13px]">
              <thead className="bg-[#fbf9ff] text-[12px] font-semibold text-[#6e5a93]">
                <tr>
                  <th className="px-5 py-3 font-medium">Vendor</th>
                  <th className="px-5 py-3 font-medium">Credits</th>
                  <th className="px-5 py-3 font-medium">Purchased / Used</th>
                  <th className="px-5 py-3 font-medium">Last Purchase</th>
                  <th className="px-5 py-3 font-medium">Controls</th>
                  <th className="px-5 py-3 font-medium">Wallet Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee9f8]">
                {wallets.map((wallet) => (
                  <tr key={wallet._id || wallet.vendorId}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#21192d]">{wallet.vendor?.name}</p>
                      <p className="mt-1 text-[12px] text-[#9b8caf]">{wallet.vendor?.email || wallet.vendorId}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#21192d]">{formatNumber(wallet.availableCredits)} available</p>
                      <p className="mt-1 text-[12px] text-[#9b8caf]">{formatNumber(wallet.reservedCredits)} reserved</p>
                    </td>
                    <td className="px-5 py-4 text-[#7f6f96]">
                      <p>{formatNumber((wallet.totals?.totalPurchased || 0) + (wallet.totals?.totalAdminAdded || 0))} purchased/added</p>
                      <p className="mt-1">{formatNumber(wallet.totals?.totalUsed || wallet.usedCredits || 0)} used</p>
                      <p className="mt-1">{formatNumber(wallet.totals?.failedBeforeSendRefunds || 0)} failed-before-send refunds</p>
                    </td>
                    <td className="px-5 py-4 text-[#7f6f96]">{formatDate(wallet.totals?.lastPurchaseDate || wallet.lastPurchaseAt)}</td>
                    <td className="px-5 py-4 text-[#7f6f96]">
                      <p>{wallet.isFrozen ? "Wallet frozen" : "Wallet active"}</p>
                      <p className="mt-1">{wallet.sendingFrozen ? "Sending frozen" : "Sending active"}</p>
                      <p className="mt-1">Rate: {wallet.customPerEmailPrice ?? "default"}</p>
                      <p className="mt-1">Daily: {wallet.customDailySendLimit ?? "default"}</p>
                      <p className="mt-1">Campaign max: {wallet.customMaxRecipientsPerCampaign ?? "default"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => openWalletModal(wallet)}
                        className="border border-[#8338ec] bg-[#8338ec] px-3 py-2 text-[12px] font-semibold text-white"
                      >
                        Manage Wallet
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {walletModal ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#21192d]/30 px-4 py-6">
                <button
                  type="button"
                  className="absolute inset-0 cursor-default"
                  onClick={() => setWalletModal(null)}
                  aria-label="Close wallet manager"
                />
                <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-[#ded7ef] bg-white shadow-[0_24px_64px_rgba(42,31,72,0.22)]">
                  <div className="flex items-start justify-between gap-4 border-b border-[#eee9f8] px-5 py-4">
                    <div>
                      <p className="text-[12px] font-semibold uppercase text-[#9b8caf]">Manage Wallet</p>
                      <h3 className="mt-1 text-[18px] font-semibold text-[#21192d]">
                        {walletModal.vendor?.name || walletModal.vendorId}
                      </h3>
                      <p className="mt-1 text-[12px] text-[#7f6f96]">
                        {formatNumber(walletModal.availableCredits)} available / {formatNumber(walletModal.reservedCredits)} reserved
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWalletModal(null)}
                      className="border border-[#ded7ef] px-3 py-2 text-[12px] font-semibold text-[#5a4380] hover:bg-[#f5efff]"
                    >
                      Close
                    </button>
                  </div>

                  <div className="grid gap-5 p-5 lg:grid-cols-2">
                    <section className="border border-[#eee9f8] p-4">
                      <h4 className="text-[14px] font-semibold text-[#21192d]">Credit adjustment</h4>
                      <p className="mt-1 text-[12px] leading-5 text-[#9b8caf]">
                        Add, deduct, or refund credits for this vendor wallet.
                      </p>
                      <div className="mt-4 grid gap-3">
                        <label className="block">
                          <span className="text-[12px] font-semibold text-[#6e5a93]">Credits</span>
                          <input
                            type="number"
                            min="0"
                            value={walletForm.credits}
                            onChange={(event) => updateWalletForm("credits", event.target.value)}
                            className="mt-1 h-10 w-full border border-[#ded7ef] px-3 text-[13px] outline-none"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[12px] font-semibold text-[#6e5a93]">Reason</span>
                          <input
                            value={walletForm.reason}
                            onChange={(event) => updateWalletForm("reason", event.target.value)}
                            className="mt-1 h-10 w-full border border-[#ded7ef] px-3 text-[13px] outline-none"
                          />
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => submitWalletAction("add")}
                            className="border border-emerald-200 px-3 py-2 text-[12px] font-semibold text-emerald-700"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => submitWalletAction("deduct")}
                            className="border border-rose-200 px-3 py-2 text-[12px] font-semibold text-rose-700"
                          >
                            Deduct
                          </button>
                          <button
                            type="button"
                            onClick={() => submitWalletAction("refund")}
                            className="border border-[#ded7ef] px-3 py-2 text-[12px] font-semibold text-[#5a4380]"
                          >
                            Refund
                          </button>
                        </div>
                      </div>
                    </section>

                    <section className="border border-[#eee9f8] p-4">
                      <h4 className="text-[14px] font-semibold text-[#21192d]">Wallet controls</h4>
                      <p className="mt-1 text-[12px] leading-5 text-[#9b8caf]">
                        Freeze wallet access, pause sending, or set vendor-specific limits.
                      </p>
                      <div className="mt-4 grid gap-3">
                        <label className="flex items-center justify-between gap-4 border border-[#eee9f8] px-3 py-2 text-[13px] font-semibold text-[#5a4380]">
                          Freeze wallet
                          <input
                            type="checkbox"
                            checked={walletForm.isFrozen}
                            onChange={(event) => updateWalletForm("isFrozen", event.target.checked)}
                          />
                        </label>
                        <label className="flex items-center justify-between gap-4 border border-[#eee9f8] px-3 py-2 text-[13px] font-semibold text-[#5a4380]">
                          Freeze sending
                          <input
                            type="checkbox"
                            checked={walletForm.sendingFrozen}
                            onChange={(event) => updateWalletForm("sendingFrozen", event.target.checked)}
                          />
                        </label>
                        <label className="block">
                          <span className="text-[12px] font-semibold text-[#6e5a93]">Custom rate</span>
                          <input
                            type="number"
                            step="0.001"
                            value={walletForm.customPerEmailPrice}
                            onChange={(event) => updateWalletForm("customPerEmailPrice", event.target.value)}
                            placeholder="Leave blank for default"
                            className="mt-1 h-10 w-full border border-[#ded7ef] px-3 text-[13px] outline-none"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[12px] font-semibold text-[#6e5a93]">Daily limit</span>
                          <input
                            type="number"
                            value={walletForm.customDailySendLimit}
                            onChange={(event) => updateWalletForm("customDailySendLimit", event.target.value)}
                            placeholder="Leave blank for default"
                            className="mt-1 h-10 w-full border border-[#ded7ef] px-3 text-[13px] outline-none"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[12px] font-semibold text-[#6e5a93]">Campaign max recipients</span>
                          <input
                            type="number"
                            value={walletForm.customMaxRecipientsPerCampaign}
                            onChange={(event) => updateWalletForm("customMaxRecipientsPerCampaign", event.target.value)}
                            placeholder="Leave blank for default"
                            className="mt-1 h-10 w-full border border-[#ded7ef] px-3 text-[13px] outline-none"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={submitWalletControls}
                          className="border border-[#8338ec] bg-[#8338ec] px-4 py-2.5 text-[12px] font-semibold text-white"
                        >
                          Save controls
                        </button>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {billingView === "subscriptions" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-[13px]">
              <thead className="bg-[#fbf9ff] text-[12px] font-semibold text-[#6e5a93]">
                <tr>
                  <th className="px-5 py-3 font-medium">Vendor</th>
                  <th className="px-5 py-3 font-medium">Current Plan</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Period End</th>
                  <th className="px-5 py-3 font-medium">Change Plan</th>
                  <th className="px-5 py-3 font-medium">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee9f8]">
                {subscriptions.map((subscription) => (
                  <tr key={subscription._id}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#21192d]">{subscription.vendor?.name}</p>
                      <p className="mt-1 text-[12px] text-[#9b8caf]">{subscription.vendor?.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#21192d]">{subscription.planId?.name}</p>
                      <p className="mt-1 text-[12px] text-[#9b8caf]">
                        {formatPlanPrice(subscription.planId?.monthlyPrice, subscription.planId?.currency)} / month
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="bg-[#f5efff] px-2.5 py-1 text-[12px] font-semibold text-[#5a4380]">
                        {subscription.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[#7f6f96]">{formatDate(subscription.currentPeriodEnd)}</td>
                    <td className="px-5 py-4">
                      <select
                        defaultValue={subscription.planId?._id}
                        onChange={(event) =>
                          onSubscriptionUpdate(subscription, { planId: event.target.value, status: "active" })
                        }
                        className="h-9 border border-[#ded7ef] bg-white px-3 text-[13px] outline-none"
                      >
                        {plans.map((plan) => (
                          <option key={plan._id} value={plan._id}>
                            {plan.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={updatingSubscriptionId === subscription._id}
                          onClick={() => onSubscriptionUpdate(subscription, { status: "active" })}
                          className="border border-emerald-200 px-3 py-2 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                        >
                          Activate
                        </button>
                        <button
                          type="button"
                          disabled={updatingSubscriptionId === subscription._id}
                          onClick={() => onSubscriptionUpdate(subscription, { status: "payment_failed" })}
                          className="border border-rose-200 px-3 py-2 text-[12px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                        >
                          Limit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {billingView === "payments" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-[13px]">
              <thead className="bg-[#fbf9ff] text-[12px] font-semibold text-[#6e5a93]">
                <tr>
                  <th className="px-5 py-3 font-medium">Vendor</th>
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium">Gateway</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee9f8]">
                {payments.map((payment) => (
                  <tr key={payment._id}>
                    <td className="px-5 py-4 font-semibold text-[#21192d]">{payment.vendor?.name}</td>
                    <td className="px-5 py-4 text-[#7f6f96]">{payment.planId?.name || "Manual"}</td>
                    <td className="px-5 py-4 text-[#7f6f96]">{payment.gateway}</td>
                    <td className="px-5 py-4 font-semibold text-[#21192d]">
                      {formatPlanPrice(payment.totalAmount, payment.currency)}
                    </td>
                    <td className="px-5 py-4 text-[#7f6f96]">{payment.status}</td>
                    <td className="px-5 py-4 text-[#7f6f96]">{formatDate(payment.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {billingView === "invoices" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-[13px]">
              <thead className="bg-[#fbf9ff] text-[12px] font-semibold text-[#6e5a93]">
                <tr>
                  <th className="px-5 py-3 font-medium">Invoice</th>
                  <th className="px-5 py-3 font-medium">Vendor</th>
                  <th className="px-5 py-3 font-medium">GST</th>
                  <th className="px-5 py-3 font-medium">Total</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Issued</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee9f8]">
                {invoices.map((invoice) => (
                  <tr key={invoice._id}>
                    <td className="px-5 py-4 font-semibold text-[#21192d]">{invoice.invoiceNumber}</td>
                    <td className="px-5 py-4 text-[#7f6f96]">{invoice.vendor?.name}</td>
                    <td className="px-5 py-4 text-[#7f6f96]">{formatPlanPrice(invoice.gstAmount, invoice.currency)}</td>
                    <td className="px-5 py-4 font-semibold text-[#21192d]">
                      {formatPlanPrice(invoice.total, invoice.currency)}
                    </td>
                    <td className="px-5 py-4 text-[#7f6f96]">{invoice.status}</td>
                    <td className="px-5 py-4 text-[#7f6f96]">{formatDate(invoice.issuedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function AdminDashboardPage() {
  const { admin } = useContext(AuthContext);
  const toast = useContext(ToastContext);
  const [overview, setOverview] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsersMeta, setAdminUsersMeta] = useState({
    limit: ADMIN_USERS_PAGE_SIZE,
    page: 1,
    total: 0,
    totalPages: 1,
  });
  const [adminUsersServerStats, setAdminUsersServerStats] = useState(null);
  const [activityOverview, setActivityOverview] = useState({ activities: [], stats: {} });
  const [billingData, setBillingData] = useState({
    creditPacks: [],
    invoices: [],
    payments: [],
    plans: [],
    paygSettings: {},
    subscriptions: [],
    wallets: [],
  });
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [usersQuery, setUsersQuery] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const [riskQuery, setRiskQuery] = useState("");
  const [activityQuery, setActivityQuery] = useState("");
  const [activityType, setActivityType] = useState("all");
  const [activityDateRange, setActivityDateRange] = useState("30d");
  const [updatingVendorId, setUpdatingVendorId] = useState("");
  const [updatingSubscriptionId, setUpdatingSubscriptionId] = useState("");
  const [activeView, setActiveView] = useState("dashboard");
  const [billingView, setBillingView] = useState("plans");
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [creditPackForm, setCreditPackForm] = useState(emptyCreditPackForm);
  const [paygSettings, setPaygSettings] = useState({});
  const [openDetail, setOpenDetail] = useState(null);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [openSections, setOpenSections] = useState(() =>
    navSections.reduce((acc, section) => {
      acc[section.title] = section.title === "User Management";
      return acc;
    }, {}),
  );

  const loadOverview = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get("/admin-dashboard/overview");
      setOverview(data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load admin dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const { data } = await api.get("/admin-notifications");
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load notifications");
    }
  };

  const loadAdminUsers = async ({ page = usersPage, search = usersQuery } = {}) => {
    setIsUsersLoading(true);
    try {
      const { data } = await api.get("/admin-dashboard/vendors", {
        params: {
          limit: ADMIN_USERS_PAGE_SIZE,
          page,
          search,
        },
      });
      setAdminUsers(data.vendors || []);
      setAdminUsersMeta(data.pagination || {
        limit: ADMIN_USERS_PAGE_SIZE,
        page,
        total: data.vendors?.length || 0,
        totalPages: 1,
      });
      setAdminUsersServerStats(data.stats || null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load users");
    } finally {
      setIsUsersLoading(false);
    }
  };

  const loadUserActivity = async () => {
    setIsActivityLoading(true);
    try {
      const { data } = await api.get("/admin-dashboard/vendor-activity");
      setActivityOverview({
        activities: data.activities || [],
        stats: data.stats || {},
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load user activity");
    } finally {
      setIsActivityLoading(false);
    }
  };

  const loadBilling = async () => {
    setIsBillingLoading(true);
    try {
      const [
        plansResponse,
        subscriptionsResponse,
        paymentsResponse,
        invoicesResponse,
        packsResponse,
        settingsResponse,
        walletsResponse,
      ] = await Promise.all([
        api.get("/billing/plans"),
        api.get("/billing/subscriptions"),
        api.get("/billing/payments"),
        api.get("/billing/invoices"),
        api.get("/billing/credit-packs"),
        api.get("/billing/payg-settings"),
        api.get("/billing/wallets"),
      ]);

      const nextSettings = settingsResponse.data.settings || {};
      setBillingData({
        creditPacks: packsResponse.data.packs || [],
        invoices: invoicesResponse.data.invoices || [],
        payments: paymentsResponse.data.payments || [],
        plans: plansResponse.data.plans || [],
        paygSettings: nextSettings,
        subscriptions: subscriptionsResponse.data.subscriptions || [],
        wallets: walletsResponse.data.wallets || [],
      });
      setPaygSettings(nextSettings);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load billing");
    } finally {
      setIsBillingLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
    loadNotifications();
    loadUserActivity();
    loadBilling();

    const intervalId = window.setInterval(loadNotifications, 10000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadAdminUsers({ page: usersPage, search: usersQuery });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [usersPage, usersQuery]);

  const vendors = useMemo(() => {
    const list = overview?.vendors || [];
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return list;
    }

    return list.filter((vendor) =>
      [vendor.name, vendor.email, vendor.businessName, vendor.accountStatus]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery)),
    );
  }, [overview?.vendors, query]);

  const filteredAdminUsers = useMemo(() => {
    return adminUsers;
  }, [adminUsers]);

  const filteredRiskVendors = useMemo(() => {
    const normalizedQuery = riskQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return adminUsers;
    }

    return adminUsers.filter((vendor) =>
      [
        vendor.name,
        vendor.email,
        vendor.phone,
        vendor.businessName,
        vendor.sellersloginVendorId,
        vendor.accountStatus,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery)),
    );
  }, [adminUsers, riskQuery]);

  const adminUserStats = useMemo(() => {
    if (adminUsersServerStats) {
      return adminUsersServerStats;
    }

    return {
      active: adminUsers.filter((vendor) => vendor.accountStatus !== "inactive").length,
      campaigns: adminUsers.reduce((sum, vendor) => sum + (vendor.campaigns || 0), 0),
      emailsSent: adminUsers.reduce((sum, vendor) => sum + (vendor.emailsSent || 0), 0),
      subscribers: adminUsers.reduce((sum, vendor) => sum + (vendor.subscribers || 0), 0),
      suspended: adminUsers.filter((vendor) => vendor.accountStatus === "inactive").length,
      total: adminUsers.length,
    };
  }, [adminUsers, adminUsersServerStats]);

  const filteredActivities = useMemo(() => {
    const normalizedQuery = activityQuery.trim().toLowerCase();
    const list = activityOverview.activities || [];
    const now = new Date();
    const dateCutoff =
      activityDateRange === "today"
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
        : activityDateRange === "7d"
          ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          : activityDateRange === "30d"
            ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            : null;

    return list.filter((item) => {
      const module = getActivityModule(item);
      const moduleAliases = {
        automation: "automations",
        campaign: "campaigns",
        segment: "segments",
        subscriber: "subscribers",
        template: "template",
      };
      const normalizedModule = moduleAliases[module] || module;
      const matchesType = activityType === "all" || normalizedModule === activityType || module === activityType;
      const matchesDate = !dateCutoff || new Date(item.timestamp) >= dateCutoff;
      const matchesQuery =
        !normalizedQuery ||
        [
          item.title,
          item.message,
          item.category,
          item.module,
          item.moduleLabel,
          item.type,
          item.status,
          item.action,
          item.entityName,
          item.vendor?.name,
          item.vendor?.email,
          item.vendor?.vendorId,
          item.actor?.name,
          item.actor?.email,
          item.entityType,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));

      return matchesType && matchesDate && matchesQuery;
    });
  }, [activityDateRange, activityOverview.activities, activityQuery, activityType]);

  const updateVendorStatus = async (vendor) => {
    const nextStatus = vendor.accountStatus === "inactive" ? "active" : "inactive";
    setUpdatingVendorId(vendor.id);

    try {
      await api.patch(`/admin-dashboard/vendors/${vendor.id}/status`, {
        status: nextStatus,
      });
      toast.success(nextStatus === "inactive" ? "Vendor suspended" : "Vendor activated");
      await loadOverview();
      await loadAdminUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update vendor");
    } finally {
      setUpdatingVendorId("");
    }
  };

  const toggleSection = (sectionTitle) => {
    setOpenSections((current) => ({
      ...current,
      [sectionTitle]: !current[sectionTitle],
    }));
  };

  const openAdminUsers = () => {
    setActiveView("users");
    setOpenSections((current) => ({
      ...current,
      "User Management": true,
    }));
  };

  const openUserActivity = () => {
    setActiveView("activity");
    setOpenSections((current) => ({
      ...current,
      "User Management": true,
    }));
  };

  const openRiskMonitoring = () => {
    setActiveView("risk");
    setOpenSections((current) => ({
      ...current,
      "Risk & Abuse": true,
    }));
  };

  const openBilling = (nextView = "plans") => {
    setActiveView("billing");
    setBillingView(nextView);
    setOpenSections((current) => ({
      ...current,
      "Billing & Credits": true,
    }));
  };

  const submitPlan = async (event) => {
    event.preventDefault();
    const payload = {
      ...planForm,
      limits: {
        automations: planForm.automations,
        segments: planForm.segments,
        teamMembers: planForm.teamMembers,
        templates: planForm.templates,
      },
    };

    try {
      if (planForm.id) {
        await api.patch(`/billing/plans/${planForm.id}`, payload);
        toast.success("Plan updated");
      } else {
        await api.post("/billing/plans", payload);
        toast.success("Plan created");
      }

      setPlanForm(emptyPlanForm);
      await loadBilling();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save plan");
    }
  };

  const submitPaygSettings = async (event) => {
    event.preventDefault();
    try {
      const { defaultPerEmailPrice: _defaultPerEmailPrice, ...settingsPayload } = paygSettings;
      await api.patch("/billing/payg-settings", settingsPayload);
      toast.success("PAYG settings updated");
      await loadBilling();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save PAYG settings");
    }
  };

  const submitCreditPack = async (event) => {
    event.preventDefault();
    try {
      if (creditPackForm.id) {
        await api.patch(`/billing/credit-packs/${creditPackForm.id}`, creditPackForm);
        toast.success("Credit pack updated");
      } else {
        await api.post("/billing/credit-packs", creditPackForm);
        toast.success("Credit pack created");
      }
      setCreditPackForm(emptyCreditPackForm);
      await loadBilling();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save credit pack");
    }
  };

  const deleteCreditPack = async (pack) => {
    try {
      await api.delete(`/billing/credit-packs/${pack._id}`);
      toast.success("Credit pack deleted");
      await loadBilling();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete credit pack");
    }
  };

  const updateWallet = async (wallet, type, controlUpdates = {}) => {
    const creditsInput = document.getElementById(`credits-${wallet.vendorId}`);
    const reasonInput = document.getElementById(`reason-${wallet.vendorId}`);
    const rateInput = document.getElementById(`rate-${wallet.vendorId}`);
    const dailyInput = document.getElementById(`daily-${wallet.vendorId}`);
    const maxInput = document.getElementById(`max-${wallet.vendorId}`);
    try {
      await api.patch(`/billing/wallets/${wallet.vendorId}`, {
        type,
        credits: creditsInput?.value || 0,
        reason: reasonInput?.value || (type === "controls" ? "Admin wallet control update" : "Admin manual adjustment"),
        customPerEmailPrice: rateInput?.value ?? undefined,
        customDailySendLimit: dailyInput?.value ?? undefined,
        customMaxRecipientsPerCampaign: maxInput?.value ?? undefined,
        ...controlUpdates,
      });
      if (creditsInput) creditsInput.value = "";
      if (reasonInput) reasonInput.value = "";
      toast.success("Wallet updated");
      await loadBilling();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update wallet");
    }
  };

  const updateSubscriptionPlan = async (subscription, updates = {}) => {
    setUpdatingSubscriptionId(subscription._id);
    try {
      await api.patch(`/billing/subscriptions/${subscription._id}`, {
        billingCycle: updates.billingCycle || subscription.billingCycle || "monthly",
        gateway: "manual",
        notes: subscription.notes || "",
        planId: updates.planId || subscription.planId?._id,
        status: updates.status || subscription.status,
      });
      toast.success("Subscription updated");
      await loadBilling();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update subscription");
    } finally {
      setUpdatingSubscriptionId("");
    }
  };

  const toggleNotifications = async () => {
    const nextOpen = !isNotificationOpen;
    setIsNotificationOpen(nextOpen);

    if (nextOpen && unreadCount > 0) {
      try {
        await api.patch("/admin-notifications/read-all");
        await loadNotifications();
      } catch (error) {
        toast.error(error.response?.data?.message || "Unable to mark notifications read");
      }
    }
  };

  const stats = overview?.stats || {};
  const isSidebarExpanded = isSidebarHovered;
  const handleRefresh = () => {
    if (activeView === "users") {
      loadAdminUsers();
      return;
    }

    if (activeView === "activity") {
      loadUserActivity();
      return;
    }

    if (activeView === "risk") {
      loadAdminUsers();
      return;
    }

    if (activeView === "billing") {
      loadBilling();
      return;
    }

    loadOverview();
  };

  return (
    <div className="grid h-screen overflow-hidden bg-[#f8f7fb] text-[#21192d] lg:grid-cols-[auto_minmax(0,1fr)]">
      <aside
        className={`hidden min-h-0 flex-col overflow-hidden border-r border-[#d8ccef] bg-[#f1eafc] text-[#4f3f6f] transition-[width] duration-200 ease-out lg:flex ${
          isSidebarExpanded ? "lg:w-[280px]" : "lg:w-[76px]"
        }`}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
      >
        <div className="border-b border-[#d8ccef] p-3">
          <div
            className={`flex items-center border border-[#d2c3ee] bg-[#eee5fb] py-3 transition-all ${
              isSidebarExpanded ? "gap-3 px-3" : "justify-center px-2"
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#f8f4ff] text-[13px] font-semibold text-[#4c1d95]">
              SA
            </div>
            {isSidebarExpanded ? (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-[#2b2140]">{admin?.name || "Super Admin"}</p>
                  <p className="truncate text-[12px] text-[#6e5a93]">{admin?.email}</p>
                </div>
                <button className="text-[#5a4380]">
                  <RefreshCcw className="h-4 w-4" />
                </button>
              </>
            ) : null}
          </div>
        </div>

        <nav className={`min-h-0 flex-1 overflow-y-auto py-4 ${isSidebarExpanded ? "px-3" : "px-2"}`}>
          {isSidebarExpanded ? (
            <p className="mb-2 px-1 text-[13px] font-medium text-[#715d9a]">Overview</p>
          ) : null}
          <button
            type="button"
            onClick={() => setActiveView("dashboard")}
            className={`flex w-full items-center bg-[#8338ec] py-3 text-left text-[14px] font-semibold text-white shadow-[0_12px_24px_rgba(131,56,236,0.22)] ${
              isSidebarExpanded ? "gap-3 px-3" : "justify-center px-2"
            }`}
            title="Dashboard"
          >
            <span className="flex h-6 w-6 items-center justify-center bg-[#eadcfb] text-[#5a189a]">
              <Home className="h-4 w-4" />
            </span>
            {isSidebarExpanded ? "Dashboard" : null}
          </button>

          {navSections.map((section) => (
            <div key={section.title} className={isSidebarExpanded ? "mt-4" : "mt-3"}>
              <button
                type="button"
                onClick={() => toggleSection(section.title)}
                className={`flex w-full items-center py-2 text-left text-[13px] font-medium text-[#715d9a] transition hover:text-[#3b176d] ${
                  isSidebarExpanded ? "justify-between px-1" : "justify-center px-2"
                }`}
                title={section.title}
              >
                {isSidebarExpanded ? (
                  <>
                    <span>{section.title}</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        openSections[section.title] ? "rotate-180" : ""
                      }`}
                    />
                  </>
                ) : (
                  (() => {
                    const SectionIcon = section.items[0][1];
                    return (
                      <span className="flex h-8 w-8 items-center justify-center bg-[#f8ddec] text-[#9f2d6a]">
                        <SectionIcon className="h-4 w-4" />
                      </span>
                    );
                  })()
                )}
              </button>
              {isSidebarExpanded && openSections[section.title] ? (
                <div className="mt-1 space-y-1">
                  {section.items.map(([label, Icon]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        if (label === "Users") {
                          openAdminUsers();
                          return;
                        }

                        if (label === "User Activity") {
                          openUserActivity();
                          return;
                        }

                        if (label === "Risk Monitoring") {
                          openRiskMonitoring();
                          return;
                        }

                        if (
                          section.title === "Billing & Credits" &&
                          ["Settings", "Packs", "Wallets", "Plans", "Subscriptions", "Payments", "Invoices"].includes(label)
                        ) {
                          openBilling(label.toLowerCase());
                          return;
                        }

                        toast.info(`${label} will be connected in the next phase`);
                      }}
                      className={`flex w-full items-center gap-3 px-1 py-2.5 text-left text-[14px] transition hover:bg-[#eadcfb] hover:text-[#3b176d] ${
                        (label === "Users" && activeView === "users") ||
                        (label === "User Activity" && activeView === "activity") ||
                        (label === "Risk Monitoring" && activeView === "risk") ||
                        (section.title === "Billing & Credits" &&
                          ["Settings", "Packs", "Wallets", "Plans", "Subscriptions", "Payments", "Invoices"].includes(label) &&
                          activeView === "billing" &&
                          billingView === label.toLowerCase())
                          ? "bg-[#e5d5f8] font-semibold text-[#3b176d]"
                          : "bg-transparent text-[#5a4380]"
                      }`}
                    >
                      <span className="flex h-6 w-6 items-center justify-center bg-[#f8ddec] text-[#9f2d6a]">
                        <Icon className="h-4 w-4" />
                      </span>
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>

        <div className="border-t border-[#d8ccef] p-4">
          <div className={`flex items-center ${isSidebarExpanded ? "gap-3" : "justify-center"}`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[13px] font-semibold text-[#4c1d95]">
              {(admin?.name || "SA").slice(0, 2).toUpperCase()}
            </div>
            {isSidebarExpanded ? (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[#2b2140]">{admin?.name || "Super Admin"}</p>
                  <p className="truncate text-[12px] text-[#6e5a93]">{admin?.email}</p>
                </div>
                </>
              ) : null}
          </div>
        </div>
      </aside>

      <main className="min-h-0 overflow-y-auto">
        <header className="sticky top-0 z-20 border-b border-[#ddd7e8] bg-white/95 px-4 py-3 backdrop-blur md:px-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <button className="flex h-10 w-10 items-center justify-center border border-[#ded7ef] bg-white lg:hidden">
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-[20px] font-semibold tracking-tight text-[#21192d]">
                  {activeView === "users"
                    ? "Users"
                    : activeView === "activity"
                      ? "User Activity"
                      : activeView === "risk"
                        ? "Risk Monitoring"
                        : activeView === "billing"
                          ? "Billing & Credits"
                        : "Dashboard"}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex h-10 items-center gap-2 border border-[#ded7ef] bg-white px-3 text-[13px] font-semibold text-[#5a4380]"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={toggleNotifications}
                  className="relative flex h-10 w-10 items-center justify-center border border-[#fed7aa] bg-[#fff7ed] text-[#fb7185]"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
                    {formatNumber(unreadCount)}
                  </span>
                </button>

                {isNotificationOpen ? (
                  <div className="absolute right-0 top-12 z-40 w-[360px] border border-[#ded7ef] bg-white shadow-[0_20px_48px_rgba(42,31,72,0.14)]">
                    <div className="flex items-center justify-between border-b border-[#eee9f8] px-4 py-3">
                      <div>
                        <p className="text-[14px] font-semibold text-[#21192d]">Notifications</p>
                        {/* <p className="text-[12px] text-[#9b8caf]">Vendor activity in real time</p> */}
                      </div>
                      <button
                        type="button"
                        onClick={loadNotifications}
                        className="text-[#5a4380]"
                        title="Refresh notifications"
                      >
                        <RefreshCcw className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="max-h-[360px] overflow-y-auto">
                      {notifications.length ? (
                        notifications.map((notification) => (
                          <div
                            key={notification._id}
                            className={`border-b border-[#f0ebf8] px-4 py-3 ${
                              notification.readAt ? "bg-white" : "bg-[#fbf8ff]"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#efe4ff] text-[#7e22ce]">
                                <Bell className="h-4 w-4" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <p className="text-[13px] font-semibold text-[#21192d]">
                                    {notification.title}
                                  </p>
                                  <span className="shrink-0 text-[11px] text-[#9b8caf]">
                                    {formatNotificationTime(notification.createdAt)}
                                  </span>
                                </div>
                                <p className="mt-1 text-[12px] leading-5 text-[#6e5a93]">
                                  {notification.message}
                                </p>
                                {notification.vendorName ? (
                                  <p className="mt-2 text-[11px] font-semibold text-[#7e22ce]">
                                    {notification.vendorName}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center text-[13px] text-[#7f6f96]">
                          No vendor notifications yet.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
              <button className="flex h-10 w-10 items-center justify-center text-[#5a4380]">
                <Sun className="h-4 w-4" />
              </button>
              <button className="flex h-10 w-10 items-center justify-center text-[#5a4380]">
                <Settings className="h-4 w-4" />
              </button>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f0e8fb] text-[13px] font-semibold text-[#5a4380]">
                SA
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-4 p-4 md:p-7">
          {activeView === "users" ? (
            <AdminUsersView
              isLoading={isUsersLoading}
              openDetail={openDetail}
              page={adminUsersMeta.page}
              pageSize={adminUsersMeta.limit}
              query={usersQuery}
              setPage={setUsersPage}
              setQuery={setUsersQuery}
              setOpenDetail={setOpenDetail}
              stats={adminUserStats}
              total={adminUsersMeta.total}
              totalPages={adminUsersMeta.totalPages}
              vendors={filteredAdminUsers}
            />
          ) : activeView === "activity" ? (
            <AdminVendorActivityView
              activities={filteredActivities}
              activityDateRange={activityDateRange}
              activityType={activityType}
              isLoading={isActivityLoading}
              query={activityQuery}
              setActivityDateRange={setActivityDateRange}
              setActivityType={setActivityType}
              setQuery={setActivityQuery}
              stats={activityOverview.stats || {}}
            />
          ) : activeView === "risk" ? (
            <AdminRiskMonitoringView
              isLoading={isUsersLoading}
              query={riskQuery}
              setQuery={setRiskQuery}
              stats={adminUserStats}
              updatingVendorId={updatingVendorId}
              updateVendorStatus={updateVendorStatus}
              vendors={filteredRiskVendors}
            />
          ) : activeView === "billing" ? (
            <AdminBillingView
              billingView={billingView}
              creditPackForm={creditPackForm}
              creditPacks={billingData.creditPacks}
              invoices={billingData.invoices}
              isLoading={isBillingLoading}
              onCreditPackDelete={deleteCreditPack}
              onCreditPackSubmit={submitCreditPack}
              onPlanSubmit={submitPlan}
              onSettingsSubmit={submitPaygSettings}
              onSubscriptionUpdate={updateSubscriptionPlan}
              onWalletUpdate={updateWallet}
              payments={billingData.payments}
              planForm={planForm}
              plans={billingData.plans}
              paygSettings={paygSettings}
              setBillingView={setBillingView}
              setCreditPackForm={setCreditPackForm}
              setPlanForm={setPlanForm}
              setPaygSettings={setPaygSettings}
              subscriptions={billingData.subscriptions}
              updatingSubscriptionId={updatingSubscriptionId}
              wallets={billingData.wallets}
            />
          ) : (
            <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AdminStatCard
              icon={Users}
              label="Total Vendors"
              value={formatNumber(stats.totalVendors)}
              tone="text-[#665cf5]"
              hint="Platform accounts"
            />
            <AdminStatCard
              icon={UserCheck}
              label="Active Vendors"
              value={formatNumber(stats.activeVendors)}
              tone="text-[#009b5a]"
              hint="Can send campaigns"
            />
            <AdminStatCard
              icon={Ban}
              label="Suspended"
              value={formatNumber(stats.suspendedVendors)}
              tone="text-[#f97316]"
              hint="Blocked by admin"
            />
            <AdminStatCard
              icon={Mail}
              label="Emails Today"
              value={formatNumber(stats.emailsSentToday)}
              tone="text-[#0084c7]"
              hint={`${formatNumber(stats.emailsSentTotal)} total`}
            />
            <AdminStatCard
              icon={BadgeIndianRupee}
              label="Monthly Revenue"
              value={formatCurrency(stats.monthlyRevenue)}
              tone="text-[#cf7a00]"
              hint="Billing phase pending"
            />
            <AdminStatCard
              icon={CreditCard}
              label="Subscriptions"
              value={formatNumber(stats.activeSubscriptions)}
              tone="text-[#d9467a]"
              hint="Plans phase pending"
            />
            <AdminStatCard
              icon={Users}
              label="Subscribers"
              value={formatNumber(stats.totalSubscribers)}
              tone="text-[#0891b2]"
              hint="Audience contacts"
            />
            <AdminStatCard
              icon={AlertTriangle}
              label="Complaint Rate"
              value={`${stats.complaintRate || 0}%`}
              tone="text-[#dc2626]"
              hint="Risk signal"
            />
          </section>

          {isLoading ? (
            <div className="border border-[#ded7ef] bg-white p-6 text-center text-[13px] font-medium text-[#7f6f96]">
              Loading admin overview...
            </div>
          ) : null}

          <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <div className="border border-[#ded7ef] bg-white p-6 shadow-[0_10px_28px_rgba(42,31,72,0.04)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-[17px] font-semibold text-[#21192d]">Email Sending Overview</h2>
                  <p className="mt-1 text-[13px] text-[#9b8caf]">Campaign volume across the platform</p>
                </div>
                <span className="border border-[#ded7ef] px-3 py-1.5 text-[12px] font-semibold text-[#7f6f96]">
                  All time
                </span>
              </div>
              <MiniLineChart />
            </div>

            <div className="border border-[#ded7ef] bg-white p-6 shadow-[0_10px_28px_rgba(42,31,72,0.04)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-[17px] font-semibold text-[#21192d]">Vendor Status</h2>
                  <p className="mt-1 text-[13px] text-[#9b8caf]">Verification and suspension overview</p>
                </div>
                <span className="text-[13px] font-semibold text-[#7f6f96]">
                  {formatNumber(stats.totalSubscribers)} subscribers
                </span>
              </div>
              <DonutChart active={stats.activeVendors} suspended={stats.suspendedVendors} />
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.8fr_1fr]">
            <div className="border border-[#ded7ef] bg-white shadow-[0_10px_28px_rgba(42,31,72,0.04)]">
              <div className="flex flex-col gap-4 border-b border-[#ded7ef] p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-[17px] font-semibold text-[#21192d]">Recent Vendors</h2>
                  <p className="text-[13px] text-[#9b8caf]">SellersLogin vendors connected to email marketing</p>
                </div>
                <label className="flex h-9 items-center gap-2 border border-[#ded7ef] bg-white px-3">
                  <Search className="h-4 w-4 text-[#9b8caf]" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search vendors"
                    className="w-full min-w-0 border-0 bg-transparent text-[13px] outline-none md:w-56"
                  />
                </label>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-left text-[13px]">
                  <thead className="bg-[#fbf9ff] text-[12px] font-semibold text-[#6e5a93]">
                    <tr>
                      <th className="px-5 py-3 font-medium">Vendor</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Subscribers</th>
                      <th className="px-5 py-3 font-medium">Campaigns</th>
                      <th className="px-5 py-3 font-medium">Emails Sent</th>
                      <th className="px-5 py-3 font-medium">Bounce</th>
                      <th className="px-5 py-3 font-medium">Last Login</th>
                      <th className="px-5 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eee9f8]">
                    {vendors.map((vendor) => (
                      <tr key={vendor.id} className="align-top">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-[#21192d]">{vendor.businessName || vendor.name}</p>
                          <p className="mt-1 text-[12px] text-[#9b8caf]">{vendor.email}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2.5 py-1 text-[12px] font-semibold ${
                              vendor.accountStatus === "inactive"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {vendor.accountStatus === "inactive" ? "Suspended" : "Active"}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-medium">{formatNumber(vendor.subscribers)}</td>
                        <td className="px-5 py-4 font-medium">{formatNumber(vendor.campaigns)}</td>
                        <td className="px-5 py-4 font-medium">{formatNumber(vendor.emailsSent)}</td>
                        <td className="px-5 py-4 font-medium text-orange-600">{vendor.bounceRate}%</td>
                        <td className="px-5 py-4 text-[#7f6f96]">{formatDate(vendor.lastLoginAt)}</td>
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => updateVendorStatus(vendor)}
                            disabled={updatingVendorId === vendor.id}
                            className="border border-[#ded7ef] px-3 py-2 text-[12px] font-semibold text-[#5a4380] transition hover:bg-[#f5efff] disabled:opacity-60"
                          >
                            {vendor.accountStatus === "inactive" ? "Activate" : "Suspend"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-5">
              <div className="border border-[#ded7ef] bg-white p-5 shadow-[0_10px_28px_rgba(42,31,72,0.04)]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[17px] font-semibold text-[#21192d]">Risk Alerts</h2>
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                <div className="space-y-3">
                  {(overview?.riskAlerts || []).map((item) => (
                    <div key={item.label} className="flex items-center justify-between bg-[#fbf9ff] px-3 py-3">
                      <span className="text-[13px] font-medium text-[#5a4380]">{item.label}</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold text-white ${
                          item.tone === "danger"
                            ? "bg-rose-500"
                            : item.tone === "warning"
                              ? "bg-orange-500"
                              : "bg-slate-400"
                        }`}
                      >
                        {formatNumber(item.count)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-[#ded7ef] bg-white p-5 shadow-[0_10px_28px_rgba(42,31,72,0.04)]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[17px] font-semibold text-[#21192d]">Recent Payments</h2>
                  <WalletCards className="h-5 w-5 text-violet-500" />
                </div>
                <div className="border border-dashed border-[#ded7ef] p-5 text-center text-[13px] text-[#7f6f96]">
                  Billing, plans, invoices, coupons, and refunds will connect in the next phase.
                </div>
              </div>
            </div>
          </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminDashboardPage;
