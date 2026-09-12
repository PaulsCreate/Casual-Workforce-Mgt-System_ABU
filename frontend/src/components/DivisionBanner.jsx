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
        colorClass: "from-[#004120] to-[#0A5A30]",
        accentBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        badge: "Hostels & Halls of Residence",
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
        colorClass: "from-[#0B3B2B] to-[#125841]",
        accentBg: "bg-teal-500/20 text-teal-300 border-teal-500/30",
        badge: "Academic & Central Facilities",
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
        colorClass: "from-[#003419] to-[#084A26]",
        // accentBg: "bg-amber-400/20 text-amber-200 border-amber-400/30",
        // badge: "Global University-Wide Master Scope",
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
      colorClass: "from-[#004120] to-[#0D542E]",
      accentBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      badge: "Operating Division",
    };
  };

  const config = getDivisionConfig();

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${config.colorClass} text-white shadow-md border border-white/10 p-5 md:p-6 ${className}`}
    >
      {/* Subtle Background Watermark Crest Pattern */}
      <div className="absolute right-0 top-0 bottom-0 opacity-5 flex items-center pr-6 pointer-events-none select-none">
        <span className="material-symbols-outlined text-[140px] leading-none">
          {config.icon}
        </span>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Division Identity & Unit */}
        <div className="flex items-start md:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner flex-shrink-0">
            <span className="material-symbols-outlined text-[28px]">
              {config.icon}
            </span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-200/90 font-mono">
                {config.title}
              </span>
              <span className="text-white/40">·</span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${config.accentBg}`}
              >
                {config.badge}
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white leading-snug">
              {config.unitTitle}
            </h2>

            <p className="text-xs md:text-sm text-emerald-100/80 mt-1 max-w-2xl leading-relaxed">
              {config.description}
            </p>
          </div>
        </div>

        {/* Right: Operational Session Metadata */}
        <div className="flex md:flex-col items-center md:items-end justify-between gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-white/10">
          <div className="text-left md:text-right">
            <p className="text-[10px] text-emerald-200/70 font-medium uppercase tracking-wider">
              Active User Session
            </p>
            <p className="text-sm font-semibold text-white truncate">
              {user?.full_name || user?.username}
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/20 border border-white/15 text-[11px] font-medium text-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {isGeneralAdmin
                ? "Full Admin Authority"
                : isDivisionAdmin
                  ? "Division Head Authority"
                  : isSupervisor
                    ? "Station Supervisor"
                    : "Authenticated"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DivisionBanner;
