import React, { useState, useEffect } from "react";
import { getAuditLogs } from "../api/usersApi";
import SideNavBar from "../components/SideNavBar";
import MobileHeader from "../components/MobileHeader";

const ACTION_META = {
  mark_attendance: { icon: "assignment_turned_in", label: "Mark Attendance", color: "text-secondary" },
  verify_report:   { icon: "verified",              label: "Verify Report",    color: "text-primary"   },
  create_worker:   { icon: "person_add",            label: "Register Worker",  color: "text-primary"   },
  update_worker:   { icon: "edit",                  label: "Update Worker",    color: "text-on-surface-variant" },
  create_transfer: { icon: "transfer_within_a_station", label: "Request Transfer", color: "text-error" },
  approve_transfer:{ icon: "done_all",              label: "Approve Transfer", color: "text-primary"   },
  reject_transfer: { icon: "cancel",                label: "Reject Transfer",  color: "text-error"     },
};

const AuditLogs = () => {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [search, setSearch]   = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load audit log entries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const formatDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const filtered = logs.filter((l) => {
    const matchSearch =
      !search ||
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      String(l.user_id).includes(search) ||
      String(l.entity_id).includes(search) ||
      l.entity_type?.toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === "all" || l.action === actionFilter;
    return matchSearch && matchAction;
  });

  const uniqueActions = [...new Set(logs.map((l) => l.action).filter(Boolean))];

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col md:flex-row">
      <SideNavBar />
      <div className="flex-1 flex flex-col min-h-screen md:ml-64 bg-surface">
        <MobileHeader title="Audit Logs" />

        {/* Desktop Header */}
        <header className="hidden md:flex justify-between items-center w-full px-margin-desktop h-16 bg-surface border-b border-outline-variant sticky top-0 z-[900]">
          <div className="font-headline-sm text-headline-sm font-bold text-primary">
            System Audit Trail
          </div>
          <div className="text-on-surface-variant font-label-md text-label-md">
            Last 100 Events
          </div>
        </header>

        {/* Page Content */}
        <main className="p-margin-mobile md:p-margin-desktop flex-1 max-w-container-max w-full mx-auto space-y-6">

          {/* Title Row */}
          <div className="border-b border-outline-variant pb-4">
            <h2 className="font-display-lg text-display-lg text-on-surface mb-2 font-bold">
              Immutable Activity Log
            </h2>
            <p className="font-body-lg text-on-surface-variant">
              Every significant system action — attendance marks, transfers, verifications — is permanently recorded here.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-error-container/20 border border-error/30 text-error rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined">error</span>
              <p>{error}</p>
            </div>
          )}

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                search
              </span>
              <input
                className="w-full pl-10 pr-4 py-2 bg-white border border-outline-variant rounded font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                placeholder="Search by action, user, entity..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 text-on-surface-variant font-label-md text-label-md">
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              <select
                className="bg-white border border-outline-variant rounded px-3 py-1.5 text-on-surface"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <option value="all">All Actions</option>
                {uniqueActions.map((a) => (
                  <option key={a} value={a}>
                    {ACTION_META[a]?.label || a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Log Table */}
          <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F7F9F8] border-b border-outline-variant">
                    <th className="py-3 px-6 font-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                      Timestamp
                    </th>
                    <th className="py-3 px-6 font-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                      Action
                    </th>
                    <th className="py-3 px-6 font-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                      Performed By
                    </th>
                    <th className="py-3 px-6 font-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                      Entity
                    </th>
                    <th className="py-3 px-6 font-label-md text-on-surface-variant uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40 font-body-md text-on-surface">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-on-surface-variant">
                        <div className="flex justify-center items-center gap-2">
                          <div className="w-6 h-6 border-2 border-outline border-t-primary rounded-full animate-spin"></div>
                          <span>Loading audit trail...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-on-surface-variant">
                        <span className="material-symbols-outlined text-4xl text-outline mb-2 block">
                          history_toggle_off
                        </span>
                        <p>No audit events found matching your criteria.</p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((log) => {
                      const meta = ACTION_META[log.action] || {
                        icon: "info",
                        label: log.action,
                        color: "text-on-surface-variant",
                      };
                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-surface-container-low transition-colors"
                        >
                          {/* Timestamp */}
                          <td className="py-3 px-6 whitespace-nowrap">
                            <span className="font-data-mono text-data-mono text-[12px] text-on-surface-variant">
                              {formatDate(log.created_at)}
                            </span>
                          </td>

                          {/* Action */}
                          <td className="py-3 px-6 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 font-semibold text-[13px] ${meta.color}`}>
                              <span className="material-symbols-outlined text-[16px]">
                                {meta.icon}
                              </span>
                              {meta.label}
                            </span>
                          </td>

                          {/* User */}
                          <td className="py-3 px-6 whitespace-nowrap">
                            <span className="font-data-mono text-data-mono text-[12px] bg-surface-container px-2 py-0.5 rounded border border-outline-variant/60 text-on-surface-variant">
                              User #{log.user_id}
                            </span>
                          </td>

                          {/* Entity */}
                          <td className="py-3 px-6 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-label-md text-[11px] uppercase tracking-wider text-on-surface-variant">
                                {log.entity_type}
                              </span>
                              <span className="font-data-mono text-data-mono text-[12px] text-on-surface">
                                #{log.entity_id}
                              </span>
                            </div>
                          </td>

                          {/* Details */}
                          <td className="py-3 px-6 max-w-xs">
                            {log.details ? (
                              <pre className="bg-surface-container-low rounded-lg p-2 font-mono text-xs text-on-surface-variant whitespace-pre-wrap break-all leading-relaxed">
                                {JSON.stringify(log.details, null, 0)
                                  .replace(/[{}]/g, "")
                                  .replace(/"/g, "")
                                  .replace(/,/g, ", ")}
                              </pre>
                            ) : (
                              <span className="text-outline text-xs italic">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            {!loading && filtered.length > 0 && (
              <div className="bg-[#F7F9F8] border-t border-outline-variant px-6 py-3 flex justify-between items-center text-on-surface-variant font-label-md text-label-md">
                <span>Showing {filtered.length} of {logs.length} events</span>
                <button
                  onClick={load}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                  Refresh
                </button>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
};

export default AuditLogs;
