import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../../components/ui/EmptyState.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import { api } from "../../lib/api.js";

function SegmentsListPage() {
  const [segments, setSegments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSegments = async () => {
    setIsLoading(true);

    try {
      const { data } = await api.get("/segments");
      setSegments(data);
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
              eyebrow="Segments"
              title="Choose how to create a segment"
              description="Start with a ready-made segment or build one from scratch in a simple flow."
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/segments/new?mode=ready-made"
              className="rounded-full border border-[#ddd4f2] bg-white px-4 py-2 text-sm font-semibold text-[#5f5878]"
            >
              Ready-made segment
            </Link>
            <Link
              to="/segments/new?mode=create"
              className="rounded-full border border-[#ddd4f2] bg-white px-4 py-2 text-sm font-semibold text-[#5f5878]"
            >
              Create from scratch
            </Link>
          </div>
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
