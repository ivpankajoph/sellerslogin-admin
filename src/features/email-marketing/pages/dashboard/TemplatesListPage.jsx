import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import EmptyState from "../../components/ui/EmptyState.jsx";
import LoadingState from "../../components/ui/LoadingState.jsx";
import { ToastContext } from "../../context/ToastContext.jsx";
import {
  buildTemplateHtml,
  readyToUseTemplateCategories,
  templatePresets,
} from "../../data/templatePresets.js";
import { api } from "../../lib/api.js";

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Not set";

const getTemplateTimestampLabel = (template) => {
  const createdAt = template.createdAt ? new Date(template.createdAt) : null;
  const updatedAt = template.updatedAt ? new Date(template.updatedAt) : null;

  if (!createdAt && updatedAt) {
    return `Updated on ${formatDateTime(updatedAt)}`;
  }

  if (createdAt && updatedAt && createdAt.getTime() !== updatedAt.getTime()) {
    return `Updated on ${formatDateTime(updatedAt)}`;
  }

  return `Created on ${formatDateTime(createdAt || updatedAt)}`;
};

const getTemplateStatus = (template) =>
  String(template.status || (template.isActive === false ? "inactive" : "active")).toLowerCase();

const statusFilterOptions = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const gallerySortOptions = [
  { value: "recent", label: "Most recent" },
  { value: "name", label: "Name" },
];

function ModalShell({ children, onClose, className = "" }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={`max-h-[92vh] w-full overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_35px_100px_rgba(15,23,42,0.25)] ${className}`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-none stroke-current" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="m13.5 6.5 4 4" />
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

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const stripBrowserLink = (html = "") =>
  String(html).replace(/<p[^>]*>[\s\S]*?View in browser[\s\S]*?<\/p>/gi, "");

const buildPreviewHtmlDoc = (html = "", fallbackTitle = "Template") => {
  const cleanedHtml = stripBrowserLink(html).trim();

  if (cleanedHtml) {
    return cleanedHtml;
  }

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f8fafc;color:#0f172a;font-family:Arial,sans-serif;">
    <div style="max-width:640px;margin:0 auto;border:1px solid #e5e7eb;border-radius:20px;background:#fff;padding:28px;">
      <div style="height:12px;width:92px;border-radius:999px;background:#cbd5e1;margin:0 auto 24px;"></div>
      <div style="height:160px;border-radius:18px;background:linear-gradient(180deg,#eef2ff 0%,#f8fafc 100%);display:flex;align-items:center;justify-content:center;">
        <div style="text-align:center;">
          <div style="font-size:18px;font-weight:700;color:#1e293b;">${escapeHtml(fallbackTitle)}</div>
          <div style="margin-top:8px;font-size:14px;color:#64748b;">Preview not available</div>
        </div>
      </div>
    </div>
  </body>
</html>`;
};

function TemplatePreviewFrame({ html, title, className = "", scale = 1 }) {
  const inverseScale = scale > 0 ? 1 / scale : 1;

  return (
    <div className={`relative h-full w-full overflow-hidden bg-white ${className}`}>
      <iframe
        title={title}
        srcDoc={buildPreviewHtmlDoc(html, title)}
        className="absolute left-0 top-0 origin-top-left bg-white"
        style={{
          width: `${inverseScale * 100}%`,
          height: `${inverseScale * 100}%`,
          transform: `scale(${scale})`,
        }}
        sandbox="allow-same-origin"
      />
    </div>
  );
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2.4">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2">
      <path d="M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function TemplatesListPage() {
  const navigate = useNavigate();
  const toast = useContext(ToastContext);
  const menuRef = useRef(null);
  const createFromScratchMenuRef = useRef(null);
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showChooser, setShowChooser] = useState(false);
  const [showEmailGallery, setShowEmailGallery] = useState(false);
  const [showCreateFromScratchMenu, setShowCreateFromScratchMenu] = useState(false);
  const [galleryTab, setGalleryTab] = useState("your");
  const [gallerySort, setGallerySort] = useState("recent");
  const [galleryCategory, setGalleryCategory] = useState("all");
  const [gallerySearch, setGallerySearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rowsPerPage, setRowsPerPage] = useState(4);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);

    try {
      const { data } = await api.get("/templates");
      setTemplates(data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load templates");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, rowsPerPage]);

  useEffect(() => {
    if (galleryTab !== "ready") {
      setGalleryCategory("all");
    }
  }, [galleryTab]);

  useEffect(() => {
    if (!openMenuId) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openMenuId]);

  useEffect(() => {
    if (!showCreateFromScratchMenu) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (
        createFromScratchMenuRef.current &&
        !createFromScratchMenuRef.current.contains(event.target)
      ) {
        setShowCreateFromScratchMenu(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowCreateFromScratchMenu(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showCreateFromScratchMenu]);

  useEffect(() => {
    if (!previewItem) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setPreviewItem(null);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [previewItem]);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/templates/${id}`);
      toast.success("Template deleted");
      setOpenMenuId(null);
      setSelectedTemplateIds((current) => current.filter((templateId) => templateId !== id));
      await loadTemplates();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete template");
    }
  };

  const handleOpenChooser = () => setShowChooser(true);

  const handleOpenCustomEditor = () => {
    setShowChooser(false);
    setShowEmailGallery(true);
  };

  const handleCloseEmailGallery = () => {
    setShowEmailGallery(false);
    setShowCreateFromScratchMenu(false);
    setGallerySearch("");
    setGallerySort("recent");
    setGalleryTab("your");
  };

  const handleCreateFromScratch = () => setShowCreateFromScratchMenu((current) => !current);

  const handleCreateFromScratchAction = (action) => {
    setShowCreateFromScratchMenu(false);
    handleCloseEmailGallery();

    if (action === "drag-drop") {
      navigate("/email-builder/new");
      return;
    }

    if (action === "simple") {
      navigate("/simple-editor/new");
      return;
    }

    if (action === "html") {
      navigate("/html-editor/new");
    }
  };

  const handleUseGalleryItem = (item) => {
    if (galleryTab === "your") {
      handleCloseEmailGallery();
      navigate(`/email-builder/${item._id}`);
      return;
    }

    handleCloseEmailGallery();
    navigate(`/email-builder/new?preset=${item.key}`);
  };

  const openPreviewItem = (item) => {
    setPreviewItem(item);
  };

  const closePreviewItem = () => {
    setPreviewItem(null);
  };

  const getPreviewHtml = (item) => {
    if (!item) return "";

    if (galleryTab === "your") {
      return item.htmlContent || item.advancedHtml || item.previewHtml || "";
    }

    if (item.form) {
      return buildTemplateHtml(item.form);
    }

    return item.htmlContent || item.previewHtml || "";
  };

  const getPreviewLabel = (item) => {
    if (!item) return "#00";
    const matchIndex = emailGalleryItems.findIndex(
      (candidate) => (candidate._id || candidate.key || candidate.id) === (item._id || item.key || item.id),
    );
    return `#${String(matchIndex >= 0 ? matchIndex + 1 : 1).padStart(2, "0")}`;
  };

  const filteredTemplates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return templates.filter((template) => {
      const status = getTemplateStatus(template);
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const matchesQuery =
        !query ||
        [template.name, template.subject, template.previewText]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      return matchesStatus && matchesQuery;
    });
  }, [templates, searchQuery, statusFilter]);

  const totalItems = filteredTemplates.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const visibleTemplates = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredTemplates.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredTemplates, currentPage, rowsPerPage]);

  const pageStart = totalItems ? (currentPage - 1) * rowsPerPage + 1 : 0;
  const pageEnd = totalItems ? pageStart + visibleTemplates.length - 1 : 0;
  const visibleTemplateIds = useMemo(
    () => visibleTemplates.map((template) => template._id),
    [visibleTemplates],
  );
  const allVisibleSelected =
    visibleTemplateIds.length > 0 &&
    visibleTemplateIds.every((templateId) => selectedTemplateIds.includes(templateId));

  const toggleSelection = (templateId) => {
    setSelectedTemplateIds((current) =>
      current.includes(templateId)
        ? current.filter((id) => id !== templateId)
        : [...current, templateId],
    );
  };

  const toggleVisibleSelection = () => {
    setSelectedTemplateIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleTemplateIds.includes(id));
      }

      return Array.from(new Set([...current, ...visibleTemplateIds]));
    });
  };

  const openEditor = (templateId) => {
    navigate(`/email-builder/${templateId}`);
  };

  const clearSelection = () => setSelectedTemplateIds([]);

  const emailGalleryItems = useMemo(() => {
    const source = galleryTab === "your" ? templates : templatePresets;
    const query = gallerySearch.trim().toLowerCase();
    const selectedCategory = String(galleryCategory || "all").trim().toLowerCase();

    const filtered = source.filter((item) => {
      const name = String(item.name || "").toLowerCase();
      const subject = String(item.subject || "").toLowerCase();
      const previewText = String(item.previewText || "").toLowerCase();
      const description = String(item.description || "").toLowerCase();
      const category = String(item.category || "").toLowerCase();

      if (galleryTab === "ready" && selectedCategory !== "all" && category.trim().toLowerCase() !== selectedCategory) {
        return false;
      }

      if (!query) return true;

      return [name, subject, previewText, description, category].some((value) =>
        value.includes(query),
      );
    });

    return [...filtered].sort((left, right) => {
      if (gallerySort === "name") {
        return String(left.name || "").localeCompare(String(right.name || ""));
      }

      const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
      const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();
      return rightTime - leftTime;
    });
  }, [gallerySearch, gallerySort, galleryTab, galleryCategory, templates]);

  const emailGalleryTitle =
    galleryTab === "your" ? "All saved templates" : "Ready-to-use templates";
  const emailGalleryDescription =
    galleryTab === "your"
      ? "Start building your email using a previously saved template."
      : "Pick a ready-made template and jump straight into the editor.";

  return (
    <div className="space-y-6 pb-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-5">
          <h1 className="text-[38px] font-semibold tracking-tight text-ui-strong md:text-[44px]">
            Templates
          </h1>
          <div className="flex items-center gap-2 border-b border-slate-200">
            {/* <button
              type="button"
              className="relative -mb-px border-b-2 border-[#6b63ff] px-3 pb-3 text-[15px] font-semibold text-[#6b63ff]"
            >
              Email
            </button> */}
          </div>
        </div>

        <button type="button" onClick={handleOpenChooser} className="primary-button shrink-0 px-5">
          Create Template
        </button>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm">
              <input
                type="checkbox"
                className="sr-only"
                checked={allVisibleSelected}
                onChange={toggleVisibleSelection}
                aria-label="Select visible templates"
              />
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-[5px] border transition ${
                  allVisibleSelected
                    ? "border-[#111827] bg-[#111827] text-white"
                    : "border-slate-300 bg-white text-transparent"
                }`}
              >
                <CheckIcon />
              </span>
            </label>

            <div className="relative w-full lg:w-[302px]">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
               
              </span>
              <input
                className="field h-11 rounded-[16px] pl-12"
                placeholder="Search for templates"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            <div className="relative w-full lg:w-[198px]">
              <select
                className="field h-11 appearance-none rounded-[16px] pr-10"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                {statusFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <svg
                viewBox="0 0 24 24"
                className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-slate-500"
                strokeWidth="2"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-3 text-[15px] text-ui-body xl:justify-end">
            <span className="font-semibold text-ui-strong">
              {pageStart}-{pageEnd} of {totalItems}
            </span>

            <div className="relative">
              <select
                className="field h-11 w-[72px] appearance-none rounded-[16px] px-3 py-0 pr-8"
                value={rowsPerPage}
                onChange={(event) => setRowsPerPage(Number(event.target.value))}
              >
                {[4, 8, 12, 24].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <svg
                viewBox="0 0 24 24"
                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-slate-500"
                strokeWidth="2"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>

            <span className="whitespace-nowrap">of {totalPages} pages</span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage <= 1}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeftIcon />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage >= totalPages}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRightIcon />
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <LoadingState message="Loading templates..." />
        ) : visibleTemplates.length ? (
          <div className="space-y-3">
            {visibleTemplates.map((template, index) => {
              const status = getTemplateStatus(template);
              const isMenuOpen = openMenuId === template._id;
              const isSelected = selectedTemplateIds.includes(template._id);

              return (
                <article
                  key={template._id}
                  className={`rounded-[24px] border bg-white px-5 py-4 shadow-[0_1px_0_rgba(15,23,42,0.02)] transition hover:border-slate-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.04)] ${
                    isSelected ? "border-slate-400" : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <label className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={isSelected}
                          onChange={() => toggleSelection(template._id)}
                          aria-label={`Select ${template.name}`}
                        />
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-[5px] border transition ${
                            isSelected
                              ? "border-[#111827] bg-[#111827] text-white"
                              : "border-slate-300 bg-white text-transparent"
                          }`}
                        >
                          <CheckIcon />
                        </span>
                      </label>

                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <h2 className="truncate text-[16px] font-semibold tracking-tight text-ui-strong">
                            {template.name}
                          </h2>
                          <button
                            type="button"
                            onClick={() => openPreviewItem(template)}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                            aria-label={`Preview ${template.name}`}
                            title="Preview template"
                          >
                            <EyeIcon />
                          </button>
                        </div>
                        <p className="mt-2 text-[14px] text-ui-body">
                          #{(currentPage - 1) * rowsPerPage + index + 1}, {getTemplateTimestampLabel(template)}
                        </p>
                        <div className="mt-3 flex items-center gap-2 text-[15px] text-ui-strong">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                          <span className="font-medium">
                            {status === "inactive"
                              ? "Inactive"
                              : status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-start">
                      <button
                        type="button"
                        onClick={() => openEditor(template._id)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                        aria-label={`Edit ${template.name}`}
                        title="Edit template"
                      >
                        <PencilIcon />
                      </button>

                      <div className="relative" ref={isMenuOpen ? menuRef : null}>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(isMenuOpen ? null : template._id)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                          aria-label={`More actions for ${template.name}`}
                          aria-expanded={isMenuOpen}
                          title="More actions"
                        >
                          <DotsIcon />
                        </button>

                        {isMenuOpen ? (
                          <div className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
                            <button
                              type="button"
                              className="flex w-full items-center px-4 py-3 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                              onClick={() => handleDelete(template._id)}
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No templates match these filters"
            description="Try a broader search or switch the status filter to see more templates."
            action={
              <button type="button" onClick={clearSelection} className="secondary-button">
                Clear selection
              </button>
            }
          />
        )}
      </section>

      {showChooser ? (
        <ModalShell onClose={() => setShowChooser(false)} className="max-w-[700px]">
          <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="text-[28px] font-semibold tracking-tight text-slate-900">
                What template do you want to create?
              </h2>
              <p className="mt-3 max-w-2xl text-[15px] leading-6 text-slate-500">
                Choose what kind of template you want to create from scratch and reuse it
                whenever you need it.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowChooser(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              aria-label="Close dialog"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2.2">
                <path d="M18 6 6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid gap-3 px-6 pb-6 pt-4 md:grid-cols-2">
            <button
              type="button"
              onClick={handleOpenCustomEditor}
              className="rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-left text-[15px] font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Create your email template
            </button>

            <button
              type="button"
              disabled
              aria-disabled="true"
              className="cursor-not-allowed rounded-[18px] border border-slate-200 bg-slate-50 px-5 py-4 text-left text-[15px] font-semibold text-slate-400"
            >
              Instant Notifications template
            </button>
          </div>
        </ModalShell>
      ) : null}

      {showEmailGallery ? (
        <ModalShell onClose={handleCloseEmailGallery} className="max-w-[1400px]">
          <div className="flex h-[88vh] flex-col bg-white lg:flex-row">
            <aside className="flex w-full flex-col border-b border-slate-200 bg-[#fafafb] px-6 py-6 lg:w-[310px] lg:border-b-0 lg:border-r">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[26px] font-semibold tracking-tight text-slate-900">
                    Create an email
                  </h2>
                </div>

                {/* <button
                  type="button"
                  onClick={handleCloseEmailGallery}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  aria-label="Close dialog"
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="2">
                    <path d="M18 6 6 18" />
                    <path d="M6 6l12 12" />
                  </svg>
                </button> */}
              </div>

              <div ref={createFromScratchMenuRef} className="relative mt-12 w-full">
                <button
                  type="button"
                  onClick={handleCreateFromScratch}
                  className="inline-flex w-full items-center justify-between rounded-[22px] bg-[#222222] px-5 py-4 text-[18px] font-semibold text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)] transition hover:bg-[#111111]"
                  aria-expanded={showCreateFromScratchMenu}
                  aria-haspopup="menu"
                >
                  <span>Create from scratch</span>
                  <svg
                    viewBox="0 0 24 24"
                    className={`ml-4 h-5 w-5 fill-none stroke-current transition-transform ${showCreateFromScratchMenu ? "rotate-180" : ""}`}
                    strokeWidth="2"
                  >
                    <path d="M7 10l5 5 5-5" />
                  </svg>
                </button>

                {showCreateFromScratchMenu ? (
                  <div
                    role="menu"
                    aria-label="Create from scratch options"
                    className="absolute left-0 right-0 top-full z-30 mt-3 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.16)] sm:left-0 sm:right-auto sm:w-[340px]"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleCreateFromScratchAction("drag-drop")}
                      className="flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-slate-50"
                    >
                      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
                        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2">
                          <rect x="4" y="4" width="8" height="8" rx="1.5" />
                          <path d="M13 8h7M16.5 4.5V11" />
                          <path d="M13 13h7M16.5 13v6.5H10" />
                        </svg>
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[17px] font-semibold text-slate-900">
                          Drag and drop editor
                        </span>
                        <span className="mt-1 block text-[14px] leading-5 text-slate-500">
                          Create an on-brand email with reusable elements.
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleCreateFromScratchAction("simple")}
                      className="flex w-full items-start gap-3 border-t border-slate-100 px-4 py-4 text-left transition hover:bg-slate-50"
                    >
                      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
                        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2">
                          <path d="M8 4h7l4 4v12H8z" />
                          <path d="M15 4v4h4" />
                          <path d="M11 12h6M11 16h6" />
                        </svg>
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[17px] font-semibold text-slate-900">
                          Simple editor
                        </span>
                        <span className="mt-1 block text-[14px] leading-5 text-slate-500">
                          Create a text-based email with images and attachments.
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleCreateFromScratchAction("html")}
                      className="flex w-full items-start gap-3 border-t border-slate-100 px-4 py-4 text-left transition hover:bg-slate-50"
                    >
                      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
                        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2">
                          <path d="m8 7-4 5 4 5" />
                          <path d="m16 7 4 5-4 5" />
                          <path d="M14 5 10 19" />
                        </svg>
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[17px] font-semibold text-slate-900">
                          HTML custom code
                        </span>
                        <span className="mt-1 block text-[14px] leading-5 text-slate-500">
                          Create a fully custom email with HTML.
                        </span>
                      </span>
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="mt-12 space-y-5">
                <div>
                  <p className="text-[14px] font-medium text-slate-700">Templates</p>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setGalleryTab("your")}
                    className={`flex w-full items-center gap-3 rounded-[12px] border px-4 py-3 text-left text-[17px] transition ${
                      galleryTab === "your"
                        ? "border-[#d1d5fa] bg-[#eeefff] text-slate-800 shadow-[inset_0_0_0_1px_rgba(107,99,255,0.12)]"
                        : "border-transparent bg-transparent text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    <span>Your templates</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGalleryTab("ready")}
                    className={`flex w-full items-center gap-3 rounded-[12px] border px-4 py-3 text-left text-[17px] transition ${
                      galleryTab === "ready"
                        ? "border-[#d1d5fa] bg-[#eeefff] text-slate-800 shadow-[inset_0_0_0_1px_rgba(107,99,255,0.12)]"
                        : "border-transparent bg-transparent text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    <span>Ready-to-use</span>
                  </button>
                </div>
              </div>
            </aside>

            <section className="flex min-w-0 flex-1 flex-col px-6 py-6 lg:px-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[30px] font-semibold tracking-tight text-slate-900 md:text-[34px]">
                    {emailGalleryTitle}
                  </h3>
                  <p className="mt-3 max-w-3xl text-[16px] leading-7 text-slate-500">
                    {emailGalleryDescription}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCloseEmailGallery}
                  className="hidden h-11 w-11 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 lg:inline-flex"
                  aria-label="Close email gallery"
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="2">
                    <path d="M18 6 6 18" />
                    <path d="M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative w-full md:max-w-[420px]">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <SearchIcon />
                  </span>
                  <input
                    className="field h-12 rounded-[18px] bg-white pl-12 text-[16px]"
                    placeholder="Search by name or ID"
                    value={gallerySearch}
                    onChange={(event) => setGallerySearch(event.target.value)}
                  />
                </div>

                {galleryTab === "ready" ? (
                  <div className="relative w-full md:w-[210px]">
                    <select
                      className="field h-12 appearance-none rounded-[18px] bg-white pr-10 text-[16px]"
                      value={galleryCategory}
                      onChange={(event) => setGalleryCategory(event.target.value)}
                    >
                      <option value="all">All categories</option>
                      {readyToUseTemplateCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <svg
                      viewBox="0 0 24 24"
                      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-slate-500"
                      strokeWidth="2"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                ) : null}

                <div className="relative w-full md:w-[180px]">
                  <select
                    className="field h-12 appearance-none rounded-[18px] bg-white pr-10 text-[16px]"
                    value={gallerySort}
                    onChange={(event) => setGallerySort(event.target.value)}
                  >
                    {gallerySortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <svg
                    viewBox="0 0 24 24"
                    className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-slate-500"
                    strokeWidth="2"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </div>

              <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
                {emailGalleryItems.length ? (
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {emailGalleryItems.map((item, index) => {
                      const previewLabel =
                        galleryTab === "your"
                          ? `#${String(index + 1).padStart(2, "0")}`
                          : `#${String(index + 1).padStart(2, "0")}`;

                      return (
                        <article
                          key={item._id || item.key || item.id}
                          className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_1px_0_rgba(15,23,42,0.02)]"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-10 w-10 rounded-md bg-slate-300/70" />
                            </div>
                            <button
                              type="button"
                              onClick={() => openPreviewItem(item)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                              aria-label={`Preview ${item.name || item.title || "template"}`}
                            >
                              <EyeIcon />
                            </button>
                          </div>

                          <div className="px-4 pb-4 pt-5">
                            <div className="overflow-hidden rounded-[18px] border border-slate-100 bg-[#f7f8fb]">
                              <div className="h-[170px] overflow-hidden bg-white p-3">
                                <TemplatePreviewFrame
                                  title={`${String(item.name || item.title || "Template")} thumbnail`}
                                  html={getPreviewHtml(item)}
                                  className="pointer-events-none rounded-[12px] border border-slate-100"
                                  scale={0.56}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3 px-4 pb-5">
                            <p className="text-[14px] text-slate-500">{previewLabel}</p>
                            <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-slate-400">
                              {String(item.category || "Template")}
                            </p>
                            <h4 className="min-h-[56px] text-[18px] font-semibold leading-7 text-slate-900">
                              {item.name || item.title}
                            </h4>
                            <button
                              type="button"
                              onClick={() => handleUseGalleryItem(item)}
                              className="inline-flex h-11 items-center rounded-[14px] border border-slate-300 bg-white px-4 text-[16px] font-medium text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
                            >
                              Use template
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex min-h-[40vh] items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
                    <div className="max-w-md">
                      <h4 className="text-xl font-semibold text-slate-900">
                        No templates found
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Try a broader search or switch tabs to see templates and ready-made options.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </ModalShell>
      ) : null}

      {previewItem ? (
        <ModalShell onClose={closePreviewItem} className="max-w-[1120px]">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="text-[26px] font-semibold tracking-tight text-slate-900">
                {String(previewItem.name || previewItem.title || "Template")}
              </h2>
              <p className="mt-3 text-[14px] text-slate-500">{getPreviewLabel(previewItem)}</p>
            </div>
            <button
              type="button"
              onClick={closePreviewItem}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              aria-label="Close preview"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="2">
                <path d="M18 6 6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 py-8">
            <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-4">
              <div className="overflow-hidden rounded-[14px] border border-slate-100 bg-white shadow-sm">
                <iframe
                  title={`${String(previewItem.name || previewItem.title || "Template")} preview`}
                  srcDoc={buildPreviewHtmlDoc(
                    getPreviewHtml(previewItem),
                    String(previewItem.name || previewItem.title || "Template"),
                  )}
                  className="block h-[64vh] min-h-[520px] w-full bg-white"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-5">
            <button
              type="button"
              onClick={closePreviewItem}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#6b63ff] transition hover:bg-slate-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                const item = previewItem;
                closePreviewItem();
                handleUseGalleryItem(item);
              }}
              className="rounded-full bg-[#20242f] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(32,36,47,0.2)] transition hover:bg-[#151822]"
            >
              Use template
            </button>
          </div>
        </ModalShell>
      ) : null}

    </div>
  );
}

export default TemplatesListPage;
