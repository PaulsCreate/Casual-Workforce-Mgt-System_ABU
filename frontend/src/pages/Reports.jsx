import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getLocations } from "../api/hierarchyApi";
import { getLocationsForSupervisor } from "../api/attendanceApi";
import {
  generateReport,
  generateBatchReport,
  getDivisionAggregateReport,
  submitReport as submitReportApi,
  submitBatchReports as submitBatchReportsApi,
  verifyReport as verifyReportApi,
  verifyBatchReports as verifyBatchReportsApi,
} from "../api/reportsApi";
import { exportToCSV } from "../utils/exportUtils";
import SideNavBar from "../components/SideNavBar";
import MobileHeader from "../components/MobileHeader";
import abuLogo from "../assets/Logo.png";

const MONTHS = [
  { value: "1",  name: "January"   },
  { value: "2",  name: "February"  },
  { value: "3",  name: "March"     },
  { value: "4",  name: "April"     },
  { value: "5",  name: "May"       },
  { value: "6",  name: "June"      },
  { value: "7",  name: "July"      },
  { value: "8",  name: "August"    },
  { value: "9",  name: "September" },
  { value: "10", name: "October"   },
  { value: "11", name: "November"  },
  { value: "12", name: "December"  },
];

const Reports = () => {
  const { user } = useAuth();
  const isAdminTier = user?.role === "administrator" || user?.role === "division_admin";
  const isSupervisor = user?.role === "supervisor";

  const [locations, setLocations] = useState([]);
  
  // Reporting scope: "hostel" | "single_block" | "division_master"
  const [reportScope, setReportScope] = useState("hostel");
  const [selectedHostel, setSelectedHostel] = useState("all");
  const [selectedLocationId, setSelectedLocationId] = useState("");

  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(currentYear));

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));
  const daysInMonth = new Date(Number(selectedYear), Number(selectedMonth), 0).getDate();
  const monthName = MONTHS.find((m) => m.value === selectedMonth)?.name || "";

  // ── Load Locations ──────────────────────────────────────────────────
  const loadLocations = async () => {
    try {
      setError("");
      const locData =
        user.role === "supervisor"
          ? await getLocationsForSupervisor(user.id)
          : await getLocations();
      setLocations(locData);

      if (locData.length > 0) {
        setSelectedLocationId(String(locData[0].id));
        // Default hostel to first hostel if available
        const firstHostel = locData[0].name.includes(" — ")
          ? locData[0].name.split(" — ")[0].trim()
          : "all";
        setSelectedHostel(firstHostel);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load operational locations");
    }
  };

  useEffect(() => {
    if (user) loadLocations();
  }, [user]);

  // Extract unique hostels from assigned locations
  const uniqueHostels = Array.from(
    new Set(
      locations.map((loc) =>
        loc.name.includes(" — ") ? loc.name.split(" — ")[0].trim() : loc.name
      )
    )
  );

  // Available blocks for the selected hostel
  const availableBlocksForHostel = locations.filter((loc) => {
    if (selectedHostel === "all") return true;
    const h = loc.name.includes(" — ") ? loc.name.split(" — ")[0].trim() : loc.name;
    return h === selectedHostel;
  });

  // Calculate target location IDs for current selection
  const getTargetLocationIds = () => {
    if (reportScope === "single_block") {
      return selectedLocationId ? [Number(selectedLocationId)] : [];
    }
    if (reportScope === "hostel") {
      return availableBlocksForHostel.map((l) => Number(l.id));
    }
    return locations.map((l) => Number(l.id));
  };

  // ── Load Report Data ────────────────────────────────────────────────
  const loadReport = async () => {
    if (!selectedMonth || !selectedYear) return;

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      if (reportScope === "division_master") {
        const divId = user?.role === "division_admin" ? user.division_id : null;
        const data = await getDivisionAggregateReport(divId, Number(selectedMonth), Number(selectedYear));
        setReportData({
          scope: "division_master",
          status: "verified", // Master reports aggregate verified/submitted statuses
          workers: data.workers || [],
          total_workers: data.total_workers || 0,
        });
      } else if (reportScope === "hostel") {
        const targetIds = getTargetLocationIds();
        if (targetIds.length === 0) {
          setReportData(null);
          return;
        }
        const data = await generateBatchReport(targetIds, Number(selectedMonth), Number(selectedYear));
        setReportData({
          scope: "hostel",
          status: data.status,
          statuses: data.statuses || [],
          location_ids: targetIds,
          workers: data.workers || [],
        });
      } else {
        // Single block
        if (!selectedLocationId) return;
        const data = await generateReport(selectedLocationId, Number(selectedMonth), Number(selectedYear));
        setReportData({
          scope: "single_block",
          status: data.status,
          report_id: data.report_id,
          operational_location_id: data.operational_location_id,
          workers: data.workers || [],
        });
      }
    } catch (err) {
      console.error(err);
      setError("Failed to generate monthly attendance register");
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportScope, selectedHostel, selectedLocationId, selectedMonth, selectedYear, locations]);

  // ── Submit Report (Supervisor) ──────────────────────────────────────
  const handleSubmitReport = async () => {
    setSubmitting(true);
    try {
      setError("");
      if (reportScope === "hostel") {
        const targetIds = getTargetLocationIds();
        const res = await submitBatchReportsApi({
          operational_location_ids: targetIds,
          period_month: Number(selectedMonth),
          period_year: Number(selectedYear),
        });
        setSuccess(res.message || `Monthly register submitted for ${selectedHostel}!`);
      } else {
        await submitReportApi({
          operational_location_id: Number(selectedLocationId),
          period_month: Number(selectedMonth),
          period_year: Number(selectedYear),
        });
        setSuccess("Monthly register submitted for verification!");
      }
      loadReport();
    } catch (err) {
      setError(err.response?.data?.error || "Error submitting monthly register");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Verify Report (Admin) ───────────────────────────────────────────
  const handleVerifyReport = async () => {
    setSubmitting(true);
    try {
      setError("");
      if (reportScope === "hostel" && reportData?.statuses) {
        const pendingIds = reportData.statuses
          .filter((s) => s.status === "submitted")
          .map((s) => s.id);
        if (pendingIds.length > 0) {
          const res = await verifyBatchReportsApi({ verification_ids: pendingIds });
          setSuccess(res.message || `Verified all blocks in ${selectedHostel}!`);
        } else {
          setSuccess("All blocks in this hostel are already verified.");
        }
      } else if (reportData?.report_id) {
        await verifyReportApi(reportData.report_id);
        setSuccess("Monthly register successfully verified!");
      }
      loadReport();
    } catch (err) {
      setError(err.response?.data?.error || "Error verifying monthly register");
    } finally {
      setSubmitting(false);
    }
  };

  // ── PDF Export ──────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    if (!reportData || !reportData.workers || reportData.workers.length === 0) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    // --- Header logo ---
    try {
      const img = new Image();
      img.src = abuLogo;
      await new Promise((res) => { img.onload = res; });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL("image/png");
      doc.addImage(dataUrl, "PNG", pageW / 2 - 15, 8, 30, 30);
    } catch (_) {}

    // --- Title ---
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 65, 32);
    doc.text("AHMADU BELLO UNIVERSITY, ZARIA", pageW / 2, 44, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text("Casual Sanitation Workforce — Monthly Attendance Register", pageW / 2, 50, { align: "center" });

    // --- Metadata Block ---
    doc.setFontSize(9);
    const scopeName =
      reportScope === "division_master"
        ? "All Division Hostels & Units (Master Register)"
        : reportScope === "hostel"
        ? `${selectedHostel} (Consolidated Register)`
        : locations.find((l) => String(l.id) === String(selectedLocationId))?.name || "—";

    const statusLabel = {
      verified: "VERIFIED ✓",
      submitted: "PENDING VERIFICATION",
      not_submitted: "DRAFT",
    };

    const metaRows = [
      ["Register Scope:", scopeName, "Period:", `${monthName} ${selectedYear}`],
      ["Working Days in Month:", String(daysInMonth), "Report Status:", statusLabel[reportData.status] || "VERIFIED"],
      ["Generated By:", user?.username || "—", "Date Generated:", new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })],
    ];

    let startY = 56;
    doc.setFillColor(242, 244, 238);
    doc.rect(14, startY - 1, pageW - 28, metaRows.length * 7 + 3, "F");
    metaRows.forEach((row, i) => {
      const y = startY + i * 7 + 5;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 65, 32);
      doc.text(row[0], 16, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text(row[1], 55, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 65, 32);
      doc.text(row[2], pageW / 2 + 2, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text(row[3], pageW / 2 + 38, y);
    });

    startY = startY + metaRows.length * 7 + 8;

    // --- Table Rows ---
    const tableBody = reportData.workers.map((item, idx) => [
      String(idx + 1),
      item.staff_id,
      item.full_name,
      item.location_name || item.unit_name || "—",
      String(item.days_worked),
      String(daysInMonth),
      `${Math.round((item.days_worked / daysInMonth) * 100)}%`,
      "Approved",
    ]);

    doc.autoTable({
      startY,
      head: [["S/N", "Staff ID", "Worker Full Name", "Location / Block", "Days Present", "Working Days", "Attend. %", "Payment Status"]],
      body: tableBody,
      styles: { fontSize: 8, cellPadding: 2.5, lineColor: [200, 200, 200], lineWidth: 0.2 },
      headStyles: { fillColor: [0, 65, 32], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { cellWidth: 22, halign: "center" },
        2: { cellWidth: 46 },
        3: { cellWidth: 42 },
        4: { halign: "center", cellWidth: 18 },
        5: { halign: "center", cellWidth: 18 },
        6: { halign: "center", cellWidth: 16 },
        7: { cellWidth: 22, halign: "center" },
      },
      alternateRowStyles: { fillColor: [247, 249, 248] },
      margin: { left: 14, right: 14 },
    });

    // --- Summary & Signature ---
    const finalY = (doc.lastAutoTable?.finalY || startY) + 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 65, 32);
    doc.text(`Total Workers on Register: ${reportData.workers.length}`, 14, finalY);
    const totalDays = reportData.workers.reduce((s, w) => s + w.days_worked, 0);
    doc.text(`Total Aggregate Days Worked: ${totalDays}`, 14, finalY + 6);

    const sigY = finalY + 20;
    doc.setDrawColor(180, 180, 180);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);

    doc.line(14, sigY, 75, sigY);
    doc.text("Prepared By (Supervisor/Admin)", 14, sigY + 5);
    doc.text("Name: _________________________", 14, sigY + 11);
    doc.text("Date:  _________________________", 14, sigY + 17);

    doc.line(pageW - 75, sigY, pageW - 14, sigY);
    doc.text("Verified & Authorised By (Dean/Director)", pageW - 75, sigY + 5);
    doc.text("Name: _________________________", pageW - 75, sigY + 11);
    doc.text("Date:  _________________________", pageW - 75, sigY + 17);

    // --- Footers ---
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `CSWATMS — ABU Zaria Sanitation Management System  |  Page ${i} of ${totalPages}  |  Printed: ${new Date().toLocaleString("en-GB")}`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 6,
        { align: "center" }
      );
    }

    const filename = `ABU_REGISTER_${scopeName.replace(/[^a-zA-Z0-9]/g, "_")}_${monthName}_${selectedYear}.pdf`;
    doc.save(filename);
  };

  // ── Excel / CSV Export ──────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!reportData || !reportData.workers || reportData.workers.length === 0) return;

    const scopeName =
      reportScope === "division_master"
        ? "Division_Master"
        : reportScope === "hostel"
        ? selectedHostel.replace(/\s+/g, "_")
        : (locations.find((l) => String(l.id) === String(selectedLocationId))?.name || "Location").replace(/\s+/g, "_");

    const filename = `ABU_Payroll_Register_${scopeName}_${monthName}_${selectedYear}.csv`;

    const headers = [
      "S/N",
      "Staff ID",
      "Worker Full Name",
      "Operational Unit",
      "Hostel / Location",
      "Days Worked",
      "Working Days in Month",
      "Attendance Percentage",
      "Period",
      "Payment Clearance Status",
    ];

    const rows = reportData.workers.map((w, idx) => [
      idx + 1,
      w.staff_id,
      w.full_name,
      w.unit_name || "Hall Administration Unit",
      w.location_name || "—",
      w.days_worked,
      daysInMonth,
      `${Math.round((w.days_worked / daysInMonth) * 100)}%`,
      `${monthName} ${selectedYear}`,
      reportData.status === "verified" ? "Approved for Payment" : "Pending Verification",
    ]);

    exportToCSV(filename, headers, rows);
  };

  // ── Status Badge ────────────────────────────────────────────────────
  const getStatusBadge = (status) => {
    switch (status) {
      case "verified":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e8f5e9] border border-[#c8e6c9] text-[#1b5e20] font-bold text-xs">
            <span className="material-symbols-outlined text-[14px]">verified</span>
            Verified & Authorised
          </span>
        );
      case "submitted":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fff9c4] border border-[#fbc02d]/40 text-[#795b00] font-bold text-xs">
            <span className="material-symbols-outlined text-[14px]">pending_actions</span>
            Pending Admin Verification
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-medium text-xs">
            <span className="material-symbols-outlined text-[14px]">edit_document</span>
            Draft (Not Submitted)
          </span>
        );
    }
  };

  const hasWorkers = reportData && reportData.workers && reportData.workers.length > 0;
  const canExport = hasWorkers;

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col md:flex-row">
      <SideNavBar />
      <div className="flex-1 flex flex-col min-h-screen md:ml-64 bg-surface">
        <MobileHeader title="Monthly Reports" />

        {/* Desktop Header */}
        <header className="hidden md:flex justify-between items-center w-full px-margin-desktop h-16 bg-surface border-b border-outline-variant sticky top-0 z-[900]">
          <div className="font-headline-sm text-headline-sm font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">analytics</span>
            Monthly Attendance & Payroll Registers
          </div>
          <div className="flex items-center gap-3">
            {reportData && getStatusBadge(reportData.status)}
          </div>
        </header>

        <main className="p-margin-mobile md:p-margin-desktop flex-1 max-w-container-max w-full mx-auto space-y-6">

          {/* Title + Action Buttons */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-4">
            <div>
              <h1 className="font-display-lg text-display-lg text-on-surface mb-1 font-bold">
                Monthly Register
              </h1>
              <p className="font-body-md text-on-surface-variant">
                {monthName} {selectedYear} · {
                  reportScope === "division_master"
                    ? "Division-Wide Master Aggregation"
                    : reportScope === "hostel"
                    ? `${selectedHostel} (Consolidated Hostel)`
                    : locations.find((l) => String(l.id) === String(selectedLocationId))?.name || "…"
                }
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Excel / CSV Export */}
              {canExport && (
                <button
                  onClick={handleExportCSV}
                  className="bg-white border border-[#2e7d32] text-[#2e7d32] hover:bg-[#e8f5e9] font-semibold text-xs py-2.5 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-2xs"
                  title="Download spreadsheet for Bursary payroll computations"
                >
                  <span className="material-symbols-outlined text-[18px]">table_view</span>
                  Export Excel (CSV)
                </button>
              )}

              {/* PDF Export */}
              {canExport && (
                <button
                  onClick={handleExportPDF}
                  className="bg-white border border-primary text-primary hover:bg-primary/5 font-semibold text-xs py-2.5 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-2xs"
                  title="Download printable official ABU register"
                >
                  <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                  Export PDF
                </button>
              )}

              {/* Supervisor: Submit Monthly Register */}
              {reportData?.status === "not_submitted" && isSupervisor && (
                <button
                  onClick={handleSubmitReport}
                  disabled={submitting || !canExport}
                  className="bg-primary text-white hover:bg-[#0E4526] font-semibold text-xs py-2.5 px-5 rounded-lg flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">publish</span>
                  )}
                  Submit {reportScope === "hostel" ? `Hostel Register (${selectedHostel})` : "Monthly Register"}
                </button>
              )}

              {/* Admin: Verify Register */}
              {reportData?.status === "submitted" && isAdminTier && (
                <button
                  onClick={handleVerifyReport}
                  disabled={submitting || !canExport}
                  className="bg-primary text-white hover:bg-[#0E4526] font-semibold text-xs py-2.5 px-5 rounded-lg flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                  )}
                  Verify & Authorise Register
                </button>
              )}
            </div>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="p-4 bg-error-container/20 border border-error/30 text-error rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined">error</span>
              <p>{error}</p>
            </div>
          )}
          {success && (
            <div className="p-4 bg-[#e8f5e9] border border-[#c8e6c9] text-[#1b5e20] rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined">check_circle</span>
              <p>{success}</p>
            </div>
          )}

          {/* Filters Bar */}
          <section className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              
              {/* 1. Scope Selector */}
              <div className="space-y-1">
                <label className="font-label-md text-xs font-bold text-on-surface uppercase tracking-wider block">
                  Report Scope
                </label>
                <select
                  className="w-full p-2.5 border border-outline-variant rounded-lg font-body-md text-sm bg-white text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={reportScope}
                  onChange={(e) => setReportScope(e.target.value)}
                >
                  <option value="hostel">🏢 Consolidated Hostel Register</option>
                  <option value="single_block">📍 Single Block / Location</option>
                  {isAdminTier && (
                    <option value="division_master">🏛️ Master Division-Wide Register</option>
                  )}
                </select>
              </div>

              {/* 2. Hostel or Block Selector */}
              {reportScope === "hostel" ? (
                <div className="space-y-1">
                  <label className="font-label-md text-xs font-bold text-on-surface uppercase tracking-wider block">
                    Hostel / Unit
                  </label>
                  <select
                    className="w-full p-2.5 border border-outline-variant rounded-lg font-body-md text-sm bg-white text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    value={selectedHostel}
                    onChange={(e) => setSelectedHostel(e.target.value)}
                  >
                    {uniqueHostels.map((h) => (
                      <option key={h} value={h}>
                        🏢 {h} ({locations.filter((l) => l.name.startsWith(h)).length} blocks)
                      </option>
                    ))}
                  </select>
                </div>
              ) : reportScope === "single_block" ? (
                <div className="space-y-1">
                  <label className="font-label-md text-xs font-bold text-on-surface uppercase tracking-wider block">
                    Specific Block
                  </label>
                  <select
                    className="w-full p-2.5 border border-outline-variant rounded-lg font-body-md text-sm bg-white text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        📍 {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="font-label-md text-xs font-bold text-on-surface uppercase tracking-wider block">
                    Division
                  </label>
                  <div className="p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm font-semibold text-primary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">domain</span>
                    Student Affairs Division (All Hostels)
                  </div>
                </div>
              )}

              {/* 3. Month */}
              <div className="space-y-1">
                <label className="font-label-md text-xs font-bold text-on-surface uppercase tracking-wider block">
                  Month
                </label>
                <select
                  className="w-full p-2.5 border border-outline-variant rounded-lg font-body-md text-sm bg-white text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* 4. Year */}
              <div className="space-y-1">
                <label className="font-label-md text-xs font-bold text-on-surface uppercase tracking-wider block">
                  Year
                </label>
                <select
                  className="w-full p-2.5 border border-outline-variant rounded-lg font-body-md text-sm bg-white text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Roster Table */}
          <section className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="text-center py-16 text-on-surface-variant flex flex-col justify-center items-center gap-3">
                <div className="w-8 h-8 border-3 border-outline-variant border-t-primary rounded-full animate-spin"></div>
                <span className="font-body-md">Compiling monthly attendance register...</span>
              </div>
            ) : !hasWorkers ? (
              <div className="text-center py-16 text-on-surface-variant space-y-2">
                <span className="material-symbols-outlined text-4xl text-outline">assignment_late</span>
                <p className="font-semibold text-on-surface">No worker attendance records found</p>
                <p className="text-xs">No active workers were deployed to this scope during {monthName} {selectedYear}.</p>
              </div>
            ) : (
              <div>
                {/* Table Header Summary */}
                <div className="bg-surface-container-low px-6 py-3 border-b border-outline-variant flex justify-between items-center text-xs font-semibold text-on-surface-variant">
                  <span>Showing {reportData.workers.length} worker(s) on register</span>
                  <span>Working days in {monthName}: <strong>{daysInMonth} days</strong></span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-surface-container/80 text-on-surface font-bold text-xs uppercase tracking-wider border-b border-outline-variant">
                        <th className="py-3.5 px-4 w-12 text-center">S/N</th>
                        <th className="py-3.5 px-4">Staff ID</th>
                        <th className="py-3.5 px-4">Worker Full Name</th>
                        <th className="py-3.5 px-4">Location / Block</th>
                        <th className="py-3.5 px-4 text-center">Days Present</th>
                        <th className="py-3.5 px-4 text-center">Working Days</th>
                        <th className="py-3.5 px-4 text-center">Attendance %</th>
                        <th className="py-3.5 px-4 text-center">Payment Clearance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/60">
                      {reportData.workers.map((worker, index) => {
                        const rate = Math.round((worker.days_worked / daysInMonth) * 100);
                        return (
                          <tr key={worker.worker_id || index} className="hover:bg-surface-container-low/60 transition-colors">
                            <td className="py-3 px-4 text-center font-data-mono text-xs text-on-surface-variant">
                              {index + 1}
                            </td>
                            <td className="py-3 px-4 font-data-mono text-xs font-semibold text-primary">
                              {worker.staff_id}
                            </td>
                            <td className="py-3 px-4 font-semibold text-on-surface">
                              {worker.full_name}
                            </td>
                            <td className="py-3 px-4 text-on-surface-variant text-xs">
                              {worker.location_name || worker.unit_name || "—"}
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-on-surface">
                              {worker.days_worked}
                            </td>
                            <td className="py-3 px-4 text-center text-on-surface-variant">
                              {daysInMonth}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs ${
                                rate >= 75 ? "bg-[#e8f5e9] text-[#1b5e20]" : rate >= 50 ? "bg-[#fff9c4] text-[#795b00]" : "bg-[#ffebee] text-[#c62828]"
                              }`}>
                                {rate}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="text-xs font-semibold text-primary flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                Cleared
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer Summary */}
                <div className="bg-surface-container-low/60 px-6 py-4 border-t border-outline-variant flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-on-surface-variant">
                  <div>
                    <strong>Total Registered Workers:</strong> {reportData.workers.length} &nbsp;·&nbsp; 
                    <strong>Aggregate Days Worked:</strong> {reportData.workers.reduce((s, w) => s + w.days_worked, 0)} days
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleExportCSV}
                      className="text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">table_view</span> Download CSV
                    </button>
                    &nbsp;|&nbsp;
                    <button
                      onClick={handleExportPDF}
                      className="text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">picture_as_pdf</span> Download PDF
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Help Tip */}
          {canExport && (
            <div className="bg-surface-container border border-outline-variant/50 rounded-xl p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-primary mt-0.5">info</span>
              <div>
                <p className="font-body-md font-semibold text-on-surface">Ready for Payment Computation & Audit Submission?</p>
                <p className="font-label-md text-on-surface-variant text-[12px] mt-0.5">
                  Use <strong>Export Excel (CSV)</strong> to send spreadsheets to the Bursary for payroll math calculations, or <strong>Export PDF</strong> for signed official printouts with university seals.
                </p>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default Reports;
