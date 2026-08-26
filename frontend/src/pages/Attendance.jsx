import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getWorkers } from "../api/workersApi";
import {
  getLocationsForSupervisor,
  getAttendanceForLocation,
  markAttendance,
  unmarkAttendance,
  markBatchAttendance,
} from "../api/attendanceApi";
import { getLocations } from "../api/hierarchyApi";
import SideNavBar from "../components/SideNavBar";
import MobileHeader from "../components/MobileHeader";

const Attendance = () => {
  const { user } = useAuth();
  const [locations, setLocations] = useState([]);
  
  // Dual-level filter state
  const [selectedHostel, setSelectedHostel] = useState("all");
  const [selectedBlockId, setSelectedBlockId] = useState("all");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  // Workforce lists
  const [allWorkers, setAllWorkers] = useState([]);
  const [markedWorkers, setMarkedWorkers] = useState([]); // list of attendance records for the location(s) + date
  const [loading, setLoading] = useState(true);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [unmarkingId, setUnmarkingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadLocations = async () => {
    try {
      setError("");
      let locData = [];
      if (user.role === "supervisor") {
        locData = await getLocationsForSupervisor(user.id);
      } else {
        locData = await getLocations();
      }
      setLocations(locData);
      setSelectedHostel("all");
      setSelectedBlockId("all");
    } catch (err) {
      console.error(err);
      setError("Failed to load operational locations");
    }
  };

  useEffect(() => {
    if (user) {
      loadLocations();
    }
  }, [user]);

  // Extract unique hostels from assigned locations
  const uniqueHostels = Array.from(
    new Set(
      locations.map((loc) =>
        loc.name.includes(" — ") ? loc.name.split(" — ")[0].trim() : loc.name
      )
    )
  );

  // Blocks belonging to currently selected hostel
  const availableBlocksForHostel = locations.filter((loc) => {
    if (selectedHostel === "all") return true;
    const hostelPrefix = loc.name.includes(" — ")
      ? loc.name.split(" — ")[0].trim()
      : loc.name;
    return hostelPrefix === selectedHostel;
  });

  // Calculate target location IDs for current filter
  const getTargetLocationIds = () => {
    if (selectedBlockId !== "all") {
      return [selectedBlockId];
    }
    if (selectedHostel !== "all") {
      return availableBlocksForHostel.map((l) => l.id.toString());
    }
    return locations.map((l) => l.id.toString());
  };

  const targetLocationIds = getTargetLocationIds();

  const loadAttendance = async () => {
    if (locations.length === 0 || !selectedDate) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError("");

      const workersData = await getWorkers();
      setAllWorkers(workersData);

      if (targetLocationIds.length === 0) {
        setMarkedWorkers([]);
        return;
      }

      // Fetch marked records in parallel for all target locations
      const results = await Promise.all(
        targetLocationIds.map((locId) =>
          getAttendanceForLocation(locId, selectedDate).catch(() => [])
        )
      );
      setMarkedWorkers(results.flat());
    } catch (err) {
      console.error(err);
      setError("Failed to load attendance log");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [selectedHostel, selectedBlockId, selectedDate, locations]);

  const handleHostelChange = (e) => {
    const newHostel = e.target.value;
    setSelectedHostel(newHostel);
    setSelectedBlockId("all"); // reset block when changing hostel
  };

  const handleBlockChange = (e) => {
    setSelectedBlockId(e.target.value);
  };

  // Mark a single worker present
  const handleMarkPresent = async (worker) => {
    if (!worker.active_assignment_id) return;
    try {
      setError("");
      setSuccess("");
      await markAttendance({
        assignment_id: worker.active_assignment_id,
        attendance_date: selectedDate,
      });
      setSuccess(`${worker.full_name} marked present!`);
      loadAttendance();
    } catch (err) {
      setError(err.response?.data?.error || "Error marking attendance");
    }
  };

  // Unmark a worker (Undo mistake)
  const handleUnmarkPresent = async (worker) => {
    if (!worker.active_assignment_id) return;
    try {
      setUnmarkingId(worker.id);
      setError("");
      setSuccess("");
      await unmarkAttendance({
        assignment_id: worker.active_assignment_id,
        attendance_date: selectedDate,
      });
      setSuccess(`Attendance unmarked for ${worker.full_name}`);
      loadAttendance();
    } catch (err) {
      setError(err.response?.data?.error || "Error unmarking attendance");
    } finally {
      setUnmarkingId(null);
    }
  };

  // Mark a batch of workers present
  const handleMarkBatch = async (workersToMark, groupName = "") => {
    const activeAssignments = workersToMark
      .filter((w) => w.active_assignment_id && !markedWorkers.some((m) => m.staff_id === w.staff_id))
      .map((w) => w.active_assignment_id);

    if (activeAssignments.length === 0) return;

    try {
      setBatchSubmitting(true);
      setError("");
      setSuccess("");
      const res = await markBatchAttendance({
        assignment_ids: activeAssignments,
        attendance_date: selectedDate,
      });
      setSuccess(res.message || `Marked present for ${groupName || "all workers"}!`);
      loadAttendance();
    } catch (err) {
      setError(err.response?.data?.error || "Error marking batch attendance");
    } finally {
      setBatchSubmitting(false);
    }
  };

  // Relevant workers for current active filter
  const relevantWorkers = allWorkers.filter(
    (w) =>
      w.status === "active" &&
      w.operational_location_id &&
      targetLocationIds.includes(w.operational_location_id.toString())
  );

  // Group relevant workers by location name
  const workersByLocation = {};
  relevantWorkers.forEach((w) => {
    const locName = w.location_name || "Unassigned Location";
    if (!workersByLocation[locName]) {
      workersByLocation[locName] = [];
    }
    workersByLocation[locName].push(w);
  });

  const totalAssigned = relevantWorkers.length;
  const totalPresent = relevantWorkers.filter((w) =>
    markedWorkers.some((m) => m.staff_id === w.staff_id)
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
            <span className="material-symbols-outlined text-primary">fact_check</span>
            Daily Attendance Log
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-surface-container-high rounded-full px-4 py-1.5 flex items-center gap-2">
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                calendar_today
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant font-semibold">
                {selectedDate}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-margin-mobile md:p-margin-desktop flex-1 max-w-container-max w-full mx-auto space-y-6">
          {/* Header Description & Summary */}
          <div className="border-b border-outline-variant pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="font-display-lg text-display-lg text-on-surface mb-1 font-bold">
                Workforce Attendance
              </h2>
              <p className="font-body-md text-on-surface-variant">
                {selectedHostel === "all"
                  ? "Consolidated register across all your supervised hostels and blocks."
                  : `Attendance register for ${selectedHostel}${selectedBlockId !== "all" ? " (single block view)" : ""}.`}
              </p>
            </div>

            {/* Quick Stats Pill */}
            {totalAssigned > 0 && (
              <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant px-4 py-2 rounded-xl">
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Attendance:</span>
                <span className="text-sm font-bold text-primary">
                  {totalPresent} / {totalAssigned} Present
                </span>
                {totalPresent === totalAssigned ? (
                  <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                ) : (
                  <span className="text-xs font-medium text-on-surface-variant">({totalUnmarked} pending)</span>
                )}
              </div>
            )}
          </div>

          {/* Success / Error Alerts */}
          {error && (
            <div className="p-4 bg-error-container/20 border border-error/30 text-error rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined">error</span>
              <p className="font-body-md">{error}</p>
            </div>
          )}
          {success && (
            <div className="p-4 bg-[#e8f5e9] border border-[#c8e6c9] text-[#1b5e20] rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined">check_circle</span>
              <p className="font-body-md">{success}</p>
            </div>
          )}

          {/* Controls: Dual Filter (Hostel & Block) + Date Selector */}
          <section className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              
              {/* 1. Hostel Filter */}
              <div className="space-y-1">
                <label className="font-label-md text-xs font-bold text-on-surface uppercase tracking-wider block flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-primary">apartment</span>
                  Filter by Hostel
                </label>
                <select
                  className="w-full p-2.5 border border-outline-variant rounded-lg font-body-md text-sm bg-white text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={selectedHostel}
                  onChange={handleHostelChange}
                >
                  <option value="all">🏢 All Hostels ({uniqueHostels.length})</option>
                  {uniqueHostels.map((h) => (
                    <option key={h} value={h}>
                      🏢 {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Block Filter */}
              <div className="space-y-1">
                <label className="font-label-md text-xs font-bold text-on-surface uppercase tracking-wider block flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-secondary">location_on</span>
                  Block / Zone Filter
                </label>
                <select
                  className="w-full p-2.5 border border-outline-variant rounded-lg font-body-md text-sm bg-white text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={selectedBlockId}
                  onChange={handleBlockChange}
                >
                  <option value="all">
                    📋 All Blocks {selectedHostel !== "all" ? `in ${selectedHostel}` : `(${availableBlocksForHostel.length})`}
                  </option>
                  {availableBlocksForHostel.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      📍 {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Date Selector */}
              <div className="space-y-1">
                <label className="font-label-md text-xs font-bold text-on-surface uppercase tracking-wider block flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant">calendar_today</span>
                  Attendance Date
                </label>
                <input
                  type="date"
                  className="w-full p-2.5 border border-outline-variant rounded-lg font-body-md text-sm bg-white text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>

            {/* Quick Batch Action Bar */}
            {totalUnmarked > 0 && (
              <div className="pt-3 border-t border-outline-variant/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <p className="text-xs text-on-surface-variant">
                  <strong>{totalUnmarked}</strong> cleaner(s) pending attendance marking for <strong>{selectedDate}</strong>.
                </p>
                <button
                  onClick={() => handleMarkBatch(relevantWorkers, selectedHostel !== "all" ? selectedHostel : "all locations")}
                  disabled={batchSubmitting}
                  className="px-5 py-2 bg-primary text-white hover:bg-[#0E4526] rounded-lg font-semibold text-xs transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">done_all</span>
                  {batchSubmitting ? "Marking..." : `Mark All Present (${totalUnmarked} workers)`}
                </button>
              </div>
            )}
          </section>

          {/* Workforce Checklist Grouped by Location */}
          {loading ? (
            <div className="text-center py-16 text-on-surface-variant flex flex-col justify-center items-center gap-3">
              <div className="w-8 h-8 border-3 border-outline-variant border-t-primary rounded-full animate-spin"></div>
              <span className="font-body-md">Loading attendance checklist...</span>
            </div>
          ) : Object.keys(workersByLocation).length === 0 ? (
            <div className="bg-white rounded-xl border border-outline-variant p-12 text-center text-on-surface-variant shadow-sm">
              <span className="material-symbols-outlined text-5xl mb-2 text-outline-variant">
                person_search
              </span>
              <h3 className="font-title-lg text-title-lg font-bold text-on-surface mb-1">
                No Workers Found
              </h3>
              <p className="text-sm max-w-md mx-auto">
                No active workers are currently deployed to the selected hostel/block.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(workersByLocation).map(([locName, workers]) => {
                const blockPresent = workers.filter((w) =>
                  markedWorkers.some((m) => m.staff_id === w.staff_id)
                ).length;
                const blockUnmarked = workers.length - blockPresent;

                return (
                  <section
                    key={locName}
                    className="bg-white rounded-xl border border-outline-variant overflow-hidden shadow-sm transition-all"
                  >
                    {/* Location Card Header */}
                    <div className="bg-surface-container-low border-b border-outline-variant px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-[20px]">
                          location_on
                        </span>
                        <div>
                          <h3 className="font-title-md font-bold text-on-surface text-sm sm:text-base">
                            {locName}
                          </h3>
                          <p className="text-xs text-on-surface-variant">
                            {blockPresent} / {workers.length} workers present
                          </p>
                        </div>
                      </div>

                      {/* Block-level quick action */}
                      {blockUnmarked > 0 && (
                        <button
                          onClick={() => handleMarkBatch(workers, locName)}
                          disabled={batchSubmitting}
                          className="self-start sm:self-auto px-3 py-1.5 bg-white border border-primary/40 hover:bg-primary/5 text-primary rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-xs">done_all</span>
                          Mark {blockUnmarked} in this block
                        </button>
                      )}
                    </div>

                    {/* Worker Roster List */}
                    <div className="divide-y divide-outline-variant/60 p-2 sm:p-4">
                      {workers.map((worker) => {
                        const isPresent = markedWorkers.some(
                          (m) => m.staff_id === worker.staff_id
                        );

                        return (
                          <div
                            key={worker.id}
                            className={`flex items-center justify-between py-3 px-3 sm:px-4 rounded-lg transition-colors ${
                              isPresent
                                ? "bg-surface-container-lowest/80"
                                : "hover:bg-surface-container-low"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                  isPresent
                                    ? "bg-primary/10 text-primary"
                                    : "bg-surface-container text-on-surface-variant"
                                }`}
                              >
                                {worker.full_name?.charAt(0) || "W"}
                              </div>
                              <div>
                                <p
                                  className={`font-body-md text-sm font-semibold ${
                                    isPresent
                                      ? "text-on-surface font-bold"
                                      : "text-on-surface"
                                  }`}
                                >
                                  {worker.full_name}
                                </p>
                                <p className="font-data-mono text-[11px] text-on-surface-variant">
                                  ID: {worker.staff_id}
                                </p>
                              </div>
                            </div>

                            {/* Action Button / Present Badge with Undo */}
                            <div>
                              {isPresent ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs">
                                    <span className="material-symbols-outlined text-sm">
                                      check_circle
                                    </span>
                                    Present
                                  </span>
                                  <button
                                    onClick={() => handleUnmarkPresent(worker)}
                                    disabled={unmarkingId === worker.id}
                                    className="p-1 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded-md transition-colors flex items-center justify-center"
                                    title="Undo / Unmark this attendance"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">
                                      undo
                                    </span>
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleMarkPresent(worker)}
                                  disabled={batchSubmitting}
                                  className="bg-white border border-outline-variant hover:border-primary text-on-surface hover:text-primary px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-all flex items-center gap-1 shadow-2xs hover:shadow-xs active:scale-95"
                                >
                                  <span className="material-symbols-outlined text-xs">
                                    done
                                  </span>
                                  Mark Present
                                </button>
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
    </div>
  );
};

export default Attendance;
