import { useEffect, useState } from "react";

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

export default function PreviewAndTestModal({
  open,
  title = "Preview & test",
  initialTab = "preview",
  subject,
  previewText = "",
  previewHtml = "",
  bodyWidth = 600,
  onClose,
  onSaveAsPdf,
  onSendTest,
  previewAudience,
  setPreviewAudience,
  previewContactQuery,
  setPreviewContactQuery,
}) {
  const [tab, setTab] = useState("preview");
  const [viewportMode, setViewportMode] = useState("desktop");
  const [recipientEmails, setRecipientEmails] = useState("");
  const [testSubject, setTestSubject] = useState(subject || "");
  const [testMessage, setTestMessage] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setViewportMode("desktop");
      setRecipientEmails("");
      setTestSubject(subject || "");
      setTestMessage("");
      setIsSendingTest(false);
    }
  }, [initialTab, open, subject]);

  const handleSendTest = async () => {
    if (!onSendTest) return;

    const emails = parseRecipientEmails(recipientEmails);

    setIsSendingTest(true);
    try {
      await onSendTest({
        emails,
        subject: testSubject,
        message: testMessage,
        html: previewHtml,
      });
    } catch {
      // Parent handler shows the relevant validation or API error toast.
    } finally {
      setIsSendingTest(false);
    }
  };

  if (!open) return null;

  const previewWidth = viewportMode === "mobile" ? 390 : Math.max(600, Number(bodyWidth) || 600);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm md:px-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-[1280px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]">
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
          <div className="grid min-h-0 flex-1 gap-4 overflow-hidden bg-slate-50 p-4 md:grid-cols-[minmax(0,1.4fr)_420px] md:p-6">
            <section className="min-h-0 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="font-semibold text-slate-900">Subject:</span>
                    <span className="text-slate-700">{subject || "No subject"}</span>
                  </div>
                  {previewText ? (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="font-semibold text-slate-900">Preview:</span>
                      <span className="text-slate-700">{previewText}</span>
                    </div>
                  ) : null}
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
                      key={`${viewportMode}-${previewHtml.length}`}
                      title="Email preview"
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

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-4">
                <button
                  type="button"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                  onClick={onSaveAsPdf}
                >
                  Save as PDF
                </button>
              </div>
            </section>

            <aside className="min-h-0 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              {/* <div className="space-y-5">
                <div>
                  <h4 className="text-[20px] font-semibold tracking-tight text-slate-900">
                    Who would you like to preview this email as?
                  </h4>
                </div>

                <div className="space-y-4">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="radio"
                      name="previewAudience"
                      value="recipient"
                      checked={previewAudience === "recipient"}
                      onChange={(event) => setPreviewAudience?.(event.target.value)}
                      className="h-4 w-4 accent-indigo-600"
                    />
                    <span className="text-[15px] text-slate-700">Preview as recipient</span>
                  </label>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-900">
                      Select a contact
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2">
                          <circle cx="11" cy="11" r="7" />
                          <path d="M20 20l-3.5-3.5" />
                        </svg>
                      </span>
                      <input
                        type="search"
                        className="field pl-11"
                        placeholder="Search by email"
                        value={previewContactQuery}
                        onChange={(event) => setPreviewContactQuery?.(event.target.value)}
                      />
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="radio"
                      name="previewAudience"
                      value="event"
                      checked={previewAudience === "event"}
                      onChange={(event) => setPreviewAudience?.(event.target.value)}
                      className="h-4 w-4 accent-indigo-600"
                    />
                    <span className="text-[15px] text-slate-700">Preview event</span>
                  </label>
                </div>
              </div> */}
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
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900">Subject</label>
                  <input
                    className="field"
                    type="text"
                    value={testSubject}
                    onChange={(event) => setTestSubject(event.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900">Message</label>
                  <textarea
                    className="field min-h-[200px] resize-y"
                    value={testMessage}
                    onChange={(event) => setTestMessage(event.target.value)}
                    placeholder="Optional note for the test email"
                  />
                </div>
                <button
                  type="button"
                  className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSendingTest}
                  onClick={handleSendTest}
                >
                  {isSendingTest ? "Sending..." : "Send test email"}
                </button>
              </div>
            </section>
            <aside className="min-h-0 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="space-y-3">
                <h4 className="text-[20px] font-semibold tracking-tight text-slate-900">Test email</h4>
                <p className="text-sm leading-6 text-slate-500">
                  Send a live SES-backed test email using the current preview content.
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
