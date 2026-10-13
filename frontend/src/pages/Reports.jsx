import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getLocations } from "../api/hierarchyApi";
import { getLocationsForSupervisor } from "../api/attendanceApi";
import {
  generateReport,
  generateBatchReport,
  submitReport as submitReportApi,
  submitBatchReports as submitBatchReportsApi,
  verifyReport as verifyReportApi,
  verifyBatchReports as verifyBatchReportsApi,
} from "../api/reportsApi";
import { exportToCSV } from "../utils/exportUtils";
import SideNavBar from "../components/SideNavBar";
import MobileHeader from "../components/MobileHeader";
import abuLogo from "../assets/Logo2.png";

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
  // UHS uses flat locations (dept names), SA uses "Hostel — Block" compound names
  const isHealthDivision = user?.division_name?.toLowerCase().includes("health");

  const [locations, setLocations] = useState([]);
  
  // Scope options: "all_hostels" | "hostel" | "single_block"
  const [reportScope, setReportScope] = useState("all_hostels");
  const [selectedHostel, setSelectedHostel] = useState("");
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
        user?.role === "supervisor"
          ? await getLocationsForSupervisor(user.id)
          : await getLocations();
      setLocations(locData);

      if (locData.length > 0) {
        setSelectedLocationId(String(locData[0].id));
        const firstHostel = isHealthDivision
          ? (locData[0].unit_name || locData[0].name)
          : locData[0].name.includes(" — ")
            ? locData[0].name.split(" — ")[0].trim()
            : locData[0].name;
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

  // Extract unique hostels/departments from assigned locations
  const uniqueHostels = Array.from(
    new Set(
      locations.map((loc) =>
        isHealthDivision
          ? (loc.unit_name || loc.name)
          : loc.name.includes(" — ") ? loc.name.split(" — ")[0].trim() : loc.name
      )
    )
  );

  // Available blocks/locations for the selected hostel/department
  const availableBlocksForHostel = locations.filter((loc) => {
    if (!selectedHostel) return true;
    const prefix = isHealthDivision
      ? (loc.unit_name || loc.name)
      : (loc.name.includes(" — ") ? loc.name.split(" — ")[0].trim() : loc.name);
    return prefix === selectedHostel;
  });

  // Calculate target location IDs for current selection
  const getTargetLocationIds = () => {
    if (reportScope === "single_block") {
      return selectedLocationId ? [Number(selectedLocationId)] : [];
    }
    if (reportScope === "hostel") {
      return availableBlocksForHostel.map((l) => Number(l.id));
    }
    // all_hostels
    return locations.map((l) => Number(l.id));
  };

  // ── Load Report Data ────────────────────────────────────────────────
  const loadReport = async () => {
    if (!selectedMonth || !selectedYear) return;

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      if (reportScope === "all_hostels") {
        const targetIds = locations.map((l) => Number(l.id));
        if (targetIds.length === 0) {
          setReportData(null);
          return;
        }

        const data = await generateBatchReport(targetIds, Number(selectedMonth), Number(selectedYear));
        setReportData({
          scope: "all_hostels",
          status: data.status,
          statuses: data.statuses || [],
          location_ids: targetIds,
          workers: data.workers || [],
          total_workers: data.workers?.length || 0,
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
          total_workers: data.workers?.length || 0,
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
          total_workers: data.workers?.length || 0,
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
      const targetIds = getTargetLocationIds();
      if (reportScope === "single_block") {
        await submitReportApi({
          operational_location_id: Number(selectedLocationId),
          period_month: Number(selectedMonth),
          period_year: Number(selectedYear),
        });
        setSuccess("Monthly register submitted for verification!");
      } else {
        const res = await submitBatchReportsApi({
          operational_location_ids: targetIds,
          period_month: Number(selectedMonth),
          period_year: Number(selectedYear),
        });
        const label = reportScope === "all_hostels" ? "all hostels" : selectedHostel;
        setSuccess(res.message || `Monthly register submitted for ${label}!`);
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
      if (reportData?.statuses && reportData.statuses.length > 0) {
        const pendingIds = reportData.statuses
          .filter((s) => s.status === "submitted")
          .map((s) => s.id);
        if (pendingIds.length > 0) {
          const res = await verifyBatchReportsApi({ verification_ids: pendingIds });
          const label = reportScope === "all_hostels" ? "all hostels" : selectedHostel;
          setSuccess(res.message || `Verified all pending blocks across ${label}!`);
        } else {
          setSuccess("All blocks are already verified.");
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

    // Logo
    try {
      const img = new Image();
      img.src = abuLogo;
      await new Promise((res) => { img.onload = res; });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL("image/png");
      doc.addImage(dataUrl, "PNG", pageW / 2 - 11, 6, 22, 22);
    } catch {}

    // Title
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 65, 32);
    doc.text("AHMADU BELLO UNIVERSITY, ZARIA", pageW / 2, 33, { align: "center" });

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text("Casual Sanitation Workforce — Monthly Attendance Register", pageW / 2, 38, { align: "center" });

    // Metadata Table Block (uses autoTable to guarantee zero overlapping text)
    const scopeName =
      reportScope === "all_hostels"
        ? isHealthDivision ? "All Departments Consolidated (Master Register)" : "All Hostels Consolidated (Master Register)"
        : reportScope === "hostel"
        ? isHealthDivision ? `${selectedHostel} (Consolidated Dept Register)` : `${selectedHostel} (Consolidated Register)`
        : locations.find((l) => String(l.id) === String(selectedLocationId))?.name || "—";

    const statusLabel = {
      verified: "VERIFIED & APPROVED ✓",
      submitted: "PENDING VERIFICATION",
      not_submitted: "DRAFT (NOT SUBMITTED)",
    };

    doc.autoTable({
      startY: 42,
      body: [
        [
          { content: "Register Scope:", styles: { fontStyle: "bold", textColor: [0, 65, 32], cellWidth: 28 } },
          { content: scopeName, styles: { cellWidth: 68 } },
          { content: "Period:", styles: { fontStyle: "bold", textColor: [0, 65, 32], cellWidth: 28 } },
          { content: `${monthName} ${selectedYear}`, styles: { cellWidth: 58 } },
        ],
        [
          { content: "Working Days:", styles: { fontStyle: "bold", textColor: [0, 65, 32] } },
          { content: `${daysInMonth} Working Days` },
          { content: "Report Status:", styles: { fontStyle: "bold", textColor: [0, 65, 32] } },
          { content: statusLabel[reportData.status] || "VERIFIED" },
        ],
        [
          { content: "Generated By:", styles: { fontStyle: "bold", textColor: [0, 65, 32] } },
          { content: user?.username || "Authorized Officer" },
          { content: "Date Generated:", styles: { fontStyle: "bold", textColor: [0, 65, 32] } },
          { content: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) },
        ],
      ],
      theme: "plain",
      styles: {
        fontSize: 8,
        cellPadding: 1.8,
        textColor: [40, 40, 40],
        overflow: "linebreak",
        lineColor: [210, 220, 210],
        lineWidth: 0.15,
      },
      margin: { left: 14, right: 14 },
    });

    const startY = (doc.lastAutoTable?.finalY || 62) + 4;

    // Build grouped Table Rows
    const tableBody = [];
    let snCounter = 1;

    // Group sorted by hostel
    const sortedHostelKeys = Object.keys(workersByHostel).sort();

    sortedHostelKeys.forEach((hostelName) => {
      const hWorkers = workersByHostel[hostelName] || [];
      if (reportScope === "all_hostels" && sortedHostelKeys.length > 1) {
        // Section Header Row
        tableBody.push([
          {
            content: `${isHealthDivision ? "DEPT / STATION:" : "HOSTEL / STATION:"} ${hostelName.toUpperCase()} (${hWorkers.length} Workers)`,
            colSpan: 8,
            styles: { fillColor: [225, 238, 228], textColor: [0, 65, 32], fontStyle: "bold", halign: "left" },
          },
        ]);
      }

      hWorkers.forEach((item) => {
        const isCompound = item.location_name && item.location_name.includes(" — ");
        const blockName = isHealthDivision
          ? (item.location_name || "—")
          : isCompound ? item.location_name.split(" — ")[1].trim() : (item.location_name || "—");

        tableBody.push([
          String(snCounter++),
          item.staff_id,
          item.full_name,
          blockName,
          item.national_id_nin || "—",
          String(item.days_worked),
          String(daysInMonth),
          `${Math.round((item.days_worked / daysInMonth) * 100)}%`,
        ]);
      });
    });

    doc.autoTable({
      startY,
      head: [["S/N", "Staff ID", "Worker Full Name", isHealthDivision ? "Location / Zone" : "Block / Zone", "National ID (NIN)", "Days Present", "Working Days", "Attend. %"]],
      body: tableBody,
      styles: { fontSize: 8, cellPadding: 2.5, lineColor: [200, 200, 200], lineWidth: 0.2 },
      headStyles: { fillColor: [0, 65, 32], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { cellWidth: 22, halign: "center" },
        2: { cellWidth: 46 },
        3: { cellWidth: 36 },
        4: { halign: "center", cellWidth: 26 },
        5: { halign: "center", cellWidth: 16 },
        6: { halign: "center", cellWidth: 16 },
        7: { halign: "center", cellWidth: 16 },
      },
      alternateRowStyles: { fillColor: [247, 249, 248] },
      margin: { left: 14, right: 14 },
    });

    // Summary & Signatures
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

    // Footers
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

    const filename = `ABU_ATTENDANCE_REGISTER_${scopeName.replace(/[^a-zA-Z0-9]/g, "_")}_${monthName}_${selectedYear}.pdf`;
    doc.save(filename);
  };

  // ── Excel / CSV Export ──────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!reportData || !reportData.workers || reportData.workers.length === 0) return;

    const scopeName =
      reportScope === "all_hostels"
        ? "All_Hostels_Consolidated"
        : reportScope === "hostel"
        ? selectedHostel.replace(/\s+/g, "_")
        : (locations.find((l) => String(l.id) === String(selectedLocationId))?.name || "Location").replace(/\s+/g, "_");

    const filename = `ABU_Attendance_Register_${scopeName}_${monthName}_${selectedYear}.csv`;

    const headers = [
      "S/N",
      "Staff ID",
      "Worker Full Name",
      isHealthDivision ? "Department / Location" : "Hostel / Location",
      isHealthDivision ? "Location / Station" : "Block / Station",
      "Phone Number",
      "National ID (NIN)",
      "Days Worked",
      "Working Days in Month",
      "Attendance Percentage",
      "Period",
      "Register Status",
    ];

    let rowIdx = 1;
    const rows = [];
    const sortedHostelKeys = Object.keys(workersByHostel).sort();

    sortedHostelKeys.forEach((hostelName) => {
      const hWorkers = workersByHostel[hostelName] || [];
      hWorkers.forEach((w) => {
        const isCompound = w.location_name && w.location_name.includes(" — ");
        const hostel = isHealthDivision
          ? (w.unit_name || w.location_name || "—")
          : isCompound ? w.location_name.split(" — ")[0].trim() : (w.location_name || "—");
        const block = isHealthDivision
          ? (w.location_name || "—")
          : isCompound ? w.location_name.split(" — ")[1].trim() : (w.location_name || "—");

        rows.push([
          rowIdx++,
          w.staff_id,
          w.full_name,
          hostel,
          block,
          w.phone_number || "—",
          w.national_id_nin || "—",
          w.days_worked,
          daysInMonth,
          `${Math.round((w.days_worked / daysInMonth) * 100)}%`,
          `${monthName} ${selectedYear}`,
          reportData.status === "verified" ? "Verified & Approved" : "Pending Verification",
        ]);
      });
    });

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

  // Group workers by hostel/department for structured display
  const workersByHostel = {};
  if (reportData?.workers) {
    reportData.workers.forEach((w) => {
      let groupKey;
      if (isHealthDivision) {
        // UHS: flat — group by unit_name (same as location_name)
        groupKey = w.unit_name || w.location_name || "General Deployment";
      } else {
        // SA: compound "HallName — BlockName" — group by prefix
        const isCompound = w.location_name && w.location_name.includes(" — ");
        groupKey = isCompound ? w.location_name.split(" — ")[0].trim() : (w.location_name || "General Deployment");
      }
      if (!workersByHostel[groupKey]) workersByHostel[groupKey] = [];
      workersByHostel[groupKey].push(w);
    });

    // Sort workers within each group alphabetically by full name
    Object.keys(workersByHostel).forEach((h) => {
      workersByHostel[h].sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
    });
  }

  const hasWorkers = reportData && reportData.workers && reportData.workers.length > 0;
  const canExport = hasWorkers;

  const submitButtonLabel = () => {
    if (reportScope === "all_hostels") return isHealthDivision ? "Submit All Departments Register" : "Submit All Hostels Register";
    if (reportScope === "hostel") return isHealthDivision ? `Submit Department Register (${selectedHostel})` : `Submit Hostel Register (${selectedHostel})`;
    return "Submit Monthly Register";
  };

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col md:flex-row">
      <SideNavBar />
      <div className="flex-1 flex flex-col min-h-screen md:ml-64 bg-surface">
        <MobileHeader title="Monthly Reports" />

        {/* Desktop Header */}
        <header className="hidden md:flex justify-between items-center w-full px-margin-desktop h-16 bg-surface border-b border-outline-variant sticky top-0 z-[900]">
          <div className="font-headline-sm text-headline-sm font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">analytics</span>
            Monthly Workforce Attendance Registers
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
                  reportScope === "all_hostels"
                    ? isHealthDivision
                      ? `All Departments Consolidated (${uniqueHostels.length} departments, ${reportData?.workers?.length || 0} workers)`
                      : `All Hostels Consolidated (${uniqueHostels.length} hostels, ${reportData?.workers?.length || 0} workers)`
                    : reportScope === "hostel"
                    ? isHealthDivision
                      ? `${selectedHostel} (Consolidated Department)`
                      : `${selectedHostel} (Consolidated Hostel)`
                    : locations.find((l) => String(l.id) === String(selectedLocationId))?.name || "…"
                }
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Excel / CSV Export */}
              {canExport && (
                <button
                  onClick={handleExportCSV}
                  className="bg-white border border-primary text-primary hover:bg-primary/5 font-semibold text-xs py-2.5 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-2xs"
                  title="Download spreadsheet of attendance records"
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
                  {submitButtonLabel()}
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
                  Verify & Authorise {
                    reportScope === "all_hostels"
                      ? isHealthDivision ? "All Departments" : "All Hostels"
                      : "Register"
                  }
                </button>
              )}
            </div>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="p-4 bg-error-container/20 border border-error/30 text-error rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined">error</span>
              <p className="font-body-md">{error}</p>
            </div>
          )}
          {success && (
            <div className="p-4 bg-primary/10 border border-primary/25 text-primary rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined">check_circle</span>
              <p className="font-body-md">{success}</p>
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
                  className="w-full p-2.5 border border-outline-variant rounded-lg font-body-md text-sm bg-white text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none font-medium"
                  value={reportScope}
                  onChange={(e) => setReportScope(e.target.value)}
                >
                  <option value="all_hostels">{isHealthDivision ? "All departments" : "All hostels"}</option>
                  <option value="hostel">{isHealthDivision ? "Single department" : "Single hostel"}</option>
                  <option value="single_block">{isHealthDivision ? "Single location" : "Single block or location"}</option>
                </select>
              </div>

              {/* 2. Specific Hostel or Block Selector (conditional) */}
              {reportScope === "hostel" ? (
                <div className="space-y-1">
                  <label className="font-label-md text-xs font-bold text-on-surface uppercase tracking-wider block">
                    {isHealthDivision ? "Choose Department" : "Choose Hostel"}
                  </label>
                  <select
                    className="w-full p-2.5 border border-outline-variant rounded-lg font-body-md text-sm bg-white text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none font-medium"
                    value={selectedHostel}
                    onChange={(e) => setSelectedHostel(e.target.value)}
                  >
                    {uniqueHostels.map((h) => (
                      <option key={h} value={h}>
                        {h} ({locations.filter((l) => l.name.startsWith(h)).length} {isHealthDivision ? "locations" : "blocks"})
                      </option>
                    ))}
                  </select>
                </div>
              ) : reportScope === "single_block" ? (
                <div className="space-y-1">
                  <label className="font-label-md text-xs font-bold text-on-surface uppercase tracking-wider block">
                    {isHealthDivision ? "Choose Location" : "Choose Block / Station"}
                  </label>
                  <select
                    className="w-full p-2.5 border border-outline-variant rounded-lg font-body-md text-sm bg-white text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="font-label-md text-xs font-bold text-on-surface uppercase tracking-wider block">
                    {isHealthDivision ? "Departments In Scope" : "Hostels In Master Scope"}
                  </label>
                  <div className="p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-xs font-semibold text-primary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">domain</span>
                    <span>
                      {isHealthDivision
                        ? `All ${uniqueHostels.length} departments combined`
                        : `All ${uniqueHostels.length} hostels and units combined`}
                    </span>
                  </div>
                </div>
              )}

              {/* 3. Month */}
              <div className="space-y-1">
                <label className="font-label-md text-xs font-bold text-on-surface uppercase tracking-wider block">
                  Reporting Month
                </label>
                <select
                  className="w-full p-2.5 border border-outline-variant rounded-lg font-body-md text-sm bg-white text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none font-medium"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Year */}
              <div className="space-y-1">
                <label className="font-label-md text-xs font-bold text-on-surface uppercase tracking-wider block">
                  Reporting Year
                </label>
                <select
                  className="w-full p-2.5 border border-outline-variant rounded-lg font-body-md text-sm bg-white text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none font-medium"
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

          {/* Metrics Summary Strip */}
          {hasWorkers && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-outline-variant rounded-xl p-4 shadow-2xs">
                <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">Total Workers</p>
                <p className="text-2xl font-bold text-on-surface mt-1">{reportData.workers.length}</p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">Active on register</p>
              </div>
              <div className="bg-white border border-outline-variant rounded-xl p-4 shadow-2xs">
                <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">{isHealthDivision ? "Total Departments" : "Total Hostels"}</p>
                <p className="text-2xl font-bold text-primary mt-1">{Object.keys(workersByHostel).length}</p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">Operating stations</p>
              </div>
              <div className="bg-white border border-outline-variant rounded-xl p-4 shadow-2xs">
                <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">Aggregate Days Worked</p>
                <p className="text-2xl font-bold text-primary mt-1">
                  {reportData.workers.reduce((s, w) => s + w.days_worked, 0)}
                </p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">Total shift logs</p>
              </div>
              <div className="bg-white border border-outline-variant rounded-xl p-4 shadow-2xs">
                <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">Average Attendance</p>
                <p className="text-2xl font-bold text-secondary mt-1">
                  {reportData.workers.length > 0
                    ? Math.round(
                        (reportData.workers.reduce((s, w) => s + w.days_worked, 0) /
                          (reportData.workers.length * daysInMonth)) *
                          100
                      )
                    : 0}%
                </p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">Workforce presence rate</p>
              </div>
            </div>
          )}

          {/* Register Data Table */}
          <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-on-surface-variant">
                <div className="w-8 h-8 border-2 border-outline border-t-primary rounded-full animate-spin" />
                <span className="text-xs font-semibold">Generating consolidated monthly attendance register...</span>
              </div>
            ) : !hasWorkers ? (
              <div className="text-center py-16 px-4">
                <span className="material-symbols-outlined text-4xl text-outline mb-2">event_busy</span>
                <h3 className="font-bold text-on-surface text-base">No Attendance Records Found</h3>
                <p className="text-xs text-on-surface-variant mt-1 max-w-md mx-auto">
                  No workers or attendance data recorded for {monthName} {selectedYear} under the selected scope.
                </p>
              </div>
            ) : (
              <div className="space-y-6 p-4 sm:p-6">

                {/* Render workers grouped by hostel */}
                {Object.entries(workersByHostel)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([hostelName, hostelWorkers], hostelIdx) => {
                    const hostelDaysWorked = hostelWorkers.reduce((s, w) => s + w.days_worked, 0);
                    const hostelAvgRate =
                      hostelWorkers.length > 0 && daysInMonth > 0
                        ? Math.round((hostelDaysWorked / (hostelWorkers.length * daysInMonth)) * 100)
                        : 0;

                    // Extract unique blocks for this hostel
                    const uniqueBlocks = Array.from(
                      new Set(
                        hostelWorkers.map((w) => {
                          const isCompound = w.location_name && w.location_name.includes(" — ");
                          return isCompound ? w.location_name.split(" — ")[1].trim() : (w.location_name || "—");
                        })
                      )
                    );

                    return (
                      <div
                        key={hostelName}
                        id={`hostel-section-${hostelIdx}`}
                        className="border border-outline-variant rounded-xl overflow-hidden scroll-mt-20 bg-white"
                      >
                        <div className="bg-surface-container-low px-5 py-4 border-b border-outline-variant flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-primary">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-base text-on-surface">{hostelName}</h3>
                                <span className="text-xs text-on-surface-variant">
                                  {hostelWorkers.length} worker{hostelWorkers.length !== 1 ? "s" : ""}
                                </span>
                              </div>
                              <p className="text-xs text-on-surface-variant mt-0.5">
                                {isHealthDivision ? "Location:" : "Blocks:"} <span className="font-medium text-on-surface">{uniqueBlocks.join(", ") || "General"}</span>
                              </p>
                            </div>
                          </div>

                          <div className="text-xs text-on-surface-variant">
                            <span>{hostelDaysWorked} days worked</span>
                            <span className="mx-2 text-outline">·</span>
                            <span>{hostelAvgRate}% average attendance</span>
                          </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-surface-container-low border-b border-outline-variant font-bold text-on-surface">
                              <tr>
                                <th className="py-3 px-3 text-center w-12">S/N</th>
                                <th className="py-3 px-3">Staff ID</th>
                                <th className="py-3 px-3">Worker Full Name</th>
                                <th className="py-3 px-3">{isHealthDivision ? "Location / Station" : "Block / Station"}</th>
                                <th className="py-3 px-3 text-center">Days Worked</th>
                                <th className="py-3 px-3 text-center">Working Days</th>
                                <th className="py-3 px-3 text-center">Attendance %</th>
                                <th className="py-3 px-3 text-center">Register Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/50">
                              {hostelWorkers.map((w, idx) => {
                                const isCompound = w.location_name && w.location_name.includes(" — ");
                                const blockName = isCompound ? w.location_name.split(" — ")[1].trim() : (w.location_name || "—");
                                const rate = daysInMonth > 0 ? Math.round((w.days_worked / daysInMonth) * 100) : 0;

                                return (
                                  <tr key={w.worker_id || idx} className="hover:bg-primary/5 transition-colors">
                                    <td className="py-2.5 px-3 text-center font-mono text-on-surface-variant">{idx + 1}</td>
                                    <td className="py-2.5 px-3 font-mono font-semibold text-primary">{w.staff_id}</td>
                                    <td className="py-2.5 px-3 font-semibold text-on-surface">{w.full_name}</td>
                                    <td className="py-2.5 px-3 text-on-surface-variant font-medium">{blockName}</td>
                                    <td className="py-2.5 px-3 text-center font-bold text-primary">{w.days_worked}</td>
                                    <td className="py-2.5 px-3 text-center font-mono text-on-surface-variant">{daysInMonth}</td>
                                    <td className="py-2.5 px-3 text-center font-semibold">
                                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${rate >= 75 ? "bg-[#e8f5e9] text-[#1b5e20]" : "bg-[#fff9c4] text-[#795b00]"}`}>
                                        {rate}%
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      <span className={`inline-flex items-center gap-1 font-bold text-[11px] ${reportData.status === "verified" ? "text-[#1b5e20]" : "text-[#795b00]"}`}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                        {reportData.status === "verified" ? "Verified" : "Pending"}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot className="bg-surface-container-low border-t-2 border-outline-variant font-bold text-on-surface text-xs">
                              <tr>
                                <td colSpan={6} className="py-2.5 px-4 text-right text-on-surface-variant">
                                  Subtotal for {hostelName}:
                                </td>
                                <td className="py-2.5 px-3 text-center text-[#1b5e20] font-bold">
                                  {hostelDaysWorked} days
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono text-on-surface-variant">
                                  {daysInMonth}
                                </td>
                                <td className="py-2.5 px-3 text-center text-primary font-bold">
                                  {hostelAvgRate}% avg
                                </td>
                                <td className="py-2.5 px-3 text-center text-on-surface-variant text-[11px]">
                                  {hostelWorkers.length} staff
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                      </div>
                    );
                  })}
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
};

export default Reports;
