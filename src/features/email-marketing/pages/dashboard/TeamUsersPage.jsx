import { useEffect, useMemo, useState, useContext } from "react";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Modal from "../../components/ui/Modal.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import { ToastContext } from "../../context/ToastContext.jsx";
import { roleLabels } from "../../data/permissions.js";
import { api } from "../../lib/api.js";

const permissionCatalog = [
  {
    permission: "view_dashboard",
    label: "Dashboard",
    description: "Open the main overview and summary cards.",
    required: true,
  },
  {
    permission: "manage_campaigns",
    label: "Campaigns",
    description: "Create, schedule, and manage campaign sends.",
  },
  {
    permission: "edit_content",
    label: "Templates and Builder",
    description: "Edit templates and design email layouts.",
  },
  {
    permission: "manage_audience",
    label: "Audience and Segments",
    description: "Work with subscribers, imports, and segments.",
  },
  {
    permission: "manage_automations",
    label: "Automations",
    description: "Build workflows and drip campaigns.",
  },
  {
    permission: "view_analytics",
    label: "Analytics and Deliverability",
    description: "Review engagement, inboxing, and sender health.",
  },
  {
    permission: "view_reports",
    label: "Reports",
    description: "Open reporting and performance summaries.",
  },
  {
    permission: "manage_settings",
    label: "Settings",
    description: "Access workspace preferences and sender controls.",
  },
];

const defaultForm = {
  name: "",
  email: "",
  status: "active",
  permissions: ["view_dashboard"],
};

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Never";

const formatPermissionLabel = (permissions = []) => {
  if (!permissions.length) {
    return "No access";
  }

  const labels = permissionCatalog
    .filter((item) => permissions.includes(item.permission))
    .map((item) => item.label);

  return labels.slice(0, 2).join(", ") + (labels.length > 2 ? ` +${labels.length - 2}` : "");
};

function TeamUsersPage() {
  const toast = useContext(ToastContext);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [isSaving, setIsSaving] = useState(false);
  const [query, setQuery] = useState("");

  const loadTeamUsers = async () => {
    setIsLoading(true);

    try {
      const { data } = await api.get("/team-users");
      setUsers(data.users || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load team users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTeamUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) {
      return users;
    }

    return users.filter((user) =>
      [user.name, user.email, user.role, user.accountStatus]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [query, users]);

  const stats = useMemo(() => {
    const activeUsers = users.filter((user) => user.accountStatus !== "inactive");
    return {
      total: users.length,
      active: activeUsers.length,
      inactive: users.length - activeUsers.length,
      withSettings: users.filter((user) => user.permissions?.includes("manage_settings")).length,
    };
  }, [users]);

  const openInviteModal = (user = null) => {
    setEditingUser(user);
    setForm(
      user
        ? {
            name: user.name || "",
            email: user.email || "",
            status: user.accountStatus || "active",
            permissions: Array.isArray(user.permissions) && user.permissions.length ? user.permissions : ["view_dashboard"],
          }
        : defaultForm,
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setForm(defaultForm);
  };

  const togglePermission = (permission) => {
    if (permission === "view_dashboard") {
      return;
    }

    setForm((current) => {
      const exists = current.permissions.includes(permission);
      const nextPermissions = exists
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission];

      if (!nextPermissions.includes("view_dashboard")) {
        nextPermissions.unshift("view_dashboard");
      }

      return {
        ...current,
        permissions: Array.from(new Set(nextPermissions)),
      };
    });
  };

  const toggleSelectAll = () => {
    setForm((current) => {
      const allPermissions = permissionCatalog.map((item) => item.permission);
      const allSelected = allPermissions.every((permission) =>
        current.permissions.includes(permission),
      );

      return {
        ...current,
        permissions: allSelected ? ["view_dashboard"] : allPermissions,
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        name: form.name,
        email: form.email,
        status: form.status,
        permissions: form.permissions,
        role: "team_member",
      };

      const { data } = editingUser
        ? await api.patch(`/team-users/${editingUser._id}`, payload)
        : await api.post("/team-users", payload);

      toast.success(
        data.emailStatus === "failed"
          ? "Access saved, but invite email could not be sent"
          : "Access granted and invite email sent",
      );

      closeModal();
      loadTeamUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save access");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (userId) => {
    try {
      await api.delete(`/team-users/${userId}`);
      toast.success("Team access deactivated");
      loadTeamUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to deactivate user");
    }
  };

  return (
    <div className="space-y-6">
      <section className="shell-card-strong p-6 md:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <PageHeader
            eyebrow="Workspace"
            title="Invite users"
            description="Grant limited dashboard access to teammates. Each invite receives a generated password and a login link by email."
          />
          <button type="button" onClick={() => openInviteModal()} className="primary-button">
            Invite user
          </button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Team users", stats.total],
          ["Active access", stats.active],
          ["Inactive access", stats.inactive],
          ["With settings", stats.withSettings],
        ].map(([label, value]) => (
          <article key={label} className="metric-card bg-gradient-to-br from-white to-[#fbfff5]">
            <div className="p-4">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#7a7296]">{label}</p>
              <p className="mt-2 text-xl font-semibold tracking-tight text-[#2f2b3d]">{value}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="shell-card-strong p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#2f2b3d]">Team access</h3>
            <p className="mt-1 text-sm text-[#6e6787]">
              Manage who can access the dashboard and what they are allowed to open.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 lg:max-w-2xl lg:flex-row">
            <input
              className="field"
              placeholder="Search by name, email, or status"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="button" onClick={() => openInviteModal()} className="secondary-button shrink-0">
              Invite user
            </button>
          </div>
        </div>
      </section>

      <section className="shell-card-strong overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-sm text-[#6e6787]">Loading team users...</div>
        ) : filteredUsers.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-[#fbfff5] text-[#7a7296]">
                <tr>
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Allowed access</th>
                  <th className="px-6 py-4 font-medium">Last login</th>
                  <th className="px-6 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 align-top">
                    <td className="px-6 py-5">
                      <div className="font-semibold text-[#2f2b3d]">{user.name}</div>
                      <div className="mt-1 text-[#6e6787]">{user.email}</div>
                      <div className="mt-2 text-xs text-[#9a94b2]">
                        Invited {formatDateTime(user.invitedAt)}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-[#5f5878]">
                      {roleLabels[user.role] || user.role}
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          user.accountStatus === "inactive"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {user.accountStatus || "active"}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-[#5f5878]">
                      {formatPermissionLabel(user.permissions || [])}
                    </td>
                    <td className="px-6 py-5 text-[#5f5878]">
                      {formatDateTime(user.lastLoginAt)}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="font-medium text-[#6d28d9]"
                          onClick={() => openInviteModal(user)}
                        >
                          Edit
                        </button>
                        {user.accountStatus !== "inactive" ? (
                          <button
                            type="button"
                            className="font-medium text-amber-700"
                            onClick={() => handleDeactivate(user.id)}
                          >
                            Deactivate
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              title="No team users yet"
              description="Invite your first teammate and assign the dashboard pages they should access."
              action={
                <button type="button" onClick={() => openInviteModal()} className="primary-button">
                  Invite user
                </button>
              }
            />
          </div>
        )}
      </section>

      {isModalOpen ? (
        <Modal
          title={editingUser ? "Edit access" : "Invite user"}
          description="Choose which dashboard pages this user can open. A generated password is emailed automatically after access is granted."
          className="!max-w-6xl"
          bodyClassName="max-h-[76vh] overflow-y-auto"
          onClose={closeModal}
        >
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="block space-y-2 md:col-span-1">
                <span className="text-sm font-semibold text-[#2f2b3d]">Name</span>
                <input
                  className="field"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Example: Pankaj Sharma"
                  required
                />
              </label>
              <label className="block space-y-2 md:col-span-1">
                <span className="text-sm font-semibold text-[#2f2b3d]">Email</span>
                <input
                  className="field"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="name@example.com"
                  required
                />
              </label>
              <label className="block space-y-2 md:col-span-1">
                <span className="text-sm font-semibold text-[#2f2b3d]">Status</span>
                <select
                  className="field"
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>

            <section className="rounded-[28px] border border-[#e5e0f3] bg-white p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#2f2b3d]">Allowed pages</h3>
                  <p className="mt-1 text-sm text-[#6e6787]">
                    Pick the sections this user can open after signing in.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="soft-pill">
                    {form.permissions.length} selected
                  </span>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="secondary-button px-4 py-2 text-sm"
                  >
                    Select all
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {permissionCatalog.map((item) => {
                  const isSelected = form.permissions.includes(item.permission);
                  const isRequired = Boolean(item.required);

                  return (
                    <button
                      key={item.permission}
                      type="button"
                      onClick={() => togglePermission(item.permission)}
                      disabled={isRequired}
                      className={`rounded-[24px] border p-4 text-left transition ${
                        isSelected
                          ? "border-emerald-300 bg-[#f7fff1] shadow-sm"
                          : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-[#fbfffd]"
                      } ${isRequired ? "cursor-default opacity-100" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h4 className="text-base font-semibold text-[#2f2b3d]">
                            {item.label}
                          </h4>
                          <p className="mt-2 text-sm leading-6 text-[#6e6787]">
                            {item.description}
                          </p>
                        </div>
                        <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500">
                          {isRequired ? "Required" : isSelected ? "Selected" : "Pick"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="flex flex-col gap-3 border-t border-[#ece7f7] pt-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeModal} className="secondary-button">
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={isSaving}>
                {isSaving ? "Saving..." : editingUser ? "Update access" : "Give access"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

export default TeamUsersPage;
