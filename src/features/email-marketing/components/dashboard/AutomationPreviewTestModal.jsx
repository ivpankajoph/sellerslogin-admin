import { useEffect, useMemo, useState } from "react";

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

const parseRecipientEmails = (value = "") =>
  Array.from(
    new Set(
      String(value)
        .split(/[\n,]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const buildFallbackPreviewHtml = (workflow = {}) => `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f8fafc;color:#0f172a;font-family:Arial,sans-serif;">
    <div style="max-width:760px;margin:0 auto;padding:24px;">
      <div style="border:1px solid #e5e7eb;border-radius:24px;background:#fff;padding:28px;text-align:center;">
        <div style="font-size:11px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#94a3b8;">Automation email preview</div>
        <h1 style="margin:10px 0 0;font-size:34px;line-height:1.15;color:#0f172a;">${escapeHtml(workflow.name || "Untitled workflow")}</h1>
        <p style="margin:14px 0 0;font-size:16px;line-height:1.8;color:#475467;">No email template is selected yet.</p>
      </div>
    </div>
  </body>
</html>`;

export default function AutomationPreviewTestModal({
  open,
  workflow,
  previewEmail,
  title = "Preview & test",
  onClose,
  onRunSample,
}) {
  const [tab, setTab] = useState("preview");
  const [viewportMode, setViewportMode] = useState("desktop");
  const [recipientEmails, setRecipientEmails] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setTab("preview");
    setViewportMode("desktop");
    setRecipientEmails("");
    setIsSending(false);
  }, [open, workflow?._id]);

  const previewHtml = useMemo(
    () => previewEmail?.html || buildFallbackPreviewHtml(workflow || {}),
    [previewEmail, workflow],
  );
  const previewWidth = viewportMode === "mobile" ? 390 : 720;

  const handleRunSample = async () => {
    if (!onRunSample) return;

    const emails = parseRecipientEmails(recipientEmails);

    setIsSending(true);
    try {
      await onRunSample({ emails });
    } finally {
      setIsSending(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm md:px-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-[1360px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 md:px-6 md:py-5">
          <h3 className="text-[22px] font-semibold tracking-tight text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Close preview"
          >
            <span className="text-2xl leading-none">&times;</span>
          </button>
        </div>

        <div className="border-b border-slate-100 px-5 md:px-6">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setTab("preview")}
              className={`border-b-2 px-1 py-4 text-[15px] font-semibold transition ${
                tab === "preview"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => setTab("send")}
              className={`border-b-2 px-1 py-4 text-[15px] font-semibold transition ${
                tab === "send"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Send test email
            </button>
          </div>
        </div>

        {tab === "preview" ? (
          <div className="grid min-h-0 flex-1 gap-4 overflow-hidden bg-slate-50 p-4 md:grid-cols-[minmax(0,1.35fr)_420px] md:p-6">
            <section className="min-h-0 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="font-semibold text-slate-900">Subject:</span>
                    <span className="text-slate-700">{previewEmail?.subject || "Untitled subject"}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="font-semibold text-slate-900">Template:</span>
                    <span className="text-slate-700">{previewEmail?.templateName || "No template selected"}</span>
                  </div>
                </div>

                <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setViewportMode("desktop")}
                    className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
                      viewportMode === "desktop"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    <DesktopIcon />
                    Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewportMode("mobile")}
                    className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
                      viewportMode === "mobile"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    <MobileIcon />
                    Mobile
                  </button>
                </div>
              </div>

              <div className="h-[calc(92vh-220px)] min-h-[520px] overflow-auto bg-[radial-gradient(circle_at_top_left,_rgba(99,91,255,0.08),_transparent_24%),radial-gradient(circle_at_right_top,_rgba(14,165,233,0.08),_transparent_24%),linear-gradient(180deg,_#f8fafc_0%,_#f3f6fb_100%)] p-4 md:p-6">
                <div className="mx-auto" style={{ maxWidth: previewWidth }}>
                  <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_16px_42px_rgba(15,23,42,0.12)]">
                    <iframe
                      key={`${viewportMode}-${workflow?._id || workflow?.name || "workflow"}-${previewEmail?.templateId || "preview"}`}
                      title="Automation preview"
                      srcDoc={previewHtml}
                      className="block h-[72vh] min-h-[520px] w-full bg-white"
                      style={{
                        width: "100%",
                        maxWidth: viewportMode === "mobile" ? 390 : "100%",
                      }}
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              </div>
            </section>

            <aside className="min-h-0 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="space-y-3">
                <h4 className="text-[20px] font-semibold tracking-tight text-slate-900">Email summary</h4>
                <p className="text-sm leading-6 text-slate-500">
                  This is the rendered email the subscriber will receive.
                </p>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-[22px] border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Workflow</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {workflow?.name || "Untitled workflow"}
                  </p>
                </div>
                <div className="rounded-[22px] border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Trigger</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {workflow?.trigger || "—"}
                  </p>
                </div>
                <div className="rounded-[22px] border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Template</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {previewEmail?.templateName || "No template selected"}
                  </p>
                </div>
                <div className="rounded-[22px] border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Preview text</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {previewEmail?.previewText || "No preview text available."}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 overflow-hidden bg-slate-50 p-4 md:grid-cols-[minmax(0,1.4fr)_420px] md:p-6">
            <section className="min-h-0 overflow-auto rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900">Recipient emails</label>
                  <textarea
                    className="field"
                    rows={4}
                    placeholder="recipient1@example.com, recipient2@example.com"
                    value={recipientEmails}
                    onChange={(event) => setRecipientEmails(event.target.value)}
                  />
                <p className="mt-2 text-xs text-slate-500">
                  Paste multiple addresses separated by commas or new lines.
                </p>
              </div>
                <button
                  type="button"
                  className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSending}
                  onClick={handleRunSample}
                >
                  {isSending ? "Sending..." : "Send test email"}
                </button>
              </div>
            </section>

            <aside className="min-h-0 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="space-y-3">
                <h4 className="text-[20px] font-semibold tracking-tight text-slate-900">Test execution</h4>
                <p className="text-sm leading-6 text-slate-500">
                  This sends the selected email template directly to the recipient addresses you enter, without creating an automation run.
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
