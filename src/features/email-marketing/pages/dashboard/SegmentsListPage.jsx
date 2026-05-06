import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../../components/ui/EmptyState.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import { api } from "../../lib/api.js";

const defaultSegmentUsage = { used: 0, limit: 0, remaining: 0, isExhausted: false };

function SegmentsListPage() {
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

  return (
    <div className="space-y-6">
      <section className="shell-card-strong p-6 md:p-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-3">
            <PageHeader
              eyebrow="Segmentation"
              title="All segment"
              description="View, edit, and manage every segment created from scratch or ready-made presets."
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/segments/new?mode=create"
              className="rounded-full border border-[#ddd4f2] bg-white px-4 py-2 text-sm font-semibold text-[#5f5878]"
            >
              Create New Segments
            </Link>
            <Link
              to="/segments/new?mode=ready-made"
              className="rounded-full border border-[#ddd4f2] bg-white px-4 py-2 text-sm font-semibold text-[#5f5878]"
            >
              Ready made segments
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 rounded-[20px] border border-[#e7def8] bg-white px-5 py-4 shadow-[0_10px_24px_rgba(43,29,75,0.04)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <p className="text-sm font-semibold text-[#2f2b3d]">
            Segments created: {segmentUsage.used}
          </p>
          <p className="mt-1 text-sm text-[#6e6787]">
            Segment creation is unlimited. Credits are checked only before a full send.
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#eee9f8] md:w-56">
          <div
            className="h-full bg-[#8338ec]"
            style={{ width: "100%" }}
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
                <Link to="/segments/new?mode=create" className="primary-button">
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
