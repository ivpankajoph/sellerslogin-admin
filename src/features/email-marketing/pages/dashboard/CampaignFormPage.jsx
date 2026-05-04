import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import LoadingState from "../../components/ui/LoadingState.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import { ToastContext } from "../../context/ToastContext.jsx";
import PreviewAndTestModal from "../../components/dashboard/PreviewAndTestModal.jsx";
import {
  campaignGoals,
  campaignStatuses,
  campaignTypes,
  formatCampaignTypeLabel,
} from "../../data/campaigns.js";
import { api } from "../../lib/api.js";
import {
  formatLocalDateTimeInput,
  toDateTimeLocalInput,
  toIsoStringFromLocalInput,
} from "../../lib/datetime.js";

const createInitialForm = () => ({
  name: "",
  type: "",
  goal: "",
  subject: "",
  previewText: "",
  fromName: "",
  fromEmail: "",
  replyTo: "",
  templateId: "",
  segmentId: "",
  status: "",
  scheduledAt: "",
  isRecurring: false,
  recurrenceInterval: 1,
  recurrenceUnit: "week",
});

const campaignHelperText = {
  name: "Internal name for this campaign. Customers will not see this.",
  type: "Choose how this campaign should behave, like one-time broadcast or lifecycle campaign.",
  goal: "Select the main purpose of this campaign, so reports are easier to understand later.",
  status: "Choose whether this campaign should stay draft, be scheduled, or become active.",
  subject: "This is the email title customers see in their inbox. Keep it clear and short.",
  previewText: "Small text shown beside the subject in inboxes. Use it to add a quick reason to open.",
  fromName: "Name customers will see as the sender of the email.",
  fromEmail: "Email address used to send this campaign. Use a trusted business email.",
  replyTo: "Optional email where customer replies should go. Leave blank if replies can use the sender email.",
  sendTime: "Choose when this campaign should be sent. For recurring campaigns, this is the first send time.",
  template: "Pick the email design and content that will be sent in this campaign.",
  audience: "Choose who should receive this campaign. Leave blank to send to all subscribers.",
  recurring: "Turn this on if this campaign should send again automatically on a schedule.",
  repeatEvery: "Set how often the recurring campaign should run, like every 1 day, week, or month.",
};

const HelpTooltip = ({ text }) => {
  const [position, setPosition] = useState(null);
  const tooltipId = useMemo(
    () => `campaign-help-${text.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    [text],
  );

  const showTooltip = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const tooltipWidth = Math.min(288, window.innerWidth - 32);
    const x = Math.min(
      Math.max(rect.left + rect.width / 2, 16 + tooltipWidth / 2),
      window.innerWidth - 16 - tooltipWidth / 2,
    );
    const estimatedHeight = 76;
    const shouldOpenAbove =
      rect.bottom + 8 + estimatedHeight > window.innerHeight;

    setPosition({
      left: x,
      top: shouldOpenAbove ? rect.top - 8 : rect.bottom + 8,
      translateY: shouldOpenAbove ? "-100%" : "0",
      width: tooltipWidth,
    });
  };

  return (
    <span
      className="relative inline-flex"
      onFocus={showTooltip}
      onMouseEnter={showTooltip}
      onBlur={() => setPosition(null)}
      onMouseLeave={() => setPosition(null)}
    >
      <span
        aria-describedby={position ? tooltipId : undefined}
        aria-label={text}
        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-[#cfc6e8] bg-white text-[10px] font-bold leading-none text-[#6e6787] shadow-sm transition hover:border-[#9f8df2] hover:text-[#4f46e5]"
        role="button"
        tabIndex={0}
      >
        ?
      </span>
      {position ? (
        <span
          className="fixed z-[1000] rounded-xl border border-[#ddd4f2] bg-white px-3 py-2 text-left text-xs font-medium leading-5 text-[#5f5878] shadow-[0_16px_36px_rgba(47,43,61,0.18)]"
          id={tooltipId}
          role="tooltip"
          style={{
            left: position.left,
            top: position.top,
            width: position.width,
            transform: `translate(-50%, ${position.translateY})`,
            whiteSpace: "normal",
          }}
        >
          {text}
        </span>
      ) : null}
    </span>
  );
};

const FormField = ({ label, help, className = "", children }) => (
  <label className={`block space-y-2 ${className}`}>
    <span className="flex items-center gap-1.5 text-sm font-semibold text-[#2f2b3d]">
      <span>{label}</span>
      {help ? <HelpTooltip text={help} /> : null}
    </span>
    {children}
  </label>
);

const formatRecurrenceLabel = (interval, unit) => {
  const quantity = Number(interval || 1);
  const normalizedUnit = unit || "week";
  const suffix = quantity === 1 ? normalizedUnit : `${normalizedUnit}s`;

  return `Every ${quantity} ${suffix}`;
};

const formatAudienceLabel = (segmentName) => segmentName || "All subscribers";

const stripTags = (value = "") =>
  String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

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

const buildCampaignPreview = (form, template) => {
  const parsed = parseTemplateHtml(template?.htmlContent || "");
  const design = template?.designJson || {};
  const displayName = form.fromName?.trim() || "Your brand";
  const subject = form.subject?.trim() || template?.subject || "Campaign subject";
  const previewText =
    form.previewText?.trim() || template?.previewText || "Preview text appears here";

  return {
    fromLine: `${displayName} <${form.fromEmail?.trim() || "sender@example.com"}>`,
    subject,
    previewText,
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

function CampaignFormPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useContext(ToastContext);
  const [form, setForm] = useState(createInitialForm());
  const [templates, setTemplates] = useState([]);
  const [segments, setSegments] = useState([]);
  const [meta, setMeta] = useState({
    types: campaignTypes,
    goals: campaignGoals,
    statuses: campaignStatuses,
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const broadcastPreset =
    new URLSearchParams(location.search).get("type") === "broadcast";
  const isBroadcastCampaign =
    form.type === "broadcast" || (!id && broadcastPreset);
  const audienceLabel = formatAudienceLabel(
    segments.find((segment) => segment._id === form.segmentId)?.name,
  );
  const selectedTemplate = useMemo(
    () => templates.find((template) => template._id === form.templateId),
    [form.templateId, templates],
  );
  const campaignPreview = useMemo(
    () => buildCampaignPreview(form, selectedTemplate),
    [form, selectedTemplate],
  );

  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const [metaResponse, templatesResponse, segmentsResponse] =
          await Promise.all([
            api.get("/campaigns/meta"),
            api.get("/templates"),
            api.get("/segments"),
          ]);

        setMeta(metaResponse.data);
        setTemplates(templatesResponse.data);
        setSegments(segmentsResponse.data);

        if (id) {
          const { data } = await api.get(`/campaigns/${id}`);
          setForm({
            name: data.name || "",
            type: data.type || "promotional",
            goal: data.goal || "clicks",
            subject: data.subject || "",
            previewText: data.previewText || "",
            fromName: data.fromName || "",
            fromEmail: data.fromEmail || "",
            replyTo: data.replyTo || "",
            templateId: data.templateId?._id || "",
            segmentId: data.segmentId?._id || "",
            status: data.status || "draft",
            scheduledAt: toDateTimeLocalInput(data.scheduledAt),
            isRecurring: Boolean(data.isRecurring),
            recurrenceInterval: data.recurrenceInterval || 1,
            recurrenceUnit: data.recurrenceUnit || "week",
          });
        } else if (broadcastPreset) {
          setForm((current) => ({
            ...current,
            type: "broadcast",
            goal: current.goal || "clicks",
            segmentId: "",
            isRecurring: false,
          }));
        }
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Unable to load campaign form",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadDependencies();
  }, [broadcastPreset, id]);

  const validateForm = () => {
    if (!form.name.trim()) {
      return "Campaign name is required";
    }

    if (!form.type) {
      return "Please choose what kind of campaign this is";
    }

    if (!form.subject.trim()) {
      return "Subject line is required";
    }

    if (!form.fromName.trim() || !form.fromEmail.trim()) {
      return "From name and from email are required";
    }

    if (!form.templateId) {
      return "Please select a template for this campaign";
    }

    return "";
  };

  const saveCampaign = async (
    nextStatus = form.status,
    { redirectAfterSave = true } = {},
  ) => {
    const validationMessage = validateForm();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const effectiveStatus = form.isRecurring
        ? "scheduled"
        : nextStatus || "draft";
      const payload = {
        ...form,
        status: effectiveStatus,
        segmentId: form.segmentId || null,
        scheduledAt: toIsoStringFromLocalInput(form.scheduledAt) || null,
        isRecurring: Boolean(form.isRecurring),
        recurrenceInterval: Number(form.recurrenceInterval || 1),
        recurrenceUnit: form.recurrenceUnit || "week",
      };

      if (id) {
        await api.put(`/campaigns/${id}`, payload);
        toast.success(
          effectiveStatus === "draft" ? "Draft updated" : "Campaign updated",
        );
      } else {
        const { data } = await api.post("/campaigns", payload);
        toast.success(
          effectiveStatus === "draft" ? "Draft saved" : "Campaign created",
        );

        if (!redirectAfterSave) {
          return data;
        }

        if (effectiveStatus === "draft") {
          navigate(`/campaigns/${data._id}`);
          return data;
        }
      }

      if (redirectAfterSave) {
        navigate("/campaigns");
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to save campaign",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendTest = async ({ emails, subject, message, html }) => {
    const recipientEmails = Array.isArray(emails)
      ? emails
          .map((email) => String(email || "").trim().toLowerCase())
          .filter(Boolean)
      : [];

    if (!recipientEmails.length) {
      toast.error("Enter a test email address");
      return;
    }

    setIsSendingTest(true);

    try {
      if (!id) {
        const testSubject = String(subject || "").trim();
        const testHtml = String(html || "").trim();

        if (!testSubject) {
          toast.error("Enter a subject for the test email");
          return;
        }

        if (!testHtml) {
          toast.error("Add content for your template");
          return;
        }

        await api.post("/email/test-send", {
          emails: recipientEmails,
          subject: testSubject,
          html: testHtml,
          message: String(message || "").trim(),
        });
        toast.success("Test email sent");
        setIsTestModalOpen(false);
        return;
      }

      await api.post(`/email/campaigns/${id}/send-test`, {
        emails: recipientEmails,
      });
      toast.success("Test email sent");
      setIsTestModalOpen(false);
    } catch (requestError) {
      toast.error(
        requestError.response?.data?.message || "Unable to send test email",
      );
    } finally {
      setIsSendingTest(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading campaign editor..." />;
  }

  return (
    <div className="space-y-6 ">
      <section className="shell-card-strong p-6 md:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <PageHeader
              eyebrow="Campaigns"
              title={
                isBroadcastCampaign
                  ? id
                    ? "Edit broadcast campaign"
                    : "Broadcast campaign"
                  : id
                    ? "Edit campaign"
                    : "Create new campaign"
              }
              description={
                isBroadcastCampaign
                  ? "Create a one-time broadcast to all subscribers or a selected segment."
                  : undefined
              }
            />
            <div className="flex flex-wrap gap-2">
              <span className="soft-pill">Template-driven send setup</span>
              <span className="soft-pill">Lifecycle state managed</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/campaigns"
              className="rounded-xl border border-[#ddd4f2] px-4 py-3 text-sm font-medium text-[#5f5878]"
            >
              Back to campaigns
            </Link>
            <button
              type="button"
              className="rounded-xl border border-[#ddd4f2] px-4 py-3 text-sm font-medium text-[#5f5878]"
              onClick={() => setIsTestModalOpen(true)}
            >
              Test send
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)] xl:items-start">
        <form
          className="shell-card-strong space-y-6 overflow-visible p-6"
          onSubmit={(event) => {
            event.preventDefault();
            saveCampaign(form.status || "draft");
          }}
        >
          <div className="grid gap-4 md:grid-cols-2 ">
            <FormField label="Campaign name" help={campaignHelperText.name}>
              <input
                className="field"
                placeholder="For example: April product update"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </FormField>

            <FormField label="Campaign type" help={campaignHelperText.type}>
              <select
                className="field"
                value={form.type}
                onChange={(event) => {
                  const nextType = event.target.value;
                  setForm((current) => ({
                    ...current,
                    type: nextType,
                    isRecurring:
                      nextType === "broadcast" ? false : current.isRecurring,
                  }));
                }}
              >
                <option value="">Choose a type</option>
                {meta.types.map((type) => (
                  <option key={type} value={type}>
                    {formatCampaignTypeLabel(type)}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Campaign goal" help={campaignHelperText.goal}>
              <select
                className="field"
                value={form.goal}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    goal: event.target.value,
                  }))
                }
              >
                <option value="">Choose a goal</option>
                {meta.goals.map((goal) => (
                  <option key={goal} value={goal}>
                    {goal}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Send status" help={campaignHelperText.status}>
              <select
                className="field"
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
              >
                <option value="">Not selected yet</option>
                {meta.statuses
                  .filter((status) => status !== "archived")
                  .map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
              </select>
            </FormField>

            <FormField
              label="Subject line"
              help={campaignHelperText.subject}
              className="md:col-span-2"
            >
              <input
                className="field"
                placeholder="For example: A quick update from SellersLogin"
                value={form.subject}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    subject: event.target.value,
                  }))
                }
              />
            </FormField>

            <FormField
              label="Preview text"
              help={campaignHelperText.previewText}
              className="md:col-span-2"
            >
              <input
                className="field"
                placeholder="For example: One small update and a helpful link"
                value={form.previewText}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    previewText: event.target.value,
                  }))
                }
              />
            </FormField>

            <FormField label="From name" help={campaignHelperText.fromName}>
              <input
                className="field"
                placeholder="For example: SellersLogin"
                value={form.fromName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    fromName: event.target.value,
                  }))
                }
              />
            </FormField>

            <FormField label="From email" help={campaignHelperText.fromEmail}>
              <input
                className="field"
                placeholder="For example: support@sellerslogin.com"
                type="email"
                value={form.fromEmail}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    fromEmail: event.target.value,
                  }))
                }
              />
            </FormField>

            <FormField label="Reply-to" help={campaignHelperText.replyTo}>
              <input
                className="field"
                placeholder="Optional reply email"
                type="email"
                value={form.replyTo}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    replyTo: event.target.value,
                  }))
                }
              />
            </FormField>

            <FormField
              label={form.isRecurring ? "First send time" : "Send time"}
              help={campaignHelperText.sendTime}
            >
              <input
                className="field"
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    scheduledAt: event.target.value,
                  }))
                }
              />
            </FormField>

            <FormField label="Template" help={campaignHelperText.template}>
              <select
                className="field"
                value={form.templateId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    templateId: event.target.value,
                  }))
                }
              >
                <option value="">Choose a template</option>
                {templates.map((template) => (
                  <option key={template._id} value={template._id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Audience" help={campaignHelperText.audience}>
              <div className="space-y-2">
                <select
                  className="field"
                  value={form.segmentId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      segmentId: event.target.value,
                    }))
                  }
                >
                  <option value="">All subscribers</option>
                  {segments.map((segment) => (
                    <option key={segment._id} value={segment._id}>
                      {segment.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[#9a94b2]">
                  Leave this blank to send to all subscribers, or choose a
                  segment for targeted broadcast.
                </p>
              </div>
            </FormField>

            {!isBroadcastCampaign ? (
              <div className="md:col-span-2 overflow-visible rounded-[24px] border border-[#ece6f8] bg-[#faf7ff] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-[#2f2b3d]">
                      <span>Recurring campaign</span>
                      <HelpTooltip text={campaignHelperText.recurring} />
                    </p>
                    <p className="mt-1 text-sm text-[#6e6787]">
                      {formatRecurrenceLabel(
                        form.recurrenceInterval,
                        form.recurrenceUnit,
                      )}
                      . Recurring campaigns are saved as scheduled automatically
                      and re-check the selected audience on every run.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-3 rounded-2xl border border-[#ddd4f2] bg-white px-4 py-3">
                    <input
                      type="checkbox"
                      checked={form.isRecurring}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          isRecurring: event.target.checked,
                        }))
                      }
                    />
                    <span className="text-sm font-semibold text-[#2f2b3d]">
                      {form.isRecurring ? "Enabled" : "Off"}
                    </span>
                  </label>
                </div>

                {form.isRecurring ? (
                  <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr]">
                    <FormField
                      label="Repeat every"
                      help={campaignHelperText.repeatEvery}
                    >
                      <div className="grid gap-3 md:grid-cols-[120px_1fr]">
                        <input
                          className="field"
                          type="number"
                          min="1"
                          value={form.recurrenceInterval}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              recurrenceInterval: event.target.value,
                            }))
                          }
                        />
                        <select
                          className="field"
                          value={form.recurrenceUnit}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              recurrenceUnit: event.target.value,
                            }))
                          }
                        >
                          <option value="day">Day</option>
                          <option value="week">Week</option>
                          <option value="month">Month</option>
                        </select>
                      </div>
                    </FormField>
                    <div className="rounded-2xl border border-dashed border-[#ddd4f2] bg-white p-4 text-sm text-[#6e6787]">
                      {formatRecurrenceLabel(
                        form.recurrenceInterval,
                        form.recurrenceUnit,
                      )}
                      . Recurring sends use the current live audience at send
                      time, so new matching subscribers can be included in
                      future runs.
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="rounded-xl border border-[#ddd4f2] px-4 py-3 text-sm font-semibold text-[#5f5878]"
              disabled={isSubmitting}
              onClick={() =>
                saveCampaign(form.isRecurring ? "scheduled" : "draft")
              }
            >
              {isSubmitting
                ? "Saving..."
                : form.isRecurring
                  ? "Save recurring"
                  : "Save as draft"}
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Saving..."
                : id
                  ? "Update campaign"
                  : "Create campaign"}
            </button>
          </div>
        </form>

        <div className="space-y-6 xl:sticky xl:top-6">
          <section className="shell-card-strong overflow-hidden">
      
            <div className="bg-[#f6f2ff] px-5 py-5">
              <div className="overflow-hidden rounded-[28px] border border-[#e8defd] bg-white shadow-[0_18px_40px_rgba(99,91,255,0.08)]">
                <div className="border-b border-[#f1ebff] bg-[#faf7ff] px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9a94b2]">
                        Preview
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#2f2b3d]">
                        {campaignPreview.subject}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#7b7592]">
                      Draft
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-[#7b7592]">
                    {campaignPreview.fromLine}
                  </p>
                  <p className="mt-1 text-xs text-[#8a93a6]">
                    {campaignPreview.previewText}
                  </p>
                </div>

                <div className="space-y-5 px-5 py-5">
                  <div className="rounded-[22px] border border-dashed border-[#e8defd] bg-[#fcfbff] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9a94b2]">
                      Audience
                    </p>
                    <p className="mt-2 text-sm font-medium text-[#2f2b3d]">
                      {audienceLabel}
                    </p>
                    <p className="mt-1 text-xs text-[#8a93a6]">
                      {form.isRecurring
                        ? `Recurring send: ${formatRecurrenceLabel(form.recurrenceInterval, form.recurrenceUnit)}`
                        : "One-time send"}
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-[24px] border border-[#ece6f8] bg-white">
                    <div className="aspect-[16/9] bg-[#f8fafc]">
                      <img
                        src={campaignPreview.imageUrl}
                        alt={campaignPreview.imageAlt}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="space-y-4 p-5">
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9a94b2]">
                          {selectedTemplate?.name || "Email content"}
                        </p>
                        <h4 className="text-2xl font-semibold leading-tight text-[#2f2b3d]">
                          {campaignPreview.headline}
                        </h4>
                        <p className="text-sm leading-6 text-[#6e6787]">
                          {campaignPreview.bodyText}
                        </p>
                      </div>

                      <div>
                        <a
                          href={campaignPreview.ctaUrl}
                          onClick={(event) => event.preventDefault()}
                          className="inline-flex rounded-xl bg-[#635bff] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(99,91,255,0.22)]"
                        >
                          {campaignPreview.ctaText}
                        </a>
                      </div>

                      <div className="rounded-2xl bg-[#faf7ff] p-4 text-xs leading-6 text-[#7b7592]">
                        {campaignPreview.footerNote}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>

      <PreviewAndTestModal
        open={isTestModalOpen}
        title="Preview & test"
        subject={form.subject}
        previewText={form.previewText}
        previewHtml={selectedTemplate?.htmlContent || ""}
        bodyWidth={760}
        onClose={() => setIsTestModalOpen(false)}
        onSendTest={handleSendTest}
      />
    </div>
  );
}

export default CampaignFormPage;
