import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PreviewAndTestModal from "../../components/dashboard/PreviewAndTestModal.jsx";
import LoadingState from "../../components/ui/LoadingState.jsx";
import { ToastContext } from "../../context/ToastContext.jsx";
import { api } from "../../lib/api.js";

const createStarterHtml = () => "";

const createTemplateMeta = () => ({
  name: "HTML custom code template",
  subject: "Custom HTML email",
  previewText: "Paste or write your email HTML here.",
  htmlContent: createStarterHtml(),
  designJson: {
    editor: "html-code",
  },
});

const getLineCount = (value = "") => Math.max(1, String(value).split("\n").length);

const getCurrentLine = (value = "", cursor = 0) => {
  const beforeCursor = value.slice(0, cursor);
  return beforeCursor.split("\n").length || 1;
};

const normalizeEditorValue = (value = "") =>
  String(value).replace(/\r\n/g, "\n").replace(/\r/g, "\n");

const CODE_LINE_HEIGHT = 24;
const CODE_FONT_SIZE = 14;
const CODE_VERTICAL_PADDING = 24;

const updateSelection = (element, start, end) => {
  requestAnimationFrame(() => {
    element.focus();
    element.setSelectionRange(start, end);
  });
};

const getHtmlEditorValidationError = (templateName, htmlValue) => {
  if (!templateName.trim()) {
    return "Enter template name";
  }

  const normalizedHtml = normalizeEditorValue(htmlValue).trim();
  const starterHtml = normalizeEditorValue(createStarterHtml()).trim();
  if (!normalizedHtml || normalizedHtml === starterHtml) {
    return "Add content for your template";
  }

  return "";
};

function BackArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2.2">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  );
}

function HtmlCustomCodeEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useContext(ToastContext);
  const [template, setTemplate] = useState(createTemplateMeta);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [isSaving, setIsSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewAudience, setPreviewAudience] = useState("recipient");
  const [previewContactQuery, setPreviewContactQuery] = useState("");
  const [editorValue, setEditorValue] = useState(createTemplateMeta().htmlContent);
  const [currentLine, setCurrentLine] = useState(1);
  const [scrollTop, setScrollTop] = useState(0);
  const textareaRef = useRef(null);
  const gutterRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!id) {
      const next = createTemplateMeta();
      setTemplate(next);
      setEditorValue(normalizeEditorValue(next.htmlContent));
      setCurrentLine(1);
      setIsLoading(false);
      return undefined;
    }

    let mounted = true;

    (async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get(`/templates/${id}`);
        const next = {
          ...createTemplateMeta(),
          name: data.name || "HTML custom code template",
          subject: data.subject || "Custom HTML email",
          previewText: data.previewText || "",
          htmlContent: normalizeEditorValue(data.htmlContent || ""),
          designJson: {
            ...(data.designJson || {}),
            editor: "html-code",
          },
        };

        if (!mounted) return;
        setTemplate(next);
        setEditorValue(normalizeEditorValue(next.htmlContent));
        setCurrentLine(1);
      } catch (error) {
        toast.error(error.response?.data?.message || "Unable to load template");
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id, toast]);

  useEffect(() => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = scrollTop;
    }
  }, [scrollTop]);

  useEffect(() => {
    if (!isPreviewOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsPreviewOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isPreviewOpen]);

  useEffect(() => {
    if (!showMenu) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showMenu]);

  const lineNumbers = useMemo(() => {
    const total = getLineCount(normalizeEditorValue(editorValue));
    return Array.from({ length: total }, (_, index) => index + 1);
  }, [editorValue]);

  const handleCursorUpdate = (event) => {
    const normalizedValue = normalizeEditorValue(event.target.value);
    setCurrentLine(
      getCurrentLine(normalizedValue, event.target.selectionStart || 0),
    );
  };

  const handleScroll = (event) => {
    const nextScrollTop = event.currentTarget.scrollTop;
    setScrollTop(nextScrollTop);
    if (gutterRef.current) {
      gutterRef.current.scrollTop = nextScrollTop;
    }
  };

  const handleChange = (event) => {
    const next = normalizeEditorValue(event.target.value);
    setEditorValue(next);
    setTemplate((current) => ({
      ...current,
      htmlContent: next,
    }));
    handleCursorUpdate(event);
  };

  const handleKeyDown = (event) => {
    const element = event.currentTarget;

    if (event.key === "Tab") {
      event.preventDefault();
      const start = element.selectionStart ?? 0;
      const end = element.selectionEnd ?? 0;
      const tabSize = "  ";

      const nextValue = normalizeEditorValue(
        `${editorValue.slice(0, start)}${tabSize}${editorValue.slice(end)}`,
      );
      setEditorValue(nextValue);
      setTemplate((current) => ({
        ...current,
        htmlContent: nextValue,
      }));
      updateSelection(element, start + tabSize.length, start + tabSize.length);
      setCurrentLine(getCurrentLine(nextValue, start + tabSize.length));
      return;
    }

    if (event.key === "Enter") {
      const start = element.selectionStart ?? 0;
      const end = element.selectionEnd ?? 0;
      const lineStart = editorValue.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
      const currentLineIndent = editorValue.slice(lineStart, start).match(/^[ \t]*/)?.[0] || "";
      const extraIndent = />$/.test(editorValue.slice(Math.max(0, start - 1), start)) ? "  " : "";
      const insert = `\n${currentLineIndent}${extraIndent}`;
      const nextValue = normalizeEditorValue(
        `${editorValue.slice(0, start)}${insert}${editorValue.slice(end)}`,
      );

      event.preventDefault();
      setEditorValue(nextValue);
      setTemplate((current) => ({
        ...current,
        htmlContent: nextValue,
      }));
      updateSelection(element, start + insert.length, start + insert.length);
      setCurrentLine(getCurrentLine(nextValue, start + insert.length));
    }
  };

  const handleSelect = (event) => {
    handleCursorUpdate(event);
  };

  const getCurrentHtmlValue = () => normalizeEditorValue(editorValue);
  const validateBeforeAction = () =>
    getHtmlEditorValidationError(template.name, getCurrentHtmlValue());

  const handlePreview = () => {
    const validationError = validateBeforeAction();
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setIsPreviewOpen(true);
  };

  const handlePrintPreview = () => {
    const validationError = validateBeforeAction();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const previewWindow = window.open("", "_blank", "width=900,height=800");
    if (!previewWindow) return;

    previewWindow.document.write(`
      <html>
        <head>
          <title>${template.name || "Preview"}</title>
          <style>
            body { margin: 0; padding: 24px; background: #f5f7fb; font-family: Arial, sans-serif; }
            .mail { max-width: 760px; margin: 0 auto; background: #fff; border-radius: 18px; overflow: hidden; box-shadow: 0 10px 30px rgba(15,23,42,0.08); }
          </style>
        </head>
        <body>
          <div class="mail">${getCurrentHtmlValue()}</div>
          <script>window.onload = () => setTimeout(() => window.print(), 300);</script>
        </body>
      </html>
    `);
    previewWindow.document.close();
    previewWindow.focus();
  };

  const handleSendTestEmail = async ({ email, subject, message, html }) => {
    const recipientEmail = String(email || "").trim().toLowerCase();
    const testSubject = String(subject || "").trim() || template.subject || template.name || "Test email";
    const testHtml = String(html || "").trim();

    if (!recipientEmail) {
      toast.error("Enter a test email address");
      throw new Error("Recipient email is required");
    }

    if (!testSubject) {
      toast.error("Enter a subject for the test email");
      throw new Error("Subject is required");
    }

    if (!testHtml) {
      toast.error("Add content for your template");
      throw new Error("Email content is required");
    }

    await api.post("/email/test-send", {
      email: recipientEmail,
      subject: testSubject,
      html: testHtml,
      message: String(message || "").trim(),
    });

    toast.success("Test email sent");
  };

  const handleSave = async ({ quit = false } = {}) => {
    const validationError = validateBeforeAction();
    if (validationError) {
      toast.error(validationError);
      return false;
    }

    setIsSaving(true);

    try {
      let savedId = id;
      const payload = {
        ...template,
        name: template.name.trim(),
        subject: template.subject.trim(),
        previewText: template.previewText.trim(),
        htmlContent: getCurrentHtmlValue(),
      };

      if (id) {
        await api.put(`/templates/${id}`, payload);
        toast.success("Template saved");
      } else {
        const { data } = await api.post("/templates", payload);
        savedId = data?._id || savedId;
        toast.success("Template created");
      }

      setTemplate((current) => ({
        ...current,
        htmlContent: payload.htmlContent,
      }));
      setEditorValue(payload.htmlContent);
      if (quit) {
        navigate("/templates");
        return true;
      }

      if (!id && savedId) {
        navigate(`/html-editor/${savedId}`, { replace: true });
      }

      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save template");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading HTML custom code editor..." />;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/templates");
  };

  return (
    <div className="space-y-5 pb-8">
      <header className="sticky top-0 z-20 rounded-[28px] border border-slate-200 bg-white/96 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.04)] backdrop-blur md:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              aria-label="Back to templates"
            >
              <BackArrowIcon />
            </button>

            <div className="min-w-0">
              <input
                className="w-full max-w-[340px] border-0 bg-transparent p-0 text-[20px] font-semibold tracking-tight text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="Untitled template"
                value={template.name}
                onChange={(event) =>
                  setTemplate((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                  {isSaving ? "Saving..." : "Ready to save"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <button
              type="button"
              onClick={handlePreview}
              className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Preview &amp; Test
            </button>
            <button
              type="button"
              onClick={() => handleSave({ quit: true })}
              disabled={isSaving}
              className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Save &amp; Quit
            </button>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setShowMenu((current) => !current)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                aria-label="More options"
              >
                <DotsIcon />
              </button>
              {showMenu ? (
                <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      handleSave({ quit: false });
                    }}
                    className="block w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      handlePrintPreview();
                    }}
                    className="block w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Save as PDF
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <section className="shell-card-strong overflow-hidden">

        <div className="bg-[linear-gradient(180deg,_rgba(248,250,252,0.88),_rgba(243,246,251,0.98))] px-3 py-3 md:px-5 md:py-5">
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            

            <div className="grid h-[68vh] min-h-0 grid-cols-[76px_minmax(0,1fr)]">
              <div
                ref={gutterRef}
                className="scrollbar-none overflow-y-auto overflow-x-hidden border-r border-slate-100 bg-slate-50/80"
              >
                <div
                  className="px-0 py-6 font-mono text-[14px] text-slate-400"
                  style={{
                    lineHeight: `${CODE_LINE_HEIGHT}px`,
                  }}
                >
                  {lineNumbers.map((line) => (
                    <div
                      key={line}
                      className={`flex h-[24px] items-center justify-end pr-4 tabular-nums transition ${
                        line === currentLine
                          ? "rounded-l-full bg-emerald-50 font-semibold text-slate-900"
                          : "text-slate-400"
                      }`}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative min-w-0 overflow-hidden bg-white">
                <div
                  className="pointer-events-none absolute left-0 right-0 z-0 bg-emerald-50/70"
                  style={{
                    top: `${CODE_VERTICAL_PADDING + (currentLine - 1) * CODE_LINE_HEIGHT - scrollTop}px`,
                    height: `${CODE_LINE_HEIGHT}px`,
                  }}
                />
                {!editorValue.trim() ? (
                  <div className="pointer-events-none absolute left-6 top-6 z-10 text-sm text-slate-400">
                    Paste or write your email HTML here
                  </div>
                ) : null}
                <textarea
                  ref={textareaRef}
                  value={editorValue}
                  onChange={handleChange}
                  onSelect={handleSelect}
                  onClick={handleSelect}
                  onKeyUp={handleSelect}
                  onMouseUp={handleSelect}
                  onKeyDown={handleKeyDown}
                  onScroll={handleScroll}
                  spellCheck={false}
                  wrap="off"
                  className="scrollbar-none relative z-10 block h-full w-full resize-none border-0 bg-transparent px-6 py-6 font-mono text-[14px] leading-[24px] text-slate-800 outline-none"
                  style={{
                    tabSize: 2,
                    whiteSpace: "pre",
                    overflow: "auto",
                    fontSize: `${CODE_FONT_SIZE}px`,
                    lineHeight: `${CODE_LINE_HEIGHT}px`,
                  }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3 text-sm text-slate-500">
              {/* <span>HTML code editing mode</span> */}
              <span>Current line {currentLine}</span>
            </div>
          </div>
        </div>
      </section>

      <form
        className="flex justify-end"
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
      >
        <button type="submit" className="sr-only" disabled={isSaving}>
          Save
        </button>
      </form>
      <PreviewAndTestModal
        open={isPreviewOpen}
        subject={template.subject || template.name}
        previewHtml={getCurrentHtmlValue()}
        bodyWidth={680}
        onClose={() => setIsPreviewOpen(false)}
        onSaveAsPdf={handlePrintPreview}
        onSendTest={handleSendTestEmail}
        previewAudience={previewAudience}
        setPreviewAudience={setPreviewAudience}
        previewContactQuery={previewContactQuery}
        setPreviewContactQuery={setPreviewContactQuery}
      />
    </div>
  );
}

export default HtmlCustomCodeEditorPage;
