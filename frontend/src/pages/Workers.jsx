import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getWorkers, createWorker } from "../api/workersApi";
import { getDivisions, getUnits, getLocations } from "../api/hierarchyApi";
import SideNavBar from "../components/SideNavBar";
import MobileHeader from "../components/MobileHeader";

const Workers = () => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "administrator";
  const isDivAdmin = currentUser?.role === "division_admin";

  const [workers, setWorkers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | inactive
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");

  // Deployment fields
  const [divisions, setDivisions] = useState([]);
  const [divisionName, setDivisionName] = useState("");
  const [units, setUnits] = useState([]);
  const [locations, setLocations] = useState([]);
  const [assignDivId, setAssignDivId] = useState("");
  const [assignUnitId, setAssignUnitId] = useState("");
  const [assignLocId, setAssignLocId] = useState("");
  const [assignEffectiveFrom, setAssignEffectiveFrom] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  const loadWorkers = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getWorkers();
      setWorkers(data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch workforce directory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkers();
  }, []);

  const handleOpenRegisterModal = async () => {
    try {
      setError("");
      setSuccess("");
      setStaffId("");
      setFullName("");
      setPhoneNumber("");
      setAppointmentDate(new Date().toISOString().slice(0, 10));
      setAssignEffectiveFrom(new Date().toISOString().slice(0, 10));
      setAssignUnitId("");
      setAssignLocId("");
      setLocations([]);

      if (isDivAdmin && currentUser?.division_id) {
        setAssignDivId(String(currentUser.division_id));
        const [divData, unitData] = await Promise.all([
          getDivisions(),
          getUnits(currentUser.division_id),
        ]);
        const myDiv = divData.find((d) => Number(d.id) === Number(currentUser.division_id));
        setDivisionName(myDiv?.name || "Your Division");
        setUnits(unitData);
      } else {
        setAssignDivId("");
        setUnits([]);
        const divData = await getDivisions();
        setDivisions(divData);
      }

      setIsModalOpen(true);
    } catch (err) {
      console.error(err);
      setError("Failed to load registration options");
    }
  };

  const handleAssignDivChange = async (divId) => {
    setAssignDivId(divId);
    setAssignUnitId("");
    setAssignLocId("");
    setUnits([]);
    setLocations([]);
    if (divId) {
      const data = await getUnits(divId);
      setUnits(data);
    }
  };

  const handleAssignUnitChange = async (unitId) => {
    setAssignUnitId(unitId);
    setAssignLocId("");
    setLocations([]);
    if (unitId) {
      const data = await getLocations(unitId);
      setLocations(data);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!staffId.trim() || !fullName.trim() || !appointmentDate) {
      setError("Staff ID, Full Name, and Appointment Date are required");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        staff_id: staffId.trim(),
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim() || null,
        appointment_date: appointmentDate,
      };

      if (assignDivId && assignUnitId && assignLocId) {
        payload.division_id = Number(assignDivId);
        payload.operational_unit_id = Number(assignUnitId);
        payload.operational_location_id = Number(assignLocId);
        payload.effective_date = assignEffectiveFrom || appointmentDate;
      }

      await createWorker(payload);
      setSuccess("Worker registered and configured successfully!");
      setIsModalOpen(false);
      loadWorkers();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to register worker");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredWorkers = workers.filter((w) => {
    const matchesSearch =
      w.full_name.toLowerCase().includes(search.toLowerCase()) ||
      w.staff_id.toLowerCase().includes(search.toLowerCase()) ||
      (w.location_name &&
        w.location_name.toLowerCase().includes(search.toLowerCase())) ||
      (w.unit_name && w.unit_name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "all" || w.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col md:flex-row">
      <SideNavBar />
      <div className="flex-1 flex flex-col min-h-screen md:ml-64">
        <MobileHeader title="Workforce Directory" />

        {/* Desktop Header */}
        <header className="hidden md:flex justify-between items-center w-full px-margin-desktop h-16 bg-surface border-b border-outline-variant sticky top-0 z-[900]">
          <div className="font-headline-sm text-headline-sm font-bold text-primary">
            Workforce Management
          </div>
          <div className="text-on-surface-variant font-label-md text-label-md">
            Casual Employees Directory
          </div>
        </header>

        {/* Page Content */}
        <main className="p-margin-mobile md:p-margin-desktop flex-1 max-w-container-max w-full mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-outline-variant pb-4 gap-4">
            <div>
              <h2 className="font-display-lg text-display-lg text-on-surface mb-2 font-bold">
                Worker Directory
              </h2>
              <p className="font-body-lg text-on-surface-variant">
                Manage registered casual workers, check assignments, and
                initiate transfers.
              </p>
            </div>
            <button
              onClick={handleOpenRegisterModal}
              className="bg-primary text-on-primary hover:bg-[#0E4526] transition-colors rounded-lg py-2.5 px-4 font-label-md text-label-md flex items-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">
                person_add
              </span>
              Register Worker
            </button>
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

          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                search
              </span>
              <input
                className="w-full pl-10 pr-4 py-2 bg-white border border-[#E4E7E6] rounded font-body-md text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                placeholder="Search by name, ID, or location..."
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex gap-4 w-full md:w-auto justify-end">
              <div className="flex items-center gap-2 text-on-surface-variant font-label-md text-label-md">
                <span className="material-symbols-outlined text-[18px]">
                  filter_list
                </span>
                <select
                  className="bg-white border border-[#E4E7E6] rounded px-3 py-1.5 focus:border-primary focus:ring-0 text-on-surface"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Directory Data Table */}
          <div className="bg-white rounded-xl border border-[#E4E7E6] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F7F9F8] border-b border-[#E4E7E6]">
                    <th className="py-3.5 px-6 font-label-md text-label-md text-on-surface-variant font-semibold whitespace-nowrap">
                      Staff ID
                    </th>
                    <th className="py-3.5 px-6 font-label-md text-label-md text-on-surface-variant font-semibold whitespace-nowrap">
                      Full Name
                    </th>
                    <th className="py-3.5 px-6 font-label-md text-label-md text-on-surface-variant font-semibold whitespace-nowrap">
                      Current Division / Unit
                    </th>
                    <th className="py-3.5 px-6 font-label-md text-label-md text-on-surface-variant font-semibold whitespace-nowrap">
                      Location
                    </th>
                    <th className="py-3.5 px-6 font-label-md text-label-md text-on-surface-variant font-semibold whitespace-nowrap">
                      Status
                    </th>
                    <th className="py-3.5 px-6 font-label-md text-label-md text-on-surface-variant font-semibold whitespace-nowrap text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E7E6] font-body-md text-body-md text-on-surface bg-white">
                  {loading ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="py-12 text-center text-on-surface-variant"
                      >
                        <div className="flex justify-center items-center gap-2">
                          <div className="w-6 h-6 border-2 border-outline border-t-primary rounded-full animate-spin"></div>
                          <span>Loading workforce files...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredWorkers.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="py-12 text-center text-on-surface-variant"
                      >
                        <span className="material-symbols-outlined text-4xl mb-2 text-outline">
                          search_off
                        </span>
                        <p>
                          No workers matching your search criteria were found.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredWorkers.map((worker) => {
                      const initials = worker.full_name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase();

                      return (
                        <tr
                          key={worker.id}
                          className="hover:bg-surface-container-low transition-colors group cursor-pointer"
                          onClick={() => navigate(`/workers/${worker.id}`)}
                        >
                          <td className="py-3 px-6 font-data-mono text-data-mono text-on-surface-variant">
                            {worker.staff_id}
                          </td>
                          <td className="py-3 px-6 font-semibold flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                              {initials}
                            </div>
                            {worker.full_name}
                          </td>
                          <td className="py-3 px-6 text-on-surface-variant">
                            {worker.division_name
                              ? `${worker.division_name} / ${worker.unit_name}`
                              : "No active assignment"}
                          </td>
                          <td className="py-3 px-6 text-on-surface-variant">
                            {worker.location_name || "Unassigned"}
                          </td>
                          <td className="py-3 px-6">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-label-md text-label-md ${
                                worker.status === "active"
                                  ? "bg-primary-container/10 text-[#145A32]"
                                  : "bg-error/10 text-error"
                              }`}
                            >
                              {worker.status === "active"
                                ? "Active"
                                : "Inactive"}
                            </span>
                          </td>
                          <td
                            className="py-3 px-6 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => navigate(`/workers/${worker.id}`)}
                              className="bg-surface border border-outline-variant hover:border-primary text-primary px-3 py-1.5 rounded transition-all text-xs font-semibold"
                            >
                              View File
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Register Worker Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white border border-outline-variant rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-[#F7F9F8] border-b border-outline-variant px-6 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">person_add</span>
                </div>
                <div>
                  <h3 className="font-title-lg text-title-lg text-on-surface font-bold">
                    Register New Casual Worker
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Add worker credentials and optionally assign their operational post.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-on-surface-variant hover:bg-surface-container-high p-1.5 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleRegister} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Section 1: Basic Information */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-primary text-[18px]">badge</span>
                    <h4 className="font-label-lg font-bold text-on-surface text-sm uppercase tracking-wider">
                      1. Worker Information
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-label-md text-xs font-semibold text-on-surface block">
                        Staff ID / Vetting Ref <span className="text-error">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ABU-2023-0142"
                        className="w-full p-2.5 border border-outline-variant rounded-lg font-body-md text-sm bg-white text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        value={staffId}
                        onChange={(e) => setStaffId(e.target.value)}
                        disabled={submitting}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-label-md text-xs font-semibold text-on-surface block">
                        Full Name <span className="text-error">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Ibrahim Sani"
                        className="w-full p-2.5 border border-outline-variant rounded-lg font-body-md text-sm bg-white text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        disabled={submitting}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-label-md text-xs font-semibold text-on-surface block">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. +234 803 123 4567"
                        className="w-full p-2.5 border border-outline-variant rounded-lg font-body-md text-sm bg-white text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        disabled={submitting}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-label-md text-xs font-semibold text-on-surface block">
                        Appointment Date <span className="text-error">*</span>
                      </label>
                      <input
                        type="date"
                        className="w-full p-2.5 border border-outline-variant rounded-lg font-body-md text-sm bg-white text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        value={appointmentDate}
                        onChange={(e) => setAppointmentDate(e.target.value)}
                        disabled={submitting}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Deployment / Placement */}
                <div className="pt-5 border-t border-outline-variant/70">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-[18px]">location_away</span>
                      <h4 className="font-label-lg font-bold text-on-surface text-sm uppercase tracking-wider">
                        2. Initial Placement <span className="text-xs font-normal text-on-surface-variant lowercase">(optional)</span>
                      </h4>
                    </div>
                    {isDivAdmin && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary/10 text-secondary border border-secondary/20">
                        <span className="material-symbols-outlined text-[13px]">domain</span>
                        {divisionName || "Student Affairs Division"}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Division Field (Only editable by general administrator) */}
                    {isAdmin && (
                      <div className="space-y-1">
                        <label className="font-label-md text-xs font-semibold text-on-surface block">
                          Division
                        </label>
                        <select
                          className="w-full p-2.5 border border-outline-variant rounded-lg font-body-md text-sm bg-white text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                          value={assignDivId}
                          onChange={(e) => handleAssignDivChange(e.target.value)}
                          disabled={submitting}
                        >
                          <option value="">Choose Division...</option>
                          {divisions.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Operational Unit Field */}
                    <div className={`space-y-1 ${!isAdmin ? "sm:col-span-1" : ""}`}>
                      <label className="font-label-md text-xs font-semibold text-on-surface block">
                        Operational Unit
                      </label>
                      <select
                        className="w-full p-2.5 border border-outline-variant rounded-lg font-body-md text-sm bg-white text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all disabled:bg-surface-container-low disabled:text-on-surface-variant/60"
                        value={assignUnitId}
                        onChange={(e) => handleAssignUnitChange(e.target.value)}
                        disabled={submitting || (isAdmin && !assignDivId)}
                      >
                        <option value="">{isAdmin && !assignDivId ? "Select Division first..." : "Choose Unit..."}</option>
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Operational Location Field */}
                    <div className="space-y-1">
                      <label className="font-label-md text-xs font-semibold text-on-surface block">
                        Operational Location / Zone
                      </label>
                      <select
                        className="w-full p-2.5 border border-outline-variant rounded-lg font-body-md text-sm bg-white text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all disabled:bg-surface-container-low disabled:text-on-surface-variant/60"
                        value={assignLocId}
                        onChange={(e) => setAssignLocId(e.target.value)}
                        disabled={submitting || !assignUnitId}
                      >
                        <option value="">{!assignUnitId ? "Select Unit first..." : "Choose Block / Zone..."}</option>
                        {(() => {
                          const groups = {};
                          const ungrouped = [];
                          locations.forEach((loc) => {
                            if (loc.name.includes(" — ")) {
                              const [hostel, block] = loc.name.split(" — ");
                              if (!groups[hostel]) groups[hostel] = [];
                              groups[hostel].push({ ...loc, blockName: block });
                            } else {
                              ungrouped.push(loc);
                            }
                          });

                          const hasGroups = Object.keys(groups).length > 0;
                          if (!hasGroups) {
                            return locations.map((l) => (
                              <option key={l.id} value={l.id}>{l.name}</option>
                            ));
                          }

                          return (
                            <>
                              {ungrouped.map((l) => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                              ))}
                              {Object.entries(groups).map(([hostelName, locs]) => (
                                <optgroup key={hostelName} label={`📍 ${hostelName}`}>
                                  {locs.map((l) => (
                                    <option key={l.id} value={l.id}>
                                      {l.name}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </>
                          );
                        })()}
                      </select>
                    </div>

                    {/* Effective Date Field */}
                    <div className="space-y-1">
                      <label className="font-label-md text-xs font-semibold text-on-surface block">
                        Effective Placement Date
                      </label>
                      <input
                        type="date"
                        className="w-full p-2.5 border border-outline-variant rounded-lg font-body-md text-sm bg-white text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all disabled:bg-surface-container-low disabled:text-on-surface-variant/60"
                        value={assignEffectiveFrom}
                        onChange={(e) => setAssignEffectiveFrom(e.target.value)}
                        disabled={submitting || !assignLocId}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-[#F7F9F8] px-6 py-4 border-t border-outline-variant flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-outline-variant hover:bg-surface-container-high rounded-lg text-sm font-semibold transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white hover:bg-[#0E4526] rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50 flex items-center gap-2 transition-colors"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">check</span>
                      <span>Register Worker</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workers;
