import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { getWorkers } from "../api/workersApi";
import {
  getLocationsForSupervisor,
  getAttendanceForLocation,
  markAttendance,
  unmarkAttendance,
  markBatchAttendance,
  logAbsence,
  removeAbsenceLog,
  getAbsenceLogsForLocation,
} from "../api/attendanceApi";
import { getLocations } from "../api/hierarchyApi";
import SideNavBar from "../components/SideNavBar";
import MobileHeader from "../components/MobileHeader";
import { getImageUrl } from "../utils/imageUrl";

/* ─── tiny toast component ─────────────────────────────────────────────── */
function Toast({ toasts }) {
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium transition-all animate-fade-in
            ${
              t.type === "error"
                ? "bg-error text-white"
                : "bg-[#1b5e20] text-white"
            }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {t.type === "error" ? "error" : "check_circle"}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

/* ─── Absence reason popover ────────────────────────────────────────────── */
function AbsenceModal({ worker, date, onClose, onSave, existingReason }) {
  const [reason, setReason] = useState(existingReason || "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!reason.trim()) return;
    setSaving(true);
    await onSave(reason.trim());
    setSaving(false);
  }

  return (
    <div
      className="fixed inset-0 z-[8000] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm mx-auto p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-on-surface text-base">
              Log Absence Reason
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              <span className="font-semibold text-on-surface">
                {worker.full_name}
              </span>
              {" · "}
              <span>{date}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Note */}
        {/* <p className="text-[11px] text-on-surface-variant bg-surface-container-low rounded-lg px-3 py-2 flex items-start gap-1.5">
          <span className="material-symbols-outlined text-[14px] mt-0.5 shrink-0">info</span>
          This is an audit note only. Pay register remains unaffected.
        </p> */}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            ref={inputRef}
            rows={3}
            placeholder="e.g. Reported sick, supervisor informed at 7:30am…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border border-outline-variant rounded-xl px-3.5 py-2.5 text-sm text-on-surface resize-none focus:border-primary focus:ring-1 focus:ring-primary outline-none placeholder:text-on-surface-variant/60 font-body-md"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-outline-variant rounded-xl text-sm text-on-surface-variant hover:bg-surface-container-low transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !reason.trim()}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-[#0E4526] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">
                    save
                  </span>
                  {existingReason ? "Update" : "Save"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN ATTENDANCE PAGE
═══════════════════════════════════════════════════════════════════════════ */
const Attendance = () => {
  const { user } = useAuth();
  const [locations, setLocations] = useState([]);
  const [selectedHostel, setSelectedHostel] = useState("all");
  const [selectedBlockId, setSelectedBlockId] = useState("all");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [allWorkers, setAllWorkers] = useState([]);
  // Optimistic state: Set of staff_ids currently marked present
  const [presentSet, setPresentSet] = useState(new Set());
  // Absence logs: map of staff_id -> { reason, assignment_id }
  const [absenceMap, setAbsenceMap] = useState({});

  const [loading, setLoading] = useState(true);
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  // Absence modal
  const [absenceModalWorker, setAbsenceModalWorker] = useState(null);

  const addToast = useCallback((message, type = "success") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      3500,
    );
  }, []);

  /* ── Load locations ── */
  const loadLocations = useCallback(async () => {
    try {
      let locData = [];
      if (user.role === "supervisor") {
        locData = await getLocationsForSupervisor(user.id);
      } else {
        locData = await getLocations();
      }
      setLocations(locData);
    } catch {
      addToast("Failed to load locations", "error");
    }
  }, [user, addToast]);

  useEffect(() => {
    if (user) loadLocations();
  }, [user, loadLocations]);

  /* ── Derived filter values ── */
  const uniqueHostels = Array.from(
    new Set(
      locations.map((loc) =>
        loc.name.includes(" — ") ? loc.name.split(" — ")[0].trim() : loc.name,
      ),
    ),
  );

  const availableBlocksForHostel = locations.filter((loc) => {
    if (selectedHostel === "all") return true;
    const hostelPrefix = loc.name.includes(" — ")
      ? loc.name.split(" — ")[0].trim()
      : loc.name;
    return hostelPrefix === selectedHostel;
  });

  const getTargetLocationIds = () => {
    if (selectedBlockId !== "all") return [selectedBlockId];
    if (selectedHostel !== "all")
      return availableBlocksForHostel.map((l) => l.id.toString());
    return locations.map((l) => l.id.toString());
  };
  const targetLocationIds = getTargetLocationIds();

  /* ── Load attendance + absence logs ── */
  const loadAttendance = useCallback(async () => {
    if (locations.length === 0 || !selectedDate) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [workersData, ...attendanceResults] = await Promise.all([
        getWorkers(),
        ...targetLocationIds.map((id) =>
          getAttendanceForLocation(id, selectedDate).catch(() => []),
        ),
      ]);
      setAllWorkers(workersData);

      const markedSet = new Set(
        attendanceResults.flat().map((r) => r.staff_id),
      );
      setPresentSet(markedSet);

      // Load absence logs in parallel
      const absenceResults = await Promise.all(
        targetLocationIds.map((id) =>
          getAbsenceLogsForLocation(id, selectedDate).catch(() => []),
        ),
      );
      const aMap = {};
      absenceResults.flat().forEach((log) => {
        aMap[log.staff_id] = {
          reason: log.reason,
          assignment_id: log.assignment_id,
        };
      });
      setAbsenceMap(aMap);
    } catch {
      addToast("Failed to load attendance", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations, selectedHostel, selectedBlockId, selectedDate]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  /* ── Optimistic mark present ── */
  const handleMarkPresent = async (worker) => {
    if (!worker.active_assignment_id) return;
    // Optimistic update
    setPresentSet((prev) => new Set([...prev, worker.staff_id]));
    // Remove any absence log optimistically
    setAbsenceMap((prev) => {
      const next = { ...prev };
      delete next[worker.staff_id];
      return next;
    });
    try {
      await markAttendance({
        assignment_id: worker.active_assignment_id,
        attendance_date: selectedDate,
      });
    } catch (err) {
      // Rollback
      setPresentSet((prev) => {
        const next = new Set(prev);
        next.delete(worker.staff_id);
        return next;
      });
      const msg = err.response?.data?.error || "Failed to mark attendance";
      addToast(`${worker.full_name.split(" ")[0]}: ${msg}`, "error");
    }
  };

  /* ── Optimistic unmark ── */
  const handleUnmarkPresent = async (worker) => {
    if (!worker.active_assignment_id) return;
    setPresentSet((prev) => {
      const next = new Set(prev);
      next.delete(worker.staff_id);
      return next;
    });
    try {
      await unmarkAttendance({
        assignment_id: worker.active_assignment_id,
        attendance_date: selectedDate,
      });
    } catch (err) {
      setPresentSet((prev) => new Set([...prev, worker.staff_id]));
      addToast(`Could not unmark ${worker.full_name.split(" ")[0]}`, "error");
    }
  };

  /* ── Mark all in batch ── */
  const handleMarkBatch = async (workersToMark, groupName = "") => {
    const toMark = workersToMark.filter(
      (w) => w.active_assignment_id && !presentSet.has(w.staff_id),
    );
    if (toMark.length === 0) return;
    // Optimistic
    setPresentSet((prev) => {
      const next = new Set(prev);
      toMark.forEach((w) => next.add(w.staff_id));
      return next;
    });
    try {
      setBatchSubmitting(true);
      await markBatchAttendance({
        assignment_ids: toMark.map((w) => w.active_assignment_id),
        attendance_date: selectedDate,
      });
      addToast(
        `Marked ${toMark.length} worker(s) present${groupName ? ` — ${groupName}` : ""}`,
      );
    } catch (err) {
      // Rollback
      setPresentSet((prev) => {
        const next = new Set(prev);
        toMark.forEach((w) => next.delete(w.staff_id));
        return next;
      });
      addToast("Batch mark failed. Please try again.", "error");
    } finally {
      setBatchSubmitting(false);
    }
  };

  /* ── Save absence log ── */
  const handleSaveAbsence = async (reason) => {
    const worker = absenceModalWorker;
    if (!worker?.active_assignment_id) return;
    try {
      await logAbsence({
        assignment_id: worker.active_assignment_id,
        absence_date: selectedDate,
        reason,
      });
      setAbsenceMap((prev) => ({
        ...prev,
        [worker.staff_id]: {
          reason,
          assignment_id: worker.active_assignment_id,
        },
      }));
      addToast(`Absence reason logged for ${worker.full_name.split(" ")[0]}`);
      setAbsenceModalWorker(null);
    } catch (err) {
      addToast(err.response?.data?.error || "Failed to log absence", "error");
    }
  };

  /* ── Remove absence log ── */
  const handleRemoveAbsence = async (worker) => {
    if (!worker.active_assignment_id) return;
    try {
      await removeAbsenceLog({
        assignment_id: worker.active_assignment_id,
        absence_date: selectedDate,
      });
      setAbsenceMap((prev) => {
        const next = { ...prev };
        delete next[worker.staff_id];
        return next;
      });
      addToast("Absence note removed");
    } catch {
      addToast("Failed to remove absence note", "error");
    }
  };

  /* ── Derived worker lists ── */
  const relevantWorkers = allWorkers.filter(
    (w) =>
      w.status === "active" &&
      w.operational_location_id &&
      targetLocationIds.includes(w.operational_location_id.toString()),
  );

  const workersByLocation = {};
  relevantWorkers.forEach((w) => {
    const locName = w.location_name || "Unassigned";
    if (!workersByLocation[locName]) workersByLocation[locName] = [];
    workersByLocation[locName].push(w);
  });

  const totalAssigned = relevantWorkers.length;
  const totalPresent = relevantWorkers.filter((w) =>
    presentSet.has(w.staff_id),
  ).length;
  const totalUnmarked = totalAssigned - totalPresent;

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col md:flex-row">
      <SideNavBar />
      <div className="flex-1 flex flex-col min-h-screen md:ml-64 bg-surface">
        <MobileHeader title="Daily Attendance" />

        {/* Desktop Header */}
        <header className="hidden md:flex justify-between items-center w-full px-margin-desktop h-16 bg-surface border-b border-outline-variant sticky top-0 z-[900]">
          <div className="font-headline-sm text-headline-sm font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">
              fact_check
            </span>
            Daily Attendance Log
          </div>
          <div className="flex items-center gap-3">
            {totalAssigned > 0 && (
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  totalPresent === totalAssigned
                    ? "bg-primary/10 text-primary"
                    : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {totalPresent} / {totalAssigned} Present
              </span>
            )}
            <span className="bg-surface-container-high rounded-full px-3 py-1.5 flex items-center gap-1.5 text-on-surface-variant text-xs font-semibold">
              <span className="material-symbols-outlined text-[16px]">
                calendar_today
              </span>
              {selectedDate}
            </span>
          </div>
        </header>

        <main className="p-margin-mobile md:p-margin-desktop flex-1 max-w-container-max w-full mx-auto space-y-5">
          {/* Page Title */}
          <div className="border-b border-outline-variant pb-4">
            <h2 className="font-display-lg text-display-lg text-on-surface font-bold">
              Workforce Attendance
            </h2>
            <p className="font-body-md text-on-surface-variant text-sm mt-0.5">
              {selectedHostel === "all"
                ? "All your supervised locations."
                : `${selectedHostel}${selectedBlockId !== "all" ? " · single block" : ""}`}
            </p>
          </div>

          {/* Filters + Batch Action */}
          <section className="bg-white border border-outline-variant rounded-2xl p-5 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              {/* Hostel Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-on-surface uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-primary">
                    apartment
                  </span>
                  Hostel
                </label>
                <select
                  className="w-full p-2.5 border border-outline-variant rounded-xl text-sm bg-white text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={selectedHostel}
                  onChange={(e) => {
                    setSelectedHostel(e.target.value);
                    setSelectedBlockId("all");
                  }}
                >
                  <option value="all">
                    All Hostels ({uniqueHostels.length})
                  </option>
                  {uniqueHostels.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Block Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-on-surface uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-secondary">
                    location_on
                  </span>
                  Block / Zone
                </label>
                <select
                  className="w-full p-2.5 border border-outline-variant rounded-xl text-sm bg-white text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={selectedBlockId}
                  onChange={(e) => setSelectedBlockId(e.target.value)}
                >
                  <option value="all">
                    All Blocks{" "}
                    {selectedHostel !== "all"
                      ? `in ${selectedHostel}`
                      : `(${availableBlocksForHostel.length})`}
                  </option>
                  {availableBlocksForHostel.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-on-surface uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
                    calendar_today
                  </span>
                  Date
                </label>
                <input
                  type="date"
                  className="w-full p-2.5 border border-outline-variant rounded-xl text-sm bg-white text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>

            {/* Batch Action Bar */}
            {totalUnmarked > 0 && (
              <div className="pt-3 border-t border-outline-variant/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <p className="text-xs text-on-surface-variant">
                  <strong>{totalUnmarked}</strong> worker(s) not yet marked for{" "}
                  <strong>{selectedDate}</strong>.
                </p>
                <button
                  onClick={() =>
                    handleMarkBatch(
                      relevantWorkers,
                      selectedHostel !== "all" ? selectedHostel : "",
                    )
                  }
                  disabled={batchSubmitting}
                  className="px-4 py-2 bg-primary text-white hover:bg-[#0E4526] rounded-xl font-semibold text-xs transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm">
                    done_all
                  </span>
                  {batchSubmitting
                    ? "Marking…"
                    : `Mark All Present (${totalUnmarked})`}
                </button>
              </div>
            )}
          </section>

          {/* Checklist */}
          {loading ? (
            <div className="flex justify-center items-center py-20 gap-3 text-on-surface-variant">
              <div className="w-7 h-7 border-2 border-outline border-t-primary rounded-full animate-spin" />
              <span className="text-sm">Loading checklist…</span>
            </div>
          ) : Object.keys(workersByLocation).length === 0 ? (
            <div className="bg-white rounded-2xl border border-outline-variant p-14 text-center shadow-sm">
              <span className="material-symbols-outlined text-5xl text-outline-variant mb-2 block">
                person_search
              </span>
              <h3 className="font-bold text-on-surface mb-1">
                No Workers Found
              </h3>
              <p className="text-sm text-on-surface-variant">
                No active workers deployed to this location.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(workersByLocation).map(([locName, workers]) => {
                const blockPresent = workers.filter((w) =>
                  presentSet.has(w.staff_id),
                ).length;
                const blockUnmarked = workers.length - blockPresent;
                const blockPct =
                  workers.length > 0
                    ? Math.round((blockPresent / workers.length) * 100)
                    : 0;

                return (
                  <section
                    key={locName}
                    className="bg-white rounded-2xl border border-outline-variant overflow-hidden shadow-sm"
                  >
                    {/* Block Header */}
                    <div className="bg-surface-container-low border-b border-outline-variant px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-secondary text-[18px]">
                          location_on
                        </span>
                        <div>
                          <h3 className="font-bold text-on-surface text-sm">
                            {locName}
                          </h3>
                          <p className="text-[11px] text-on-surface-variant">
                            {blockPresent}/{workers.length} present · {blockPct}
                            % attendance
                          </p>
                        </div>
                      </div>
                      {blockUnmarked > 0 && (
                        <button
                          onClick={() => handleMarkBatch(workers, locName)}
                          disabled={batchSubmitting}
                          className="self-start sm:self-auto px-3 py-1.5 bg-white border border-primary/40 hover:bg-primary/5 text-primary rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            done_all
                          </span>
                          Mark {blockUnmarked} remaining
                        </button>
                      )}
                    </div>

                    {/* Worker Rows */}
                    <div className="divide-y divide-outline-variant/40">
                      {workers.map((worker) => {
                        const isPresent = presentSet.has(worker.staff_id);
                        const absenceEntry = absenceMap[worker.staff_id];
                        const initials =
                          worker.full_name
                            ?.split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase() || "CW";

                        return (
                          <div
                            key={worker.id}
                            className={`flex items-center justify-between py-3 px-5 transition-colors ${
                              isPresent
                                ? "bg-primary/[0.03]"
                                : "hover:bg-surface-container-lowest"
                            }`}
                          >
                            {/* Avatar + Name */}
                            <div className="flex items-center gap-3 min-w-0">
                              {worker.photo_url ? (
                                <img
                                  src={getImageUrl(worker.photo_url)}
                                  alt={worker.full_name}
                                  className="w-9 h-9 rounded-full object-cover border border-primary/20 shrink-0"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                    e.target.nextSibling.style.display = "flex";
                                  }}
                                />
                              ) : null}
                              <div
                                className={`w-9 h-9 rounded-full items-center justify-center font-bold text-xs shrink-0 ${
                                  worker.photo_url ? "hidden" : "flex"
                                } ${isPresent ? "bg-primary text-white" : "bg-primary/10 text-primary"}`}
                              >
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <p
                                  className={`text-sm font-semibold truncate ${isPresent ? "text-on-surface" : "text-on-surface"}`}
                                >
                                  {worker.full_name}
                                </p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-[10px] text-on-surface-variant">
                                    {worker.staff_id}
                                  </span>
                                  {/* Absence note badge */}
                                  {!isPresent && absenceEntry && (
                                    <span className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 max-w-[160px]">
                                      <span className="material-symbols-outlined text-[11px]">
                                        note
                                      </span>
                                      <span className="truncate">
                                        {absenceEntry.reason}
                                      </span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 shrink-0 ml-3">
                              {isPresent ? (
                                <>
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-[11px]">
                                    <span className="material-symbols-outlined text-[14px]">
                                      check_circle
                                    </span>
                                    Present
                                  </span>
                                  <button
                                    onClick={() => handleUnmarkPresent(worker)}
                                    className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded-lg transition-colors"
                                    title="Undo"
                                  >
                                    <span className="material-symbols-outlined text-[17px]">
                                      undo
                                    </span>
                                  </button>
                                </>
                              ) : (
                                <>
                                  {/* Log absence button */}
                                  <button
                                    onClick={() =>
                                      setAbsenceModalWorker(worker)
                                    }
                                    className={`p-1.5 rounded-lg transition-colors ${
                                      absenceEntry
                                        ? "text-amber-600 bg-amber-50 hover:bg-amber-100"
                                        : "text-on-surface-variant hover:text-amber-600 hover:bg-amber-50"
                                    }`}
                                    title={
                                      absenceEntry
                                        ? "Edit absence reason"
                                        : "Log absence reason"
                                    }
                                  >
                                    <span className="material-symbols-outlined text-[17px]">
                                      {absenceEntry ? "edit_note" : "note_add"}
                                    </span>
                                  </button>
                                  {/* Remove note if exists */}
                                  {absenceEntry && (
                                    <button
                                      onClick={() =>
                                        handleRemoveAbsence(worker)
                                      }
                                      className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors"
                                      title="Remove absence note"
                                    >
                                      <span className="material-symbols-outlined text-[17px]">
                                        remove_circle_outline
                                      </span>
                                    </button>
                                  )}
                                  {/* Mark Present */}
                                  <button
                                    onClick={() => handleMarkPresent(worker)}
                                    disabled={batchSubmitting}
                                    className="bg-white border border-outline-variant hover:border-primary text-on-surface hover:text-primary px-3 py-1.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-1 shadow-sm hover:shadow active:scale-95 disabled:opacity-50"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">
                                      done
                                    </span>
                                    Mark
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Absence Modal */}
      {absenceModalWorker && (
        <AbsenceModal
          worker={absenceModalWorker}
          date={selectedDate}
          existingReason={absenceMap[absenceModalWorker.staff_id]?.reason || ""}
          onClose={() => setAbsenceModalWorker(null)}
          onSave={handleSaveAbsence}
        />
      )}

      {/* Toast notifications */}
      <Toast toasts={toasts} />
    </div>
  );
};

export default Attendance;
