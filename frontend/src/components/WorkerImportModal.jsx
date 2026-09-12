import React, { useState, useRef } from "react";
import { bulkImportWorkers } from "../api/workersApi";
import { exportToCSV } from "../utils/exportUtils";

const WorkerImportModal = ({ isOpen, onClose, onSuccess, existingWorkers = [], locations = [] }) => {
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [filterMode, setFilterMode] = useState("all"); // "all" | "valid" | "errors"
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // ── Download Sample CSV Template ──────────────────────────────────
  const handleDownloadTemplate = () => {
    const headers = [
      "Staff ID",
      "Full Name",
      "Phone Number",
      "Appointment Date (YYYY-MM-DD)",
      "National ID (NIN)",
      "Next of Kin Name",
      "Next of Kin Phone",
      "Assigned Station (e.g. Ramat Hall — Block A)",
    ];

    // Pick 2 real locations from database for realistic template examples
    const sampleLoc1 = locations.length > 0 ? locations[0].name : "Ramat Hall — Block A";
    const sampleLoc2 = locations.length > 1 ? locations[1].name : "ICSA Hall — Block B";

    const rows = [
      [
        "CW/2026/001",
        "Musa Ibrahim Danjuma",
        "08031234567",
        new Date().toISOString().split("T")[0],
        "12345678901",
        "Amina Musa",
        "08039876543",
        sampleLoc1,
      ],
      [
        "CW/2026/002",
        "Grace Oche Agada",
        "08129876543",
        new Date().toISOString().split("T")[0],
        "98765432109",
        "Sunday Agada",
        "08123456789",
        sampleLoc2,
      ],
    ];

    exportToCSV("ABU_Worker_Registration_Template", headers, rows);
  };

  // ── CSV Parsing & Validation ──────────────────────────────────────
  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setError("");

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        parseCSVText(text);
      } catch (err) {
        setError("Failed to parse CSV file. Ensure it is a valid format.");
      }
    };
    reader.readAsText(uploadedFile);
  };

  const parseCSVText = (csvText) => {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      setError("The uploaded CSV file contains no worker data rows.");
      setParsedRows([]);
      return;
    }

    // Existing staff IDs for duplicate detection
    const existingStaffIds = new Set(existingWorkers.map((w) => String(w.staff_id).trim().toUpperCase()));
    const seenInFileStaffIds = new Set();

    const dataRows = [];
    const errorsList = [];

    // Parse header to find column indexes
    const headerCols = lines[0].split(",").map((c) => c.replace(/^["']|["']$/g, "").trim().toLowerCase());

    const staffIdIdx = headerCols.findIndex((c) => c.includes("staff"));
    const nameIdx = headerCols.findIndex((c) => c.includes("name") && !c.includes("bank") && !c.includes("kin"));
    const phoneIdx = headerCols.findIndex((c) => c.includes("phone") && !c.includes("kin"));
    const dateIdx = headerCols.findIndex((c) => c.includes("date") || c.includes("appointment"));
    const ninIdx = headerCols.findIndex((c) => c.includes("nin") || c.includes("national"));
    const kinNameIdx = headerCols.findIndex((c) => c.includes("kin") && c.includes("name"));
    const kinPhoneIdx = headerCols.findIndex((c) => c.includes("kin") && c.includes("phone"));
    const stationIdx = headerCols.findIndex((c) => c.includes("station") || c.includes("location") || c.includes("hostel") || c.includes("block"));

    for (let i = 1; i < lines.length; i++) {
      // Split with quotes handling
      const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(",");
      const cleanCols = row.map((val) => val.replace(/^["']|["']$/g, "").trim());

      const staff_id = (staffIdIdx !== -1 ? cleanCols[staffIdIdx] : cleanCols[0]) || "";
      const full_name = (nameIdx !== -1 ? cleanCols[nameIdx] : cleanCols[1]) || "";
      const phone_number = (phoneIdx !== -1 ? cleanCols[phoneIdx] : cleanCols[2]) || "";
      const appointment_date = (dateIdx !== -1 ? cleanCols[dateIdx] : cleanCols[3]) || new Date().toISOString().split("T")[0];
      const national_id_nin = (ninIdx !== -1 ? cleanCols[ninIdx] : cleanCols[4]) || "";
      const next_of_kin_name = (kinNameIdx !== -1 ? cleanCols[kinNameIdx] : cleanCols[5]) || "";
      const next_of_kin_phone = (kinPhoneIdx !== -1 ? cleanCols[kinPhoneIdx] : cleanCols[6]) || "";
      const station_name = (stationIdx !== -1 ? cleanCols[stationIdx] : cleanCols[7]) || "";

      // Match station to location ID
      let operational_location_id = null;
      let matchedLocationName = station_name;

      if (station_name) {
        const foundLoc = locations.find((l) =>
          l.name.toLowerCase().trim() === station_name.toLowerCase().trim() ||
          l.name.toLowerCase().includes(station_name.toLowerCase().trim())
        );
        if (foundLoc) {
          operational_location_id = foundLoc.id;
          matchedLocationName = foundLoc.name;
        }
      }

      // Validations
      const rowErrors = [];
      const normStaffId = staff_id.toUpperCase().trim();

      if (!staff_id) {
        rowErrors.push("Staff ID is required");
      } else if (existingStaffIds.has(normStaffId)) {
        rowErrors.push(`Staff ID ${staff_id} already exists in the system`);
      } else if (seenInFileStaffIds.has(normStaffId)) {
        rowErrors.push(`Duplicate Staff ID ${staff_id} in this file`);
      } else {
        seenInFileStaffIds.add(normStaffId);
      }

      if (!full_name) {
        rowErrors.push("Worker full name is required");
      }

      if (station_name && !operational_location_id) {
        rowErrors.push(`Station "${station_name}" not found in system`);
      }

      const parsedItem = {
        rowIndex: i + 1,
        staff_id,
        full_name,
        phone_number,
        appointment_date,
        national_id_nin,
        next_of_kin_name,
        next_of_kin_phone,
        station_name: matchedLocationName,
        operational_location_id,
        errors: rowErrors,
        isValid: rowErrors.length === 0,
      };

      dataRows.push(parsedItem);
      if (rowErrors.length > 0) {
        errorsList.push({ row: i + 1, errors: rowErrors });
      }
    }

    setParsedRows(dataRows);
    setValidationErrors(errorsList);
  };

  // ── Execute Batch Import ──────────────────────────────────────────
  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setError("No valid worker records found to import. Please resolve the errors.");
      return;
    }

    setImporting(true);
    setError("");

    try {
      const payload = validRows.map((r) => ({
        staff_id: r.staff_id,
        full_name: r.full_name,
        phone_number: r.phone_number,
        appointment_date: r.appointment_date,
        national_id_nin: r.national_id_nin,
        next_of_kin_name: r.next_of_kin_name,
        next_of_kin_phone: r.next_of_kin_phone,
        operational_location_id: r.operational_location_id,
      }));

      const res = await bulkImportWorkers(payload);
      onSuccess(res.message || `Successfully imported ${validRows.length} workers!`);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to complete batch worker import");
    } finally {
      setImporting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const errorCount = parsedRows.length - validCount;

  const displayedRows =
    filterMode === "valid"
      ? parsedRows.filter((r) => r.isValid)
      : filterMode === "errors"
      ? parsedRows.filter((r) => !r.isValid)
      : parsedRows;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-outline-variant flex flex-col max-h-[90vh] overflow-hidden animate-fadeIn">
        
        {/* Header */}
        <div className="px-6 py-4 bg-surface-container border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl">group_add</span>
            </div>
            <div>
              <h2 className="font-bold text-on-surface text-lg">Batch Import Casual Workers</h2>
              <p className="text-xs text-on-surface-variant">
                Upload CSV spreadsheet to register multiple workers into operational stations simultaneously.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3 bg-error/10 border border-error/30 text-error rounded-xl text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              <p>{error}</p>
            </div>
          )}

          {/* Step 1: Template Info */}
          <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-primary font-bold text-xs">
                <span className="material-symbols-outlined text-sm">description</span>
                <span>Step 1: Download Standard Spreadsheet Template</span>
              </div>
              <p className="text-xs text-on-surface-variant max-w-xl">
                Use the pre-formatted ABU worker import template with required column headers (Staff ID, Full Name, Phone, Appointment Date, NIN, Next of Kin, Station).
              </p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="shrink-0 bg-white border border-primary text-primary hover:bg-primary/5 font-semibold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Download CSV Template
            </button>
          </div>

          {/* Step 2: Upload Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-primary/40 hover:border-primary bg-surface-container-low/50 hover:bg-primary/5 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-1">
              <span className="material-symbols-outlined text-2xl">cloud_upload</span>
            </div>
            <p className="font-bold text-sm text-on-surface">
              {file ? file.name : "Click to browse or drop your CSV spreadsheet here"}
            </p>
            <p className="text-xs text-on-surface-variant">
              {file ? `File selected: ${(file.size / 1024).toFixed(1)} KB` : "Accepts .CSV files exported from Excel or Google Sheets"}
            </p>
          </div>

          {/* Step 3: Validation & Live Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              {/* Status Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-on-surface">Import Preview</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#e8f5e9] text-[#1b5e20] font-bold text-xs">
                    🟢 {validCount} Valid
                  </span>
                  {errorCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#ffebee] text-[#c62828] font-bold text-xs">
                      🔴 {errorCount} Invalid
                    </span>
                  )}
                </div>

                <div className="flex gap-1 text-xs">
                  <button
                    onClick={() => setFilterMode("all")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${filterMode === "all" ? "bg-primary text-white" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}
                  >
                    All ({parsedRows.length})
                  </button>
                  <button
                    onClick={() => setFilterMode("valid")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${filterMode === "valid" ? "bg-primary text-white" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}
                  >
                    Valid Only ({validCount})
                  </button>
                  {errorCount > 0 && (
                    <button
                      onClick={() => setFilterMode("errors")}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${filterMode === "errors" ? "bg-error text-white" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}
                    >
                      Errors Only ({errorCount})
                    </button>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="border border-outline-variant rounded-xl overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-surface-container sticky top-0 border-b border-outline-variant font-bold text-on-surface">
                    <tr>
                      <th className="py-2 px-3 text-center">Row</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Staff ID</th>
                      <th className="py-2 px-3">Full Name</th>
                      <th className="py-2 px-3">National ID (NIN)</th>
                      <th className="py-2 px-3">Assigned Station</th>
                      <th className="py-2 px-3">Validation Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/60">
                    {displayedRows.map((r) => (
                      <tr key={r.rowIndex} className={`hover:bg-surface-container-low/60 ${!r.isValid ? "bg-error/5" : ""}`}>
                        <td className="py-2 px-3 text-center font-mono text-on-surface-variant">{r.rowIndex}</td>
                        <td className="py-2 px-3 text-center">
                          {r.isValid ? (
                            <span className="text-primary font-bold">✓ Ready</span>
                          ) : (
                            <span className="text-error font-bold">✕ Error</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono font-semibold text-primary">{r.staff_id || "—"}</td>
                        <td className="py-2 px-3 font-medium text-on-surface">{r.full_name || "—"}</td>
                        <td className="py-2 px-3 font-mono text-on-surface-variant">{r.national_id_nin || "—"}</td>
                        <td className="py-2 px-3 text-on-surface-variant">{r.station_name || "—"}</td>
                        <td className="py-2 px-3">
                          {r.isValid ? (
                            <span className="text-primary text-[11px] font-semibold">Valid entry</span>
                          ) : (
                            <span className="text-error text-[11px] font-semibold">{r.errors.join(", ")}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-surface-container border-t border-outline-variant flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {parsedRows.length > 0 && validCount > 0 && (
              <button
                onClick={handleConfirmImport}
                disabled={importing}
                className="bg-primary text-white hover:bg-[#0E4526] font-bold text-xs py-2.5 px-5 rounded-lg flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
              >
                {importing ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-sm">how_to_reg</span>
                )}
                Register {validCount} Worker{validCount !== 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default WorkerImportModal;
