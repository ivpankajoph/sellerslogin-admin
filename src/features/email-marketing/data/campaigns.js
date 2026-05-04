export const campaignTypes = [
  "promotional",
  "broadcast",
  "newsletter",
  "abandoned_cart",
  "win_back",
  "product_launch",
];

export const campaignTypeLabels = {
  promotional: "Promotional",
  broadcast: "Broadcast",
  newsletter: "Newsletter",
  abandoned_cart: "Abandoned cart",
  win_back: "Win-back",
  product_launch: "Product launch",
};

export const formatCampaignTypeLabel = (type) =>
  campaignTypeLabels[type] || String(type || "").replaceAll("_", " ");

export const campaignGoals = ["clicks", "orders", "revenue", "reactivation"];

export const campaignStatuses = [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "paused",
  "failed",
  "archived",
];

export const templateVariables = ["{{firstName}}", "{{lastName}}", "{{email}}"];
