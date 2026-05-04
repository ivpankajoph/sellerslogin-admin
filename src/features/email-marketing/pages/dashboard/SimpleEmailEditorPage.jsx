import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import PreviewAndTestModal from "../../components/dashboard/PreviewAndTestModal.jsx";
import LoadingState from "../../components/ui/LoadingState.jsx";
import { ToastContext } from "../../context/ToastContext.jsx";
import { api } from "../../lib/api.js";

const MERGE_TAGS = ["{{firstName}}", "{{lastName}}", "{{email}}"];
const EMOJIS = ["😀", "✨", "🔥", "💬", "🎉", "✅", "📣", "💡", "🚀"];
const FONT_FAMILIES = [
  "Arial",
  "Georgia",
  "Helvetica",
  "Tahoma",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
];
const FONT_SIZES = ["12", "14", "16", "18", "20", "24", "28", "32", "36"];

const createEmptyTemplate = () => ({
  name: "New template",
  subject: "",
  previewText: "",
  htmlContent: "<p>Start writing your email here.</p>",
  plainTextContent: "Start writing your email here.",
  designJson: {
    editor: "simple",
  },
});

const stripHtml = (html = "") => {
  const element = document.createElement("div");
  element.innerHTML = html;
  return (element.textContent || element.innerText || "").replace(/\s+/g, " ").trim();
};

const normalizeEditorValue = (value = "") =>
  String(value).replace(/\r\n/g, "\n").replace(/\r/g, "\n");

const fileToHostedImageUrl = async (file) => {
  const rawDataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read image"));
    reader.readAsDataURL(file);
  });

  try {
    const { data } = await api.post("/uploads/image", {
      dataUrl: rawDataUrl,
      filename: "simple-editor-image",
    });
    return data?.url || rawDataUrl;
  } catch {
    return rawDataUrl;
  }
};

const countWords = (text = "") => {
  const trimmed = String(text).trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
};

const getSelectionRange = (root) => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;
  return range;
};

const decodeEntities = (html = "") => {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || "";
};

const insertHtmlAtSelection = (root, html) => {
  root?.focus();
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    root?.insertAdjacentHTML("beforeend", html);
    return;
  }
  const range = selection.getRangeAt(0);
  if (root && !root.contains(range.commonAncestorContainer)) {
    root.insertAdjacentHTML("beforeend", html);
    return;
  }
  range.deleteContents();
  const container = document.createElement("div");
  container.innerHTML = html;
  const fragment = document.createDocumentFragment();
  while (container.firstChild) fragment.appendChild(container.firstChild);
  const lastNode = fragment.lastChild;
  range.insertNode(fragment);
  if (lastNode) {
    range.setStartAfter(lastNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
};

const execCommand = (command, value = null) => {
  document.execCommand(command, false, value);
};

const getCurrentBlockFormat = () =>
  String(document.queryCommandValue?.("formatBlock") || "")
    .replace(/[<>]/g, "")
    .trim()
    .toLowerCase();

const Icon = ({ children, className = "" }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

const IconSource = () => (
  <Icon className="h-4 w-4">
    <path d="M8 8l-4 4 4 4" />
    <path d="M16 8l4 4-4 4" />
  </Icon>
);

const IconLink = () => (
  <Icon className="h-4 w-4">
    <path d="M10 13a5 5 0 0 1 0-7l1.5-1.5a5 5 0 0 1 7 7L17 13" />
    <path d="M14 11a5 5 0 0 1 0 7l-1.5 1.5a5 5 0 0 1-7-7L7 11" />
  </Icon>
);

const IconImage = () => (
  <Icon className="h-4 w-4">
    <rect x="4" y="5" width="16" height="14" rx="2" />
    <path d="M8.5 10.5l2.5 2.5 2-2 3.5 3.5" />
    <circle cx="9" cy="9" r="1" />
  </Icon>
);

const IconBold = () => <span className="text-[15px] font-black leading-none">B</span>;
const IconItalic = () => <span className="text-[15px] font-semibold italic leading-none">I</span>;
const IconUnderline = () => <span className="text-[15px] font-semibold leading-none underline decoration-2 underline-offset-2">U</span>;
const IconStrike = () => <span className="text-[15px] font-semibold leading-none line-through">S</span>;

const IconEmoji = () => <span className="text-[15px] leading-none">☺</span>;
const IconMerge = () => <span className="text-[14px] font-semibold leading-none">{'{}'}</span>;

const IconTable = () => (
  <Icon className="h-4 w-4">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M4 10h16" />
    <path d="M4 16h16" />
    <path d="M10 4v16" />
    <path d="M16 4v16" />
  </Icon>
);

const IconAlignLeft = () => (
  <Icon className="h-4 w-4">
    <path d="M4 6h9" />
    <path d="M4 10h14" />
    <path d="M4 14h9" />
    <path d="M4 18h14" />
  </Icon>
);

const IconAlignCenter = () => (
  <Icon className="h-4 w-4">
    <path d="M6 6h12" />
    <path d="M4 10h16" />
    <path d="M6 14h12" />
    <path d="M4 18h16" />
  </Icon>
);

const IconAlignRight = () => (
  <Icon className="h-4 w-4">
    <path d="M11 6h9" />
    <path d="M6 10h14" />
    <path d="M11 14h9" />
    <path d="M6 18h14" />
  </Icon>
);

const IconJustify = () => (
  <Icon className="h-4 w-4">
    <path d="M4 6h16" />
    <path d="M4 10h16" />
    <path d="M4 14h16" />
    <path d="M4 18h16" />
  </Icon>
);

const IconBullets = () => (
  <Icon className="h-4 w-4">
    <circle cx="5" cy="7" r="1.2" />
    <circle cx="5" cy="12" r="1.2" />
    <circle cx="5" cy="17" r="1.2" />
    <path d="M9 7h10" />
    <path d="M9 12h10" />
    <path d="M9 17h10" />
  </Icon>
);

const IconNumbers = () => (
  <Icon className="h-4 w-4">
    <path d="M4 7h2V5" />
    <path d="M4 12h2V10" />
    <path d="M4 17h2v-2H4" />
    <path d="M9 7h10" />
    <path d="M9 12h10" />
    <path d="M9 17h10" />
  </Icon>
);

const IconOutdent = () => (
  <Icon className="h-4 w-4">
    <path d="M9 7H20" />
    <path d="M9 12H16" />
    <path d="M9 17H20" />
    <path d="M4 7l4 3-4 3" />
  </Icon>
);

const IconIndent = () => (
  <Icon className="h-4 w-4">
    <path d="M4 7h11" />
    <path d="M4 12h7" />
    <path d="M4 17h11" />
    <path d="M20 7l-4 3 4 3" />
  </Icon>
);

const IconParagraph = () => <span className="text-[15px] font-semibold leading-none">P</span>;
const IconHeading = () => <span className="text-[15px] font-semibold leading-none">H</span>;

const ToolbarButton = ({ active, children, title, onClick }) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 220 });
  const buttonRef = useRef(null);
  const tipRef = useRef(null);

  const updatePosition = () => {
    const button = buttonRef.current;
    if (!button || typeof window === "undefined") return;

    const rect = button.getBoundingClientRect();
    const width = Math.min(260, Math.max(180, Math.min(window.innerWidth - 24, title.length * 7 + 32)));
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), Math.max(12, window.innerWidth - width - 12));
    const top = rect.bottom + 8;

    setPosition({ top, left, width });
  };

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target) &&
        tipRef.current &&
        !tipRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const onEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    updatePosition();
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, title]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={title}
        aria-expanded={open}
        onMouseDown={(event) => event.preventDefault()}
        onMouseEnter={() => {
          updatePosition();
          setOpen(true);
        }}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => {
          updatePosition();
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onClick={onClick}
        className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition ${
          active ? "border-[#1f5eff] bg-[#eaf0ff] text-[#1231a2]" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        {children}
      </button>
      {open ? (
        createPortal(
          <div
            ref={tipRef}
            className="z-[90] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-[0_18px_36px_rgba(15,23,42,0.16)]"
            style={{
              position: "fixed",
              top: `${position.top}px`,
              left: `${position.left}px`,
              width: `${position.width}px`,
              maxWidth: "calc(100vw - 24px)",
            }}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
          >
            {title}
          </div>,
          document.body,
        )
      ) : null}
    </>
  );
};

const getSimpleTemplateValidationError = (templateName, htmlValue) => {
  if (!templateName.trim()) {
    return "Enter template name";
  }

  const normalizedHtml = normalizeEditorValue(htmlValue).trim();
  const plainText = stripHtml(htmlValue);

  if (!normalizedHtml || !plainText) {
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

function SimpleEmailEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useContext(ToastContext);
  const [template, setTemplate] = useState(createEmptyTemplate());
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [sourceMode, setSourceMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState("");
  const [previewAudience, setPreviewAudience] = useState("recipient");
  const [previewContactQuery, setPreviewContactQuery] = useState("");
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [imageUrlValue, setImageUrlValue] = useState("");
  const [cursorSelection, setCursorSelection] = useState(null);
  const [toolbarState, setToolbarState] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    paragraph: true,
    heading: false,
  });
  const editorRef = useRef(null);
  const sourceRef = useRef(null);
  const fileInputRef = useRef(null);
  const menuRef = useRef(null);
  const selectionRef = useRef(null);
  const lastSavedSignatureRef = useRef("");

  useEffect(() => {
    if (!id) {
      const next = createEmptyTemplate();
      setTemplate(next);
      setHtmlSource(next.htmlContent);
      lastSavedSignatureRef.current = JSON.stringify(next);
      return;
    }

    let mounted = true;
    (async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get(`/templates/${id}`);
        const next = {
          ...createEmptyTemplate(),
          name: data.name || "New template",
          subject: data.subject || "",
          previewText: data.previewText || "",
          htmlContent: data.htmlContent || data.designJson?.htmlContent || createEmptyTemplate().htmlContent,
          plainTextContent:
            data.plainTextContent ||
            stripHtml(data.htmlContent || data.designJson?.htmlContent || "") ||
            "Start writing your email here.",
          designJson: {
            ...(data.designJson || {}),
            editor: "simple",
          },
        };
        if (!mounted) return;
        setTemplate(next);
        setHtmlSource(next.htmlContent);
        lastSavedSignatureRef.current = JSON.stringify(next);
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
    const handlePointer = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowMenu(false);
        setIsPreviewOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (sourceMode) {
      setHtmlSource(template.htmlContent);
      return;
    }

    if (editorRef.current && editorRef.current.innerHTML !== template.htmlContent) {
      editorRef.current.innerHTML = template.htmlContent;
    }
  }, [sourceMode, template.htmlContent]);

  const plainText = useMemo(() => stripHtml(template.htmlContent), [template.htmlContent]);
  const wordCount = useMemo(() => countWords(plainText), [plainText]);
  const characterCount = useMemo(() => decodeEntities(plainText).length, [plainText]);
  const getCurrentHtmlValue = () =>
    (sourceMode ? htmlSource : editorRef.current?.innerHTML || template.htmlContent);
  const getSnapshotForActions = () => {
    const currentHtml = getCurrentHtmlValue();
    return {
      name: template.name,
      html: currentHtml,
      plainText: stripHtml(currentHtml),
    };
  };
  const validateBeforeAction = () => {
    const snapshot = getSnapshotForActions();
    return getSimpleTemplateValidationError(snapshot.name, snapshot.html);
  };
  const syncFromEditor = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const text = stripHtml(html);
    setTemplate((current) => ({
      ...current,
      htmlContent: html,
      plainTextContent: text,
    }));
    refreshToolbarState();
  };

  const syncFromSource = (value) => {
    setHtmlSource(value);
    setTemplate((current) => ({
      ...current,
      htmlContent: value,
      plainTextContent: stripHtml(value),
    }));
  };

  const rememberSelection = () => {
    if (sourceMode) {
      const source = sourceRef.current;
      if (source) {
        setCursorSelection({
          start: source.selectionStart,
          end: source.selectionEnd,
        });
      }
      return;
    }

    const range = getSelectionRange(editorRef.current);
    if (range) selectionRef.current = range.cloneRange();
  };

  const restoreSelection = () => {
    if (sourceMode) {
      const source = sourceRef.current;
      if (source && cursorSelection) {
        source.focus();
        source.setSelectionRange(cursorSelection.start, cursorSelection.end);
      }
      return;
    }

    if (editorRef.current && selectionRef.current) {
      editorRef.current.focus();
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(selectionRef.current);
    }
  };

  const applyCommand = (command, value = null) => {
    if (sourceMode) return;
    restoreSelection();
    execCommand(command, value);
    syncFromEditor();
    setTimeout(refreshToolbarState, 0);
  };

  const handleFontChange = (value) => {
    applyCommand("fontName", value);
  };

  const handleFontSizeChange = (value) => {
    if (sourceMode) return;
    restoreSelection();
    execCommand("fontSize", "7");
    const spans = editorRef.current?.querySelectorAll('font[size="7"]');
    spans?.forEach((node) => {
      node.removeAttribute("size");
      node.style.fontSize = `${value}px`;
      node.style.fontFamily = node.style.fontFamily || "inherit";
    });
    syncFromEditor();
  };

  const handleColorChange = (value) => {
    applyCommand("foreColor", value);
  };

  const handleClearFormatting = () => {
    applyCommand("removeFormat");
    applyCommand("unlink");
  };

  const refreshToolbarState = () => {
    if (sourceMode) return;

    const blockFormat = getCurrentBlockFormat();
    setToolbarState({
      bold: Boolean(document.queryCommandState?.("bold")),
      italic: Boolean(document.queryCommandState?.("italic")),
      underline: Boolean(document.queryCommandState?.("underline")),
      strike: Boolean(document.queryCommandState?.("strikeThrough")),
      paragraph: blockFormat === "p" || blockFormat === "div" || blockFormat === "body",
      heading: ["h1", "h2", "h3", "h4"].includes(blockFormat),
    });
  };

  const handleInsertMergeTag = (tag) => {
    if (sourceMode) {
      const source = sourceRef.current;
      if (!source) return;
      const start = source.selectionStart ?? source.value.length;
      const end = source.selectionEnd ?? source.value.length;
      const value = `${source.value.slice(0, start)}${tag}${source.value.slice(end)}`;
      syncFromSource(value);
      setTimeout(() => {
        source.focus();
        source.setSelectionRange(start + tag.length, start + tag.length);
      }, 0);
      return;
    }

    restoreSelection();
    insertHtmlAtSelection(editorRef.current, tag);
    syncFromEditor();
  };

  const handleInsertEmoji = (emoji) => {
    if (sourceMode) {
      const source = sourceRef.current;
      if (!source) return;
      const start = source.selectionStart ?? source.value.length;
      const end = source.selectionEnd ?? source.value.length;
      const value = `${source.value.slice(0, start)}${emoji}${source.value.slice(end)}`;
      syncFromSource(value);
      setTimeout(() => {
        source.focus();
        source.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
      return;
    }

    restoreSelection();
    insertHtmlAtSelection(editorRef.current, emoji);
    syncFromEditor();
  };

  const handleInsertLink = () => {
    const url = window.prompt("Enter link URL");
    if (!url) return;

    if (sourceMode) {
      const source = sourceRef.current;
      if (!source) return;
      const selected = source.value.slice(source.selectionStart || 0, source.selectionEnd || 0) || url;
      const html = `<a href="${url}" target="_blank" rel="noreferrer">${selected}</a>`;
      const next = `${source.value.slice(0, source.selectionStart || 0)}${html}${source.value.slice(source.selectionEnd || 0)}`;
      syncFromSource(next);
      return;
    }

    restoreSelection();
    const selection = window.getSelection();
    const selectedText = selection?.toString() || url;
    execCommand("createLink", url);
    const anchor = editorRef.current?.querySelector("a[href]");
    if (anchor) {
      anchor.target = "_blank";
      anchor.rel = "noreferrer";
      if (!anchor.textContent) anchor.textContent = selectedText;
    }
    syncFromEditor();
  };

  const handleInsertImage = () => {
    if (sourceMode) {
      setShowImagePrompt(true);
      return;
    }
    setShowImagePrompt(true);
  };

  const confirmInsertImage = () => {
    const value = imageUrlValue.trim();
    if (!value) return;
    const html = `<p><img src="${value}" alt="Inserted image" style="max-width:100%; height:auto; border-radius:16px; display:block;" /></p>`;
    if (sourceMode) {
      const source = sourceRef.current;
      if (!source) return;
      const start = source.selectionStart ?? source.value.length;
      const end = source.selectionEnd ?? source.value.length;
      const next = `${source.value.slice(0, start)}${html}${source.value.slice(end)}`;
      syncFromSource(next);
      setShowImagePrompt(false);
      setImageUrlValue("");
      return;
    }

    restoreSelection();
    insertHtmlAtSelection(editorRef.current, html);
    syncFromEditor();
    setShowImagePrompt(false);
    setImageUrlValue("");
  };

  const handleInsertTable = () => {
    const html = `
      <table style="width:100%; border-collapse:collapse; margin:12px 0;">
        <tr>
          <td style="border:1px solid #d9d9e3; padding:10px;">Cell 1</td>
          <td style="border:1px solid #d9d9e3; padding:10px;">Cell 2</td>
        </tr>
      </table>
    `;
    if (sourceMode) {
      const source = sourceRef.current;
      if (!source) return;
      const start = source.selectionStart ?? source.value.length;
      const end = source.selectionEnd ?? source.value.length;
      const next = `${source.value.slice(0, start)}${html}${source.value.slice(end)}`;
      syncFromSource(next);
      return;
    }

    restoreSelection();
    insertHtmlAtSelection(editorRef.current, html);
    syncFromEditor();
  };

  const handleToggleSource = () => {
    if (!sourceMode) {
      syncFromEditor();
      setHtmlSource(editorRef.current?.innerHTML || template.htmlContent);
    } else {
      syncFromSource(htmlSource || "");
    }
    setSourceMode((current) => !current);
  };

  useEffect(() => {
    if (sourceMode) return undefined;

    const handleSelectionChange = () => {
      if (document.activeElement === editorRef.current) {
        refreshToolbarState();
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [sourceMode]);

  const handleSave = async ({ quit = false } = {}) => {
    const snapshot = getSnapshotForActions();
    const validationError = getSimpleTemplateValidationError(snapshot.name, snapshot.html);
    if (validationError) {
      toast.error(validationError);
      return false;
    }

    if (sourceMode) {
      syncFromSource(snapshot.html);
    } else {
      syncFromEditor();
    }

    const currentHtml = snapshot.html;
    setIsSaving(true);
    try {
      const payload = {
        name: snapshot.name.trim() || "New template",
        subject: template.subject.trim(),
        previewText: template.previewText.trim(),
        htmlContent: currentHtml,
        plainTextContent: snapshot.plainText,
        designJson: {
          ...(template.designJson || {}),
          editor: "simple",
        },
      };

      let savedId = id;
      if (id) {
        await api.put(`/templates/${id}`, payload);
        toast.success("Template saved");
      } else {
        const { data } = await api.post("/templates", payload);
        savedId = data?._id || savedId;
        toast.success("Template created");
      }

      const savedSignature = JSON.stringify({
        ...template,
        htmlContent: payload.htmlContent,
        plainTextContent: payload.plainTextContent,
      });
      lastSavedSignatureRef.current = savedSignature;
      setTemplate((current) => ({
        ...current,
        htmlContent: payload.htmlContent,
        plainTextContent: payload.plainTextContent,
      }));
      if (sourceMode) setHtmlSource(payload.htmlContent);
      else if (editorRef.current && editorRef.current.innerHTML !== payload.htmlContent) {
        editorRef.current.innerHTML = payload.htmlContent;
      }

      if (quit) {
        navigate("/templates");
        return;
      }

      if (!id && savedId) {
        navigate(`/simple-editor/${savedId}`, { replace: true });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save template");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintPreview = () => {
    const validationError = validateBeforeAction();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const previewHtml = getCurrentHtmlValue();
    const win = window.open("", "_blank", "width=900,height=800");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>${template.name || "Preview"}</title>
          <style>
            body { font-family: Arial, sans-serif; background: #f5f7fb; padding: 32px; }
            .mail { max-width: 680px; margin: 0 auto; background: #fff; border-radius: 18px; padding: 32px; box-shadow: 0 10px 30px rgba(15,23,42,0.08); }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <div class="mail">${previewHtml}</div>
          <script>window.onload = () => setTimeout(() => window.print(), 300);</script>
        </body>
      </html>
    `);
    win.document.close();
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

  if (isLoading) return <LoadingState message="Loading simple editor..." />;

  const editorHtml = sourceMode ? htmlSource : template.htmlContent;
  const handlePreview = () => {
    const validationError = validateBeforeAction();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (sourceMode) {
      syncFromSource(getCurrentHtmlValue());
    } else {
      syncFromEditor();
    }
    if (sourceMode) {
      setHtmlSource(getCurrentHtmlValue());
    }
    setIsPreviewOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/96 backdrop-blur">
        <div className="flex flex-col gap-4 px-4 py-3 md:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/templates")}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              aria-label="Back to templates"
            >
              <BackArrowIcon />
            </button>

            <div className="min-w-0">
              <input
                className="w-full max-w-[340px] border-0 bg-transparent p-0 text-[20px] font-semibold tracking-tight text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="Untitled template"
                value={template.name}
                onChange={(event) => setTemplate((current) => ({ ...current, name: event.target.value }))}
              />
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                  {isSaving ? "Saving..." : "Ready to save"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePreview}
              className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              Preview &amp; Test
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave({ quit: true })}
              className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
            >
              Save &amp; Quit
            </button>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setShowMenu((current) => !current)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-xl text-slate-600 hover:bg-slate-50"
                aria-label="More actions"
              >
                ⋮
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
      </div>

      <div className="border-b border-slate-200 bg-white px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto">
          <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            <ToolbarButton title="HTML source" active={sourceMode} onClick={handleToggleSource}>
              <IconSource />
            </ToolbarButton>
          </div>

          <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            <select
              className="h-10 rounded-xl border-0 bg-transparent px-3 text-sm outline-none"
              value="Arial"
              onChange={(event) => handleFontChange(event.target.value)}
            >
              {FONT_FAMILIES.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-xl border-0 bg-transparent px-3 text-sm outline-none"
              value="16"
              onChange={(event) => handleFontSizeChange(Number(event.target.value || 16))}
            >
              {FONT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            <ToolbarButton active={toolbarState.bold} title="Bold text" onClick={() => applyCommand("bold")}>
              <IconBold />
            </ToolbarButton>
            <ToolbarButton active={toolbarState.italic} title="Italic text" onClick={() => applyCommand("italic")}>
              <IconItalic />
            </ToolbarButton>
            <ToolbarButton active={toolbarState.underline} title="Underline text" onClick={() => applyCommand("underline")}>
              <IconUnderline />
            </ToolbarButton>
            <ToolbarButton active={toolbarState.strike} title="Strikethrough" onClick={() => applyCommand("strikeThrough")}>
              <IconStrike />
            </ToolbarButton>
            <ToolbarButton title="Clear formatting" onClick={handleClearFormatting}>
              <span className="text-[14px] leading-none">⌫</span>
            </ToolbarButton>
          </div>

          <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            <input
              type="color"
              className="h-10 w-10 cursor-pointer rounded-xl border-0 bg-transparent p-1"
              onChange={(event) => handleColorChange(event.target.value)}
              aria-label="Text color"
            />
            <ToolbarButton title="Insert link" onClick={handleInsertLink}>
              <IconLink />
            </ToolbarButton>
            <ToolbarButton
              title="Insert image"
              onClick={() => {
                setShowImagePrompt(true);
              }}
            >
              <IconImage />
            </ToolbarButton>
            <ToolbarButton title="Emoji" onClick={() => handleInsertEmoji(EMOJIS[0])}>
              <IconEmoji />
            </ToolbarButton>
            <ToolbarButton
              title="Merge tags"
              onClick={() => {
                const tag = window.prompt(`Choose a merge tag:\n${MERGE_TAGS.join("\n")}`, MERGE_TAGS[0]);
                if (tag && MERGE_TAGS.includes(tag.trim())) handleInsertMergeTag(tag.trim());
              }}
            >
              <IconMerge />
            </ToolbarButton>
            <ToolbarButton title="Insert table" onClick={handleInsertTable}>
              <IconTable />
            </ToolbarButton>
          </div>

          <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            <ToolbarButton title="Align left" onClick={() => applyCommand("justifyLeft")}>
              <IconAlignLeft />
            </ToolbarButton>
            <ToolbarButton title="Align center" onClick={() => applyCommand("justifyCenter")}>
              <IconAlignCenter />
            </ToolbarButton>
            <ToolbarButton title="Align right" onClick={() => applyCommand("justifyRight")}>
              <IconAlignRight />
            </ToolbarButton>
            <ToolbarButton title="Justify text" onClick={() => applyCommand("justifyFull")}>
              <IconJustify />
            </ToolbarButton>
          </div>

          <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            <ToolbarButton title="Bulleted list" onClick={() => applyCommand("insertUnorderedList")}>
              <IconBullets />
            </ToolbarButton>
            <ToolbarButton title="Numbered list" onClick={() => applyCommand("insertOrderedList")}>
              <IconNumbers />
            </ToolbarButton>
            <ToolbarButton title="Outdent" onClick={() => applyCommand("outdent")}>
              <IconOutdent />
            </ToolbarButton>
            <ToolbarButton title="Indent" onClick={() => applyCommand("indent")}>
              <IconIndent />
            </ToolbarButton>
          </div>

          <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            <ToolbarButton active={toolbarState.paragraph} title="Paragraph" onClick={() => applyCommand("formatBlock", "<p>")}>
              <IconParagraph />
            </ToolbarButton>
            <ToolbarButton active={toolbarState.heading} title="Heading" onClick={() => applyCommand("formatBlock", "<h2>")}>
              <IconHeading />
            </ToolbarButton>
          </div>

          <div className="ml-auto flex items-center gap-4 text-sm text-slate-500">
            <span>Words: {wordCount}</span>
            <span>Characters: {characterCount}</span>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1380px] px-4 py-6 md:px-6">
        <div className="rounded-[28px] border border-slate-200 bg-[#fbfcff] p-4 shadow-[0_18px_48px_rgba(15,23,42,0.06)] md:p-6">
          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
            {/* <div className="border-b border-slate-100 px-5 py-3 text-sm text-slate-500">
              Clean text editor
            </div> */}
            <div className="relative min-h-[68vh]">
              {sourceMode ? (
                <textarea
                  ref={sourceRef}
                  value={htmlSource}
                  onChange={(event) => syncFromSource(event.target.value)}
                  onClick={rememberSelection}
                  onKeyUp={rememberSelection}
                  className="min-h-[68vh] w-full resize-none border-0 bg-white px-6 py-6 font-mono text-sm leading-7 text-slate-800 outline-none"
                />
              ) : (
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  spellCheck={false}
                  onInput={syncFromEditor}
                  onMouseUp={rememberSelection}
                  onKeyUp={rememberSelection}
                  onFocus={rememberSelection}
                  className="min-h-[68vh] px-6 py-6 text-[16px] leading-7 text-slate-800 outline-none"
                  style={{ fontFamily: "Arial" }}
                />
              )}

              {!sourceMode && !stripHtml(editorHtml) ? (
                <div className="pointer-events-none absolute left-6 top-6 text-slate-400">
                  Start writing your email here.
                </div>
              ) : null}

              <div className="pointer-events-none absolute bottom-4 right-5 text-sm text-slate-500">
                Words: {wordCount} &nbsp;&nbsp; Characters: {characterCount}
              </div>
            </div>
          </div>
        </div>
      </main>

      {showImagePrompt ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4">
          <div className="w-full max-w-md rounded-[24px] bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Insert image</h3>
            <p className="mt-1 text-sm text-slate-500">Paste an image URL or upload a file.</p>
            <div className="mt-4 space-y-3">
              <input
                value={imageUrlValue}
                onChange={(event) => setImageUrlValue(event.target.value)}
                className="field"
                placeholder="https://..."
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload file
                </button>
                <button type="button" className="primary-button" onClick={confirmInsertImage}>
                  Insert
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setShowImagePrompt(false);
                    setImageUrlValue("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <PreviewAndTestModal
        open={isPreviewOpen}
        subject={template.subject || template.name}
        previewText={template.previewText}
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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          (async () => {
            const hostedUrl = await fileToHostedImageUrl(file);
            setImageUrlValue(hostedUrl);
            setShowImagePrompt(true);
            event.target.value = "";
          })();
        }}
      />

    </div>
  );
}

export default SimpleEmailEditorPage;
