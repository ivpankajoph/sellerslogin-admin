import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import LoadingState from "../../components/ui/LoadingState.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import { ToastContext } from "../../context/ToastContext.jsx";
import { templateVariables } from "../../data/campaigns.js";
import {
  applyTemplatePreset,
  buildTemplateHtml,
  getTemplatePreset,
} from "../../data/templatePresets.js";
import { api } from "../../lib/api.js";

const createInitialForm = () => ({
  name: "",
  subject: "",
  previewText: "",
  eyebrow: "Campaign update",
  headline: "Your latest update",
  bodyText: "Write the message you want subscribers to see.",
  ctaText: "Shop now",
  ctaUrl: "https://sellerslogin.com",
  imageUrl:
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
  imageAlt: "Campaign image",
  footerNote: "You are receiving this because you subscribed to updates.",
});

const FormField = ({ label, hint, className = "", children }) => (
  <label className={`block space-y-2 ${className}`}>
    <span className="text-sm font-semibold text-[#2f2b3d]">{label}</span>
    {hint ? <span className="block text-xs text-[#8a93a6]">{hint}</span> : null}
    {children}
  </label>
);

const stripTags = (value = "") =>
  String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const parseTemplateHtml = (html = "") => {
  if (!html) return {};

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
      footerNote: undefined,
    };
  } catch {
    return {};
  }
};

const mapTemplateToForm = (data) => {
  const design = data.designJson || {};
  const parsed = parseTemplateHtml(data.htmlContent || "");

  return {
    ...createInitialForm(),
    name: data.name || "",
    subject: data.subject || "",
    previewText: data.previewText || "",
    eyebrow: design.eyebrow || parsed.eyebrow || "Campaign update",
    headline: design.headline || parsed.headline || "Your latest update",
    bodyText:
      design.bodyText ||
      parsed.bodyText ||
      "Write the message you want subscribers to see.",
    ctaText: design.ctaText || parsed.ctaText || "Shop now",
    ctaUrl: design.ctaUrl || parsed.ctaUrl || "https://sellerslogin.com",
    imageUrl:
      design.imageUrl || parsed.imageUrl || createInitialForm().imageUrl,
    imageAlt: design.imageAlt || parsed.imageAlt || "Campaign image",
    footerNote:
      design.footerNote ||
      "You are receiving this because you subscribed to updates.",
  };
};

function TemplateFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetKey = searchParams.get("preset");
  const toast = useContext(ToastContext);
  const [form, setForm] = useState(createInitialForm());
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) {
      const loadTemplate = async () => {
        setIsLoading(true);

        try {
          const { data } = await api.get(`/templates/${id}`);
          setForm(mapTemplateToForm(data));
        } catch (requestError) {
          setError(
            requestError.response?.data?.message || "Unable to load template",
          );
        } finally {
          setIsLoading(false);
        }
      };

      loadTemplate();
      return;
    }

    if (presetKey && getTemplatePreset(presetKey)) {
      setForm((current) => applyTemplatePreset(current, presetKey));
    }

    setIsLoading(false);
  }, [id, presetKey]);

  const generatedHtml = useMemo(() => buildTemplateHtml(form), [form]);

  const previewMarkup = useMemo(() => {
    return {
      __html: generatedHtml,
    };
  }, [generatedHtml]);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.name.trim() || !form.subject.trim()) {
      setError("Template name and subject are required");
      return;
    }

    setIsSaving(true);

    const payload = {
      name: form.name.trim(),
      subject: form.subject.trim(),
      previewText: form.previewText.trim(),
      htmlContent: generatedHtml,
      designJson: {
        eyebrow: form.eyebrow,
        headline: form.headline,
        bodyText: form.bodyText,
        ctaText: form.ctaText,
        ctaUrl: form.ctaUrl,
        imageUrl: form.imageUrl,
        imageAlt: form.imageAlt,
        footerNote: form.footerNote,
      },
    };

    try {
      if (id) {
        await api.put(`/templates/${id}`, payload);
        toast.success("Template updated");
      } else {
        await api.post("/templates", payload);
        toast.success("Template created");
      }
      navigate("/templates");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to save template",
      );
      toast.error("Unable to save template");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading template..." />;

  return (
    <div className="space-y-6">
      <section className="shell-card p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <PageHeader
            eyebrow="Templates"
            title={id ? "Edit template" : "Create template"}
            
          />
          <div className="flex flex-wrap gap-3">
            <Link to="/templates" className="secondary-button">
              Back to templates
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <form
          className="shell-card-strong space-y-6 p-6"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Template name">
              <input
                className="field"
                placeholder="April product promo"
                value={form.name}
                onChange={handleChange("name")}
              />
            </FormField>
            <FormField label="Subject line">
              <input
                className="field"
                placeholder="A new offer for this week"
                value={form.subject}
                onChange={handleChange("subject")}
              />
            </FormField>
          </div>

          <FormField
            label="Preview text"
            hint="Optional inbox preview text that appears next to the subject line."
          >
            <input
              className="field"
              placeholder="A short preview to support your subject line"
              value={form.previewText}
              onChange={handleChange("previewText")}
            />
          </FormField>

          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Headline" hint="The main title inside the email.">
              <input
                className="field"
                placeholder="Your latest update"
                value={form.headline}
                onChange={handleChange("headline")}
              />
            </FormField>
            <FormField label="Eyebrow" hint="Small label above the headline.">
              <input
                className="field"
                placeholder="Campaign update"
                value={form.eyebrow}
                onChange={handleChange("eyebrow")}
              />
            </FormField>
          </div>

          <FormField
            label="Body text"
            
          >
            <textarea
              className="field min-h-[170px] resize-y"
              placeholder="Write the message you want subscribers to see."
              value={form.bodyText}
              onChange={handleChange("bodyText")}
            />
          </FormField>

          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Button text">
              <input
                className="field"
                placeholder="Shop now"
                value={form.ctaText}
                onChange={handleChange("ctaText")}
              />
            </FormField>
            <FormField label="Button link">
              <input
                className="field"
                placeholder="https://sellerslogin.com"
                value={form.ctaUrl}
                onChange={handleChange("ctaUrl")}
              />
            </FormField>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Image URL">
              <input
                className="field"
                placeholder="https://..."
                value={form.imageUrl}
                onChange={handleChange("imageUrl")}
              />
            </FormField>
            <FormField label="Image alt text">
              <input
                className="field"
                placeholder="Campaign image"
                value={form.imageAlt}
                onChange={handleChange("imageAlt")}
              />
            </FormField>
          </div>

          <FormField
            label="Footer note"
            hint="A short line to explain why subscribers got this email."
          >
            <textarea
              className="field min-h-[120px] resize-y"
              placeholder="You are receiving this because..."
              value={form.footerNote}
              onChange={handleChange("footerNote")}
            />
          </FormField>

          {error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            
            <button
              type="submit"
              className="primary-button"
              disabled={isSaving}
            >
              {isSaving
                ? "Saving..."
                : id
                  ? "Update template"
                  : "Create template"}
            </button>
          </div>
        </form>

        <aside className="space-y-6">
          <section className="shell-card-strong p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-kicker">Template preview</p>
                
              </div>
            </div>

            <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                {form.name || "Template name"}
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                {form.subject || "Subject line appears here"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {form.previewText || "Preview text appears here"}
              </p>
              <div
                className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5"
                dangerouslySetInnerHTML={previewMarkup}
              />
            </div>
          </section>

          
        </aside>
      </section>
    </div>
  );
}

export default TemplateFormPage;
