import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getPendingReports,
  verifyBatchReports,
  generateBatchReport,
} from "../api/reportsApi";
import { exportToCSV } from "../utils/exportUtils";
import SideNavBar from "../components/SideNavBar";
import MobileHeader from "../components/MobileHeader";
import abuLogo from "../assets/Logo2.png";

const MONTHS = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const PendingReports = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [verifyingGroup, setVerifyingGroup] = useState(null); // group key being verified
  const [exportingGroup, setExportingGroup] = useState(null); // group key being exported
  const [globalVerifying, setGlobalVerifying] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getPendingReports();
      setReports(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load pending reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ── Group pending reports by Hostel / Unit & Period ──────────────────
  const groupedReports = {};
  reports.forEach((r) => {
    const isCompound = r.location_name && r.location_name.includes(" — ");
    const groupName = isCompound
      ? r.location_name.split(" — ")[0].trim()
      : r.location_name;
    const blockName = isCompound
      ? r.location_name.split(" — ")[1].trim()
      : r.location_name;

    const groupKey = `${groupName}_${r.period_month}_${r.period_year}`;
    if (!groupedReports[groupKey]) {
      groupedReports[groupKey] = {
        groupKey,
        groupName,
        period_month: r.period_month,
        period_year: r.period_year,
        submitted_at: r.submitted_at,
        submitted_by: r.submitted_by,
        reports: [],
      };
    }
    groupedReports[groupKey].reports.push({
      ...r,
      blockName,
    });
  });

  const groupList = Object.values(groupedReports);

  // ── Verify Group (Hostel / Unit) ────────────────────────────────────
  const handleVerifyGroup = async (group) => {
    setVerifyingGroup(group.groupKey);
    try {
      setError("");
      setSuccess("");
      const verificationIds = group.reports.map((r) => r.id);
      const res = await verifyBatchReports({ verification_ids: verificationIds });
      setSuccess(
        res.message ||
          `Successfully verified all ${group.reports.length} block(s) in ${group.groupName} for ${MONTHS[group.period_month]} ${group.period_year}!`
      );
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to verify reports");
    } finally {
      setVerifyingGroup(null);
    }
  };

  // ── Global Verify All Pending ───────────────────────────────────────
  const handleVerifyAll = async () => {
    if (reports.length === 0) return;
    setGlobalVerifying(true);
    try {
      setError("");
      setSuccess("");
      const allIds = reports.map((r) => r.id);
      const res = await verifyBatchReports({ verification_ids: allIds });
      setSuccess(
        res.message ||
          `Successfully verified all ${reports.length} pending report(s) across all hostels!`
      );
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to verify all reports");
    } finally {
      setGlobalVerifying(false);
    }
  };

  // ── Export PDF for Group (Hostel) ───────────────────────────────────
  const handleExportPDF = async (group) => {
    setExportingGroup(group.groupKey);
    try {
      const locationIds = group.reports.map((r) => r.operational_location_id);
      const reportData = await generateBatchReport(
        locationIds,
        group.period_month,
        group.period_year
      );

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const daysInMonth = new Date(group.period_year, group.period_month, 0).getDate();
      const monthName = MONTHS[group.period_month];

      // Logo
      try {
        const img = new Image();
        img.src = abuLogo;
        await new Promise((res) => { img.onload = res; });
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext("2d").drawImage(img, 0, 0);
        doc.addImage(canvas.toDataURL("image/png"), "PNG", pageW / 2 - 15, 8, 30, 30);
      } catch {}

      // Title
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 65, 32);
      doc.text("AHMADU BELLO UNIVERSITY, ZARIA", pageW / 2, 44, { align: "center" });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(
        "Casual Sanitation Workforce — Verified Monthly Attendance Register",
        pageW / 2,
        50,
        { align: "center" }
      );

      // Metadata
      doc.setFontSize(9);
      const metaRows = [
        ["Hostel / Unit:", `${group.groupName} (${group.reports.length} blocks)`, "Period:", `${monthName} ${group.period_year}`],
        ["Working Days in Month:", String(daysInMonth), "Verification Status:", "PENDING REVIEW"],
        ["Reviewing Officer:", user?.username || "—", "Date Generated:", new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })],
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

      // Table
      const tableBody = (reportData.workers || []).map((item, idx) => [
        String(idx + 1),
        item.staff_id,
        item.full_name,
        item.location_name || "—",
        String(item.days_worked),
        String(daysInMonth),
        `${Math.round((item.days_worked / daysInMonth) * 100)}%`,
        "Pending Verification",
      ]);

      doc.autoTable({
        startY,
        head: [["S/N", "Staff ID", "Worker Full Name", "Block / Location", "Days Present", "Working Days", "Attend. %", "Status"]],
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

      const finalY = (doc.lastAutoTable?.finalY || startY) + 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 65, 32);
      doc.text(`Total Workers on Register: ${reportData.workers?.length || 0}`, 14, finalY);
      const totalDays = (reportData.workers || []).reduce((s, w) => s + w.days_worked, 0);
      doc.text(`Total Aggregate Days Worked: ${totalDays}`, 14, finalY + 6);

      // Signatures
      const sigY = finalY + 20;
      doc.setDrawColor(180, 180, 180);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(9);
      doc.line(14, sigY, 75, sigY);
      doc.text("Verified By (Division Admin / Dean)", 14, sigY + 5);
      doc.text("Name: _________________________", 14, sigY + 11);
      doc.text("Date:  _________________________", 14, sigY + 17);
      doc.line(pageW - 75, sigY, pageW - 14, sigY);
      doc.text("Received By (Cash Unit Officer)", pageW - 75, sigY + 5);
      doc.text("Name: _________________________", pageW - 75, sigY + 11);
      doc.text("Date:  _________________________", pageW - 75, sigY + 17);

      // Footers
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `CSWATMS — ABU Zaria Sanitation Management | Page ${i} of ${totalPages} | Printed: ${new Date().toLocaleString("en-GB")}`,
          pageW / 2,
          doc.internal.pageSize.getHeight() - 6,
          { align: "center" }
        );
      }

      const filename = `PENDING_REGISTER_${group.groupName.replace(/[^a-zA-Z0-9]/g, "_")}_${monthName}_${group.period_year}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error(err);
      setError("Failed to generate preview PDF");
    } finally {
      setExportingGroup(null);
    }
  };

  // ── Export CSV for Group (Hostel) ───────────────────────────────────
  const handleExportCSV = async (group) => {
    try {
      const locationIds = group.reports.map((r) => r.operational_location_id);
      const reportData = await generateBatchReport(
        locationIds,
        group.period_month,
        group.period_year
      );

      const daysInMonth = new Date(group.period_year, group.period_month, 0).getDate();
      const monthName = MONTHS[group.period_month];
      const filename = `ABU_Pending_${group.groupName.replace(/\s+/g, "_")}_${monthName}_${group.period_year}.csv`;

      const headers = [
        "S/N",
        "Staff ID",
        "Worker Full Name",
        "Hostel",
        "Block / Location",
        "Days Worked",
        "Working Days in Month",
        "Attendance Percentage",
        "Period",
        "Status",
      ];

      const rows = (reportData.workers || []).map((w, idx) => [
        idx + 1,
        w.staff_id,
        w.full_name,
        group.groupName,
        w.location_name || "—",
        w.days_worked,
        daysInMonth,
        `${Math.round((w.days_worked / daysInMonth) * 100)}%`,
        `${monthName} ${group.period_year}`,
        "Pending Verification",
      ]);

      exportToCSV(filename, headers, rows);
    } catch (err) {
      console.error(err);
      setError("Failed to export spreadsheet");
    }
  };

  const formatDate = (iso) =>
    iso
      ? new Date(iso).toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col md:flex-row">
      <SideNavBar />
      <div className="flex-1 flex flex-col min-h-screen md:ml-64 bg-surface">
        <MobileHeader title="Pending Reports" />

        {/* Desktop Header */}
        <header className="hidden md:flex justify-between items-center w-full px-margin-desktop h-16 bg-surface border-b border-outline-variant sticky top-0 z-[900]">
          <div className="font-headline-sm text-headline-sm font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">pending_actions</span>
            Pending Report Verification
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={load}
              className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors font-label-md text-sm"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Refresh
            </button>
            {reports.length > 0 && (
              <button
                onClick={handleVerifyAll}
                disabled={globalVerifying}
                className="bg-primary text-white hover:bg-[#0E4526] px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">done_all</span>
                {globalVerifying ? "Verifying All..." : `Verify All (${reports.length} blocks)`}
              </button>
            )}
          </div>
        </header>

        <main className="p-margin-mobile md:p-margin-desktop flex-1 max-w-container-max w-full mx-auto space-y-6">

          <div className="border-b border-outline-variant pb-4">
            <h1 className="font-display-lg text-display-lg text-on-surface font-bold">
              Reports Awaiting Verification
            </h1>
            <p className="font-body-lg text-on-surface-variant mt-1">
              Supervisors have submitted these monthly registers for your review. Approve entire hostels or individual stations with 1 click.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-error/10 border border-error/30 text-error rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined">error</span>
              <p>{error}</p>
            </div>
          )}
          {success && (
            <div className="p-4 bg-primary/10 border border-primary/25 text-primary rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined">check_circle</span>
              <p>{success}</p>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-20 gap-3 text-on-surface-variant">
              <div className="w-8 h-8 border-2 border-outline border-t-primary rounded-full animate-spin" />
              <span>Loading pending registers...</span>
            </div>
          ) : groupList.length === 0 ? (
            <div className="bg-white border border-outline-variant rounded-2xl p-12 flex flex-col items-center text-center shadow-sm">
              <div className="w-20 h-20 rounded-full bg-[#e8f5e9] flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-4xl text-primary">task_alt</span>
              </div>
              <h3 className="font-headline-sm text-on-surface font-bold">All Clear!</h3>
              <p className="text-on-surface-variant mt-2 max-w-sm">
                No monthly registers are currently awaiting your verification.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupList.map((group) => (
                <div
                  key={group.groupKey}
                  className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:shadow-md transition-shadow"
                >
                  {/* Group Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary text-2xl">
                        apartment
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-on-surface text-base sm:text-lg">
                          {group.groupName}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-xs">
                          {group.reports.length} {group.reports.length === 1 ? "block" : "blocks"}
                        </span>
                      </div>
                      
                      <p className="text-on-surface-variant text-sm mt-0.5 font-medium">
                        Period: <strong>{MONTHS[group.period_month]} {group.period_year}</strong>
                      </p>

                      {/* Included blocks chips */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {group.reports.map((r) => (
                          <span
                            key={r.id}
                            className="bg-surface-container text-on-surface-variant text-xs px-2 py-0.5 rounded-md font-mono"
                          >
                            {r.blockName}
                          </span>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-3 mt-3 text-xs text-on-surface-variant">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          Submitted: {formatDate(group.submitted_at)}
                        </span>
                        {group.submitted_by && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">person</span>
                            Supervisor #{group.submitted_by}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Export CSV */}
                    <button
                      onClick={() => handleExportCSV(group)}
                      className="flex items-center gap-1 px-3 py-2 border border-[#2e7d32] text-[#2e7d32] rounded-lg font-semibold text-xs hover:bg-[#e8f5e9] transition-colors shadow-2xs"
                      title="Export CSV spreadsheet for Bursary"
                    >
                      <span className="material-symbols-outlined text-[16px]">table_view</span>
                      CSV
                    </button>

                    {/* Preview / Export PDF */}
                    <button
                      onClick={() => handleExportPDF(group)}
                      disabled={exportingGroup === group.groupKey}
                      className="flex items-center gap-1 px-3 py-2 border border-primary text-primary rounded-lg font-semibold text-xs hover:bg-primary/5 transition-colors disabled:opacity-50 shadow-2xs"
                    >
                      {exportingGroup === group.groupKey ? (
                        <div className="w-3.5 h-3.5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                      ) : (
                        <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                      )}
                      Preview PDF
                    </button>

                    {/* 1-Click Verify Group */}
                    <button
                      onClick={() => handleVerifyGroup(group)}
                      disabled={verifyingGroup === group.groupKey}
                      className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg font-bold text-xs hover:bg-[#0E4526] transition-colors disabled:opacity-50 shadow-sm"
                    >
                      {verifyingGroup === group.groupKey ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <span className="material-symbols-outlined text-[16px]">verified</span>
                      )}
                      Verify All ({group.reports.length} blocks)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && reports.length > 0 && (
            <div className="bg-surface-container border border-outline-variant/50 rounded-xl p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-primary mt-0.5">info</span>
              <p className="font-label-md text-on-surface-variant text-[12px]">
                Once you verify a hostel or unit register, it is locked and certified for official records. 
                You can download the <strong>PDF register</strong> for physical archiving or the <strong>CSV spreadsheet</strong> for forward transmission to administration.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default PendingReports;
