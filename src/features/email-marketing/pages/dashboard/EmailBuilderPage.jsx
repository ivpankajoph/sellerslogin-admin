import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import LoadingState from "../../components/ui/LoadingState.jsx";
import { ToastContext } from "../../context/ToastContext.jsx";
import { getCatalogProduct, productCatalog } from "../../data/productCatalog.js";
import { getTemplatePreset } from "../../data/templatePresets.js";
import { api } from "../../lib/api.js";

const uid = () =>
  globalThis.crypto?.randomUUID?.() || `block_${Math.random().toString(36).slice(2, 10)}`;

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const isDataImageUrl = (value = "") => /^data:image\//i.test(String(value || "").trim());

const imageUrlToPng = async (value = "") => {
  const source = String(value || "").trim();
  if (!isDataImageUrl(source)) {
    return source;
  }

  const { data } = await api.post("/uploads/image", {
    dataUrl: source,
    filename: "template-image",
  });

  if (!data?.url) {
    throw new Error("Unable to upload image");
  }

  return data.url;
};

const fileToPngDataUrl = async (file) => {
  const rawDataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read image"));
    reader.readAsDataURL(file);
  });

  return imageUrlToPng(rawDataUrl);
};

const normalizeTemplateImageUrls = async (form) => {
  const next = {
    ...form,
    styleSettings: {
      ...(form.styleSettings || cloneStyleSettings()),
      background: {
        ...((form.styleSettings || cloneStyleSettings()).background || {}),
        imageUrl: await imageUrlToPng((form.styleSettings || cloneStyleSettings()).background?.imageUrl || ""),
      },
    },
    blocks: Array.isArray(form.blocks) ? form.blocks.map((block) => ({ ...block, props: { ...(block.props || {}) } })) : [],
  };

  if (!Array.isArray(next.blocks)) {
    next.blocks = [];
  }

  next.blocks = await Promise.all(
    next.blocks.map(async (block) => {
      const props = { ...(block.props || {}) };
      if (typeof props.imageUrl === "string" && props.imageUrl.trim()) {
        props.imageUrl = await imageUrlToPng(props.imageUrl);
      }
      if (typeof props.thumbnailUrl === "string" && props.thumbnailUrl.trim()) {
        props.thumbnailUrl = await imageUrlToPng(props.thumbnailUrl);
      }
      return { ...block, props };
    }),
  );

  return next;
};

const money = (value = 0) => `$${Number(value || 0).toFixed(2)}`;

const cloneStyleSettings = (settings = {}) => ({
  layout: { bodyWidth: 600, bodyColor: "#ffffff", ...(settings.layout || {}) },
  spacing: { padding: 28, groupSides: true, ...(settings.spacing || {}) },
  background: {
    color: "#f5f7fb",
    imageUrl: "",
    ...(settings.background || {}),
  },
  header: { showBrowserLink: true, ...(settings.header || {}) },
  text: {
    paragraphFont: "Arial",
    headingFont: "Arial",
    fontSize: 16,
    fontColor: "#334155",
    lineHeight: 1.7,
    direction: "ltr",
    linkColor: "#2563eb",
    linkStyle: "underline",
    ...(settings.text || {}),
  },
  buttons: {
    font: "Arial",
    fontSize: 16,
    fontColor: "#ffffff",
    bold: true,
    italic: false,
    underline: false,
    width: 50,
    roundedCorners: 12,
    backgroundColor: "#111827",
    borderSize: 0,
    borderColor: "#111827",
    ...(settings.buttons || {}),
  },
});

const createInitialForm = (mode = "builder") => ({
  name: "",
  subject: "",
  previewText: "",
  accentColor: "#6d28d9",
  styleSettings: cloneStyleSettings(),
  blocks: [],
  advancedHtml: mode === "html" ? "" : "",
});

const normalizeBlocks = (blocks = []) =>
  blocks.filter(Boolean).map((block) => {
    const legacyTypeMap = {
      eyebrow: "body_text",
      heading: "title",
      text: "body_text",
      body: "body_text",
      product_list: "dynamic_content",
    };
    const type = blockDefinitions[block.type] ? block.type : legacyTypeMap[block.type] || block.type;
    const props = block.props || {};

    if (type === "title") return { id: block.id || uid(), type, props: { ...blockDefinitions.title.create(), content: props.content ?? props.title ?? props.text ?? "", align: props.align || "left", fontSize: Number(props.fontSize || 34), color: props.color || "#0f172a" } };
    if (type === "body_text") return { id: block.id || uid(), type, props: { ...blockDefinitions.body_text.create(), content: props.content ?? props.text ?? "", align: props.align || "left", fontSize: Number(props.fontSize || 16), color: props.color || "#334155", lineHeight: Number(props.lineHeight || 1.7), bold: Boolean(props.bold), italic: Boolean(props.italic), underline: Boolean(props.underline) } };
    if (type === "button") return { id: block.id || uid(), type, props: { ...blockDefinitions.button.create(), ...props, text: props.text || props.label || "Call to action" } };
    if (type === "image") return { id: block.id || uid(), type, props: { ...blockDefinitions.image.create(), ...props } };
    if (type === "product") return { id: block.id || uid(), type, props: { ...blockDefinitions.product.create(), ...props } };
    if (type === "dynamic_content") return { id: block.id || uid(), type, props: { ...blockDefinitions.dynamic_content.create(), ...props } };
    if (type === "logo") return { id: block.id || uid(), type, props: { ...blockDefinitions.logo.create(), ...props } };
    if (type === "social") return { id: block.id || uid(), type, props: { ...blockDefinitions.social.create(), ...props } };
    if (type === "html") return { id: block.id || uid(), type, props: { ...blockDefinitions.html.create(), ...props } };
    if (type === "divider") return { id: block.id || uid(), type, props: { ...blockDefinitions.divider.create(), ...props } };
    if (type === "navigation") return { id: block.id || uid(), type, props: { ...blockDefinitions.navigation.create(), ...props } };
    if (type === "spacer") return { id: block.id || uid(), type, props: { ...blockDefinitions.spacer.create(), ...props } };
    if (type === "video") return { id: block.id || uid(), type, props: { ...blockDefinitions.video.create(), ...props } };
    return { id: block.id || uid(), type: "body_text", props: { ...blockDefinitions.body_text.create(), ...props } };
  });

const legacyToBlocks = (design = {}) => {
  if (Array.isArray(design.blocks) && design.blocks.length) {
    return normalizeBlocks(design.blocks);
  }

  const blocks = [];
  if (design.headerLabel) blocks.push({ id: uid(), type: "body_text", props: { ...blockDefinitions.body_text.create(), content: design.headerLabel, fontSize: 12, color: "#64748b", bold: true } });
  if (design.headline) blocks.push({ id: uid(), type: "title", props: { ...blockDefinitions.title.create(), content: design.headline } });
  if (design.introText) blocks.push({ id: uid(), type: "body_text", props: { ...blockDefinitions.body_text.create(), content: design.introText } });
  if (design.bodyText) blocks.push({ id: uid(), type: "body_text", props: { ...blockDefinitions.body_text.create(), content: design.bodyText } });
  if (design.imageUrl) {
    blocks.push({
      id: uid(),
      type: "image",
      props: {
        ...blockDefinitions.image.create(),
        imageUrl: design.imageUrl,
        alt: design.imageAlt || blockDefinitions.image.create().alt,
        linkUrl: design.ctaUrl || "",
      },
    });
  }
  if (design.ctaText || design.ctaUrl) {
    blocks.push({
      id: uid(),
      type: "button",
      props: {
        ...blockDefinitions.button.create(),
        text: design.ctaText || "View Update",
        url: design.ctaUrl || "https://sellerslogin.com",
      },
    });
  }
  if (design.footerNote) blocks.push({ id: uid(), type: "body_text", props: { ...blockDefinitions.body_text.create(), content: design.footerNote } });
  return blocks;
};

const mapTemplateToForm = (data, mode = "builder") => {
  const design = data.designJson || {};
  const blocks = legacyToBlocks(design);
  const isBuilderTemplate = design.editor === "drag-drop" || blocks.length > 0;

  return {
    ...createInitialForm(mode),
    name: data.name || "",
    subject: data.subject || "",
    previewText: data.previewText || "",
    accentColor: design.accentColor || "#6d28d9",
    styleSettings: cloneStyleSettings(design.styleSettings || design.builderSettings || {}),
    blocks,
    advancedHtml: mode === "html" || !isBuilderTemplate ? data.htmlContent || "" : "",
  };
};

const socialNetworks = ["facebook", "instagram", "x", "youtube", "tiktok", "linkedin"];

const socialNetworkMeta = {
  facebook: {
    label: "Facebook",
    short: "f",
    color: "#1877f2",
    iconUrl: "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg",
  },
  instagram: {
    label: "Instagram",
    short: "ig",
    color: "linear-gradient(135deg, #f58529 0%, #dd2a7b 55%, #8134af 100%)",
    iconUrl: "https://img.freepik.com/premium-vector/instagram-logo-with-colorful-gradient_1273375-1516.jpg?semt=ais_hybrid&w=740&q=80",
  },
  x: {
    label: "X",
    short: "x",
    color: "#111827",
    iconUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRoCYphTFk4G4kKew1pFbWPdQ8n4vv2VyRyGg&s",
  },
  youtube: {
    label: "YouTube",
    short: "yt",
    color: "#ff0000",
    iconUrl: "https://static.vecteezy.com/system/resources/thumbnails/047/580/497/small/youtube-popular-social-media-logo-free-png.png",
  },
  tiktok: { label: "TikTok", short: "tt", color: "#111827", iconUrl: "" },
  linkedin: {
    label: "LinkedIn",
    short: "in",
    color: "#0a66c2",
    iconUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ20jX_O-zXwzv9VVovmevV9Qp-daMqj9p9SQ&s",
  },
};

const getSocialIconMeta = (network = "") => socialNetworkMeta[String(network || "").toLowerCase()] || {
  label: String(network || "Social").replace(/^\w/, (char) => char.toUpperCase()),
  short: String(network || "s").slice(0, 2).toLowerCase(),
  color: "#334155",
  iconUrl: "",
};

const blockDefinitions = {
  title: {
    label: "Title",
    description: "Primary headline for the email.",
    helpText: "Use this for the main heading. It should catch the reader's attention fast.",
    create: () => ({
      content: "",
      align: "left",
      fontSize: 34,
      color: "#0f172a",
      level: 1,
      marginTop: 0,
      marginBottom: 14,
    }),
  },
  body_text: {
    label: "Body text",
    description: "Editable paragraph copy with inline formatting.",
    helpText: "Use this for normal paragraph text. It is good for details and short messages.",
    create: () => ({
      content: "",
      align: "left",
      fontSize: 16,
      color: "#334155",
      lineHeight: 1.7,
      bold: false,
      italic: false,
      underline: false,
      marginTop: 0,
      marginBottom: 14,
    }),
  },
  image: {
    label: "Image",
    description: "Hero, product, or banner image.",
    helpText: "Use this to add a picture, banner, or product image to your email.",
    create: () => ({
      imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
      alt: "Campaign banner",
      width: 100,
      align: "center",
      linkUrl: "",
      caption: "Optional caption for your image block.",
    }),
  },
  video: {
    label: "Video",
    description: "Video thumbnail with a linked play CTA.",
    helpText: "Use this to show a video preview and link people to watch it.",
    create: () => ({
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      thumbnailUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
      alt: "Video preview",
      align: "center",
      ctaLabel: "Play video",
      caption: "Video preview content.",
    }),
  },
  button: {
    label: "Button",
    description: "Clear CTA with custom colors and spacing.",
    helpText: "Use this for a call to action button, like Shop now or Learn more.",
    create: () => ({
      text: "Call to action",
      url: "https://sellerslogin.com",
      align: "center",
      backgroundColor: "#111827",
      fontColor: "#ffffff",
      radius: 14,
      paddingX: 24,
      paddingY: 14,
      width: 50,
      borderSize: 0,
      borderColor: "#111827",
    }),
  },
  dynamic_content: {
    label: "Dynamic content",
    description: "Auto-populated content from a dynamic source.",
    helpText: "Use this to show content that can change, like product recommendations.",
    create: () => ({
      sourceType: "recommendations",
      sourceQuery: "",
      itemCount: 3,
      layout: "grid",
      showImage: true,
      showTitle: true,
      showPrice: true,
      showButton: true,
      fallbackText: "No matching items found.",
    }),
  },
  logo: {
    label: "Logo",
    description: "Brand logo with link and width control.",
    helpText: "Use this to show your brand logo near the top or bottom of the email.",
    create: () => ({
      imageUrl: "",
      alt: "Logo",
      linkUrl: "",
      width: 160,
      align: "left",
    }),
  },
  social: {
    label: "Social",
    description: "Social icon row with custom links.",
    helpText: "Use this to add social media icons that link to your profiles.",
    create: () => ({
      items: [
        { network: "facebook", url: "" },
        { network: "x", url: "" },
        { network: "youtube", url: "" },
        { network: "linkedin", url: "" },
      ],
      align: "left",
      iconSize: 32,
      gap: 12,
    }),
  },
  html: {
    label: "HTML",
    description: "Raw HTML block with preview rendering.",
    helpText: "Use this when you want to add your own HTML code.",
    create: () => ({
      html: "<div style=\"padding:12px;border:1px dashed #cbd5e1;border-radius:16px;\">Custom HTML</div>",
      previewMode: "safe",
    }),
  },
  divider: {
    label: "Divider",
    description: "Visual separator with custom spacing.",
    helpText: "Use this to add a line between two parts of your email.",
    create: () => ({
      thickness: 1,
      width: 100,
      align: "center",
      color: "#e5e7eb",
      spacingTop: 16,
      spacingBottom: 16,
    }),
  },
  product: {
    label: "Product",
    description: "Single product card tied to the catalog.",
    helpText: "Use this to show one product with image, price, and a button.",
    create: () => ({
      productIds: [productCatalog[0]?.id || ""],
      layout: "card",
      showImage: true,
      showTitle: true,
      showPrice: true,
      showCompareAt: true,
      showButton: true,
      ctaLabel: "View product",
    }),
  },
  navigation: {
    label: "Navigation",
    description: "Editable menu items and alignment.",
    helpText: "Use this to add menu links like Shop, About, or Contact.",
    create: () => ({
      items: [
        { label: "Shop", url: "#" },
        { label: "About", url: "#" },
        { label: "Contact", url: "#" },
      ],
      align: "center",
      gap: 20,
      color: "#111827",
      fontSize: 14,
    }),
  },
  spacer: {
    label: "Spacer",
    description: "Clean vertical breathing room.",
    helpText: "Use this to add empty space between blocks.",
    create: () => ({
      height: 24,
    }),
  },
};

const blockTypesInOrder = Object.keys(blockDefinitions);
const blockLabel = Object.fromEntries(blockTypesInOrder.map((type) => [type, blockDefinitions[type].label]));
const paletteItems = Object.fromEntries(
  blockTypesInOrder.map((type) => [type, { title: blockDefinitions[type].label, description: blockDefinitions[type].description }]),
);

const createBlockByType = (type) => ({
  id: uid(),
  type,
  props: blockDefinitions[type]?.create ? blockDefinitions[type].create() : {},
});

const sectionPresets = [
  {
    key: "hero",
    title: "Hero section",
    description: "Title, body text, image, and CTA.",
    build: () => [
      createBlockByType("title"),
      createBlockByType("body_text"),
      createBlockByType("image"),
      createBlockByType("button"),
    ],
  },
  {
    key: "product",
    title: "Product spotlight",
    description: "Single product or dynamic recommendation.",
    build: () => [createBlockByType("title"), createBlockByType("product")],
  },
  {
    key: "footer",
    title: "Footer section",
    description: "Navigation, social links, and spacer.",
    build: () => [createBlockByType("divider"), createBlockByType("navigation"), createBlockByType("social"), createBlockByType("spacer")],
  },
];

const fontOptions = ["Arial", "Helvetica", "Georgia", "Times New Roman", "Verdana", "Inter"];

const stripUnsafeHtml = (html = "") => String(html || "").replace(/<script[\s\S]*?<\/script>/gi, "");

const formatTextHtml = (value = "") => escapeHtml(value).replace(/\r\n|\r|\n/g, "<br />");

const wrapEmailBlock = (html = "") =>
  `<div class="email-builder-block" style="box-sizing:border-box;margin:0 0 16px;padding:16px;border:1px solid #e2e8f0;border-radius:24px;background:#ffffff;">${html}</div>`;

const getTrackingMeta = (block, fallbackSection = "Content") => {
  const sectionByType = {
    title: "Header",
    body_text: "Content",
    image: "Image",
    video: "Video",
    button: "CTA button",
    logo: "Brand logo",
    social: "Social links",
    navigation: "Navigation links",
    product: "Product block",
  };

  const section = block.props.section || sectionByType[block.type] || fallbackSection;

  return {
    blockId: block.id || block._id || "",
    section,
    ctaType: block.type,
  };
};

const buildTrackingAttrs = (block, fallbackSection = "Content") => {
  const meta = getTrackingMeta(block, fallbackSection);

  return [
    `data-track-block="${escapeHtml(meta.blockId)}"`,
    `data-track-section="${escapeHtml(meta.section)}"`,
    `data-track-cta-type="${escapeHtml(meta.ctaType)}"`,
  ].join(" ");
};

const blockHtml = (block, settings) => {
  const align = block.props.align || "left";
  const textAlign = `text-align:${align};`;
  const paragraphFont = settings.text.paragraphFont || "Arial";
  const headingFont = settings.text.headingFont || paragraphFont;
  const textColor = settings.text.fontColor || "#334155";
  const lineHeight = Number(settings.text.lineHeight || 1.7);
  const headingSize = Math.max(24, Number(settings.text.fontSize || 16) + 14);
  const bodySize = Number(settings.text.fontSize || 16);
  const direction = settings.text.direction === "rtl" ? "rtl" : "ltr";
  const blockColor = block.props.color || textColor;
  const blockSize = Number(block.props.fontSize || bodySize);

  switch (block.type) {
    case "title":
      return wrapEmailBlock(`<h1 style="margin:${Number(block.props.marginTop || 0)}px 0 ${Number(block.props.marginBottom || 14)}px;font-size:${Number(block.props.fontSize || headingSize)}px;line-height:1.15;color:${block.props.color || "#0f172a"};font-weight:700;font-family:${headingFont};direction:${direction};${textAlign}">${formatTextHtml(block.props.content || "")}</h1>`);
    case "body_text":
      return wrapEmailBlock(`<p style="margin:${Number(block.props.marginTop || 0)}px 0 ${Number(block.props.marginBottom || 14)}px;font-size:${Number(block.props.fontSize || bodySize)}px;line-height:${Number(block.props.lineHeight || lineHeight)};color:${block.props.color || textColor};white-space:pre-wrap;font-family:${paragraphFont};font-weight:${block.props.bold ? 700 : 400};${block.props.italic ? "font-style:italic;" : ""}${block.props.underline ? "text-decoration:underline;" : ""}direction:${direction};${textAlign}">${formatTextHtml(block.props.content || "")}</p>`);
    case "image":
      return wrapEmailBlock(`<div style="text-align:${align};"><a href="${escapeHtml(block.props.linkUrl || "#")}" ${buildTrackingAttrs(block, "Image block")} style="text-decoration:none;">${block.props.imageUrl ? `<img src="${escapeHtml(block.props.imageUrl)}" alt="${escapeHtml(block.props.alt || "Image")}" style="display:block;width:${Math.max(20, Number(block.props.width || 100))}%;margin:0 auto;border-radius:24px;object-fit:cover;" />` : `<div style="border:1px dashed #cbd5e1;border-radius:24px;padding:40px 20px;color:#94a3b8;text-align:center;">Image</div>`}</a>${block.props.caption ? `<p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#64748b;text-align:${align};font-family:${paragraphFont};">${escapeHtml(block.props.caption)}</p>` : ""}</div>`);
    case "video":
      return wrapEmailBlock(`<div style="text-align:${align};"><a href="${escapeHtml(block.props.videoUrl || "#")}" ${buildTrackingAttrs(block, "Video block")} style="display:inline-block;text-decoration:none;"><div style="position:relative;border-radius:24px;overflow:hidden;border:1px solid #e5e7eb;background:#0f172a;"><img src="${escapeHtml(block.props.thumbnailUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80")}" alt="${escapeHtml(block.props.alt || "Video preview")}" style="display:block;width:100%;max-width:100%;object-fit:cover;opacity:.92;" /><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;"><span style="width:72px;height:72px;border-radius:999px;background:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#111827;">▶</span></div></div></a><p style="margin:10px 0 0;color:#64748b;font-family:${paragraphFont};font-size:13px;">${escapeHtml(block.props.caption || block.props.ctaLabel || "Play video")}</p></div>`);
    case "button": {
      const width = Math.min(100, Math.max(20, Number(block.props.width || settings.buttons.width || 50)));
      const borderSize = Math.max(0, Number(block.props.borderSize ?? settings.buttons.borderSize ?? 0));
      const backgroundColor = block.props.backgroundColor || settings.buttons.backgroundColor || "#111827";
      const fontColor = block.props.fontColor || settings.buttons.fontColor || "#ffffff";
      const radius = Number(block.props.radius || settings.buttons.roundedCorners || 12);
      const fontSize = Number(block.props.fontSize || settings.buttons.fontSize || 16);
      const paddingY = Number(block.props.paddingY || 12);
      const paddingX = Number(block.props.paddingX || 20);
      const marginY = Number(block.props.marginY || 15);
      const buttonStyle = `display:inline-block;box-sizing:border-box;text-decoration:none;font-size:${fontSize}px;font-family:${settings.buttons.font || "Arial"};font-weight:${block.props.bold === false ? 500 : 700};${block.props.italic ? "font-style:italic;" : ""}${block.props.underline ? "text-decoration:underline;" : ""}padding:${paddingY}px ${paddingX}px;border-radius:${radius}px;${block.props.style === "ghost" ? `background:transparent;color:${backgroundColor};` : `background:${backgroundColor};color:${fontColor};`}border:${borderSize}px solid ${block.props.borderColor || backgroundColor};width:${width}%;`;
      return wrapEmailBlock(`<div style="text-align:${align};margin:${marginY}px 0;"><a href="${escapeHtml(block.props.url || "#")}" ${buildTrackingAttrs(block, "CTA button")} title="${escapeHtml(block.props.tooltip || "")}" style="${buttonStyle}">${escapeHtml(block.props.text || "Click")}</a></div>`);
    }
    case "dynamic_content": {
      const products = productCatalog.slice(0, Number(block.props.itemCount || 3));
      const list = products.length ? products : productCatalog.slice(0, 3);
      const layout = block.props.layout === "list" ? "list" : "grid";
      const showImage = block.props.showImage !== false;
      const showTitle = block.props.showTitle !== false;
      const showPrice = block.props.showPrice !== false;
      const showButton = block.props.showButton !== false;
      const card = (product) => `
        <td style="${layout === "grid" ? "width:33.33%;padding:0 8px 16px;vertical-align:top;" : "width:100%;padding:0 0 12px;"}">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;background:#fff;">
            <tr>
              <td style="padding:16px;">
                ${showImage ? `<img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name)}" style="display:block;width:100%;height:160px;object-fit:cover;border-radius:14px;" />` : ""}
                ${showTitle ? `<div style="margin-top:12px;font-size:16px;font-weight:700;color:#0f172a;font-family:${paragraphFont};">${escapeHtml(product.name)}</div>` : ""}
                ${showPrice ? `<div style="margin-top:8px;font-weight:700;color:${settings.buttons.backgroundColor || "#111827"};">${money(product.price)}${block.props.showCompareAt && product.compareAtPrice ? `<span style="margin-left:8px;color:#94a3b8;text-decoration:line-through;">${money(product.compareAtPrice)}</span>` : ""}</div>` : ""}
                ${showButton ? `<div style="margin-top:14px;"><span style="display:inline-block;background:${settings.buttons.backgroundColor || "#111827"};color:${settings.buttons.fontColor || "#ffffff"};padding:10px 14px;border-radius:10px;font-size:13px;font-weight:700;font-family:${paragraphFont};">${escapeHtml(block.props.ctaLabel || "View product")}</span></div>` : ""}
              </td>
            </tr>
          </table>
        </td>`;
      return wrapEmailBlock(`<div style="margin:20px 0 0;text-align:${align};"><div style="font-size:20px;font-weight:700;color:#0f172a;font-family:${paragraphFont};margin:0 0 14px;">${escapeHtml(block.props.title || "Recommended products")}</div>${layout === "grid" ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>${list.map((product) => card(product)).join("")}</tr></table>` : `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${list.map((product) => `<tr>${card(product).replace("<td style=\"width:100%;padding:0 0 12px;\">", "<td style=\"width:100%;padding:0 0 12px;\">")}</tr>`).join("")}</table>`}</div>`);
    }
    case "logo":
      return wrapEmailBlock(`<div style="text-align:${align};"><a href="${escapeHtml(block.props.linkUrl || "#")}" ${buildTrackingAttrs(block, "Brand logo")} style="text-decoration:none;"><img src="${escapeHtml(block.props.imageUrl || "https://placehold.co/320x120?text=Logo")}" alt="${escapeHtml(block.props.alt || "Logo")}" style="display:inline-block;width:${Math.max(40, Number(block.props.width || 160))}px;max-width:100%;height:auto;" /></a></div>`);
    case "social": {
      const items = Array.isArray(block.props.items) ? block.props.items : [];
      const icons = items.length ? items : [];
      const iconSize = Math.max(20, Number(block.props.iconSize || 32));
      const gap = Math.max(4, Number(block.props.gap || 12));
      return wrapEmailBlock(`<div style="text-align:${align};"><table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;"><tr>${icons.map((item) => {
        const meta = getSocialIconMeta(item.network);
        const imageMarkup = meta.iconUrl
          ? `<img src="${escapeHtml(meta.iconUrl)}" alt="${escapeHtml(meta.label)}" style="display:block;width:${Math.round(iconSize)}px;height:${Math.round(iconSize)}px;object-fit:contain;border-radius:999px;background:#fff;" />`
          : `<span style="display:flex;width:${Math.round(iconSize)}px;height:${Math.round(iconSize)}px;border-radius:999px;background:${meta.color || "#334155"};color:#fff;align-items:center;justify-content:center;text-decoration:none;font-size:${Math.max(9, Math.round(iconSize * 0.33))}px;font-weight:700;text-transform:uppercase;letter-spacing:.02em;">${escapeHtml(meta.short)}</span>`;
        return `<td style="padding:0 ${Math.round(gap / 2)}px;"><a href="${escapeHtml(item.url || "#")}" ${buildTrackingAttrs({ ...block, props: { ...block.props, section: "Social links" } }, "Social links")} style="display:inline-flex;align-items:center;justify-content:center;text-decoration:none;border-radius:999px;box-shadow:0 6px 14px rgba(15,23,42,.08);overflow:hidden;">${imageMarkup}</a></td>`;
      }).join("")}</tr></table></div>`);
    }
    case "html":
      return wrapEmailBlock(stripUnsafeHtml(block.props.html || ""));
    case "divider":
      return wrapEmailBlock(`<hr style="border:none;border-top:${Math.max(1, Number(block.props.thickness || 1))}px solid ${block.props.color || "#e5e7eb"};width:${Math.min(100, Math.max(20, Number(block.props.width || 100)))}%;margin:${Number(block.props.spacingTop || 16)}px auto ${Number(block.props.spacingBottom || 16)}px;" />`);
    case "product": {
      const p = getCatalogProduct((block.props.productIds || [])[0]);
      if (!p) return wrapEmailBlock(`<div style="padding:20px;border:1px dashed #cbd5e1;border-radius:18px;color:#64748b;">No product selected</div>`);
      return wrapEmailBlock(`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 auto 16px;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;background:#fff;"><tr><td width="180" style="padding:0;vertical-align:top;">${block.props.showImage !== false ? `<img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.name)}" style="display:block;width:100%;height:180px;object-fit:cover;" />` : ""}</td><td style="padding:18px;vertical-align:top;"><div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#94a3b8;font-weight:700;font-family:${paragraphFont};">Product</div>${block.props.showTitle !== false ? `<div style="margin-top:8px;font-size:18px;line-height:1.35;font-weight:700;color:#0f172a;font-family:${paragraphFont};">${escapeHtml(p.name)}</div>` : ""}${block.props.showPrice !== false ? `<div style="margin-top:12px;font-size:18px;font-weight:700;color:${settings.buttons.backgroundColor || "#111827"};">${money(p.price)}${block.props.showCompareAt && p.compareAtPrice ? `<span style="margin-left:8px;color:#94a3b8;text-decoration:line-through;">${money(p.compareAtPrice)}</span>` : ""}</div>` : ""}${block.props.showButton !== false ? `<div style="margin-top:16px;"><span style="display:inline-block;background:${settings.buttons.backgroundColor || "#111827"};color:${settings.buttons.fontColor || "#ffffff"};padding:10px 16px;border-radius:10px;font-size:14px;font-weight:700;font-family:${paragraphFont};">${escapeHtml(block.props.ctaLabel || "View product")}</span></div>` : ""}</td></tr></table>`);
    }
    case "navigation": {
      const items = Array.isArray(block.props.items) ? block.props.items : [];
      return wrapEmailBlock(`<nav style="text-align:${align};font-family:${paragraphFont};font-size:${Number(block.props.fontSize || 14)}px;color:${block.props.color || "#111827"};"><div style="display:inline-flex;flex-wrap:wrap;gap:${Number(block.props.gap || 20)}px;justify-content:${align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start"};">${items.map((item) => `<a href="${escapeHtml(item.url || "#")}" ${buildTrackingAttrs(block, "Navigation links")} style="color:${block.props.color || "#111827"};text-decoration:none;font-weight:600;">${escapeHtml(item.label || "Link")}</a>`).join("")}</div></nav>`);
    }
    case "spacer":
      return `<div style="height:${Number(block.props.height || 24)}px;"></div>`;
    default:
      return "";
  }
};

const buildTemplateHtml = (form) => {
  const settings = form.styleSettings || cloneStyleSettings();
  const bodyWidth = Math.max(320, Number(settings.layout.bodyWidth || 600));
  const outerPadding = Math.max(0, Number(settings.spacing.padding || 28));
  const emailPadding = settings.spacing.groupSides
    ? `${outerPadding}px`
    : `${outerPadding}px ${Math.max(16, Math.round(outerPadding * 0.6))}px`;
  const backgroundImage = settings.background.imageUrl
    ? `background-image:url('${escapeHtml(settings.background.imageUrl)}');background-size:cover;background-position:center;`
    : "";
  const direction = settings.text.direction === "rtl" ? "rtl" : "ltr";
  const contentHtml = (form.blocks || []).map((block) => blockHtml(block, settings)).join("") || `<p style="margin:0;font-size:16px;line-height:1.7;color:#64748b;font-family:${settings.text.paragraphFont || "Arial"};">Drop content here.</p>`;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { margin: 0; padding: 0; background: ${settings.background.color || "#f5f7fb"}; direction: ${direction}; }
      a { color: ${settings.text.linkColor || "#2563eb"}; ${settings.text.linkStyle === "none" ? "text-decoration:none;" : settings.text.linkStyle === "underline" ? "text-decoration:underline;" : ""} }
    </style>
  </head>
  <body style="margin:0;padding:0;background:${settings.background.color || "#f5f7fb"};${backgroundImage}">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${settings.background.color || "#f5f7fb"};padding:${outerPadding}px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:${bodyWidth}px;background:${settings.layout.bodyColor || "#ffffff"};border:1px solid #e5e7eb;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:${emailPadding};font-family:${settings.text.paragraphFont || "Arial"},sans-serif;">
                ${settings.header.showBrowserLink ? `<p style="margin:0 0 18px;font-size:12px;color:#64748b;text-align:right;"><a href="#" style="color:${settings.text.linkColor || "#2563eb"};text-decoration:${settings.text.linkStyle === "none" ? "none" : "underline"};">View in browser</a></p>` : ""}
                ${contentHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

const previewBlock = (block, settings) => {
  const align = block.props.align || "left";
  const textAlign =
    align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  const paragraphFont = settings.text.paragraphFont || "Arial";
  const headingFont = settings.text.headingFont || paragraphFont;
  const textColor = settings.text.fontColor || "#334155";
  const bodySize = Number(settings.text.fontSize || 16);
  const headingSize = Math.max(24, bodySize + 14);
  const blockColor = block.props.color || textColor;

  if (block.type === "eyebrow")
    return <p className={`font-semibold uppercase tracking-[0.22em] ${textAlign}`} style={{ fontFamily: paragraphFont, color: blockColor, fontSize: `${Number(block.props.fontSize || 12)}px` }}>{block.props.content || "Campaign update"}</p>;
  if (block.type === "heading")
    return (
      <h4 className={`font-semibold ${textAlign}`} style={{ fontFamily: headingFont, fontSize: `${Number(block.props.fontSize || headingSize)}px`, lineHeight: 1.15, color: block.props.color || "#0f172a" }}>
        {block.props.content || ""}
      </h4>
    );
  if (block.type === "body" || block.type === "text")
    return <p className={`whitespace-pre-line ${textAlign}`} style={{ fontFamily: paragraphFont, color: block.props.color || textColor, fontSize: `${Number(block.props.fontSize || bodySize)}px`, lineHeight: settings.text.lineHeight }}>{block.props.content || ""}</p>;
  if (block.type === "image")
    return (
      <div>
        <img
          src={
            block.props.imageUrl ||
            "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"
          }
          alt={block.props.alt || "Campaign banner"}
          className={`w-full object-cover ${block.props.rounded ? "rounded-3xl" : ""}`}
        />
        {block.props.caption ? <p className="mt-2 text-center text-sm text-slate-500">{block.props.caption}</p> : null}
      </div>
    );
  if (block.type === "button") {
    const width = Math.min(100, Math.max(20, Number(block.props.width || settings.buttons.width || 50)));
    const borderSize = Math.max(0, Number(block.props.borderSize ?? settings.buttons.borderSize ?? 0));
    const backgroundColor = block.props.backgroundColor || settings.buttons.backgroundColor || "#111827";
    const fontColor = block.props.fontColor || settings.buttons.fontColor || "#ffffff";
    const radius = Number(block.props.radius || settings.buttons.roundedCorners || 12);
    const fontSize = Number(block.props.fontSize || settings.buttons.fontSize || 16);
    const paddingY = Number(block.props.paddingY || 12);
    const paddingX = Number(block.props.paddingX || 20);
    const marginY = Number(block.props.marginY || 15);
    const buttonStyle = {
      backgroundColor: block.props.style === "ghost" ? "transparent" : backgroundColor,
      color: block.props.style === "ghost" ? backgroundColor : fontColor,
      borderRadius: `${radius}px`,
      fontFamily: settings.buttons.font || "Arial",
      fontSize: `${fontSize}px`,
      width: `${width}%`,
      fontWeight: block.props.bold === false ? 500 : 700,
      fontStyle: block.props.italic ? "italic" : "normal",
      textDecoration: block.props.underline ? "underline" : "none",
      border: `${borderSize}px solid ${block.props.borderColor || backgroundColor}`,
      padding: `${paddingY}px ${paddingX}px`,
      margin: `${marginY}px 0`,
    };
    return (
      <div className={textAlign}>
        <span className="inline-flex items-center justify-center px-4 py-3 text-sm" style={buttonStyle}>
          {block.props.text || "Click"}
        </span>
      </div>
    );
  }
  if (block.type === "product") {
    const p = getCatalogProduct(block.props.productId);
    if (!p) return <p className="text-sm text-slate-500">No product selected</p>;
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-4">
        <div className="flex gap-3">
          <img src={p.imageUrl} alt={p.name} className="h-20 w-20 rounded-2xl object-cover" />
          <div className="flex-1">
            <p className="font-semibold text-slate-900">{p.name}</p>
            <p className="text-xs text-slate-500">{p.category}</p>
            <p className="mt-2 font-semibold text-slate-900">
              {money(p.price)}
              {block.props.showCompareAt && p.compareAtPrice ? (
                <span className="ml-2 text-xs text-slate-400 line-through">{money(p.compareAtPrice)}</span>
              ) : null}
            </p>
          </div>
        </div>
      </div>
    );
  }
  if (block.type === "product_list") {
    const ids = (block.props.productIds || []).slice(0, Number(block.props.limit || 3));
    const products = ids.map((id) => getCatalogProduct(id)).filter(Boolean);
    const list = products.length ? products : productCatalog.slice(0, Number(block.props.limit || 3));
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-900">{block.props.title || "Featured products"}</p>
        <div className="mt-3 space-y-3">
          {list.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
              <img src={p.imageUrl} alt={p.name} className="h-14 w-14 rounded-2xl object-cover" />
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{p.name}</p>
                <p className="text-xs text-slate-500">{p.category}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-900">{money(p.price)}</p>
                {block.props.showCompareAt ? <p className="text-xs text-slate-400 line-through">{money(p.compareAtPrice)}</p> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (block.type === "divider")
    return (
      <hr
        className="my-6 border-0"
        style={{
          borderTopStyle: "solid",
          borderTopWidth: `${Math.max(1, Number(block.props.thickness || 1))}px`,
          borderTopColor: block.props.color || "#e5e7eb",
        }}
      />
    );
  if (block.type === "spacer") return <div style={{ height: `${Number(block.props.size || 24)}px` }} />;
  return null;
};

const ControlCard = ({ title, description, children, className = "" }) => (
  <section className={`rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.05)] ${className}`}>
    <div className="mb-4">
      <h3 className="text-[18px] font-semibold tracking-tight text-slate-900">{title}</h3>
      {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
    </div>
    {children}
  </section>
);

const InspectorHelp = ({ text }) => {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 304 });
  const buttonRef = useRef(null);
  const bubbleRef = useRef(null);

  const updatePosition = () => {
    const button = buttonRef.current;
    if (!button || typeof window === "undefined") return;

    const rect = button.getBoundingClientRect();
    const width = Math.min(320, Math.max(240, window.innerWidth - 24));
    const left = Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - width - 12));
    const bubbleHeight = 96;
    const fitsBelow = rect.bottom + 8 + bubbleHeight <= window.innerHeight;
    const top = fitsBelow ? rect.bottom + 8 : Math.max(12, rect.top - 8 - bubbleHeight);

    setPosition({ top, left, width });
  };

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target) &&
        bubbleRef.current &&
        !bubbleRef.current.contains(event.target)
      ) {
        setOpen(false);
        setPinned(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        setPinned(false);
      }
    };

    updatePosition();
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const showHelp = () => {
    updatePosition();
    setOpen(true);
  };

  const hideHelp = () => {
    if (!pinned) {
      setOpen(false);
    }
  };

  const togglePinned = () => {
    setPinned((current) => {
      const next = !current;
      setOpen(next);
      if (next) updatePosition();
      return next;
    });
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-white"
        aria-label="Block help"
        aria-expanded={open}
        onClick={togglePinned}
        onFocus={showHelp}
        onBlur={hideHelp}
        onMouseEnter={showHelp}
        onMouseLeave={hideHelp}
      >
        ?
      </button>
      {open ? (
        createPortal(
          <div
            ref={bubbleRef}
            className="z-[80] rounded-2xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600 shadow-[0_18px_36px_rgba(15,23,42,0.12)] whitespace-normal break-words"
            style={{
              position: "fixed",
              top: `${position.top}px`,
              left: `${position.left}px`,
              width: `${position.width}px`,
              maxWidth: "calc(100vw - 24px)",
            }}
            onMouseEnter={showHelp}
            onMouseLeave={hideHelp}
          >
            {text}
          </div>,
          document.body,
        )
      ) : null}
    </>
  );
};

const Field = ({ label, hint, children, className = "" }) => (
  <label className={`block space-y-2 ${className}`}>
    <span className="text-sm font-semibold text-slate-800">{label}</span>
    {hint ? <span className="block text-xs leading-5 text-slate-500">{hint}</span> : null}
    {children}
  </label>
);

const ToggleGroup = ({ options, value, onChange, className = "" }) => (
  <div className={`inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1 ${className}`}>
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
          value === option.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

const textBlockTypes = new Set(["title", "body_text"]);

const CanvasDropZone = ({ active, label, onDragOver, onDrop }) => (
  <div
    data-canvas-dropzone="true"
    className={`relative h-4 transition ${active ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
    onDragOver={onDragOver}
    onDrop={onDrop}
  >
    <div
      className={`absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full transition ${
        active ? "bg-[#6d5efc]" : "bg-transparent"
      }`}
    />
    {active ? (
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[calc(100%+6px)] rounded-full bg-[#6d5efc] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-sm">
        {label}
      </div>
    ) : null}
  </div>
);

const CanvasEditableText = ({
  value,
  onChange,
  className = "",
  style,
  placeholder = "",
}) => {
  const textRef = useRef(null);
  const isFocusedRef = useRef(false);

  useEffect(() => {
    const el = textRef.current;
    if (!el || document.activeElement === el || isFocusedRef.current) {
      return;
    }

    const nextValue = String(value ?? "");
    if (el.textContent !== nextValue) {
      el.textContent = nextValue;
    }
  }, [value]);

  return (
    <div
      ref={textRef}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      className={className}
      style={style}
      data-placeholder={placeholder}
      onFocus={() => {
        isFocusedRef.current = true;
      }}
      onBlur={() => {
        isFocusedRef.current = false;
      }}
      onInput={(event) => onChange(event.currentTarget.textContent || "")}
    />
  );
};

const CanvasBlock = ({
  block,
  selected,
  settings,
  onSelect,
  onUpdate,
  onDuplicate,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onDragStart,
  onDragEnd,
}) => {
  const align = block.props.align || "left";
  const textAlign = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  const justify = align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start";
  const sharedWrap = `group relative rounded-[24px] border bg-white p-4 transition cursor-grab ${
    selected ? "border-[#6d5efc] ring-2 ring-[#6d5efc]/20" : "border-slate-200 hover:border-slate-300"
  }`;
  const fontSize = Number(block.props.fontSize || settings.text.fontSize || 16);
  const fontFamily = block.type === "title" ? settings.text.headingFont || "Arial" : settings.text.paragraphFont || "Arial";
  const color = block.props.color || settings.text.fontColor || "#334155";
  const textStyle = {
    fontFamily,
    fontSize: `${fontSize}px`,
    color,
    lineHeight: settings.text.lineHeight,
    fontWeight: block.type === "title" ? 700 : block.props.bold === false ? 400 : block.props.bold ? 700 : 400,
    fontStyle: block.props.italic ? "italic" : "normal",
    textDecoration: block.props.underline ? "underline" : "none",
  };

  const blockProps = {
    draggable: true,
    onDragStart: onDragStart(block.id),
    onDragEnd,
    onClick: onSelect,
    "data-canvas-block": "true",
  };

  if (block.type === "title") {
    const titleStyle = {
      ...textStyle,
      fontSize: `${Number(block.props.fontSize || 34)}px`,
      lineHeight: 1.15,
      textAlign: align,
      width: "100%",
      marginTop: `${Number(block.props.marginTop || 0)}px`,
      marginBottom: `${Number(block.props.marginBottom || 14)}px`,
    };

    return (
      <div className={sharedWrap} {...blockProps}>
        <CanvasEditableText
          value={block.props.content || ""}
          onChange={(content) => onUpdate(block.id, { content })}
          className={`min-h-[40px] w-full outline-none ${textAlign}`}
          style={titleStyle}
        />
      </div>
    );
  }

  if (block.type === "body_text") {
    const bodyStyle = {
      ...textStyle,
      fontSize: `${Number(block.props.fontSize || 16)}px`,
      lineHeight: Number(block.props.lineHeight || 1.7),
      textAlign: align,
      width: "100%",
      fontWeight: block.props.bold ? 700 : 400,
      fontStyle: block.props.italic ? "italic" : "normal",
      textDecoration: block.props.underline ? "underline" : "none",
      marginTop: `${Number(block.props.marginTop || 0)}px`,
      marginBottom: `${Number(block.props.marginBottom || 14)}px`,
    };

    return (
      <div className={sharedWrap} {...blockProps}>
        <CanvasEditableText
          value={block.props.content || ""}
          onChange={(content) => onUpdate(block.id, { content })}
          className={`min-h-[48px] w-full whitespace-pre-wrap break-words outline-none ${textAlign}`}
          style={bodyStyle}
        />
      </div>
    );
  }

  if (block.type === "video") {
    return (
      <div className={sharedWrap} {...blockProps}>
        <div className={align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"}>
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-950">
            <img
              src={block.props.thumbnailUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"}
              alt={block.props.alt || "Video preview"}
              className="block w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-lg">Play</span>
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-500">{block.props.caption || block.props.ctaLabel || "Play video"}</p>
        </div>
      </div>
    );
  }

  if (block.type === "logo") {
    return (
      <div className={sharedWrap} {...blockProps}>
        <div className={align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"}>
          {block.props.imageUrl ? (
            <img
              src={block.props.imageUrl}
              alt={block.props.alt || "Logo"}
              className="inline-block max-w-full"
              style={{ width: `${Math.max(40, Number(block.props.width || 160))}px` }}
            />
          ) : (
            <div className="inline-flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-500">
              Logo
            </div>
          )}
        </div>
      </div>
    );
  }

  if (block.type === "social") {
    const items = Array.isArray(block.props.items) ? block.props.items : [];
    const iconSize = Math.max(20, Number(block.props.iconSize || 32));
    const gap = Math.max(4, Number(block.props.gap || 12));
    return (
      <div className={sharedWrap} {...blockProps}>
        <div
          className={`flex flex-wrap items-center gap-3 ${
            align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"
          }`}
          style={{ gap: `${gap}px`, minHeight: `${Math.max(48, iconSize + 16)}px` }}
        >
          {items.length ? (
            items.map((item, index) => {
              const meta = getSocialIconMeta(item.network);
              const iconImage = meta.iconUrl ? (
                <img
                  src={meta.iconUrl}
                  alt={meta.label}
                  className="block"
                  style={{
                    width: `${iconSize}px`,
                    height: `${iconSize}px`,
                    objectFit: "contain",
                    backgroundColor: "#fff",
                    borderRadius: "9999px",
                  }}
                />
              ) : (
                <span
                  className="inline-flex items-center justify-center rounded-full text-xs font-bold uppercase text-white"
                  style={{
                    width: `${iconSize}px`,
                    height: `${iconSize}px`,
                    background: meta.color,
                    fontSize: `${Math.max(9, Math.round(iconSize * 0.33))}px`,
                  }}
                >
                  {meta.short}
                </span>
              );

              return (
                <a
                  key={`${item.network || "social"}-${index}`}
                  href={item.url || "#"}
                  title={meta.label}
                  className="inline-flex items-center justify-center rounded-full bg-white p-0 shadow-[0_8px_18px_rgba(15,23,42,0.12)] transition hover:scale-[1.03]"
                >
                  {iconImage}
                </a>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Add social links in the sidebar.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (block.type === "navigation") {
    return (
      <div className={sharedWrap} {...blockProps}>
        <nav className={`flex flex-wrap gap-4 ${align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"}`} style={{ color: block.props.color || "#111827", fontSize: `${Number(block.props.fontSize || 14)}px` }}>
          {(block.props.items || []).map((item, index) => (
            <a key={`${item.label || "link"}-${index}`} href={item.url || "#"} className="font-semibold text-slate-900 no-underline">
              {item.label || "Link"}
            </a>
          ))}
        </nav>
      </div>
    );
  }

  if (block.type === "html") {
    return (
      <div className={sharedWrap} {...blockProps}>
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4" dangerouslySetInnerHTML={{ __html: stripUnsafeHtml(block.props.html || "") || '<div style="color:#94a3b8;">HTML block</div>' }} />
      </div>
    );
  }

  if (block.type === "dynamic_content") {
    const products = productCatalog.slice(0, Number(block.props.itemCount || 3));
    return (
      <div className={sharedWrap} {...blockProps}>
        <div className="mb-3 text-sm font-semibold text-slate-900">{block.props.sourceType || "recommendations"}</div>
        <div className={`grid gap-3 ${block.props.layout === "list" ? "grid-cols-1" : "md:grid-cols-3"}`}>
          {products.length ? products.map((product) => (
            <div key={product.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {block.props.showImage !== false ? <img src={product.imageUrl} alt={product.name} className="h-40 w-full object-cover" /> : null}
              <div className="p-3">
                {block.props.showTitle !== false ? <div className="font-semibold text-slate-900">{product.name}</div> : null}
                {block.props.showPrice !== false ? <div className="mt-1 text-sm font-semibold text-slate-900">{money(product.price)}</div> : null}
                {block.props.showButton !== false ? <div className="mt-3 inline-flex rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">{block.props.ctaLabel || "View"}</div> : null}
              </div>
            </div>
          )) : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">{block.props.fallbackText || "No items found"}</div>}
        </div>
      </div>
    );
  }

  if (block.type === "product") {
    const productIds = Array.isArray(block.props.productIds) ? block.props.productIds : [];
    const product = productIds.map((id) => getCatalogProduct(id)).find(Boolean) || getCatalogProduct(productCatalog[0]?.id);
    return (
      <div className={sharedWrap} {...blockProps}>
        {product ? (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            {block.props.showImage !== false ? <img src={product.imageUrl} alt={product.name} className="h-48 w-full object-cover" /> : null}
            <div className="p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Product</div>
              {block.props.showTitle !== false ? <div className="mt-2 text-lg font-semibold text-slate-900">{product.name}</div> : null}
              {block.props.showPrice !== false ? (
                <div className="mt-2 text-base font-semibold text-slate-900">
                  {money(product.price)}
                  {block.props.showCompareAt && product.compareAtPrice ? <span className="ml-2 text-sm text-slate-400 line-through">{money(product.compareAtPrice)}</span> : null}
                </div>
              ) : null}
              {block.props.showButton !== false ? <div className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{block.props.ctaLabel || "View product"}</div> : null}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No product selected</div>
        )}
      </div>
    );
  }

  if (block.type === "image") {
    return (
      <div className={sharedWrap} {...blockProps}>
        <div className={textAlign}>
          <img
            src={block.props.imageUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"}
            alt={block.props.alt || "Campaign banner"}
            className={`mx-auto w-full object-cover ${block.props.rounded ? "rounded-3xl" : ""}`}
          />
          {block.props.caption ? <p className="mt-2 text-sm text-slate-500">{block.props.caption}</p> : null}
        </div>
      </div>
    );
  }

  if (block.type === "button") {
    const width = Math.min(100, Math.max(20, Number(block.props.width || settings.buttons.width || 50)));
    const borderSize = Math.max(0, Number(block.props.borderSize ?? settings.buttons.borderSize ?? 0));
    const backgroundColor = block.props.backgroundColor || settings.buttons.backgroundColor || "#111827";
    const fontColor = block.props.fontColor || settings.buttons.fontColor || "#ffffff";
    const radius = Number(block.props.radius || settings.buttons.roundedCorners || 12);
    const buttonStyle = {
      backgroundColor: block.props.style === "ghost" ? "transparent" : backgroundColor,
      color: block.props.style === "ghost" ? backgroundColor : fontColor,
      borderRadius: `${radius}px`,
      fontFamily: settings.buttons.font || "Arial",
      fontSize: `${Number(block.props.fontSize || settings.buttons.fontSize || 16)}px`,
      width: `${width}%`,
      fontWeight: block.props.bold === false ? 500 : 700,
      fontStyle: block.props.italic ? "italic" : "normal",
      textDecoration: block.props.underline ? "underline" : "none",
      border: `${borderSize}px solid ${block.props.borderColor || backgroundColor}`,
      padding: `${Number(block.props.paddingY || 12)}px ${Number(block.props.paddingX || 20)}px`,
      margin: `${Number(block.props.marginY || 15)}px 0`,
    };

    return (
      <div className={sharedWrap} {...blockProps}>
        <div className={justify}>
          <span className="inline-flex items-center justify-center text-sm" style={buttonStyle}>
            {block.props.text || "Click"}
          </span>
        </div>
      </div>
    );
  }

  if (block.type === "divider") {
    return (
      <div className={sharedWrap} {...blockProps}>
        <hr
          className="border-0"
          style={{
            borderTopStyle: "solid",
            borderTopWidth: `${Math.max(1, Number(block.props.thickness || 1))}px`,
            borderTopColor: block.props.color || "#e5e7eb",
          }}
        />
      </div>
    );
  }

  if (block.type === "spacer") {
    return (
      <div className={sharedWrap} {...blockProps}>
        <div style={{ height: `${Number(block.props.size || 24)}px` }} />
      </div>
    );
  }

  return (
    <div className={sharedWrap} {...blockProps}>
      <CanvasEditableText
        value={block.props.content || ""}
        onChange={(content) => onUpdate(block.id, { content })}
        className={`min-h-[36px] w-full outline-none ${textAlign}`}
        style={textStyle}
      />
    </div>
  );
};

const BlockInspector = ({
  block,
  onUpdate,
  onDuplicate,
  onRemove,
  onClearSelection,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onUploadError,
}) => {
  const imageFileInputRef = useRef(null);
  const logoFileInputRef = useRef(null);

  if (!block) return null;

  const update = (patch) => onUpdate(block.id, patch);
  const title = blockDefinitions[block.type]?.label || block.type;
  const helpText = blockDefinitions[block.type]?.helpText || "Use this block to add content to your email.";

  const wrap = (body, description = "Click a block in the canvas and adjust its settings.") => (
    <ControlCard
      title={
        <span className="inline-flex items-center gap-2">
          <span>{title}</span>
          <InspectorHelp text={helpText} />
        </span>
      }
      description=""
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {block.type}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="secondary-button px-3 py-2 text-sm" onClick={onClearSelection}>
            Clear
          </button>
          <button type="button" className="secondary-button px-3 py-2 text-sm" onClick={() => onDuplicate(block.id)}>
            Duplicate
          </button>
          <button type="button" className="secondary-button px-3 py-2 text-sm" onClick={() => onRemove(block.id)}>
            Delete
          </button>
        </div>
      </div>
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <button type="button" className="font-semibold text-slate-700 disabled:opacity-40" onClick={onMoveUp} disabled={!canMoveUp}>
          Move up
        </button>
        <button type="button" className="font-semibold text-slate-700 disabled:opacity-40" onClick={onMoveDown} disabled={!canMoveDown}>
          Move down
        </button>
      </div>
      {body}
    </ControlCard>
  );

  if (block.type === "title") {
    return wrap(
      <div className="space-y-4">
        <Field label="Title text">
          <textarea className="field min-h-[120px] resize-y" value={block.props.content || ""} onChange={(event) => update({ content: event.target.value })} />
        </Field>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Alignment">
            <select className="field" value={block.props.align || "left"} onChange={(event) => update({ align: event.target.value })}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </Field>
          <Field label="Font size">
            <input className="field" type="number" min="18" max="80" value={block.props.fontSize || 34} onChange={(event) => update({ fontSize: Number(event.target.value || 34) })} />
          </Field>
          <Field label="Color">
            <input className="field h-12 p-1" type="color" value={block.props.color || "#0f172a"} onChange={(event) => update({ color: event.target.value })} />
          </Field>
        </div>
      </div>,
      "Primary headline only."
    );
  }

  if (block.type === "body_text") {
    return wrap(
      <div className="space-y-4">
        <Field label="Body copy">
          <textarea className="field min-h-[140px] resize-y" value={block.props.content || ""} onChange={(event) => update({ content: event.target.value })} />
        </Field>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Alignment">
            <select className="field" value={block.props.align || "left"} onChange={(event) => update({ align: event.target.value })}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </Field>
          <Field label="Font size">
            <input className="field" type="number" min="12" max="60" value={block.props.fontSize || 16} onChange={(event) => update({ fontSize: Number(event.target.value || 16) })} />
          </Field>
          <Field label="Color">
            <input className="field h-12 p-1" type="color" value={block.props.color || "#334155"} onChange={(event) => update({ color: event.target.value })} />
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr]">
          {[
            ["bold", "B"],
            ["italic", "I"],
            ["underline", "U"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => update({ [key]: !Boolean(block.props[key]) })}
              className={`inline-flex h-11 items-center justify-center rounded-2xl border text-sm font-semibold transition ${
                block.props[key] ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Field label="Line height">
          <ToggleGroup
            value={String(block.props.lineHeight || 1.7)}
            onChange={(value) => update({ lineHeight: Number(value) })}
            options={[
              { value: "1.4", label: "Compact" },
              { value: "1.7", label: "Normal" },
              { value: "2", label: "Relaxed" },
            ]}
          />
        </Field>
      </div>,
      "Paragraph copy with inline formatting."
    );
  }

  if (block.type === "image") {
    const handleImageFilePick = (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      (async () => {
        try {
          const pngDataUrl = await fileToPngDataUrl(file);
          update({ imageUrl: pngDataUrl });
        } catch (uploadError) {
          onUploadError?.(uploadError);
        } finally {
          event.target.value = "";
        }
      })();
    };

    return wrap(
      <div className="space-y-4">
        <Field label="Image URL">
          <input className="field" value={block.props.imageUrl || ""} onChange={(event) => update({ imageUrl: event.target.value })} />
        </Field>
        <Field label="Upload image">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="secondary-button px-4 py-2 text-sm" onClick={() => imageFileInputRef.current?.click()}>
              Choose file
            </button>
            <span className="text-xs text-slate-500">PNG, JPG, or SVG from your computer</span>
          </div>
          <input ref={imageFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFilePick} />
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Alt text">
            <input className="field" value={block.props.alt || ""} onChange={(event) => update({ alt: event.target.value })} />
          </Field>
          <Field label="Link URL">
            <input className="field" value={block.props.linkUrl || ""} onChange={(event) => update({ linkUrl: event.target.value })} />
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Width">
            <input className="field" type="number" min="20" max="100" value={block.props.width || 100} onChange={(event) => update({ width: Number(event.target.value || 100) })} />
          </Field>
          <Field label="Alignment">
            <select className="field" value={block.props.align || "center"} onChange={(event) => update({ align: event.target.value })}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </Field>
          <Field label="Caption">
            <input className="field" value={block.props.caption || ""} onChange={(event) => update({ caption: event.target.value })} />
          </Field>
        </div>
      </div>
    );
  }

  if (block.type === "video") {
    return wrap(
      <div className="space-y-4">
        <Field label="Video URL">
          <input className="field" value={block.props.videoUrl || ""} onChange={(event) => update({ videoUrl: event.target.value })} />
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Thumbnail URL">
            <input className="field" value={block.props.thumbnailUrl || ""} onChange={(event) => update({ thumbnailUrl: event.target.value })} />
          </Field>
          <Field label="Play label">
            <input className="field" value={block.props.ctaLabel || ""} onChange={(event) => update({ ctaLabel: event.target.value })} />
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Alignment">
            <select className="field" value={block.props.align || "center"} onChange={(event) => update({ align: event.target.value })}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </Field>
          <Field label="Caption">
            <input className="field" value={block.props.caption || ""} onChange={(event) => update({ caption: event.target.value })} />
          </Field>
        </div>
      </div>
    );
  }

  if (block.type === "button") {
    return wrap(
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Button label">
            <input className="field" value={block.props.text || ""} onChange={(event) => update({ text: event.target.value })} />
          </Field>
          <Field label="URL">
            <input className="field" value={block.props.url || ""} onChange={(event) => update({ url: event.target.value })} />
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Alignment">
            <select className="field" value={block.props.align || "center"} onChange={(event) => update({ align: event.target.value })}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </Field>
          <Field label="Width">
            <input className="field" type="number" min="20" max="100" value={block.props.width || 50} onChange={(event) => update({ width: Number(event.target.value || 50) })} />
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Background color">
            <input className="field h-12 p-1" type="color" value={block.props.backgroundColor || "#111827"} onChange={(event) => update({ backgroundColor: event.target.value })} />
          </Field>
          <Field label="Text color">
            <input className="field h-12 p-1" type="color" value={block.props.fontColor || "#ffffff"} onChange={(event) => update({ fontColor: event.target.value })} />
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Radius">
            <input className="field" type="number" min="0" max="40" value={block.props.radius || 12} onChange={(event) => update({ radius: Number(event.target.value || 12) })} />
          </Field>
          <Field label="Padding Y">
            <input className="field" type="number" min="4" max="40" value={block.props.paddingY || 12} onChange={(event) => update({ paddingY: Number(event.target.value || 12) })} />
          </Field>
          <Field label="Padding X">
            <input className="field" type="number" min="8" max="48" value={block.props.paddingX || 20} onChange={(event) => update({ paddingX: Number(event.target.value || 20) })} />
          </Field>
        </div>
      </div>
    );
  }

  if (block.type === "dynamic_content") {
    return wrap(
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Source">
            <select className="field" value={block.props.sourceType || "recommendations"} onChange={(event) => update({ sourceType: event.target.value })}>
              <option value="recommendations">Recommendations</option>
              <option value="collection">Collection</option>
              <option value="rule">Rule based</option>
            </select>
          </Field>
          <Field label="Source query">
            <input className="field" value={block.props.sourceQuery || ""} onChange={(event) => update({ sourceQuery: event.target.value })} />
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Item count">
            <input className="field" type="number" min="1" max="12" value={block.props.itemCount || 3} onChange={(event) => update({ itemCount: Number(event.target.value || 3) })} />
          </Field>
          <Field label="Layout">
            <select className="field" value={block.props.layout || "grid"} onChange={(event) => update({ layout: event.target.value })}>
              <option value="grid">Grid</option>
              <option value="list">List</option>
            </select>
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ["showImage", "Show image"],
            ["showTitle", "Show title"],
            ["showPrice", "Show price"],
            ["showButton", "Show button"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span className="font-semibold text-slate-900">{label}</span>
              <input type="checkbox" checked={block.props[key] !== false} onChange={(event) => update({ [key]: event.target.checked })} />
            </label>
          ))}
        </div>
        <Field label="Fallback text">
          <input className="field" value={block.props.fallbackText || ""} onChange={(event) => update({ fallbackText: event.target.value })} />
        </Field>
      </div>
    );
  }

  if (block.type === "logo") {
    const handleLogoFilePick = (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      (async () => {
        try {
          const pngDataUrl = await fileToPngDataUrl(file);
          update({ imageUrl: pngDataUrl });
        } catch (uploadError) {
          onUploadError?.(uploadError);
        } finally {
          event.target.value = "";
        }
      })();
    };

    return wrap(
      <div className="space-y-4">
        <Field label="Logo URL">
          <input className="field" value={block.props.imageUrl || ""} onChange={(event) => update({ imageUrl: event.target.value })} />
        </Field>
        <Field label="Upload logo">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="secondary-button px-4 py-2 text-sm" onClick={() => logoFileInputRef.current?.click()}>
              Choose file
            </button>
            <span className="text-xs text-slate-500">PNG, JPG, or SVG from your computer</span>
          </div>
          <input ref={logoFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFilePick} />
        </Field>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Alt text">
            <input className="field" value={block.props.alt || ""} onChange={(event) => update({ alt: event.target.value })} />
          </Field>
          <Field label="Link URL">
            <input className="field" value={block.props.linkUrl || ""} onChange={(event) => update({ linkUrl: event.target.value })} />
          </Field>
          <Field label="Width">
            <input className="field" type="number" min="40" max="400" value={block.props.width || 160} onChange={(event) => update({ width: Number(event.target.value || 160) })} />
          </Field>
        </div>
        <Field label="Alignment">
          <ToggleGroup
            value={block.props.align || "left"}
            onChange={(value) => update({ align: value })}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
              { value: "right", label: "Right" },
            ]}
          />
        </Field>
      </div>
    );
  }

  if (block.type === "social") {
    const items = Array.isArray(block.props.items) ? block.props.items : [];
    const updateItem = (index, patch) => {
      const next = items.map((item, currentIndex) => (currentIndex === index ? { ...item, ...patch } : item));
      update({ items: next });
    };
    return wrap(
      <div className="space-y-4">
        <Field label="Alignment">
          <ToggleGroup
            value={block.props.align || "left"}
            onChange={(value) => update({ align: value })}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
              { value: "right", label: "Right" },
            ]}
          />
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Icon size">
            <input className="field" type="number" min="20" max="60" value={block.props.iconSize || 32} onChange={(event) => update({ iconSize: Number(event.target.value || 32) })} />
          </Field>
          <Field label="Spacing">
            <input className="field" type="number" min="4" max="24" value={block.props.gap || 12} onChange={(event) => update({ gap: Number(event.target.value || 12) })} />
          </Field>
        </div>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={`${item.network || "social"}-${index}`} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
                    {getSocialIconMeta(item.network).iconUrl ? (
                      <img
                        src={getSocialIconMeta(item.network).iconUrl}
                        alt={getSocialIconMeta(item.network).label}
                        className="h-full w-full object-contain p-1.5"
                      />
                    ) : (
                      <span className="text-xs font-bold uppercase text-slate-700">
                        {getSocialIconMeta(item.network).short}
                      </span>
                    )}
                  </div>
                  <select
                    className="border-0 bg-transparent p-0 text-base font-medium text-slate-900 outline-none"
                    value={item.network || "facebook"}
                    onChange={(event) => updateItem(index, { network: event.target.value })}
                  >
                    {socialNetworks.map((network) => (
                      <option key={network} value={network}>
                        {network}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="text-2xl leading-none text-[#6b63ff] transition hover:text-[#5148f6]"
                  aria-label={`Remove ${item.network || "social"} link`}
                  onClick={() => update({ items: items.filter((_, currentIndex) => currentIndex !== index) })}
                >
                  ×
                </button>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">URL</span>
                <input className="field" value={item.url || ""} onChange={(event) => updateItem(index, { url: event.target.value })} placeholder="https://" />
              </label>
            </div>
          ))}
          <button type="button" className="secondary-button px-5 py-2 text-sm font-semibold" onClick={() => update({ items: [...items, { network: "instagram", url: "" }] })}>
            Add icons
          </button>
        </div>
      </div>
    );
  }

  if (block.type === "html") {
    return wrap(
      <div className="space-y-4">
        <Field label="Raw HTML">
          <textarea className="field min-h-[220px] resize-y font-mono text-xs" value={block.props.html || ""} onChange={(event) => update({ html: event.target.value })} />
        </Field>
        <Field label="Preview mode">
          <ToggleGroup
            value={block.props.previewMode || "safe"}
            onChange={(value) => update({ previewMode: value })}
            options={[
              { value: "safe", label: "Safe" },
              { value: "raw", label: "Raw" },
            ]}
          />
        </Field>
      </div>
    );
  }

  if (block.type === "divider") {
    return wrap(
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Thickness">
            <input className="field" type="number" min="1" max="8" value={block.props.thickness || 1} onChange={(event) => update({ thickness: Number(event.target.value || 1) })} />
          </Field>
          <Field label="Width">
            <input className="field" type="number" min="20" max="100" value={block.props.width || 100} onChange={(event) => update({ width: Number(event.target.value || 100) })} />
          </Field>
          <Field label="Alignment">
            <select className="field" value={block.props.align || "center"} onChange={(event) => update({ align: event.target.value })}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Color">
            <input className="field h-12 p-1" type="color" value={block.props.color || "#e5e7eb"} onChange={(event) => update({ color: event.target.value })} />
          </Field>
          <Field label="Top spacing">
            <input className="field" type="number" min="0" max="48" value={block.props.spacingTop || 16} onChange={(event) => update({ spacingTop: Number(event.target.value || 16) })} />
          </Field>
          <Field label="Bottom spacing">
            <input className="field" type="number" min="0" max="48" value={block.props.spacingBottom || 16} onChange={(event) => update({ spacingBottom: Number(event.target.value || 16) })} />
          </Field>
        </div>
      </div>
    );
  }

  if (block.type === "product") {
    const items = Array.isArray(block.props.productIds) ? block.props.productIds : [productCatalog[0]?.id || ""];
    return wrap(
      <div className="space-y-4">
        <div className="space-y-3">
          {items.map((productId, index) => (
            <div key={`${productId || "product"}-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_auto]">
              <select className="field" value={productId || ""} onChange={(event) => update({ productIds: items.map((item, currentIndex) => (currentIndex === index ? event.target.value : item)) })}>
                {productCatalog.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {money(product.price)}
                  </option>
                ))}
              </select>
              <button type="button" className="secondary-button px-3 py-2 text-sm" onClick={() => update({ productIds: items.filter((_, currentIndex) => currentIndex !== index) })}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="secondary-button px-4 py-2 text-sm" onClick={() => update({ productIds: [...items, productCatalog[0]?.id || ""] })}>
            Add product
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ["showImage", "Show image"],
            ["showTitle", "Show title"],
            ["showPrice", "Show price"],
            ["showCompareAt", "Show compare-at"],
            ["showButton", "Show button"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span className="font-semibold text-slate-900">{label}</span>
              <input type="checkbox" checked={block.props[key] !== false} onChange={(event) => update({ [key]: event.target.checked })} />
            </label>
          ))}
        </div>
        <Field label="CTA label">
          <input className="field" value={block.props.ctaLabel || ""} onChange={(event) => update({ ctaLabel: event.target.value })} />
        </Field>
      </div>
    );
  }

  if (block.type === "navigation") {
    const items = Array.isArray(block.props.items) ? block.props.items : [];
    const updateItem = (index, patch) => {
      const next = items.map((item, currentIndex) => (currentIndex === index ? { ...item, ...patch } : item));
      update({ items: next });
    };
    return wrap(
      <div className="space-y-4">
        <Field label="Alignment">
          <ToggleGroup
            value={block.props.align || "center"}
            onChange={(value) => update({ align: value })}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
              { value: "right", label: "Right" },
            ]}
          />
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Spacing">
            <input className="field" type="number" min="4" max="40" value={block.props.gap || 20} onChange={(event) => update({ gap: Number(event.target.value || 20) })} />
          </Field>
          <Field label="Font size">
            <input className="field" type="number" min="10" max="24" value={block.props.fontSize || 14} onChange={(event) => update({ fontSize: Number(event.target.value || 14) })} />
          </Field>
        </div>
        <Field label="Color">
          <input className="field h-12 p-1" type="color" value={block.props.color || "#111827"} onChange={(event) => update({ color: event.target.value })} />
        </Field>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={`${item.label || "nav"}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <input className="field" value={item.label || ""} onChange={(event) => updateItem(index, { label: event.target.value })} placeholder="Label" />
                <input className="field" value={item.url || ""} onChange={(event) => updateItem(index, { url: event.target.value })} placeholder="https://..." />
                <button type="button" className="secondary-button px-3 py-2 text-sm" onClick={() => update({ items: items.filter((_, currentIndex) => currentIndex !== index) })}>
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="secondary-button px-4 py-2 text-sm" onClick={() => update({ items: [...items, { label: "New link", url: "#" }] })}>
            Add item
          </button>
        </div>
      </div>
    );
  }

  if (block.type === "spacer") {
    return wrap(
      <Field label="Spacer height">
        <input className="field" type="number" min="8" max="160" value={block.props.height || 24} onChange={(event) => update({ height: Number(event.target.value || 24) })} />
      </Field>
    );
  }

  return wrap(
    <div className="space-y-4">
      <Field label="Block data">
        <textarea className="field min-h-[120px] resize-y font-mono text-xs" value={JSON.stringify(block.props, null, 2)} readOnly />
      </Field>
    </div>
  );
};

function EmailBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useContext(ToastContext);
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "html" ? "html" : "builder";
  const presetKey = searchParams.get("preset") || "";
  const [form, setForm] = useState(() => createInitialForm(initialMode));
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(initialMode === "html");
  const [activePanel, setActivePanel] = useState("content");
  const [contentTab, setContentTab] = useState("blocks");
  const [viewportMode, setViewportMode] = useState("desktop");
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [lastSavedSignature, setLastSavedSignature] = useState("");
  const [paletteDragType, setPaletteDragType] = useState("");
  const [dragId, setDragId] = useState("");
  const [dropIndex, setDropIndex] = useState(-1);
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState("preview");
  const [previewViewportMode, setPreviewViewportMode] = useState("desktop");
  const [previewAudience, setPreviewAudience] = useState("recipient");
  const [previewContactQuery, setPreviewContactQuery] = useState("");
  const [testRecipientEmail, setTestRecipientEmail] = useState("");
  const [testEmailSubject, setTestEmailSubject] = useState("");
  const [testEmailMessage, setTestEmailMessage] = useState("");
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [previewHtmlSource, setPreviewHtmlSource] = useState("");
  const actionMenuRef = useRef(null);
  const bgImageInputRef = useRef(null);

  useEffect(() => {
    if (!id) {
      setLastSavedSignature(JSON.stringify(form));
    }
  }, []);

  useEffect(() => {
    if (id || !presetKey) {
      return;
    }

    const preset = getTemplatePreset(presetKey);
    if (!preset) {
      return;
    }

    (async () => {
      const normalizedPreset = {
        ...preset.form,
        imageUrl: await imageUrlToPng(preset.form.imageUrl || ""),
      };

      const presetBlocks = legacyToBlocks({
        eyebrow: preset.form.eyebrow,
        headline: preset.form.headline,
        bodyText: preset.form.bodyText,
        ctaText: preset.form.ctaText,
        ctaUrl: preset.form.ctaUrl,
        footerNote: preset.form.footerNote,
        imageUrl: normalizedPreset.imageUrl,
        imageAlt: preset.form.imageAlt,
      });

      const next = {
        ...createInitialForm("builder"),
        name: preset.name,
        subject: preset.subject,
        previewText: preset.previewText,
        blocks: presetBlocks,
        advancedHtml: "",
      };

      setForm(next);
      setShowAdvanced(false);
      setLastSavedSignature(JSON.stringify(next));
    })();
  }, [id, presetKey]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get(`/templates/${id}`);
        const mapped = await normalizeTemplateImageUrls(mapTemplateToForm(data, initialMode));
        setForm(mapped);
        setShowAdvanced(initialMode === "html" || (!mapped.blocks.length && Boolean(mapped.advancedHtml?.trim())));
        setLastSavedSignature(JSON.stringify(mapped));
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load template");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id, initialMode]);

  useEffect(() => {
    if (!showActionMenu) return undefined;

    const handlePointerDown = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setShowActionMenu(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setShowActionMenu(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showActionMenu]);

  useEffect(() => {
    if (!isPreviewOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsPreviewOpen(false);
        setPreviewHtmlSource("");
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isPreviewOpen]);

  const generatedHtml = useMemo(() => buildTemplateHtml(form), [form]);
  const serializedForm = useMemo(() => JSON.stringify(form), [form]);
  const hasUnsavedChanges = serializedForm !== lastSavedSignature;
  const currentSettings = form.styleSettings || cloneStyleSettings();
  const previewHtml = previewHtmlSource || (showAdvanced && form.advancedHtml.trim() ? form.advancedHtml.trim() : generatedHtml);

  useEffect(() => {
    if (!isPreviewOpen && previewHtmlSource) {
      setPreviewHtmlSource("");
    }
  }, [serializedForm, isPreviewOpen, previewHtmlSource]);

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateStyle = (section, key, value) =>
    setForm((current) => ({
      ...current,
      styleSettings: {
        ...(current.styleSettings || cloneStyleSettings()),
        [section]: {
          ...((current.styleSettings || cloneStyleSettings())[section] || {}),
          [key]: value,
        },
      },
    }));

  const updateBlock = (blockId, patch) =>
    setForm((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.id === blockId ? { ...block, props: { ...block.props, ...patch } } : block,
      ),
    }));

  const insertBlockAt = (type, index = form.blocks.length) => {
    const next = createBlockByType(type);

    setActivePanel("content");
    setContentTab("blocks");
    setSelectedBlockId(next.id);
    setForm((current) => {
      const nextBlocks = [...current.blocks];
      nextBlocks.splice(Math.min(Math.max(0, index), nextBlocks.length), 0, next);
      return { ...current, blocks: nextBlocks };
    });
  };

  const addBlock = (type) => insertBlockAt(type);

  const moveBlockToIndex = (blockId, targetIndex) =>
    setForm((current) => {
      const fromIndex = current.blocks.findIndex((block) => block.id === blockId);
      if (fromIndex < 0) return current;
      const next = [...current.blocks];
      const [item] = next.splice(fromIndex, 1);
      const normalizedIndex = Math.max(0, Math.min(targetIndex, next.length));
      next.splice(normalizedIndex, 0, item);
      return { ...current, blocks: next };
    });

  const handlePaletteDragStart = (type) => (event) => {
    setPaletteDragType(type);
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-email-block", JSON.stringify({ kind: "palette", type }));
  };

  const handlePaletteDragEnd = () => {
    setPaletteDragType("");
    setDropIndex(-1);
  };

  const handleBlockDragStart = (blockId) => (event) => {
    setDragId(blockId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-email-block", JSON.stringify({ kind: "canvas", id: blockId }));
  };

  const handleBlockDragEnd = () => {
    setDragId("");
    setDropIndex(-1);
  };

  const handleDropAtIndex = (index) => (event) => {
    event.preventDefault();
    event.stopPropagation();

    const raw = event.dataTransfer.getData("application/x-email-block");
    if (!raw) return;

    try {
      const payload = JSON.parse(raw);
      if (payload.kind === "palette" && payload.type) {
        insertBlockAt(payload.type, index);
      } else if (payload.kind === "canvas" && payload.id) {
        moveBlockToIndex(payload.id, index);
      }
    } catch {
      // Ignore malformed drag payloads.
    } finally {
      setDragId("");
      setPaletteDragType("");
      setDropIndex(-1);
    }
  };

  const insertSection = (section) => {
    const blocks = section.build().map((block) => ({ ...block, id: block.id || uid() }));
    setActivePanel("content");
    setContentTab("blocks");
    setSelectedBlockId(blocks[0]?.id || "");
    setForm((current) => ({ ...current, blocks: [...current.blocks, ...blocks] }));
  };

  const removeBlock = (blockId) =>
    setForm((current) => ({
      ...current,
      blocks: current.blocks.filter((block) => block.id !== blockId),
    }));

  const moveBlock = (blockId, direction) =>
    setForm((current) => {
      const index = current.blocks.findIndex((block) => block.id === blockId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.blocks.length) return current;
      const next = [...current.blocks];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return { ...current, blocks: next };
    });

  const duplicateBlock = (blockId) =>
    setForm((current) => {
      const index = current.blocks.findIndex((block) => block.id === blockId);
      if (index < 0) return current;
      const copy = {
        ...current.blocks[index],
        id: uid(),
        props: { ...current.blocks[index].props },
      };
      const next = [...current.blocks];
      next.splice(index + 1, 0, copy);
      return { ...current, blocks: next };
    });

  const reorder = (fromId, toId) =>
    setForm((current) => {
      const from = current.blocks.findIndex((block) => block.id === fromId);
      const to = current.blocks.findIndex((block) => block.id === toId);
      if (from < 0 || to < 0 || from === to) return current;
      const next = [...current.blocks];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return { ...current, blocks: next };
    });

  const getValidationError = () => {
    if (!form.name.trim()) {
      return "Enter template name";
    }

    if (!form.blocks.length && !form.advancedHtml.trim()) {
      return "Add content for your template";
    }

    return "";
  };

  const buildRenderableHtml = async () => {
    const normalizedForm = await normalizeTemplateImageUrls(form);
    if (showAdvanced && normalizedForm.advancedHtml.trim()) {
      return normalizedForm.advancedHtml.trim();
    }
    return buildTemplateHtml(normalizedForm);
  };

  const extractSaveErrorMessage = (requestError) =>
    requestError?.response?.data?.message ||
    requestError?.message ||
    "Unable to save template";

  const buildUniqueTemplateName = (baseName, existingNames = [], currentId = "") => {
    const normalizedExisting = new Set(
      existingNames
        .filter(Boolean)
        .map((name) => String(name).trim().toLowerCase())
        .filter((name) => name !== String(baseName).trim().toLowerCase()),
    );

    const source = String(baseName || "Untitled template").trim();
    const candidates = [
      `${source} copy`,
      `${source} copy 2`,
      `${source} copy 3`,
      `${source} copy 4`,
      `${source} copy 5`,
    ];

    for (const candidate of candidates) {
      if (!normalizedExisting.has(candidate.trim().toLowerCase())) {
        return candidate;
      }
    }

    const suffix = currentId ? currentId.slice(-4).toUpperCase() : Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${source} ${suffix}`;
  };

  const saveTemplate = async ({ quit = false } = {}) => {
    setError("");
    const validationError = getValidationError();
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return false;
    }

    const subject = form.subject.trim() || form.name.trim() || "Untitled template";
    setIsSaving(true);
    try {
      const normalizedForm = await normalizeTemplateImageUrls(form);
      const htmlContent =
        showAdvanced && normalizedForm.advancedHtml.trim()
          ? normalizedForm.advancedHtml.trim()
          : buildTemplateHtml(normalizedForm);
      const payload = {
        name: normalizedForm.name.trim(),
        subject,
        previewText: normalizedForm.previewText.trim(),
        htmlContent,
        designJson: {
          editor: "drag-drop",
          accentColor: normalizedForm.accentColor,
          styleSettings: normalizedForm.styleSettings,
          blocks: normalizedForm.blocks,
        },
      };

      const persistTemplate = async (nextPayload, { suppressSuccessToast = false, savedForm = normalizedForm } = {}) => {
        const savedSignature = JSON.stringify(savedForm);

        if (id) {
          await api.put(`/templates/${id}`, nextPayload);
          if (!suppressSuccessToast) {
            toast.success("Template saved");
          }
          setForm(savedForm);
          setLastSavedSignature(savedSignature);
          if (quit) navigate("/templates");
          return true;
        }

        const { data: created } = await api.post("/templates", nextPayload);
        if (!suppressSuccessToast) {
          toast.success("Template created");
        }
        setForm(savedForm);
        setLastSavedSignature(savedSignature);

        if (quit) {
          navigate("/templates");
        } else if (created?._id) {
          navigate(`/email-builder/${created._id}`, { replace: true });
        }

        return true;
      };

      try {
        return await persistTemplate(payload);
      } catch (requestError) {
        const status = requestError?.response?.status;
        if (status === 409 && payload.name) {
          const { data: templates } = await api.get("/templates");
          const existingNames = Array.isArray(templates) ? templates.map((template) => template.name) : [];
          const uniqueName = buildUniqueTemplateName(payload.name, existingNames, id);

          if (uniqueName && uniqueName !== payload.name) {
            const retryForm = { ...normalizedForm, name: uniqueName };
            const retryPayload = { ...payload, name: uniqueName };
            await persistTemplate(retryPayload, { suppressSuccessToast: true, savedForm: retryForm });
            toast.success(
              id
                ? `Template name already exists. Saved as "${uniqueName}".`
                : `Template name already exists. Created as "${uniqueName}".`,
            );
            return true;
          }
        }

        throw requestError;
      }
    } catch (requestError) {
      const message = extractSaveErrorMessage(requestError);
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const openPreview = () => {
    const validationError = getValidationError();
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    (async () => {
      const normalizedHtml = await buildRenderableHtml();
      setPreviewHtmlSource(normalizedHtml);
      setTestRecipientEmail("");
      setTestEmailSubject(previewSubject);
      setTestEmailMessage("");
      setPreviewTab("preview");
      setIsPreviewOpen(true);
    })();
  };

  const handleSendTestEmail = async () => {
    const recipientEmail = testRecipientEmail.trim().toLowerCase();
    const subject = testEmailSubject.trim() || previewSubject;

    if (!recipientEmail) {
      toast.error("Enter a test email address");
      return;
    }

    if (!subject) {
      toast.error("Enter a subject for the test email");
      return;
    }

    setIsSendingTestEmail(true);

    try {
      const normalizedHtml = await buildRenderableHtml();
      if (!normalizedHtml.trim()) {
        toast.error("Add content for your template");
        return;
      }
      await api.post("/email/test-send", {
        email: recipientEmail,
        subject,
        html: normalizedHtml,
        message: testEmailMessage.trim(),
      });
      toast.success("Test email sent");
      setIsPreviewOpen(false);
      setPreviewHtmlSource("");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to send test email");
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const exportPdf = async () => {
    const validationError = getValidationError();
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    try {
      const normalizedHtml = await buildRenderableHtml();
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.srcdoc = normalizedHtml;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        const frameWindow = iframe.contentWindow;
        frameWindow?.focus();
        frameWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      };
      setShowActionMenu(false);
    } catch {
      toast.error("Unable to export PDF");
    }
  };

  const handleBgImagePick = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    (async () => {
      try {
        const pngDataUrl = await fileToPngDataUrl(file);
        updateStyle("background", "imageUrl", pngDataUrl);
      } catch (uploadError) {
        toast.error(uploadError.response?.data?.message || uploadError.message || "Unable to upload image");
      } finally {
        event.target.value = "";
      }
    })();
  };

  const clearCanvasSelection = () => {
    setSelectedBlockId("");
    setActivePanel("content");
    setContentTab("blocks");
  };

  if (isLoading) return <LoadingState message="Loading email builder..." />;

  const previewWidth = viewportMode === "mobile" ? 390 : currentSettings.layout.bodyWidth || 600;
  const selectedBlock = form.blocks.find((block) => block.id === selectedBlockId) || null;
  const previewSubject = form.subject.trim() || form.name.trim() || "Untitled template";
  const previewText = form.previewText.trim();
  const previewFromName = form.fromName?.trim() || "";
  const previewFromEmail = form.fromEmail?.trim() || "";
  const previewReplyTo = form.replyTo?.trim() || "";

  return (
    <div className="min-h-screen bg-[#f7f2e9] p-3 md:p-4">
      <div className="mx-auto flex h-[calc(100vh-24px)] max-w-[1800px] flex-col gap-4 overflow-hidden md:h-[calc(100vh-32px)]">
        <header className="rounded-[30px] border border-[#e6ddd1] bg-white/95 px-4 py-3 shadow-[0_18px_42px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/templates")}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e6ddd1] bg-[#fbf7f0] text-slate-700 transition hover:bg-[#f2ebdf]"
                aria-label="Back to templates"
              >
                <BackArrowIcon />
              </button>
              <div className="min-w-0">
                <input
                  className="w-full max-w-[340px] border-0 bg-transparent p-0 text-[20px] font-semibold tracking-tight text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="Untitled template"
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                />
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                  <span className="rounded-full bg-[#f5efe7] px-3 py-1 text-[#8b5e34]">
                    {hasUnsavedChanges ? "Unsaved changes" : "No unsaved changes"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <ToggleGroup
                className="hidden md:inline-flex"
                value={viewportMode}
                onChange={setViewportMode}
                options={[
                  {
                    value: "desktop",
                    label: (
                      <span className="inline-flex items-center gap-2">
                        <DesktopIcon />
                        Desktop
                      </span>
                    ),
                  },
                  {
                    value: "mobile",
                    label: (
                      <span className="inline-flex items-center gap-2">
                        <MobileIcon />
                        Mobile
                      </span>
                    ),
                  },
                ]}
              />

              <button
                type="button"
                className="secondary-button"
                onClick={openPreview}
              >
                Preview & test
              </button>

              <button
                type="button"
                onClick={() => saveTemplate({ quit: true })}
                className="rounded-full bg-[#20242f] px-5 py-3 text-[15px] font-semibold text-white shadow-[0_14px_28px_rgba(32,36,47,0.2)] transition hover:bg-[#151822]"
                disabled={isSaving}
              >
                Save & quit
              </button>

              <div className="relative" ref={actionMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowActionMenu((current) => !current)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e6ddd1] bg-white text-slate-700 transition hover:bg-[#f7f3ec]"
                  aria-label="More actions"
                  aria-expanded={showActionMenu}
                >
                  <DotsIcon />
                </button>

                  {showActionMenu ? (
                  <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-3xl border border-[#e6ddd1] bg-white shadow-[0_22px_48px_rgba(15,23,42,0.14)]">
                    <button
                      type="button"
                      onClick={() => {
                        setShowActionMenu(false);
                        saveTemplate();
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-[#f7f3ec]"
                    >
                      <SaveIcon />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={exportPdf}
                      className="flex w-full items-center gap-3 border-t border-[#efe7dc] px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-[#f7f3ec]"
                    >
                      <PdfIcon />
                      Save as PDF
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="min-h-0 space-y-4 overflow-y-auto pr-1 xl:max-h-[calc(100vh-136px)]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActivePanel("content")}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  activePanel === "content"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <ContentIcon />
                  Content
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActivePanel("style")}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  activePanel === "style"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <StyleIcon />
                  Style
                </span>
              </button>
            </div>
          </section>

          {activePanel === "content" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 rounded-[22px] border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setContentTab("blocks")}
                  className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                    contentTab === "blocks" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                  }`}
                >
                  Blocks
                </button>
                <button
                  type="button"
                  onClick={() => setContentTab("sections")}
                  className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                    contentTab === "sections" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                  }`}
                >
                  Sections
                </button>
                <button
                  type="button"
                  onClick={() => setContentTab("saved")}
                  className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                    contentTab === "saved" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                  }`}
                >
                  Saved
                </button>
              </div>

              {selectedBlock ? (
                <BlockInspector
                  block={selectedBlock}
                  onUpdate={updateBlock}
                  onDuplicate={duplicateBlock}
                  onRemove={(blockId) => {
                    removeBlock(blockId);
                    if (selectedBlockId === blockId) {
                      setSelectedBlockId("");
                    }
                  }}
                  onClearSelection={() => setSelectedBlockId("")}
                  onMoveUp={() => selectedBlock && moveBlock(selectedBlock.id, -1)}
                  onMoveDown={() => selectedBlock && moveBlock(selectedBlock.id, 1)}
                  canMoveUp={Boolean(selectedBlock && form.blocks.findIndex((block) => block.id === selectedBlock.id) > 0)}
                  canMoveDown={Boolean(selectedBlock && form.blocks.findIndex((block) => block.id === selectedBlock.id) < form.blocks.length - 1)}
                  onUploadError={(uploadError) =>
                    toast.error(uploadError.response?.data?.message || uploadError.message || "Unable to upload image")
                  }
                />
              ) : contentTab === "blocks" ? (
                <ControlCard title="Blocks" description="Drag blocks into the canvas or tap one to add it.">
                  <div className="grid grid-cols-2 gap-3">
                    {blockTypesInOrder.map((type) => (
                      <div
                        key={type}
                        role="button"
                        tabIndex={0}
                        draggable
                        onDragStart={handlePaletteDragStart(type)}
                        onDragEnd={handlePaletteDragEnd}
                        onClick={() => addBlock(type)}
                        className="cursor-grab rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50 active:cursor-grabbing"
                      >
                        <span className="block text-sm font-semibold text-slate-900">{paletteItems[type].title}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">{paletteItems[type].description}</span>
                      </div>
                    ))}
                  </div>
                </ControlCard>
              ) : contentTab === "sections" ? (
                <ControlCard title="Sections" description="Drop in a ready-made section in one click.">
                  <div className="space-y-3">
                    {sectionPresets.map((section) => (
                      <button
                        key={section.key}
                        type="button"
                        onClick={() => insertSection(section)}
                        className="flex w-full items-start justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-slate-300 hover:bg-white"
                      >
                        <span>
                          <span className="block text-sm font-semibold text-slate-900">{section.title}</span>
                          <span className="mt-1 block text-xs leading-5 text-slate-500">{section.description}</span>
                        </span>
                        <span className="mt-1 text-slate-400">
                          <ChevronRightIcon />
                        </span>
                      </button>
                    ))}
                  </div>
                </ControlCard>
              ) : (
                <ControlCard title="Saved" description="Store blocks or sections for later reuse.">
                  <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-8 text-center">
                    <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-[#f3f7f0] text-[#6fbf7d]">
                      <svg viewBox="0 0 120 120" className="h-16 w-16 fill-none stroke-current" strokeWidth="2">
                        <path d="M25 85c18 8 52 8 70 0" />
                        <path d="M34 70c14-25 37-25 52 0" />
                        <path d="M42 57c0-9 7-16 18-16s18 7 18 16c0 8-7 15-18 15s-18-7-18-15Z" />
                        <path d="M52 36c2-4 6-6 8-6s6 2 8 6" />
                        <path d="M60 24v10" />
                        <path d="M86 34l5-5" />
                        <path d="M35 34l-5-5" />
                      </svg>
                    </div>
                    <h4 className="mt-6 text-[18px] font-semibold text-slate-900">
                      Save your favourite content and reuse it anytime
                    </h4>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Use the Save icon while selecting a block or section, then come back here to reuse it later.
                    </p>
                  </div>
                </ControlCard>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <ControlCard title="Layout" description="Set the email width and base body color.">
                <div className="space-y-4">
                  <Field label="Body width" hint="Width of the centered email container in pixels.">
                    <input
                      className="field"
                      type="number"
                      min="320"
                      max="900"
                      value={currentSettings.layout.bodyWidth}
                      onChange={(event) => updateStyle("layout", "bodyWidth", Number(event.target.value || 600))}
                    />
                  </Field>
                  <Field label="Body color">
                    <input
                      className="field h-12 p-1"
                      type="color"
                      value={currentSettings.layout.bodyColor}
                      onChange={(event) => updateStyle("layout", "bodyColor", event.target.value)}
                    />
                  </Field>
                </div>
              </ControlCard>

              <ControlCard title="Spacing" description="Control padding and spacing behavior.">
                <div className="space-y-4">
                  <Field label="Padding">
                    <input
                      className="field"
                      type="number"
                      min="0"
                      max="80"
                      value={currentSettings.spacing.padding}
                      onChange={(event) => updateStyle("spacing", "padding", Number(event.target.value || 0))}
                    />
                  </Field>
                  <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <span>
                      <span className="block font-semibold text-slate-900">Group sides</span>
                      <span className="block text-xs text-slate-500">Use one shared padding value across the email.</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={Boolean(currentSettings.spacing.groupSides)}
                      onChange={(event) => updateStyle("spacing", "groupSides", event.target.checked)}
                    />
                  </label>
                </div>
              </ControlCard>

              <ControlCard title="Background" description="Adjust the outer canvas background.">
                <div className="space-y-4">
                  <Field label="Color">
                    <input
                      className="field h-12 p-1"
                      type="color"
                      value={currentSettings.background.color}
                      onChange={(event) => updateStyle("background", "color", event.target.value)}
                    />
                  </Field>
                  <Field label="Image" hint="Use an image for the email backdrop if needed.">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="secondary-button px-4 py-2 text-sm"
                        onClick={() => bgImageInputRef.current?.click()}
                      >
                        Add image
                      </button>
                      {currentSettings.background.imageUrl ? (
                        <button
                          type="button"
                          className="ghost-button px-3 py-2 text-sm"
                          onClick={() => updateStyle("background", "imageUrl", "")}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <input ref={bgImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgImagePick} />
                  </Field>
                  <Field label="Image URL">
                    <input
                      className="field"
                      placeholder="https://..."
                      value={currentSettings.background.imageUrl}
                      onChange={(event) => updateStyle("background", "imageUrl", event.target.value)}
                    />
                  </Field>
                </div>
              </ControlCard>

              <ControlCard title="Header" description="Control browser-link visibility and header behavior.">
                <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <span>
                    <span className="block font-semibold text-slate-900">Show 'View in Browser' link</span>
                    <span className="block text-xs text-slate-500">Displayed above the email content.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(currentSettings.header.showBrowserLink)}
                    onChange={(event) => updateStyle("header", "showBrowserLink", event.target.checked)}
                  />
                </label>
              </ControlCard>

              <ControlCard title="Text styles" description="Set typography, color, and direction.">
                <div className="space-y-4">
                  <Field label="Paragraph font">
                    <select
                      className="field"
                      value={currentSettings.text.paragraphFont}
                      onChange={(event) => updateStyle("text", "paragraphFont", event.target.value)}
                    >
                      {fontOptions.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Heading font">
                    <select
                      className="field"
                      value={currentSettings.text.headingFont}
                      onChange={(event) => updateStyle("text", "headingFont", event.target.value)}
                    >
                      {fontOptions.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Font size">
                    <input
                      className="field"
                      type="number"
                      min="12"
                      max="24"
                      value={currentSettings.text.fontSize}
                      onChange={(event) => updateStyle("text", "fontSize", Number(event.target.value || 16))}
                    />
                  </Field>
                  <Field label="Font color">
                    <input
                      className="field h-12 p-1"
                      type="color"
                      value={currentSettings.text.fontColor}
                      onChange={(event) => updateStyle("text", "fontColor", event.target.value)}
                    />
                  </Field>
                </div>
              </ControlCard>

              <ControlCard title="Text settings" description="Adjust reading rhythm and direction.">
                <div className="space-y-4">
                  <Field label="Line height">
                    <ToggleGroup
                      value={String(currentSettings.text.lineHeight)}
                      onChange={(value) => updateStyle("text", "lineHeight", Number(value))}
                      options={[
                        { value: "1.4", label: "Compact" },
                        { value: "1.7", label: "Normal" },
                        { value: "2", label: "Relaxed" },
                      ]}
                    />
                  </Field>
                  <Field label="Writing direction">
                    <ToggleGroup
                      value={currentSettings.text.direction}
                      onChange={(value) => updateStyle("text", "direction", value)}
                      options={[
                        { value: "ltr", label: "LTR" },
                        { value: "rtl", label: "RTL" },
                      ]}
                    />
                  </Field>
                </div>
              </ControlCard>

              <ControlCard title="Links" description="Control link color and decoration.">
                <div className="space-y-4">
                  <Field label="Color">
                    <input
                      className="field h-12 p-1"
                      type="color"
                      value={currentSettings.text.linkColor}
                      onChange={(event) => updateStyle("text", "linkColor", event.target.value)}
                    />
                  </Field>
                  <Field label="Style">
                    <ToggleGroup
                      value={currentSettings.text.linkStyle}
                      onChange={(value) => updateStyle("text", "linkStyle", value)}
                      options={[
                        { value: "none", label: "None" },
                        { value: "underline", label: "Underline" },
                      ]}
                    />
                  </Field>
                </div>
              </ControlCard>

              <ControlCard title="Buttons" description="Tune button appearance across the email.">
                <div className="space-y-4">
                  <Field label="Font">
                    <select
                      className="field"
                      value={currentSettings.buttons.font}
                      onChange={(event) => updateStyle("buttons", "font", event.target.value)}
                    >
                      {fontOptions.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Font size">
                    <input
                      className="field"
                      type="number"
                      min="12"
                      max="24"
                      value={currentSettings.buttons.fontSize}
                      onChange={(event) => updateStyle("buttons", "fontSize", Number(event.target.value || 16))}
                    />
                  </Field>
                  <Field label="Font color">
                    <input
                      className="field h-12 p-1"
                      type="color"
                      value={currentSettings.buttons.fontColor}
                      onChange={(event) => updateStyle("buttons", "fontColor", event.target.value)}
                    />
                  </Field>
                  <Field label="Font style">
                    <div className="flex flex-wrap gap-2">
                      {[
                        ["bold", "B"],
                        ["italic", "I"],
                        ["underline", "U"],
                      ].map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => updateStyle("buttons", key, !currentSettings.buttons[key])}
                          className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-sm font-semibold transition ${
                            currentSettings.buttons[key]
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Width" hint="Button width as a percentage.">
                      <div className="flex items-center gap-2">
                        <input
                          className="field"
                          type="number"
                          min="25"
                          max="100"
                          value={currentSettings.buttons.width}
                          onChange={(event) => updateStyle("buttons", "width", Number(event.target.value || 50))}
                        />
                        <span className="text-sm text-slate-500">%</span>
                      </div>
                    </Field>
                    <Field label="Rounded corners">
                      <div className="flex items-center gap-2">
                        <input
                          className="field"
                          type="number"
                          min="0"
                          max="24"
                          value={currentSettings.buttons.roundedCorners}
                          onChange={(event) => updateStyle("buttons", "roundedCorners", Number(event.target.value || 0))}
                        />
                        <span className="text-sm text-slate-500">px</span>
                      </div>
                    </Field>
                  </div>
                  <Field label="Background color">
                    <input
                      className="field h-12 p-1"
                      type="color"
                      value={currentSettings.buttons.backgroundColor}
                      onChange={(event) => updateStyle("buttons", "backgroundColor", event.target.value)}
                    />
                  </Field>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Border size">
                      <input
                        className="field"
                        type="number"
                        min="0"
                        max="6"
                        value={currentSettings.buttons.borderSize}
                        onChange={(event) => updateStyle("buttons", "borderSize", Number(event.target.value || 0))}
                      />
                    </Field>
                    <Field label="Border color">
                      <input
                        className="field h-12 p-1"
                        type="color"
                        value={currentSettings.buttons.borderColor}
                        onChange={(event) => updateStyle("buttons", "borderColor", event.target.value)}
                      />
                    </Field>
                  </div>
                </div>
              </ControlCard>

              <details
                className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.05)]"
                open={showAdvanced}
                onToggle={(event) => setShowAdvanced(event.currentTarget.open)}
              >
                <summary className="cursor-pointer list-none text-[16px] font-semibold text-slate-900">
                  Advanced HTML
                </summary>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Leave this empty to use the drag-and-drop builder output. Paste custom HTML here when needed.
                </p>
                <textarea
                  className="field mt-4 min-h-[220px] resize-y font-mono text-xs"
                  placeholder="Optional HTML override"
                  value={form.advancedHtml}
                  onChange={(event) => updateForm("advancedHtml", event.target.value)}
                />
              </details>
            </div>
          )}

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          ) : null}
        </aside>

        <section className="min-h-0 overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                Canvas
              </p>
              <h2 className="mt-1 text-[20px] font-semibold tracking-tight text-slate-900">
                {viewportMode === "mobile" ? "Mobile preview" : "Desktop preview"}
              </h2>
            </div>
            <div className="md:hidden">
              <ToggleGroup
                value={viewportMode}
                onChange={setViewportMode}
                options={[
                  { value: "desktop", label: "Desktop" },
                  { value: "mobile", label: "Mobile" },
                ]}
              />
            </div>
          </div>

          <div
            className="h-[calc(100vh-240px)] min-h-[620px] overflow-auto bg-[radial-gradient(circle_at_top_left,_rgba(99,91,255,0.08),_transparent_24%),radial-gradient(circle_at_right_top,_rgba(14,165,233,0.08),_transparent_24%),linear-gradient(180deg,_#f8fafc_0%,_#f3f6fb_100%)] p-4 md:p-6"
            style={{
              backgroundImage: currentSettings.background.imageUrl
                ? `linear-gradient(180deg, rgba(248,250,252,0.94), rgba(243,246,251,0.94)), url(${currentSettings.background.imageUrl})`
                : undefined,
              backgroundSize: currentSettings.background.imageUrl ? "cover" : undefined,
              backgroundPosition: currentSettings.background.imageUrl ? "center" : undefined,
            }}
            onClick={(event) => {
              if (!event.target.closest?.("[data-canvas-block]")) {
                clearCanvasSelection();
              }
            }}
          >
            <div
              className="mx-auto w-full"
              style={{
                maxWidth: previewWidth,
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDropAtIndex(form.blocks.length)}
            >
              <div
                className="rounded-[28px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)]"
                style={{
                  background: currentSettings.layout.bodyColor,
                }}
              >
                {/* <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 text-sm text-slate-500">
                  <span>{currentSettings.header.showBrowserLink ? "View in browser link enabled" : "View in browser link hidden"}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Drag blocks here
                  </span>
                </div> */}

                <div
                  className="space-y-4 p-4 md:p-6"
                  style={{
                    padding: currentSettings.spacing.groupSides
                      ? `${currentSettings.spacing.padding}px`
                      : `${currentSettings.spacing.padding}px ${Math.max(16, Math.round(Number(currentSettings.spacing.padding || 28) * 0.6))}px`,
                  }}
                >
                  {form.blocks.length ? (
                    <div className="space-y-2">
                      <CanvasDropZone
                        active={dropIndex === 0}
                        label="Insert at top"
                        onDragOver={() => setDropIndex(0)}
                        onDrop={handleDropAtIndex(0)}
                      />
                      {form.blocks.map((block, index) => (
                        <div key={block.id} className="space-y-2">
                          <CanvasBlock
                            block={block}
                            selected={selectedBlockId === block.id}
                            settings={currentSettings}
                            onSelect={() => {
                              setSelectedBlockId(block.id);
                              setActivePanel("content");
                              setContentTab("blocks");
                            }}
                            onUpdate={updateBlock}
                            onDuplicate={duplicateBlock}
                            onRemove={(blockId) => {
                              removeBlock(blockId);
                              if (selectedBlockId === blockId) {
                                setSelectedBlockId("");
                              }
                            }}
                            onMoveUp={() => moveBlock(block.id, -1)}
                            onMoveDown={() => moveBlock(block.id, 1)}
                            canMoveUp={index > 0}
                            canMoveDown={index < form.blocks.length - 1}
                            onDragStart={handleBlockDragStart}
                            onDragEnd={handleBlockDragEnd}
                          />
                          <CanvasDropZone
                            active={dropIndex === index + 1}
                            label={index === form.blocks.length - 1 ? "Drop to end" : "Insert here"}
                            onDragOver={() => setDropIndex(index + 1)}
                            onDrop={handleDropAtIndex(index + 1)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      className={`rounded-[28px] border border-dashed px-6 py-16 text-center transition ${
                        paletteDragType ? "border-[#6d5efc] bg-[#f4f2ff]" : "border-slate-300 bg-slate-50"
                      }`}
                      onDragOver={() => setDropIndex(0)}
                      onDrop={handleDropAtIndex(0)}
                    >
                      <p className="text-lg font-semibold text-slate-900">Drag blocks here</p>
                      <p className="mt-2 text-sm text-slate-500">
                        Drop a block from the left panel, then click it to edit inline.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <form
        className="flex justify-end"
        onSubmit={(event) => {
          event.preventDefault();
          saveTemplate();
        }}
      >
        <button type="submit" className="sr-only">
          Save
        </button>
      </form>
            {isPreviewOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm md:px-6"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsPreviewOpen(false);
              setPreviewHtmlSource("");
            }
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-[1280px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 md:px-6 md:py-5">
              <h3 className="text-[22px] font-semibold tracking-tight text-slate-900">
                Preview &amp; test
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsPreviewOpen(false);
                  setPreviewHtmlSource("");
                }}
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
                  onClick={() => setPreviewTab("preview")}
                  className={`border-b-2 px-1 py-4 text-[15px] font-semibold transition ${
                    previewTab === "preview"
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("send")}
                  className={`border-b-2 px-1 py-4 text-[15px] font-semibold transition ${
                    previewTab === "send"
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Send test email
                </button>
              </div>
            </div>

            {previewTab === "preview" ? (
              <div className="grid min-h-0 flex-1 gap-4 overflow-hidden bg-slate-50 p-4 md:grid-cols-[minmax(0,1.4fr)_420px] md:p-6">
                <section className="min-h-0 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                    <div className="min-w-0 space-y-2">
                      {previewFromName || previewFromEmail || previewReplyTo ? (
                        <>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                            <span className="font-semibold text-slate-900">From:</span>
                            <span className="text-slate-700">
                              {previewFromName && previewFromEmail
                                ? `${previewFromName} <${previewFromEmail}>`
                                : previewFromName || previewFromEmail}
                            </span>
                          </div>
                          {previewReplyTo ? (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                              <span className="font-semibold text-slate-900">Reply-to:</span>
                              <span className="text-slate-700">{previewReplyTo}</span>
                            </div>
                          ) : null}
                        </>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <span className="font-semibold text-slate-900">Subject:</span>
                        <span className="text-slate-700">{previewSubject}</span>
                      </div>
                      {previewText ? (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                          <span className="font-semibold text-slate-900">Preview:</span>
                          <span className="text-slate-700">{previewText}</span>
                        </div>
                      ) : null}
                    </div>

                    <ToggleGroup
                      value={previewViewportMode}
                      onChange={setPreviewViewportMode}
                      options={[
                        {
                          value: "desktop",
                          label: (
                            <span className="inline-flex items-center gap-2">
                              <DesktopIcon />
                              Desktop
                            </span>
                          ),
                        },
                        {
                          value: "mobile",
                          label: (
                            <span className="inline-flex items-center gap-2">
                              <MobileIcon />
                              Mobile
                            </span>
                          ),
                        },
                      ]}
                    />
                  </div>

                  <div className="h-[calc(92vh-220px)] min-h-[520px] overflow-auto bg-[radial-gradient(circle_at_top_left,_rgba(99,91,255,0.08),_transparent_24%),radial-gradient(circle_at_right_top,_rgba(14,165,233,0.08),_transparent_24%),linear-gradient(180deg,_#f8fafc_0%,_#f3f6fb_100%)] p-4 md:p-6">
                    <div
                      className="mx-auto"
                      style={{
                        maxWidth:
                          previewViewportMode === "mobile"
                            ? 390
                            : Math.max(600, currentSettings.layout.bodyWidth || 600),
                      }}
                    >
                      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_16px_42px_rgba(15,23,42,0.12)]">
                        <iframe
                          key={`${previewViewportMode}-${previewHtml.length}`}
                          title="Email preview"
                          srcDoc={previewHtml}
                          className="block h-[72vh] min-h-[520px] w-full bg-white"
                          style={{
                            width: "100%",
                            maxWidth: previewViewportMode === "mobile" ? 390 : "100%",
                          }}
                          sandbox="allow-same-origin"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* <aside className="min-h-0 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="space-y-5">
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
                          onChange={(event) => setPreviewAudience(event.target.value)}
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
                            onChange={(event) => setPreviewContactQuery(event.target.value)}
                          />
                        </div>
                      </div>

                      <label className="flex cursor-pointer items-center gap-3">
                        <input
                          type="radio"
                          name="previewAudience"
                          value="event"
                          checked={previewAudience === "event"}
                          onChange={(event) => setPreviewAudience(event.target.value)}
                          className="h-4 w-4 accent-indigo-600"
                        />
                        <span className="text-[15px] text-slate-700">Preview event</span>
                      </label>
                    </div>
                  </div>
                </aside> */}
              </div>
            ) : (
              <div className="grid min-h-0 flex-1 gap-4 overflow-hidden bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_360px] md:p-6">
                <section className="min-h-0 overflow-auto rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-900">Recipient email</label>
                      <input
                        className="field"
                        type="email"
                        placeholder="recipient@example.com"
                        value={testRecipientEmail}
                        onChange={(event) => setTestRecipientEmail(event.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-900">Subject</label>
                      <input
                        className="field"
                        type="text"
                        value={testEmailSubject}
                        onChange={(event) => setTestEmailSubject(event.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-900">Message</label>
                      <textarea
                        className="field min-h-[200px] resize-y"
                        value={testEmailMessage}
                        onChange={(event) => setTestEmailMessage(event.target.value)}
                        placeholder="Optional note for the test email"
                      />
                    </div>
                    <button
                      type="button"
                      className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSendingTestEmail}
                      onClick={handleSendTestEmail}
                    >
                      {isSendingTestEmail ? "Sending..." : "Send test email"}
                    </button>
                  </div>
                </section>

                <aside className="min-h-0 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="space-y-3">
                    <h4 className="text-[20px] font-semibold tracking-tight text-slate-900">
                      Test email
                    </h4>
                    <p className="text-sm leading-6 text-slate-500">
                      Send a live SES-backed test email using the current preview content.
                    </p>
                  </div>
                </aside>
              </div>
            )}
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}

function ContentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
      <rect x="4" y="4" width="6" height="6" rx="1.5" />
      <rect x="14" y="4" width="6" height="6" rx="1.5" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" />
      <rect x="14" y="14" width="6" height="6" rx="1.5" />
    </svg>
  );
}

function StyleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
      <path d="M4 20c3-7 7-11 16-16" />
      <path d="M7 4l13 13" />
      <path d="M7 4l-3 3" />
    </svg>
  );
}

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

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  );
}

function BackArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2.2">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
      <path d="M5 4h11l3 3v13H5z" />
      <path d="M8 4v6h8V4" />
      <path d="M8 18h8" />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v5h5" />
      <path d="M8 14h8" />
      <path d="M8 18h8" />
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

export default EmailBuilderPage;
