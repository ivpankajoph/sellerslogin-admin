export const segmentMatchModes = [
  {
    value: "and",
    label: "Match all conditions",
    helper: "All conditions below must be true for a contact to match this segment.",
  },
  {
    value: "or",
    label: "Match any condition",
    helper: "A contact will match this segment if even one of the conditions below is true.",
  },
];

export const segmentFieldGroups = [
  {
    id: "activity",
    label: "User activity",
    description: "Email engagement and recent subscriber activity.",
    fields: [
      {
        value: "lastActivityAt",
        label: "Last activity",
        kind: "date",
        operators: ["in_last_days", "before_days"],
      },
      {
        value: "lastOpenAt",
        label: "Opened email",
        kind: "date",
        operators: ["in_last_days", "before_days"],
      },
      {
        value: "lastClickAt",
        label: "Clicked email",
        kind: "date",
        operators: ["in_last_days", "before_days"],
      },
      {
        value: "engagementScore",
        label: "Engagement score",
        kind: "number",
        operators: ["more_than", "less_than", "is", "is_not"],
      },
      {
        value: "status",
        label: "Status",
        kind: "text",
        operators: ["is", "is_not"],
      },
      {
        value: "sourceLocation",
        label: "Source location",
        kind: "text",
        operators: ["is", "is_not"],
      },
    ],
  },
  {
    id: "purchase",
    label: "Purchase",
    description: "Orders, spend, and cart intent.",
    fields: [
      {
        value: "totalOrders",
        label: "Total orders",
        kind: "number",
        operators: ["more_than", "less_than", "is", "is_not"],
      },
      {
        value: "totalSpent",
        label: "Total spent",
        kind: "number",
        operators: ["more_than", "less_than", "is", "is_not"],
      },
      {
        value: "lastOrderDate",
        label: "Last purchase date",
        kind: "date",
        operators: ["in_last_days", "before_days"],
      },
      {
        value: "cartAbandoner",
        label: "Cart abandoner",
        kind: "boolean",
        operators: ["is", "is_not"],
      },
    ],
  },
  {
    id: "location",
    label: "Location",
    description: "Geography-based targeting.",
    fields: [
      {
        value: "country",
        label: "Country",
        kind: "text",
        operators: ["is", "is_not"],
      },
      {
        value: "state",
        label: "State",
        kind: "text",
        operators: ["is", "is_not"],
      },
      {
        value: "city",
        label: "City",
        kind: "text",
        operators: ["is", "is_not"],
      },
    ],
  },
  {
    id: "tags",
    label: "Tags",
    description: "Simple audience labels.",
    fields: [
      {
        value: "tags",
        label: "Has tag",
        kind: "text",
        operators: ["is", "is_not", "all"],
      },
    ],
  },
];

export const segmentQuickPresets = [
  {
    id: "activeUsers",
    name: "Active Users",
    description: "People who were active in the last 7 days.",
    definition: {
      logic: "and",
      filters: [
        { category: "activity", field: "lastActivityAt", operator: "in_last_days", value: "7" },
      ],
    },
  },
  {
    id: "inactiveUsers",
    name: "Inactive Users",
    description: "Contacts who were inactive for 30 days or more.",
    definition: {
      logic: "and",
      filters: [
        { category: "activity", field: "lastActivityAt", operator: "before_days", value: "30" },
      ],
    },
  },
  {
    id: "buyers",
    name: "Buyers",
    description: "Contacts with at least one completed order.",
    definition: {
      logic: "and",
      filters: [
        { category: "purchase", field: "totalOrders", operator: "more_than", value: "0" },
      ],
    },
  },
  {
    id: "highSpenders",
    name: "High Spenders",
    description: "Contacts who spent over 500.",
    definition: {
      logic: "and",
      filters: [
        { category: "purchase", field: "totalSpent", operator: "more_than", value: "500" },
      ],
    },
  },
  {
    id: "cartAbandoners",
    name: "Cart Abandoners",
    description: "Contacts marked as cart abandoners.",
    definition: {
      logic: "and",
      filters: [
        { category: "purchase", field: "cartAbandoner", operator: "is", value: "true" },
      ],
    },
  },
];

export const getFieldGroup = (groupId) =>
  segmentFieldGroups.find((group) => group.id === groupId) || segmentFieldGroups[0];

export const getFieldOption = (fieldValue) =>
  segmentFieldGroups.flatMap((group) => group.fields).find((field) => field.value === fieldValue);

export const getDefaultField = (groupId = "activity") =>
  getFieldGroup(groupId).fields[0]?.value || "lastActivityAt";

export const createBlankCondition = (groupId = "activity") => ({
  category: groupId,
  field: getDefaultField(groupId),
  operator: getFieldOption(getDefaultField(groupId))?.operators?.[0] || "is",
  value: "",
});

export const getPresetById = (presetId) =>
  segmentQuickPresets.find((preset) => preset.id === presetId);
