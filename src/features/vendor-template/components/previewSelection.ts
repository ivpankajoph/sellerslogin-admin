export const resolveEditorRouteFromComponent = (
  componentId?: string,
  selectedTemplateKey?: string
) => {
  const value = String(componentId || "").trim();
  if (!value) return null;

  if (
    value.startsWith("components.home_page") ||
    value.startsWith("components.logo") ||
    value.startsWith("components.theme")
  ) {
    return selectedTemplateKey ? `/vendor-template/${selectedTemplateKey}` : null;
  }

  if (
    value.startsWith("components.about_page") ||
    value.startsWith("components.vendor_profile")
  ) {
    return "/vendor-template-about";
  }

  if (value.startsWith("components.contact_page")) {
    return "/vendor-template-contact";
  }

  if (value.startsWith("components.custom_pages")) {
    return "/vendor-template-pages";
  }

  if (value.startsWith("components.social_page.blogs")) {
    return "/vendor-template-blog";
  }

  if (value.startsWith("components.social_page.legal_pages")) {
    return "/vendor-template-policy";
  }

  if (value.startsWith("components.social_page")) {
    return "/vendor-template-other";
  }

  return null;
};

const PENDING_SELECTION_STORAGE_KEY = "vendor_template_pending_selection";

export type PendingEditorSelection = {
  route?: string | null;
  sectionId?: string | null;
  componentId?: string | null;
};

export const setPendingEditorSelection = (
  selection?: PendingEditorSelection | null
) => {
  if (typeof window === "undefined") return;

  try {
    if (!selection?.componentId && !selection?.sectionId) {
      window.sessionStorage.removeItem(PENDING_SELECTION_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(
      PENDING_SELECTION_STORAGE_KEY,
      JSON.stringify({
        route: selection.route || null,
        sectionId: selection.sectionId || null,
        componentId: selection.componentId || null,
      })
    );
  } catch {
    return;
  }
};

export const consumePendingEditorSelection = (route?: string) => {
  if (typeof window === "undefined") return undefined;

  try {
    const raw = window.sessionStorage.getItem(PENDING_SELECTION_STORAGE_KEY);
    if (!raw) return undefined;

    const parsed = JSON.parse(raw) as PendingEditorSelection;
    const targetRoute = String(parsed?.route || "").trim();
    if (targetRoute && route && targetRoute !== route) {
      return undefined;
    }

    window.sessionStorage.removeItem(PENDING_SELECTION_STORAGE_KEY);
    return {
      route: targetRoute || undefined,
      sectionId: String(parsed?.sectionId || "").trim() || undefined,
      componentId: String(parsed?.componentId || "").trim() || undefined,
    };
  } catch {
    return undefined;
  }
};
