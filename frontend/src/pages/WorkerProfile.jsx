import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  getWorker,
  updateWorker,
  createAssignment,
  getWorkerAssignmentHistory,
  getWorkerCurrentAssignment,
} from "../api/workersApi";
import { createTransfer } from "../api/transfersApi";
import { getDivisions, getUnits, getLocations } from "../api/hierarchyApi";
import { useAuth } from "../context/AuthContext";
import SideNavBar from "../components/SideNavBar";
import MobileHeader from "../components/MobileHeader";

const WorkerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "administrator";
  const isDivAdmin = currentUser?.role === "division_admin";

  const [worker, setWorker] = useState(null);
  const [currentAssignment, setCurrentAssignment] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modals state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  // Dropdown options
  const [divisions, setDivisions] = useState([]);
  const [divisionName, setDivisionName] = useState("");
  const [units, setUnits] = useState([]);
  const [locations, setLocations] = useState([]);

  // Assignment form input states
  const [assignDivId, setAssignDivId] = useState("");
  const [assignUnitId, setAssignUnitId] = useState("");
  const [assignLocId, setAssignLocId] = useState("");
  const [assignEffectiveFrom, setAssignEffectiveFrom] = useState("");

  // Transfer form input states
  const [transUnitId, setTransUnitId] = useState("");
  const [transLocId, setTransLocId] = useState("");
  const [transReason, setTransReason] = useState("");

  // Edit profile states
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStatus, setEditStatus] = useState("active");

  const [submitting, setSubmitting] = useState(false);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");
      // Fetch worker details (our optimized model query returns division/location names if assigned)
      const wData = await getWorker(id);
      setWorker(wData);

      // Fetch active assignment
      try {
        const curAssign = await getWorkerCurrentAssignment(id);
        setCurrentAssignment(curAssign);
      } catch (err) {
        setCurrentAssignment(null);
      }

      // Fetch assignment history
      const histData = await getWorkerAssignmentHistory(id);
      setHistory(histData);
    } catch (err) {
      console.error(err);
      setError("Failed to load worker profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [id]);

  // Load dropdown lists for assignment/transfer
  const handleOpenAssignModal = async () => {
    try {
      setError("");
      setAssignUnitId("");
      setAssignLocId("");
      setLocations([]);
      setAssignEffectiveFrom(new Date().toISOString().slice(0, 10));

      if (isDivAdmin && currentUser?.division_id) {
        setAssignDivId(String(currentUser.division_id));
        const [divData, unitData] = await Promise.all([
          getDivisions(),
          getUnits(currentUser.division_id),
        ]);
        setDivisions(divData);
        const myDiv = divData.find((d) => Number(d.id) === Number(currentUser.division_id));
        setDivisionName(myDiv?.name || "Your Division");
        setUnits(unitData);
      } else {
        setAssignDivId("");
        setUnits([]);
        const divData = await getDivisions();
        setDivisions(divData);
      }

      setIsAssignModalOpen(true);
    } catch (err) {
      console.error(err);
      setError("Failed to load assignment options");
    }
  };

  const handleOpenTransferModal = async () => {
    if (!currentAssignment) return;
    try {
      setError("");
      // Get units in same division (transfers cannot cross division boundaries)
      const unitData = await getUnits(currentAssignment.division_id);
      setUnits(unitData);
      setTransUnitId("");
      setTransLocId("");
      setTransReason("");
      setIsTransferModalOpen(true);
    } catch (err) {
      setError("Failed to load transfer options");
    }
  };

  // Cascading dropdowns
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

  const handleTransferUnitChange = async (unitId) => {
    setTransUnitId(unitId);
    setTransLocId("");
    setLocations([]);
    if (unitId) {
      const data = await getLocations(unitId);
      setLocations(data);
    }
  };

  // Submit profile edit
  const handleEditProfileSubmit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setSubmitting(true);
    try {
      setError("");
      const updated = await updateWorker(id, {
        full_name: editName,
        phone_number: editPhone,
        status: editStatus,
      });
      setWorker(updated);
      setSuccess("Profile updated successfully!");
      setIsEditProfileModalOpen(false);
      loadProfile();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit initial assignment
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignDivId || !assignUnitId || !assignLocId || !assignEffectiveFrom) {
      setError("All assignment fields are required");
      return;
    }
    setSubmitting(true);
    try {
      setError("");
      await createAssignment({
        worker_id: Number(id),
        division_id: Number(assignDivId),
        operational_unit_id: Number(assignUnitId),
        operational_location_id: Number(assignLocId),
        effective_from: assignEffectiveFrom,
      });
      setSuccess("Worker assigned successfully!");
      setIsAssignModalOpen(false);
      loadProfile();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create assignment");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit transfer
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!transUnitId || !transLocId) {
      setError("Destination Unit and Location are required");
      return;
    }
    setSubmitting(true);
    try {
      setError("");
      await createTransfer({
        worker_id: Number(id),
        to_operational_unit_id: Number(transUnitId),
        to_operational_location_id: Number(transLocId),
        reason: transReason,
      });

      const isInternal = Number(transUnitId) === currentAssignment.operational_unit_id;
      if (isInternal) {
        setSuccess("Internal transfer executed immediately!");
      } else {
        setSuccess("Inter-unit transfer requested! Awaiting administrator approval.");
      }

      setIsTransferModalOpen(false);
      loadProfile();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create transfer");
    } finally {
      setSubmitting(false);
    }
  };

  // Check if transfer would be internal or inter-unit
  const isSelectedTransferInternal =
    currentAssignment &&
    Number(transUnitId) === currentAssignment.operational_unit_id;

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col md:flex-row">
      <SideNavBar />
      <div className="flex-1 flex flex-col min-h-screen md:ml-64 bg-surface">
        <MobileHeader title="Worker Profile" />

        {/* Desktop Header */}
        <header className="hidden md:flex justify-between items-center w-full px-margin-desktop h-16 bg-surface border-b border-outline-variant sticky top-0 z-[900]">
          <div className="flex items-center gap-2 text-on-surface-variant font-label-md text-label-md">
            <Link to="/workers" className="hover:text-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Back to Workforce
            </Link>
          </div>
          <div className="text-on-surface-variant font-label-md text-label-md">
            Employee Profile
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-margin-mobile md:p-margin-desktop bg-surface">
          {loading ? (
            <div className="min-h-[400px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 border-4 border-outline border-t-primary rounded-full animate-spin"></div>
                <span className="text-on-surface-variant text-sm font-semibold">Loading profile...</span>
              </div>
            </div>
          ) : !worker ? (
            <div className="p-margin-desktop text-center bg-white border border-outline-variant rounded-xl">
              <span className="material-symbols-outlined text-5xl text-outline mb-2">person_off</span>
              <h3 className="font-title-lg font-bold text-on-surface">Worker File Not Found</h3>
              <p className="text-on-surface-variant mt-1">Please confirm the reference link.</p>
              <Link to="/workers" className="text-primary hover:underline font-semibold mt-4 block">
                Go back to workforce directory
              </Link>
            </div>
          ) : (
            <div className="max-w-container-max mx-auto space-y-6">
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

              {/* Profile Card Block */}
              <div className="bg-white border border-outline-variant rounded-xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row gap-6 md:items-center">
                <div className="relative shrink-0">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-primary/10 border-4 border-surface shadow-sm flex items-center justify-center font-bold text-3xl text-primary">
                    {worker.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase()}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h1 className="font-headline-md text-headline-md text-on-surface font-bold">
                          {worker.full_name}
                        </h1>
                        <span
                          className={`px-3 py-0.5 rounded-full font-label-md text-label-md border ${
                            worker.status === "active"
                              ? "bg-primary-container/10 text-[#145A32] border-[#145A32]/30"
                              : "bg-error/10 text-error border-error/30"
                          }`}
                        >
                          {worker.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="font-data-mono text-data-mono text-on-surface-variant bg-surface-container-low inline-block px-3.5 py-1 rounded border border-outline-variant/50 mb-3">
                        Staff ID: {worker.staff_id}
                      </div>
                    </div>
                    {/* Action buttons */}
                    <div className="shrink-0 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setEditName(worker.full_name);
                          setEditPhone(worker.phone_number || "");
                          setEditStatus(worker.status);
                          setIsEditProfileModalOpen(true);
                        }}
                        className="bg-surface border border-outline-variant text-on-surface hover:bg-surface-container-high px-4 py-2 rounded-lg font-semibold text-body-md transition-colors flex items-center gap-1 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                        Edit Status
                      </button>
                      {currentAssignment ? (
                        <button
                          onClick={handleOpenTransferModal}
                          className="bg-primary text-on-primary hover:bg-[#0E4526] px-4 py-2 rounded-lg font-semibold text-body-md transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            transfer_within_a_station
                          </span>
                          Transfer Worker
                        </button>
                      ) : (
                        <button
                          onClick={handleOpenAssignModal}
                          className="bg-primary text-on-primary hover:bg-[#0E4526] px-4 py-2 rounded-lg font-semibold text-body-md transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            assignment_ind
                          </span>
                          Deploy Worker
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Grid Detail */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Current assignment & Contact */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  {/* Current assignment block */}
                  <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-primary"></div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2.5 bg-primary-container rounded-lg text-on-primary-container">
                        <span className="material-symbols-outlined">location_on</span>
                      </div>
                      <div>
                        <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">
                          Current Deployment
                        </h2>
                        <p className="font-label-md text-on-surface-variant text-[11px] uppercase tracking-wider">
                          Active Duty Station
                        </p>
                      </div>
                    </div>

                    {currentAssignment ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                        <div>
                          <p className="font-label-md text-on-surface-variant text-[10px] uppercase tracking-wider mb-1">
                            Division
                          </p>
                          <p className="font-body-lg text-on-surface font-semibold flex items-center gap-2">
                            <span className="material-symbols-outlined text-outline-variant text-[18px]">
                              account_balance
                            </span>
                            {worker.division_name}
                          </p>
                        </div>
                        <div>
                          <p className="font-label-md text-on-surface-variant text-[10px] uppercase tracking-wider mb-1">
                            Unit
                          </p>
                          <p className="font-body-lg text-on-surface font-semibold flex items-center gap-2">
                            <span className="material-symbols-outlined text-outline-variant text-[18px]">
                              cleaning_services
                            </span>
                            {worker.unit_name}
                          </p>
                        </div>
                        <div>
                          <p className="font-label-md text-on-surface-variant text-[10px] uppercase tracking-wider mb-1">
                            Location
                          </p>
                          <p className="font-body-lg text-on-surface font-semibold flex items-center gap-2">
                            <span className="material-symbols-outlined text-outline-variant text-[18px]">
                              school
                            </span>
                            {worker.location_name}
                          </p>
                        </div>
                        <div>
                          <p className="font-label-md text-on-surface-variant text-[10px] uppercase tracking-wider mb-1">
                            Assigned Supervisor
                          </p>
                          <p className="font-body-lg text-on-surface font-semibold flex items-center gap-2">
                            <span className="material-symbols-outlined text-outline-variant text-[18px]">
                              badge
                            </span>
                            ID: {currentAssignment.supervisor_id}
                          </p>
                        </div>
                        <div className="sm:col-span-2 pt-4 border-t border-outline-variant flex justify-between items-center text-on-surface-variant text-xs">
                          <span className="font-data-mono text-data-mono flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm">calendar_today</span>
                            Effective From: {currentAssignment.effective_from}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <span className="material-symbols-outlined text-4xl text-outline mb-2">
                          report_problem
                        </span>
                        <p className="text-on-surface-variant italic">
                          This worker is currently unassigned to any location. They cannot be logged for attendance.
                        </p>
                        <button
                          onClick={handleOpenAssignModal}
                          className="mt-4 bg-primary text-on-primary hover:bg-[#0E4526] px-4 py-2 rounded-lg font-semibold text-xs transition-colors inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span>
                          Deploy Now
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Personal details */}
                  <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
                    <h3 className="font-title-lg text-title-lg text-on-surface font-bold mb-4">
                      Contact & Appointment
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-outline-variant mt-0.5">call</span>
                        <div>
                          <p className="font-body-md text-on-surface">
                            {worker.phone_number || "Not provided"}
                          </p>
                          <p className="font-label-md text-on-surface-variant text-[10px]">
                            Primary Mobile
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-outline-variant mt-0.5">
                          calendar_today
                        </span>
                        <div>
                          <p className="font-body-md text-on-surface">
                            {worker.appointment_date}
                          </p>
                          <p className="font-label-md text-on-surface-variant text-[10px]">
                            Date of Appointment
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assignment History Timeline */}
                <div className="lg:col-span-5">
                  <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm h-full flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">history</span>
                        <h2 className="font-title-lg text-title-lg text-on-surface font-bold">
                          Assignment History
                        </h2>
                      </div>
                    </div>

                    <div className="flex-1 relative pl-4 border-l-2 border-surface-variant space-y-6">
                      {history.length === 0 ? (
                        <p className="text-on-surface-variant italic text-xs py-4 pl-2">
                          No history logged.
                        </p>
                      ) : (
                        history.map((hist, idx) => {
                          const isCurrent = hist.effective_to === null;
                          return (
                            <div key={hist.id} className="relative">
                              <div
                                className={`absolute -left-[22px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                  isCurrent ? "bg-primary" : "bg-outline-variant"
                                }`}
                              />
                              <div className="font-data-mono text-data-mono text-[12px] text-on-surface-variant mb-1 font-semibold">
                                {hist.effective_from} to {hist.effective_to || "Present"}
                              </div>
                              <div
                                className={`p-3 rounded-lg border ${
                                  isCurrent
                                    ? "bg-surface-container border-primary/20"
                                    : "bg-surface-container-lowest border-outline-variant/60"
                                }`}
                              >
                                <p className="font-body-md font-bold text-on-surface">
                                  Deployment ID: #{hist.id}
                                </p>
                                <p className="font-label-md text-on-surface-variant text-[11px] mt-0.5">
                                  Supervisor User ID: {hist.supervisor_id}
                                </p>
                                {hist.transfer_id && (
                                  <p className="text-[10px] font-data-mono text-secondary mt-1">
                                    Via Transfer Ref: #{hist.transfer_id}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Worker Status Modal */}
      {isEditProfileModalOpen && worker && (
        <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-surface border-b border-outline-variant px-6 py-4 flex justify-between items-center">
              <h3 className="font-title-lg text-title-lg text-on-surface font-semibold">
                Edit Worker File
              </h3>
              <button
                onClick={() => setIsEditProfileModalOpen(false)}
                className="text-on-surface-variant hover:bg-surface-container-high p-1 rounded"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleEditProfileSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface block">
                  Full Name
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-outline-variant rounded font-body-md bg-white text-on-surface"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface block">
                  Phone Number
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-outline-variant rounded font-body-md bg-white text-on-surface"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface block">
                  Employment Status
                </label>
                <select
                  className="w-full p-2 border border-outline-variant rounded font-body-md bg-white text-on-surface"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  disabled={submitting}
                >
                  <option value="active">Active (On Duty)</option>
                  <option value="inactive">Inactive (Terminated / Resigned)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-outline-variant mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditProfileModalOpen(false)}
                  className="px-4 py-2 border border-outline-variant hover:bg-surface-container rounded text-body-md"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white hover:bg-[#0E4526] rounded text-body-md font-semibold disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deploy / Assign Worker Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-surface border-b border-outline-variant px-6 py-4 flex justify-between items-center">
              <h3 className="font-title-lg text-title-lg text-on-surface font-semibold">
                Deploy Worker (Initial Assignment)
              </h3>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-on-surface-variant hover:bg-surface-container-high p-1 rounded"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAssignSubmit} className="p-6 space-y-4">
              {isAdmin ? (
                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface block">
                    Select Division *
                  </label>
                  <select
                    className="w-full p-2 border border-outline-variant rounded font-body-md bg-white text-on-surface"
                    value={assignDivId}
                    onChange={(e) => handleAssignDivChange(e.target.value)}
                    disabled={submitting}
                    required
                  >
                    <option value="">Choose Division...</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-3 bg-secondary/10 border border-secondary/20 rounded-lg flex items-center justify-between">
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Division</span>
                  <span className="text-sm font-bold text-secondary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">domain</span>
                    {divisionName || "Student Affairs Division"}
                  </span>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface block">
                  Select Unit *
                </label>
                <select
                  className="w-full p-2 border border-outline-variant rounded font-body-md bg-white text-on-surface disabled:bg-surface-container-low"
                  value={assignUnitId}
                  onChange={(e) => handleAssignUnitChange(e.target.value)}
                  disabled={submitting || (isAdmin && !assignDivId)}
                  required
                >
                  <option value="">{isAdmin && !assignDivId ? "Select Division first..." : "Choose Unit..."}</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface block">
                  Select Location *
                </label>
                <select
                  className="w-full p-2 border border-outline-variant rounded font-body-md bg-white text-on-surface disabled:bg-surface-container-low"
                  value={assignLocId}
                  onChange={(e) => setAssignLocId(e.target.value)}
                  disabled={submitting || !assignUnitId}
                  required
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

              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface block">
                  Effective From Date *
                </label>
                <input
                  type="date"
                  className="w-full p-2 border border-outline-variant rounded font-body-md bg-white text-on-surface"
                  value={assignEffectiveFrom}
                  onChange={(e) => setAssignEffectiveFrom(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-outline-variant mt-6">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 border border-outline-variant hover:bg-surface-container rounded text-body-md"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white hover:bg-[#0E4526] rounded text-body-md font-semibold disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? "Deploying..." : "Confirm Deployment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Worker Modal */}
      {isTransferModalOpen && currentAssignment && (
        <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-surface border-b border-outline-variant px-6 py-4 flex justify-between items-center">
              <h3 className="font-title-lg text-title-lg text-on-surface font-semibold">
                Transfer Deployment
              </h3>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="text-on-surface-variant hover:bg-surface-container-high p-1 rounded"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleTransferSubmit} className="p-6 space-y-4">
              <div className="bg-surface-container-low p-3 rounded border border-outline-variant/60 space-y-1">
                <p className="font-label-md text-on-surface-variant text-[10px] uppercase font-bold tracking-wide">
                  Current Assignment
                </p>
                <p className="font-body-md text-on-surface font-semibold">
                  {worker.division_name} &gt; {worker.unit_name} &gt; {worker.location_name}
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface block">
                  Select Destination Unit *
                </label>
                <select
                  className="w-full p-2 border border-outline-variant rounded font-body-md bg-white text-on-surface"
                  value={transUnitId}
                  onChange={(e) => handleTransferUnitChange(e.target.value)}
                  disabled={submitting}
                  required
                >
                  <option value="">Choose Unit...</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface block">
                  Select Destination Location *
                </label>
                <select
                  className="w-full p-2 border border-outline-variant rounded font-body-md bg-white text-on-surface"
                  value={transLocId}
                  onChange={(e) => setTransLocId(e.target.value)}
                  disabled={submitting || !transUnitId}
                  required
                >
                  <option value="">Choose Location...</option>
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

              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface block">
                  Reason for Transfer
                </label>
                <textarea
                  rows="3"
                  className="w-full p-2 border border-outline-variant rounded font-body-md bg-white text-on-surface"
                  placeholder="Provide comments or transfer triggers..."
                  value={transReason}
                  onChange={(e) => setTransReason(e.target.value)}
                  disabled={submitting}
                />
              </div>

              {/* Dynamic Transfer Notice */}
              {transUnitId && (
                <div
                  className={`p-3.5 rounded border text-xs font-semibold leading-relaxed ${
                    isSelectedTransferInternal
                      ? "bg-primary-container/10 border-primary-container/30 text-primary-container"
                      : "bg-[#fff9c4] border-[#fbc02d]/30 text-[#f57f17]"
                  }`}
                >
                  <div className="flex gap-2 items-start">
                    <span className="material-symbols-outlined text-[18px]">info</span>
                    <div>
                      {isSelectedTransferInternal ? (
                        <p>
                          <strong>Internal Transfer:</strong> Destination is in the same operational unit. This transfer completes immediately without approval.
                        </p>
                      ) : (
                        <p>
                          <strong>Inter-unit Transfer:</strong> Destination crosses unit boundaries. This transfer will remain in a pending state until approved by an administrator.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-outline-variant mt-6">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 border border-outline-variant hover:bg-surface-container rounded text-body-md"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white hover:bg-[#0E4526] rounded text-body-md font-semibold disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? "Initiating..." : "Confirm Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerProfile;
