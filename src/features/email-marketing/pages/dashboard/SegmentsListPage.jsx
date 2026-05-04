import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../../components/ui/EmptyState.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import { ToastContext } from "../../context/ToastContext.jsx";
import { api } from "../../lib/api.js";

const defaultSegmentUsage = { used: 0, limit: 0, remaining: 0, isExhausted: false };

function SegmentsListPage() {
  const toast = useContext(ToastContext);
  const [segments, setSegments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [segmentUsage, setSegmentUsage] = useState(defaultSegmentUsage);

  const loadSegments = async () => {
    setIsLoading(true);

    try {
      const [segmentsResponse, billingResponse] = await Promise.all([
        api.get("/segments"),
        api.get("/billing/me").catch(() => ({ data: null })),
      ]);
      setSegments(segmentsResponse.data);
      setSegmentUsage(billingResponse.data?.featureUsage?.segments || defaultSegmentUsage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSegments();
  }, []);

  const handleDelete = async (id) => {
    await api.delete(`/segments/${id}`);
    loadSegments();
  };

  const isSegmentLimitReached = segmentUsage.isExhausted;

  const guardSegmentCreate = (event) => {
    if (!isSegmentLimitReached) {
      return;
    }

    event.preventDefault();
    toast.error("Segment limit reached. Upgrade your plan to create more segments.");
  };

  return (
    <div className="space-y-6">
      <section className="shell-card-strong p-6 md:p-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-3">
            <PageHeader
              eyebrow="Segments"
              title="Choose how to create a segment"
              description="Start with a ready-made segment or build one from scratch in a simple flow."
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/segments/new?mode=ready-made"
              onClick={guardSegmentCreate}
              className={`rounded-full border border-[#ddd4f2] bg-white px-4 py-2 text-sm font-semibold text-[#5f5878] ${
                isSegmentLimitReached ? "pointer-events-auto opacity-60" : ""
              }`}
            >
              Ready-made segment
            </Link>
            <Link
              to="/segments/new?mode=create"
              onClick={guardSegmentCreate}
              className={`rounded-full border border-[#ddd4f2] bg-white px-4 py-2 text-sm font-semibold text-[#5f5878] ${
                isSegmentLimitReached ? "pointer-events-auto opacity-60" : ""
              }`}
            >
              Create from scratch
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 rounded-[20px] border border-[#e7def8] bg-white px-5 py-4 shadow-[0_10px_24px_rgba(43,29,75,0.04)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <p className="text-sm font-semibold text-[#2f2b3d]">
            Segments used: {segmentUsage.used} / {segmentUsage.limit}
          </p>
          <p className="mt-1 text-sm text-[#6e6787]">
            {segmentUsage.remaining} segments remaining in your current plan.
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#eee9f8] md:w-56">
          <div
            className={`h-full ${isSegmentLimitReached ? "bg-rose-500" : "bg-[#8338ec]"}`}
            style={{
              width: `${segmentUsage.limit ? Math.min((segmentUsage.used / segmentUsage.limit) * 100, 100) : 0}%`,
            }}
          />
        </div>
      </section>

      <section className="shell-card-strong p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b84a5]">
              Your segments
            </p>
            {/* <h3 className="mt-2 text-2xl font-semibold text-[#2f2b3d]">
              Your dynamic audiences
            </h3> */}
          </div>
          <button
            type="button"
            onClick={loadSegments}
            className="rounded-xl border border-[#ddd4f2] px-4 py-3 text-sm font-medium text-[#5f5878]"
          >
            Refresh
          </button>
        </div>

        <div className="mt-5">
          {isLoading ? (
            <p className="text-sm text-[#6e6787]">Loading segments...</p>
          ) : segments.length ? (
            <div className="grid gap-4">
              {segments.map((segment) => (
                <article
                  key={segment._id}
                  className="rounded-[28px] border border-[#e7def8] bg-white p-5 shadow-[0_10px_24px_rgba(43,29,75,0.04)]"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-semibold text-[#2f2b3d]">
                          {segment.name}
                        </h4>
                        <span className="soft-pill">
                          {segment.previewCount || 0} users match
                        </span>
                      </div>
                      <p className="text-sm text-[#6e6787]">
                        {segment.definition?.logic === "or"
                          ? "Any condition can match."
                          : "All conditions must match."}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Link
                        to={`/segments/${segment._id}/edit`}
                        className="rounded-2xl border border-[#ddd4f2] px-4 py-2 text-sm font-medium text-[#5f5878]"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(segment._id)}
                        className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(segment.filterSummary || []).map((summary, index) => (
                      <span
                        key={`${segment._id}-${index}`}
                        className="soft-pill"
                      >
                        {summary}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No segments yet"
              description="Create a preset or build a new audience segment in a few simple steps."
              action={
                <Link to="/segments/new?mode=create" onClick={guardSegmentCreate} className="primary-button">
                  Create segment
                </Link>
              }
            />
          )}
        </div>
      </section>
    </div>
  );
}

export default SegmentsListPage;
