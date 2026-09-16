import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { getDivisions } from "../api/hierarchyApi";
import { getUsers, createUser, deactivateUser, reactivateUser, resetUserPasswordApi } from "../api/usersApi";
import SideNavBar from "../components/SideNavBar";
import MobileHeader from "../components/MobileHeader";

const ROLE_BADGE = {
  administrator:  { label: "Administrator",  bg: "bg-primary/10",      text: "text-primary",      icon: "shield" },
  division_admin: { label: "Division Admin",  bg: "bg-secondary/10",    text: "text-secondary",    icon: "manage_accounts" },
  supervisor:     { label: "Supervisor",      bg: "bg-surface-tint/10", text: "text-surface-tint", icon: "supervisor_account" },
};

const INITIAL_FORM = { full_name: "", username: "", email: "", password: "", role: "supervisor", division_id: "" };

const Users = () => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "administrator";
  const isDivAdmin = currentUser?.role === "division_admin";

  const [users, setUsers]         = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [search, setSearch]       = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Modal state
  const [showCreate, setShowCreate]     = useState(false);
  const [form, setForm]                 = useState(INITIAL_FORM);
  const [formError, setFormError]       = useState("");
  const [saving, setSaving]             = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);

  // Admin Reset Password state
  const [resetTarget, setResetTarget] = useState(null);
  const [resetTempPass, setResetTempPass] = useState("Abupass@2026");
  const [resetMustChange, setResetMustChange] = useState(true);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [usersData, divisionsData] = await Promise.all([
        getUsers(),
        isAdmin ? getDivisions() : Promise.resolve([]),
      ]);
      setUsers(usersData);
      setDivisions(divisionsData);
    } catch (err) {
      console.error(err);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.username?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // ── Create User ─────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.username || !form.password) {
      setFormError("Full name, username and password are required");
      return;
    }
    if (isAdmin && !form.role) {
      setFormError("Please select a role");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await createUser({
        full_name:   form.full_name,
        username:    form.username,
        email:       form.email || undefined,
        password:    form.password,
        role:        isDivAdmin ? "supervisor" : form.role,
        division_id: isDivAdmin
          ? currentUser.division_id
          : (form.division_id || undefined),
      });
      setSuccess("User account created successfully.");
      setShowCreate(false);
      setForm(INITIAL_FORM);
      load();
    } catch (err) {
      setFormError(err.response?.data?.error || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  // ── Deactivate / Reactivate ─────────────────────────────────────────
  const handleToggleActive = async (u) => {
    try {
      setError("");
      if (u.is_active) {
        await deactivateUser(u.id);
        setSuccess(`${u.full_name} has been deactivated.`);
      } else {
        await reactivateUser(u.id);
        setSuccess(`${u.full_name} has been reactivated.`);
      }
      setConfirmDeactivate(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Action failed");
    }
  };

  // ── Admin Password Reset ───────────────────────────────────────────
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetTarget) return;
    try {
      setResetLoading(true);
      setError("");
      await resetUserPasswordApi(resetTarget.id, {
        new_password: resetTempPass,
        must_change_password: resetMustChange,
      });
      setResetResult({
        username: resetTarget.username,
        full_name: resetTarget.full_name,
        tempPassword: resetTempPass,
        mustChange: resetMustChange,
      });
      setResetTarget(null);
      setSuccess(`Password for ${resetTarget.full_name} has been reset.`);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset password");
    } finally {
      setResetLoading(false);
    }
  };

  const getDivisionName = (divId) =>
    divisions.find((d) => d.id === divId)?.name || (divId ? `Div #${divId}` : "All Divisions");

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col md:flex-row">
      <SideNavBar />
      <div className="flex-1 flex flex-col min-h-screen md:ml-64 bg-surface">
        <MobileHeader title="User Management" />

        {/* Desktop Header */}
        <header className="hidden md:flex justify-between items-center w-full px-margin-desktop h-16 bg-surface border-b border-outline-variant sticky top-0 z-[900]">
          <div className="font-headline-sm text-headline-sm font-bold text-primary">
            {isDivAdmin ? "Division Supervisors" : "System Users"}
          </div>
          <button
            onClick={() => { setShowCreate(true); setFormError(""); setForm(INITIAL_FORM); }}
            className="bg-primary text-white font-label-md text-label-md py-2 px-4 rounded-lg flex items-center gap-1.5 hover:bg-[#0E4526] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            {isDivAdmin ? "Add Supervisor" : "New User"}
          </button>
        </header>

        <main className="p-margin-mobile md:p-margin-desktop flex-1 max-w-container-max w-full mx-auto space-y-6">

          {/* Page title */}
          <div className="border-b border-outline-variant pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-display-lg text-display-lg text-on-surface font-bold">
                {isDivAdmin ? "Manage Supervisors" : "User Accounts"}
              </h1>
              <p className="font-body-lg text-on-surface-variant mt-1">
                {isDivAdmin
                  ? "Create and manage supervisors for your division"
                  : "Administrator, division admins, and supervisor accounts"}
              </p>
            </div>
            <button
              onClick={() => { setShowCreate(true); setFormError(""); setForm(INITIAL_FORM); }}
              className="md:hidden bg-primary text-white font-label-md text-label-md py-2.5 px-4 rounded-lg flex items-center gap-2 w-fit"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              {isDivAdmin ? "Add Supervisor" : "New User"}
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <div className="p-4 bg-error/10 border border-error/30 text-error rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined">error</span><p>{error}</p>
            </div>
          )}
          {success && (
            <div className="p-4 bg-primary/10 border border-primary/25 text-primary rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined">check_circle</span><p>{success}</p>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative w-full sm:w-72">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
              <input
                className="w-full pl-9 pr-4 py-2 bg-white border border-outline-variant rounded font-body-md text-on-surface focus:border-primary outline-none"
                placeholder="Search by name or username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {isAdmin && (
              <select
                className="bg-white border border-outline-variant rounded px-3 py-2 text-on-surface font-body-md"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="administrator">Administrator</option>
                <option value="division_admin">Division Admin</option>
                <option value="supervisor">Supervisor</option>
              </select>
            )}
          </div>

          {/* Users Table */}
          <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F7F9F8] border-b border-outline-variant">
                    <th className="py-3 px-6 font-label-md text-on-surface-variant uppercase tracking-wider">Name</th>
                    <th className="py-3 px-6 font-label-md text-on-surface-variant uppercase tracking-wider">Username</th>
                    <th className="py-3 px-6 font-label-md text-on-surface-variant uppercase tracking-wider">Role</th>
                    {isAdmin && <th className="py-3 px-6 font-label-md text-on-surface-variant uppercase tracking-wider">Division</th>}
                    <th className="py-3 px-6 font-label-md text-on-surface-variant uppercase tracking-wider">Status</th>
                    <th className="py-3 px-6 font-label-md text-on-surface-variant uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40 text-on-surface">
                  {loading ? (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5} className="py-12 text-center text-on-surface-variant">
                        <div className="flex justify-center items-center gap-2">
                          <div className="w-6 h-6 border-2 border-outline border-t-primary rounded-full animate-spin" />
                          <span>Loading users...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5} className="py-12 text-center text-on-surface-variant">
                        <span className="material-symbols-outlined text-4xl text-outline block mb-2">person_search</span>
                        <p>No users found matching your criteria.</p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((u) => {
                      const badge = ROLE_BADGE[u.role] || ROLE_BADGE.supervisor;
                      const isSelf = u.id === currentUser?.id;
                      return (
                        <tr key={u.id} className={`hover:bg-surface-container-low transition-colors ${!u.is_active ? "opacity-50" : ""}`}>
                          <td className="py-3 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-primary text-[16px]">{badge.icon}</span>
                              </div>
                              <div>
                                <p className="font-semibold text-sm text-on-surface">{u.full_name}</p>
                                {u.email && <p className="text-xs text-on-surface-variant">{u.email}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-6 font-data-mono text-sm text-on-surface-variant">{u.username}</td>
                          <td className="py-3 px-6">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${badge.bg} ${badge.text}`}>
                              <span className="material-symbols-outlined text-[13px]">{badge.icon}</span>
                              {badge.label}
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="py-3 px-6 text-sm text-on-surface-variant">
                              {getDivisionName(u.division_id)}
                            </td>
                          )}
                          <td className="py-3 px-6">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.is_active ? "bg-[#e8f5e9] text-[#1b5e20]" : "bg-error/10 text-error"}`}>
                              {u.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="py-3 px-6">
                            <div className="flex items-center gap-2">
                              {!isSelf && (
                                <button
                                  onClick={() => {
                                    setResetTarget(u);
                                    setResetTempPass("Abupass@2026");
                                    setResetMustChange(true);
                                  }}
                                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-amber-500/40 text-amber-800 bg-amber-50 hover:bg-amber-100 transition-colors flex items-center gap-1"
                                  title="Reset password for this user"
                                >
                                  <span className="material-symbols-outlined text-[14px]">lock_reset</span>
                                  Reset
                                </button>
                              )}
                              {!isSelf && u.role !== "administrator" && (
                                <button
                                  onClick={() => setConfirmDeactivate(u)}
                                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${
                                    u.is_active
                                      ? "border-error/40 text-error hover:bg-error/5"
                                      : "border-primary/40 text-primary hover:bg-primary/5"
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[14px]">
                                    {u.is_active ? "person_off" : "person_check"}
                                  </span>
                                  {u.is_active ? "Deactivate" : "Reactivate"}
                                </button>
                              )}
                              {isSelf && (
                                <span className="text-xs text-outline italic">Current User</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {!loading && filtered.length > 0 && (
              <div className="bg-[#F7F9F8] border-t border-outline-variant px-6 py-2.5 text-on-surface-variant font-label-md text-xs">
                {filtered.length} user{filtered.length !== 1 ? "s" : ""} shown
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Create User Modal ─────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  {isDivAdmin ? "Add Supervisor" : "Create User Account"}
                </h2>
                <p className="text-on-surface-variant text-sm mt-0.5">
                  {isDivAdmin
                    ? "New supervisor will be added to your division"
                    : "Fill in the details for the new system user"}
                </p>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-outline hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-error/10 border border-error/30 text-error text-sm rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>{formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-label-md text-label-md text-on-surface font-semibold">Full Name *</label>
                  <input
                    className="w-full p-2 border border-outline-variant rounded font-body-md bg-white text-on-surface focus:border-primary outline-none"
                    placeholder="e.g. Musa Ibrahim"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface font-semibold">Username *</label>
                  <input
                    className="w-full p-2 border border-outline-variant rounded font-body-md bg-white text-on-surface focus:border-primary outline-none"
                    placeholder="e.g. musa.ibrahim"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface font-semibold">Email (optional)</label>
                  <input
                    type="email"
                    className="w-full p-2 border border-outline-variant rounded font-body-md bg-white text-on-surface focus:border-primary outline-none"
                    placeholder="name@abu.edu.ng"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface font-semibold">Password *</label>
                  <input
                    type="password"
                    className="w-full p-2 border border-outline-variant rounded font-body-md bg-white text-on-surface focus:border-primary outline-none"
                    placeholder="Minimum 6 characters"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />
                </div>

                {/* Role + Division — admin only */}
                {isAdmin && (
                  <>
                    <div className="space-y-1">
                      <label className="font-label-md text-label-md text-on-surface font-semibold">Role *</label>
                      <select
                        className="w-full p-2 border border-outline-variant rounded font-body-md bg-white text-on-surface"
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                      >
                        <option value="supervisor">Supervisor</option>
                        <option value="division_admin">Division Admin</option>
                        <option value="administrator">Administrator</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-label-md text-label-md text-on-surface font-semibold">Division</label>
                      <select
                        className="w-full p-2 border border-outline-variant rounded font-body-md bg-white text-on-surface"
                        value={form.division_id}
                        onChange={(e) => setForm({ ...form, division_id: e.target.value })}
                      >
                        <option value="">— None (General Admin) —</option>
                        {divisions.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 border border-outline-variant text-on-surface rounded-lg font-label-md hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-primary text-white rounded-lg font-label-md hover:bg-[#0E4526] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Deactivate/Reactivate Modal ──────────────────────── */}
      {confirmDeactivate && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <div className="flex flex-col items-center text-center gap-3">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${confirmDeactivate.is_active ? "bg-error/10" : "bg-primary/10"}`}>
                <span className={`material-symbols-outlined text-3xl ${confirmDeactivate.is_active ? "text-error" : "text-primary"}`}>
                  {confirmDeactivate.is_active ? "person_off" : "person_check"}
                </span>
              </div>
              <div>
                <h3 className="font-headline-sm text-on-surface font-bold">
                  {confirmDeactivate.is_active ? "Deactivate Account?" : "Reactivate Account?"}
                </h3>
                <p className="text-on-surface-variant text-sm mt-1">
                  {confirmDeactivate.is_active
                    ? `${confirmDeactivate.full_name} will no longer be able to log in.`
                    : `${confirmDeactivate.full_name} will regain access to the system.`}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeactivate(null)}
                className="flex-1 px-4 py-2 border border-outline-variant text-on-surface rounded-lg font-label-md hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleToggleActive(confirmDeactivate)}
                className={`flex-1 px-4 py-2 text-white rounded-lg font-label-md transition-colors ${confirmDeactivate.is_active ? "bg-error hover:bg-error/80" : "bg-primary hover:bg-[#0E4526]"}`}
              >
                {confirmDeactivate.is_active ? "Yes, Deactivate" : "Yes, Reactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Admin Reset Password Modal ─────────────────────────────── */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">lock_reset</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-on-surface font-bold">
                    Reset User Password
                  </h3>
                  <p className="text-on-surface-variant text-xs mt-0.5">
                    For <span className="font-semibold text-on-surface">{resetTarget.full_name}</span> (@{resetTarget.username})
                  </p>
                </div>
              </div>
              <button onClick={() => setResetTarget(null)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Temporary Password <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={resetTempPass}
                    onChange={(e) => setResetTempPass(e.target.value)}
                    required
                    className="flex-1 px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg font-data-mono text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setResetTempPass(`Abu${Math.floor(1000 + Math.random() * 9000)}@2026`)}
                    className="px-3 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-lg text-xs font-medium transition-colors"
                    title="Generate new temporary password"
                  >
                    Random
                  </button>
                </div>
                <p className="text-[11px] text-on-surface-variant mt-1">
                  Share this temporary password securely with the user.
                </p>
              </div>

              <div className="flex items-center gap-2 p-3 bg-surface-container-low rounded-xl border border-outline-variant/60">
                <input
                  type="checkbox"
                  id="mustChangeOnLogin"
                  checked={resetMustChange}
                  onChange={(e) => setResetMustChange(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-outline"
                />
                <label htmlFor="mustChangeOnLogin" className="text-xs text-on-surface cursor-pointer select-none">
                  Require user to change password on next login
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="px-4 py-2 border border-outline-variant text-on-surface rounded-lg text-xs font-medium hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {resetLoading && <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  <span>Reset & Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reset Success / Copy Password Modal ───────────────────────── */}
      {resetResult && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-2xl">check_circle</span>
            </div>

            <div>
              <h3 className="font-headline-sm text-on-surface font-bold">
                Password Reset Successfully!
              </h3>
              <p className="text-on-surface-variant text-xs mt-1">
                New temporary credentials for <span className="font-semibold">{resetResult.full_name}</span>:
              </p>
            </div>

            <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant text-left space-y-1 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Username:</span>
                <span className="font-semibold text-on-surface">{resetResult.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Temp Password:</span>
                <span className="font-bold text-primary">{resetResult.tempPassword}</span>
              </div>
              {resetResult.mustChange && (
                <p className="text-[10px] text-amber-700 font-sans mt-1">
                  * User will be forced to change this password on next login.
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`Username: ${resetResult.username}\nTemporary Password: ${resetResult.tempPassword}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex-1 px-4 py-2 border border-primary text-primary hover:bg-primary/5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copied ? "done" : "content_copy"}
                </span>
                <span>{copied ? "Copied!" : "Copy Details"}</span>
              </button>
              <button
                onClick={() => { setResetResult(null); setCopied(false); }}
                className="px-5 py-2 bg-primary text-white hover:bg-[#0E4526] rounded-xl text-xs font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
