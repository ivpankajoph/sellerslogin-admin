import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import LoadingState from "../../components/ui/LoadingState.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import { ToastContext } from "../../context/ToastContext.jsx";
import {
  createBlankCondition,
  getFieldGroup,
  getFieldOption,
  getPresetById,
  segmentFieldGroups,
  segmentMatchModes,
  segmentQuickPresets,
} from "../../data/segmentBuilder.js";
import { api } from "../../lib/api.js";

const getKindValue = (kind) => {
  if (kind === "boolean") {
    return "true";
  }

  if (kind === "number") {
    return "0";
  }

  if (kind === "date") {
    return "7";
  }

  return "";
};

const createConditionFromField = (fieldValue, fallbackCategory = "activity") => {
  const field = getFieldOption(fieldValue);
  const group = segmentFieldGroups.find((item) =>
    item.fields.some((entry) => entry.value === fieldValue),
  ) || getFieldGroup(fallbackCategory);
  const nextField = field || group.fields[0];

  return {
    category: group.id,
    field: nextField.value,
    operator: nextField.operators[0] || "is",
    value: getKindValue(nextField.kind),
  };
};

const buildConditionSummary = (condition) => {
  const field = getFieldOption(condition.field);
  const fieldLabel = field?.label || condition.field;
  const operatorLabelMap = {
    is: "is",
    is_not: "is not",
    more_than: "more than",
    less_than: "less than",
    in_last_days: "in last",
    before_days: "inactive for",
    all: "has all",
  };

  const operatorLabel = operatorLabelMap[condition.operator] || condition.operator;
  const value = String(condition.value || "").trim();

  if (!value && field?.kind !== "boolean") {
    return fieldLabel;
  }

  if (condition.operator === "in_last_days" || condition.operator === "before_days") {
    return `${fieldLabel} ${operatorLabel} ${value} days`;
  }

  if (field?.kind === "boolean") {
    return `${fieldLabel} ${operatorLabel} ${value === "false" ? "No" : "Yes"}`;
  }

  return `${fieldLabel} ${operatorLabel} ${value}`;
};

const sanitizeConditions = (conditions = []) =>
  conditions
    .map((condition) => {
      const field = getFieldOption(condition.field);

      if (!field) {
        return null;
      }

      const normalizedValue = String(condition.value ?? "").trim();
      const requiresValue = field.kind !== "boolean" || condition.operator === "is_not" || condition.operator === "is";

      if (field.kind === "boolean") {
        return {
          category: condition.category || "activity",
          field: condition.field,
          operator: condition.operator || "is",
          value: normalizedValue || "true",
        };
      }

      if (requiresValue && !normalizedValue) {
        return null;
      }

      return {
        category: condition.category || "activity",
        field: condition.field,
        operator: condition.operator || "is",
        value: normalizedValue,
      };
    })
    .filter(Boolean);

const emptyWebsiteScope = {
  websiteId: "",
  websiteSlug: "",
  websiteName: "",
  label: "",
};

const normalizeWebsiteScope = (scope = {}) => ({
  websiteId: String(scope.websiteId || scope.website_id || "").trim(),
  websiteSlug: String(scope.websiteSlug || scope.website_slug || "").trim(),
  websiteName: String(scope.websiteName || scope.website_name || "").trim(),
  label: String(
    scope.label ||
      scope.websiteName ||
      scope.website_name ||
      scope.websiteSlug ||
      scope.website_slug ||
      scope.websiteId ||
      scope.website_id ||
      "",
  ).trim(),
});

const getWebsiteOptionScope = (website = {}) => ({
  websiteId: website.websiteId || "",
  websiteSlug: website.websiteSlug || "",
  websiteName: website.websiteName || "",
  label: website.label || website.websiteName || website.websiteSlug || website.websiteId || "",
});

const getWebsiteScopeKey = (scope = {}) =>
  [scope.websiteId || "", scope.websiteSlug || "", scope.websiteName || ""].join("::");

function SegmentFormPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useContext(ToastContext);
  const presetId = new URLSearchParams(location.search).get("preset");
  const mode = new URLSearchParams(location.search).get("mode");
  const preset = !id ? getPresetById(presetId) : null;
  const isPresetPickerMode = mode === "ready-made" && !preset;

  const initialDefinition = preset?.definition || {
    logic: "and",
    filters: [createBlankCondition()],
  };

  const [name, setName] = useState(() => preset?.name || "");
  const [websiteScope, setWebsiteScope] = useState(emptyWebsiteScope);
  const [websites, setWebsites] = useState([]);
  const [logic, setLogic] = useState(() => initialDefinition.logic || "and");
  const [conditions, setConditions] = useState(() =>
    (initialDefinition.filters?.length ? initialDefinition.filters : [createBlankCondition()]).map(
      (condition) => ({
        category: condition.category || "activity",
        field: condition.field || "lastActivityAt",
        operator: condition.operator || "in_last_days",
        value: String(condition.value ?? ""),
      }),
    ),
  );
  const [previewCount, setPreviewCount] = useState(0);
  const [sampleUsers, setSampleUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const selectedWebsiteKey = getWebsiteScopeKey(normalizeWebsiteScope(websiteScope));

  useEffect(() => {
    if (id || !preset) {
      return;
    }

    const nextDefinition = preset.definition || { logic: "and", filters: [createBlankCondition()] };

    setName(preset.name || "");
    setWebsiteScope(emptyWebsiteScope);
    setLogic(nextDefinition.logic || "and");
    setConditions(
      (nextDefinition.filters?.length ? nextDefinition.filters : [createBlankCondition()]).map(
        (condition) => ({
          category: condition.category || "activity",
          field: condition.field || "lastActivityAt",
          operator: condition.operator || "in_last_days",
          value: String(condition.value ?? ""),
        }),
      ),
    );
  }, [id, preset]);

  useEffect(() => {
    const loadWebsiteOptions = async () => {
      try {
        const { data } = await api.get("/subscribers/summary");
        setWebsites(data?.websites || []);
      } catch {
        setWebsites([]);
      }
    };

    loadWebsiteOptions();
  }, []);

  useEffect(() => {
    if (!id) {
      return;
    }

    const loadSegment = async () => {
      try {
        const { data } = await api.get(`/segments/${id}`);
        const nextDefinition = data.definition || { logic: "and", filters: data.rules || [] };

        setName(data.name || "");
        setWebsiteScope(normalizeWebsiteScope(data.websiteScope || {}));
        setLogic(nextDefinition.logic || "and");
        setConditions(
          (nextDefinition.filters?.length ? nextDefinition.filters : [createBlankCondition()]).map(
            (condition) => ({
              category: condition.category || "activity",
              field: condition.field || "lastActivityAt",
              operator: condition.operator || "in_last_days",
              value: String(condition.value ?? ""),
            }),
          ),
        );
      } catch (requestError) {
        toast.error(
          requestError.response?.data?.message || "Unable to load segment",
        );
        navigate("/segments");
      } finally {
        setIsLoading(false);
      }
    };

    loadSegment();
  }, [id, navigate, toast]);

  const cleanConditions = useMemo(() => sanitizeConditions(conditions), [conditions]);

  const refreshPreview = async (
    nextLogic = logic,
    nextConditions = cleanConditions,
    nextWebsiteScope = websiteScope,
  ) => {
    try {
      const { data } = await api.post("/segments/preview", {
        definition: {
          logic: nextLogic,
          filters: nextConditions,
        },
        websiteScope: normalizeWebsiteScope(nextWebsiteScope || {}),
      });

      setPreviewCount(Number(data.previewCount || 0));
      setSampleUsers(data.sampleSubscribers || []);
    } catch {
      setPreviewCount(0);
      setSampleUsers([]);
    }
  };

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const timer = setTimeout(() => {
      refreshPreview();
    }, 300);

    return () => clearTimeout(timer);
  }, [cleanConditions, isLoading, logic, websiteScope]);

  const handleConditionChange = (index, key, value) => {
    setConditions((current) =>
      current.map((condition, conditionIndex) => {
        if (conditionIndex !== index) {
          return condition;
        }

        if (key === "category") {
          const nextGroup = getFieldGroup(value);
          const nextField = nextGroup.fields[0];

          return {
            category: value,
            field: nextField.value,
            operator: nextField.operators[0] || "is",
            value: getKindValue(nextField.kind),
          };
        }

        if (key === "field") {
          return createConditionFromField(value, condition.category);
        }

        if (key === "operator") {
          const field = getFieldOption(condition.field);
          return {
            ...condition,
            operator: value,
            value:
              field?.kind === "boolean"
                ? value === "is_not"
                  ? "false"
                  : "true"
                : field?.kind === "date"
                  ? condition.value || "7"
                  : field?.kind === "number"
                    ? condition.value || "0"
                    : condition.value,
          };
        }

        return { ...condition, [key]: value };
      }),
    );
  };

  const addCondition = () => {
    setConditions((current) => [
      ...current,
      createBlankCondition(current[current.length - 1]?.category || "activity"),
    ]);
  };

  const removeCondition = (index) => {
    setConditions((current) => {
      if (current.length === 1) {
        return [createBlankCondition()];
      }

      return current.filter((_, conditionIndex) => conditionIndex !== index);
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Segment name is required");
      return;
    }

    if (!cleanConditions.length) {
      setError("Add at least one condition");
      return;
    }

    setIsSaving(true);

    const payload = {
      name: name.trim(),
      websiteScope: normalizeWebsiteScope(websiteScope || {}),
      definition: {
        logic,
        filters: cleanConditions,
      },
    };

    try {
      if (id) {
        await api.put(`/segments/${id}`, payload);
        toast.success("Segment updated");
      } else {
        await api.post("/segments", payload);
        toast.success("Segment created");
      }

      navigate("/segments");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to save segment",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isPresetPickerMode) {
    return (
      <div className="space-y-6">
        <section className="shell-card-strong p-6 md:p-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <PageHeader
              eyebrow="Segments"
              title="Choose a ready-made segment"
              description="Pick a preset first, then edit it in the segment builder."
            />
            <Link
              to="/segments"
              className="rounded-xl border border-[#ddd4f2] px-4 py-3 text-sm font-medium text-[#5f5878]"
            >
              Back to segments
            </Link>
          </div>
        </section>

        <section className="shell-card-strong p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b84a5]">
                Ready-made segments
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-[#2f2b3d]">
                Select one to edit
              </h3>
            </div>
            <Link
              to="/segments/new?mode=create"
              className="rounded-xl border border-[#ddd4f2] px-4 py-3 text-sm font-medium text-[#5f5878]"
            >
              Create from scratch instead
            </Link>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {segmentQuickPresets.map((item) => (
              <article
                key={item.id}
                className="rounded-[28px] border border-[#e7def8] bg-gradient-to-br from-white to-[#faf7ff] p-5"
              >
                <h4 className="text-lg font-semibold text-[#2f2b3d]">
                  {item.name}
                </h4>
                <p className="mt-2 text-sm text-[#6e6787]">
                  {item.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.definition.filters.map((filter) => (
                    <span
                      key={`${item.id}-${filter.field}`}
                      className="soft-pill"
                    >
                      {getFieldOption(filter.field)?.label || filter.field}
                    </span>
                  ))}
                </div>
                <div className="mt-5">
                  <Link
                    to={`/segments/new?mode=ready-made&preset=${item.id}`}
                    className="primary-button w-full"
                  >
                    Edit preset
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingState message="Loading segment builder..." />;
  }

  return (
    <div className="space-y-6">
      <section className="shell-card-strong p-6 md:p-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <PageHeader
            eyebrow="Segments"
            title={id ? "Edit segment" : "Create a segment"}
            description="Pick a name, add simple conditions, and see the audience count update as you build."
          />
          <div className="flex flex-wrap gap-3">
            <Link
              to="/segments"
              className="rounded-xl border border-[#ddd4f2] px-4 py-3 text-sm font-medium text-[#5f5878]"
            >
              Back to segments
            </Link>
            <button
              type="submit"
              form="segment-builder-form"
              className="primary-button"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save segment"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <form
          id="segment-builder-form"
          className="shell-card-strong space-y-6 p-6"
          onSubmit={handleSubmit}
        >
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b84a5]">
                Step 1
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#2f2b3d]">
                Name your segment
              </h2>
            </div>
            <input
              className="field"
              placeholder="e.g. High value buyers"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <select
              className="field"
              value={selectedWebsiteKey}
              onChange={(event) => {
                const website = websites.find((item) => item.id === event.target.value);
                setWebsiteScope(website ? getWebsiteOptionScope(website) : emptyWebsiteScope);
              }}
            >
              <option value={getWebsiteScopeKey(emptyWebsiteScope)}>All websites</option>
              {websites.map((website) => (
                <option key={website.id} value={website.id}>
                  {website.label} ({website.count || 0})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b84a5]">
                Step 2
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#2f2b3d]">
                Add conditions
              </h2>
              <p className="mt-2 text-sm text-[#6e6787]">
                Choose a category, pick a rule, and keep it simple.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {segmentMatchModes.map((mode) => {
                const tooltipAlignClass =
                  mode.value === "and"
                    ? "left-0 translate-x-0"
                    : "right-0 translate-x-0";

                return (
                <div key={mode.value} className="group relative z-10">
                  <button
                    type="button"
                    onClick={() => setLogic(mode.value)}
                    aria-describedby={`segment-match-mode-${mode.value}`}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      logic === mode.value
                        ? "border-[#2f2b3d] bg-[#2f2b3d] text-white"
                        : "border-[#ddd4f2] bg-white text-[#5f5878]"
                    }`}
                  >
                    {mode.label}
                  </button>
                  <div
                    id={`segment-match-mode-${mode.value}`}
                    role="tooltip"
                    className={`pointer-events-none absolute bottom-full z-20 mb-3 w-80 rounded-2xl border border-[#e7def8] bg-white px-4 py-3 text-left text-sm text-[#5f5878] opacity-0 shadow-[0_18px_50px_rgba(43,29,75,0.14)] transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100 ${tooltipAlignClass}`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a7296]">
                      {mode.label}
                    </p>
                    <p className="mt-2 leading-6">{mode.helper}</p>
                  </div>
                </div>
                );
              })}
            </div>

            <div className="space-y-4">
              {conditions.map((condition, index) => {
                const group = getFieldGroup(condition.category);
                const field = getFieldOption(condition.field);
                const fieldOptions = group.fields;
                const valueKind = field?.kind || "text";

                return (
                  <article
                    key={`${condition.category}-${condition.field}-${index}`}
                    className="rounded-[28px] border border-[#e7def8] bg-[#faf7ff] p-4 shadow-[0_10px_24px_rgba(43,29,75,0.04)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8b84a5]">
                          Condition {index + 1}
                        </p>
                        <p className="mt-1 text-sm text-[#6e6787]">
                          {buildConditionSummary(condition)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCondition(index)}
                        className="rounded-xl border border-[#ddd4f2] px-3 py-2 text-sm font-medium text-[#5f5878]"
                      >
                        X
                      </button>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_0.95fr]">
                      <select
                        className="field"
                        value={condition.category}
                        onChange={(event) =>
                          handleConditionChange(index, "category", event.target.value)
                        }
                      >
                        {segmentFieldGroups.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </select>

                      <select
                        className="field"
                        value={condition.field}
                        onChange={(event) =>
                          handleConditionChange(index, "field", event.target.value)
                        }
                      >
                        {fieldOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>

                      <select
                        className="field"
                        value={condition.operator}
                        onChange={(event) =>
                          handleConditionChange(index, "operator", event.target.value)
                        }
                      >
                        {field?.operators?.map((item) => (
                          <option key={item} value={item}>
                            {item === "is"
                              ? "is"
                              : item === "is_not"
                                ? "is not"
                                : item === "more_than"
                                  ? "more than"
                                  : item === "less_than"
                                    ? "less than"
                                    : item === "in_last_days"
                                      ? "in last X days"
                                      : item === "before_days"
                                        ? "inactive for X days"
                                        : "has all tags"}
                          </option>
                        ))}
                      </select>

                      <div>
                        {valueKind === "boolean" ? (
                          <select
                            className="field"
                            value={condition.value || "true"}
                            onChange={(event) =>
                              handleConditionChange(index, "value", event.target.value)
                            }
                          >
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        ) : (
                          <input
                            className="field"
                            type={valueKind === "number" || valueKind === "date" ? "number" : "text"}
                            min={valueKind === "number" || valueKind === "date" ? "0" : undefined}
                            placeholder={
                              valueKind === "number"
                                ? "0"
                                : valueKind === "date"
                                  ? "7"
                                  : "Enter value"
                            }
                            value={condition.value}
                            onChange={(event) =>
                              handleConditionChange(index, "value", event.target.value)
                            }
                          />
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addCondition}
              className="rounded-2xl border border-[#ddd4f2] px-5 py-3 text-sm font-semibold text-[#5f5878]"
            >
              + Add condition
            </button>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b84a5]">
              Selected filters
            </p>
            <div className="flex flex-wrap gap-2">
              {cleanConditions.length ? (
                cleanConditions.map((condition, index) => (
                  <span
                    key={`${condition.field}-${index}`}
                    className="inline-flex items-center gap-2 rounded-full border border-[#ddd4f2] bg-white px-3 py-2 text-sm font-medium text-[#5f5878]"
                  >
                    {buildConditionSummary(condition)}
                    <button
                      type="button"
                      className="text-[#8b84a5]"
                      onClick={() => removeCondition(index)}
                    >
                      X
                    </button>
                  </span>
                ))
              ) : (
                <span className="soft-pill">No filters added yet</span>
              )}
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}
        </form>

        <aside className="space-y-6">
          {preset ? (
            <article className="shell-card-strong p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b84a5]">
                Ready-made segment loaded
              </p>
              <h3 className="mt-2 text-xl font-semibold text-[#2f2b3d]">
                {preset.name}
              </h3>
              <p className="mt-2 text-sm text-[#6e6787]">
                Make your changes here and save when ready.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {preset.definition.filters.map((filter) => (
                  <span
                    key={`${preset.id}-${filter.field}`}
                    className="soft-pill"
                  >
                    {getFieldOption(filter.field)?.label || filter.field}
                  </span>
                ))}
              </div>
              <div className="mt-5">
                <Link
                  to="/segments/new?mode=ready-made"
                  className="rounded-2xl border border-[#ddd4f2] px-4 py-3 text-sm font-medium text-[#5f5878]"
                >
                  Change preset
                </Link>
              </div>
            </article>
          ) : null}

          <article className="shell-card-strong p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b84a5]">
              Step 3
            </p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold text-[#2f2b3d]">
                  {previewCount} users match this segment
                </h3>
                <p className="mt-2 text-sm text-[#6e6787]">
                  This updates automatically as you change the rules.
                </p>
              </div>
              <span className="soft-pill">{cleanConditions.length} filters</span>
            </div>
          </article>

          <article className="shell-card-strong p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b84a5]">
              Preview sample
            </p>
            <div className="mt-4 space-y-3">
              {sampleUsers.length ? (
                sampleUsers.map((user) => (
                  <div
                    key={user.email}
                    className="rounded-2xl bg-[#faf7ff] p-4"
                  >
                    <p className="font-semibold text-[#2f2b3d]">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="mt-1 text-sm text-[#6e6787]">{user.email}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#6e6787]">
                  Matching users will appear here after you build a segment.
                </p>
              )}
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}

export default SegmentFormPage;
