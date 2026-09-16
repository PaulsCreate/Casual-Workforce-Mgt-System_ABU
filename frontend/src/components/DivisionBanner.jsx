import React from "react";
import { useAuth } from "../context/AuthContext";

/**
 * Division Context Banner (Institutional Tenant Header)
 * Displays the active operating division and unit context for the logged-in session.
 */
const DivisionBanner = ({ subtitle, className = "" }) => {
  const { user } = useAuth();

  const isGeneralAdmin = user?.role === "administrator";
  const isDivisionAdmin = user?.role === "division_admin";
  const isSupervisor = user?.role === "supervisor";

  // Determine division details
  const getDivisionConfig = () => {
    const divName = (user?.division_name || "").toLowerCase();

    if (
      divName.includes("student affairs") ||
      divName.includes("hall") ||
      Number(user?.division_id) === 2
    ) {
      return {
        title: "Student Affairs Division",
        unitTitle: "Hall Administration Unit (Hostels)",
        description: subtitle || "Hostel Regions",
        icon: "apartment",
        accentClass: "border-l-amber-600",
      };
    }

    if (
      divName.includes("health") ||
      divName.includes("sanitation") ||
      Number(user?.division_id) === 1
    ) {
      return {
        title: "University Health Services",
        unitTitle: "Environmental Sanitation Unit",
        description:
          subtitle ||
          "Workforce across Faculties, Centers & Administrative Units",
        icon: "health_and_safety",
        accentClass: "border-l-teal-700",
      };
    }

    if (isGeneralAdmin) {
      return {
        title: "University-Wide Administration",
        unitTitle: "General Directorate",
        description:
          subtitle ||
          "Consolidated oversight across Student Affairs (Hostels) & University Health Services (Faculties)",
        icon: "verified_user",
        accentClass: "border-l-primary",
      };
    }

    // Default Fallback
    return {
      title: user?.division_name || "Operational Division",
      unitTitle: "Sanitation Workforce Unit",
      description:
        subtitle ||
        "Casual Workforce Attendance and Operational Task Management",
      icon: "domain",
      accentClass: "border-l-primary",
    };
  };

  const config = getDivisionConfig();

  return (
    <div
      className={`rounded-xl border border-outline-variant border-l-4 ${config.accentClass} bg-surface p-5 md:p-6 shadow-sm ${className}`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary/8 text-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[23px]">
              {config.icon}
            </span>
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {config.title}
            </p>
            <h2 className="text-lg md:text-xl font-semibold text-on-surface leading-snug mt-0.5">
              {config.unitTitle}
            </h2>
            <p className="text-sm text-on-surface-variant mt-1 max-w-2xl leading-relaxed">
              {config.description}
            </p>
          </div>
        </div>

        <div className="md:text-right md:border-l md:border-outline-variant md:pl-5">
          <p className="text-[11px] text-on-surface-variant uppercase tracking-wide">
            Signed in as
          </p>
          <p className="text-sm font-semibold text-on-surface truncate max-w-[220px]">
            {user?.full_name || user?.username}
          </p>
          <p className="text-xs text-primary mt-0.5">
            {isGeneralAdmin
              ? "General Administrator"
              : isDivisionAdmin
                ? "Division Administrator"
                : isSupervisor
                  ? "Supervisor"
                  : "Authenticated user"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DivisionBanner;
