import { useContext, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";

const initialForm = {
  email: import.meta.env.VITE_ADMIN_EMAIL || "",
  password: import.meta.env.VITE_ADMIN_PASSWORD || "",
};

function LoginPage() {
  const { admin, login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (admin) {
    return <Navigate to="/overview" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(form);
      navigate(location.state?.from?.pathname || "/overview", {
        replace: true,
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to sign in");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(21,128,61,0.12),transparent_28%),radial-gradient(circle_at_right_top,rgba(15,23,42,0.06),transparent_26%),linear-gradient(180deg,var(--bg-page)_0%,var(--bg-page-soft)_100%)]" />
      <div className="absolute left-[-8rem] top-[-8rem] h-72 w-72 rounded-full bg-[rgba(21,128,61,0.08)] blur-3xl" />
      <div className="absolute bottom-[-6rem] right-[-5rem] h-72 w-72 rounded-full bg-[rgba(15,23,42,0.06)] blur-3xl" />

      <section className="relative w-full max-w-[460px]">
        <div className="shell-card-strong overflow-hidden">
          <div className="border-b border-[var(--border-soft)] px-8 py-7">
            <div className="inline-flex items-center rounded-full border border-[rgba(21,128,61,0.18)] bg-[rgba(213,246,200,0.62)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#2f6f35]">
              Email Marketing Dashboard
            </div>
            <h2 className="mt-5 text-[34px] font-semibold tracking-tight text-ui-strong">
              Sign in
            </h2>
            <p className="mt-3 max-w-md text-[15px] leading-6 text-ui-body">
              Use your workspace email and password to access campaigns, automations, templates, and team controls.
            </p>
          </div>

          <div className="px-8 py-8">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-ui-strong">Email</span>
                <input
                  className="field"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="Enter email"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-ui-strong">Password</span>
                <input
                  className="field"
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder="Enter password"
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                className="primary-button w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Signing in..." : "Login"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LoginPage;
