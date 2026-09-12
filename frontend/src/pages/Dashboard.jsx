import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getDashboardStats } from "../api/reportsApi";
import { useAuth } from "../context/AuthContext";
import SideNavBar from "../components/SideNavBar";
import MobileHeader from "../components/MobileHeader";
import DivisionBanner from "../components/DivisionBanner";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    active_workers: 0,
    total_divisions: 0,
    total_units: 0,
    total_locations: 0,
    pending_transfers: 0,
    attendance_today: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const todayStr = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col md:flex-row">
      <SideNavBar />
      <div className="flex-1 flex flex-col min-h-screen md:ml-64">
        <MobileHeader title="Dashboard" />

        {/* Desktop Header */}
        <header className="hidden md:flex justify-between items-center w-full px-margin-desktop h-20 bg-surface border-b border-outline-variant sticky top-0 z-[900]">
          <div>
            <h1 className="font-headline-md text-headline-md text-primary font-bold">
              {user?.role === "division_admin" ? "Division Dashboard" : "Administrator Dashboard"}
            </h1>
            <p className="font-body-md text-on-surface-variant">
              Casual Sanitation Workforce Attendance and Task Management
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-surface-container-high rounded-full px-4 py-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                calendar_today
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant font-semibold">
                {todayStr}
              </span>
            </div>
          </div>
        </header>

        {/* Canvas Body */}
        <main className="p-margin-mobile md:p-margin-desktop flex-1 max-w-container-max w-full mx-auto space-y-6">
          {/* Institutional Division Context Banner */}
          <DivisionBanner />

          {error && (
            <div className="p-4 bg-error-container/20 border border-error/30 text-error rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined">error</span>
              <p className="font-body-md">{error}</p>
            </div>
          )}

          {/* Quick Stats Bento Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Workers Stat */}
            <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="font-label-md text-on-surface-variant font-medium">
                  Active Workforce
                </span>
                <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-lg">
                  groups
                </span>
              </div>
              <div className="mt-4">
                <h3 className="font-display-lg text-display-lg text-primary font-bold">
                  {loading ? "..." : stats.active_workers}
                </h3>
                <p className="font-label-md text-on-surface-variant text-[11px] mt-1">
                  Active Casual Employees
                </p>
              </div>
            </div>

            {/* Attendance Stat */}
            <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="font-label-md text-on-surface-variant font-medium">
                  Attendance Today
                </span>
                <span className="material-symbols-outlined text-secondary bg-secondary/10 p-2 rounded-lg">
                  assignment_turned_in
                </span>
              </div>
              <div className="mt-4">
                <h3 className="font-display-lg text-display-lg text-secondary font-bold">
                  {loading ? "..." : stats.attendance_today}
                </h3>
                <p className="font-label-md text-on-surface-variant text-[11px] mt-1">
                  Workers marked present today
                </p>
              </div>
            </div>

            {/* Pending Approvals */}
            <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="font-label-md text-on-surface-variant font-medium">
                  Pending Transfers
                </span>
                <span className="material-symbols-outlined text-error bg-error/10 p-2 rounded-lg">
                  transfer_within_a_station
                </span>
              </div>
              <div className="mt-4">
                <h3 className="font-display-lg text-display-lg text-error font-bold">
                  {loading ? "..." : stats.pending_transfers}
                </h3>
                <p className="font-label-md text-on-surface-variant text-[11px] mt-1">
                  Awaiting unit approvals
                </p>
              </div>
            </div>

            {/* Locations Stat */}
            <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="font-label-md text-on-surface-variant font-medium">
                  Deployed Locations
                </span>
                <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-lg">
                  location_on
                </span>
              </div>
              <div className="mt-4">
                <h3 className="font-display-lg text-display-lg text-primary font-bold">
                  {loading ? "..." : stats.total_locations}
                </h3>
                <p className="font-label-md text-on-surface-variant text-[11px] mt-1">
                  Active zones in {stats.total_divisions} Divisions
                </p>
              </div>
            </div>
          </section>

          {/* Quick Actions & Bento Blocks */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions Panel */}
            <div className="lg:col-span-2 bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
              <h2 className="font-title-lg text-title-lg text-on-surface mb-6 font-bold">
                Quick Administrative Actions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => navigate("/workers")}
                  className="p-4 border border-outline-variant hover:border-primary rounded-lg flex items-center gap-4 transition-all text-left bg-surface-container-lowest hover:bg-surface-container-low"
                >
                  <span className="material-symbols-outlined text-primary text-3xl bg-primary/10 p-3 rounded-lg">
                    person_add
                  </span>
                  <div>
                    <h4 className="font-title-lg text-on-surface font-semibold text-sm">
                      Workforce Directory
                    </h4>
                    <p className="font-label-md text-on-surface-variant text-[11px] mt-0.5">
                      Register new casual workers or search files.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/hierarchy")}
                  className="p-4 border border-outline-variant hover:border-primary rounded-lg flex items-center gap-4 transition-all text-left bg-surface-container-lowest hover:bg-surface-container-low"
                >
                  <span className="material-symbols-outlined text-secondary text-3xl bg-secondary/10 p-3 rounded-lg">
                    domain
                  </span>
                  <div>
                    <h4 className="font-title-lg text-on-surface font-semibold text-sm">
                      Institutional Structure
                    </h4>
                    <p className="font-label-md text-on-surface-variant text-[11px] mt-0.5">
                      Manage divisions, units, locations & supervisors.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/approvals")}
                  className="p-4 border border-outline-variant hover:border-primary rounded-lg flex items-center gap-4 transition-all text-left bg-surface-container-lowest hover:bg-surface-container-low"
                >
                  <span className="material-symbols-outlined text-error text-3xl bg-error/10 p-3 rounded-lg">
                    approval
                  </span>
                  <div>
                    <h4 className="font-title-lg text-on-surface font-semibold text-sm">
                      Transfer Approvals
                    </h4>
                    <p className="font-label-md text-on-surface-variant text-[11px] mt-0.5">
                      Review and authorize inter-unit worker movements.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/reports")}
                  className="p-4 border border-outline-variant hover:border-primary rounded-lg flex items-center gap-4 transition-all text-left bg-surface-container-lowest hover:bg-surface-container-low"
                >
                  <span className="material-symbols-outlined text-on-tertiary-fixed bg-tertiary-fixed p-3 rounded-lg text-3xl">
                    assessment
                  </span>
                  <div>
                    <h4 className="font-title-lg text-on-surface font-semibold text-sm">
                      Monthly Registers
                    </h4>
                    <p className="font-label-md text-on-surface-variant text-[11px] mt-0.5">
                      Generate, submit and verify monthly attendance registers.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Activity Block */}
            <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
              <h2 className="font-title-lg text-title-lg text-on-surface mb-6 font-bold">
                Operational Framework
              </h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">
                    verified_user
                  </span>
                  <div>
                    <h4 className="font-body-md font-semibold text-on-surface">
                      Verified Records Only
                    </h4>
                    <p className="font-label-md text-on-surface-variant text-[12px] mt-0.5 leading-relaxed">
                      All monthly report metrics require institutional sign-off and administrative verification.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">
                    history
                  </span>
                  <div>
                    <h4 className="font-body-md font-semibold text-on-surface">
                      Immutable Audit logs
                    </h4>
                    <p className="font-label-md text-on-surface-variant text-[12px] mt-0.5 leading-relaxed">
                      Every worker transfer, worker creation, and attendance approval generates an audit record.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-outline-variant mt-6 text-center">
                  <Link
                    to="/audit-logs"
                    className="text-primary font-label-md text-label-md hover:underline font-semibold flex items-center justify-center gap-1"
                  >
                    View System Audit Logs
                    <span className="material-symbols-outlined text-sm">
                      arrow_forward
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
