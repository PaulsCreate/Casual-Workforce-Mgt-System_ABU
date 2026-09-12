import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  getWorkerDossier,
  updateWorker,
  createAssignment,
  uploadWorkerPhoto,
} from "../api/workersApi";
import { createTransfer } from "../api/transfersApi";
import { getDivisions, getUnits, getLocations } from "../api/hierarchyApi";
import { useAuth } from "../context/AuthContext";
import { getImageUrl } from "../utils/imageUrl";
import SideNavBar from "../components/SideNavBar";
import MobileHeader from "../components/MobileHeader";

const WorkerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "administrator";
  const isDivAdmin = currentUser?.role === "division_admin";

  const [dossierData, setDossierData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

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

  // Edit profile form state
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone_number: "",
    status: "active",
    national_id_nin: "",
    next_of_kin_name: "",
    next_of_kin_phone: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getWorkerDossier(id);
      setDossierData(data);
      if (data?.worker) {
        setEditForm({
          full_name: data.worker.full_name || "",
          phone_number: data.worker.phone_number || "",
          status: data.worker.status || "active",
          national_id_nin: data.worker.national_id_nin || "",
          next_of_kin_name: data.worker.next_of_kin_name || "",
          next_of_kin_phone: data.worker.next_of_kin_phone || "",
        });
      }
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

  // Handle Photo Upload
  const handlePhotoSelected = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size exceeds 5MB limit. Please choose a smaller photo.");
      return;
    }

    const formData = new FormData();
    formData.append("photo", file);

    setUploadingPhoto(true);
    setError("");
    setSuccess("");

    try {
      await uploadWorkerPhoto(id, formData);
      setSuccess("Passport photo updated successfully!");
      loadProfile();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Open Assign Modal
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
        const myDiv = divData.find(
          (d) => Number(d.id) === Number(currentUser.division_id),
        );
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

  // Open Transfer Modal
  const handleOpenTransferModal = async () => {
    const currentAssign = dossierData?.assignments?.find(
      (a) => !a.effective_to,
    );
    if (!currentAssign) {
      setError("Worker must have an active assignment to request a transfer.");
      return;
    }
    try {
      setError("");
      const unitData = await getUnits(currentAssign.division_id);
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

  // Submit Profile Edit
  const handleEditProfileSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.full_name.trim()) {
      setError("Worker full name is required");
      return;
    }
    setSubmitting(true);
    try {
      setError("");
      await updateWorker(id, editForm);
      setSuccess("Worker profile updated successfully!");
      setIsEditProfileModalOpen(false);
      loadProfile();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Assignment
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

  // Submit Transfer
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!transUnitId || !transLocId) {
      setError("Destination Unit and Location are required");
      return;
    }
    setSubmitting(true);
    try {
      setError("");
      const currentAssign = dossierData?.assignments?.find(
        (a) => !a.effective_to,
      );
      await createTransfer({
        worker_id: Number(id),
        to_operational_unit_id: Number(transUnitId),
        to_operational_location_id: Number(transLocId),
        reason: transReason,
      });

      const isInternal =
        currentAssign &&
        Number(transUnitId) === currentAssign.operational_unit_id;
      if (isInternal) {
        setSuccess("Internal station transfer executed immediately!");
      } else {
        setSuccess(
          "Inter-unit transfer requested! Awaiting administrator approval in Approvals page.",
        );
      }

      setIsTransferModalOpen(false);
      loadProfile();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create transfer");
    } finally {
      setSubmitting(false);
    }
  };

  const worker = dossierData?.worker;
  const assignments = dossierData?.assignments || [];
  const activeAssignment = assignments.find((a) => !a.effective_to);
  const stats = dossierData?.attendance_stats || {
    total_present: 0,
    total_recorded_days: 0,
    total_months_active: 0,
  };
  const attRate =
    stats.total_recorded_days > 0
      ? Math.round((stats.total_present / stats.total_recorded_days) * 100)
      : 0;

  const isSelectedTransferInternal =
    activeAssignment &&
    Number(transUnitId) === activeAssignment.operational_unit_id;

  const initials = worker?.full_name
    ? worker.full_name
        .split("")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "CW";

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col md:flex-row">
      <SideNavBar />
      <div className="flex-1 flex flex-col min-h-screen md:ml-64 bg-surface">
        <MobileHeader title="Worker Profile" />

        {/* Desktop Header */}
        <header className="hidden md:flex justify-between items-center w-full px-margin-desktop h-16 bg-surface border-b border-outline-variant sticky top-0 z-[900]">
          <div className="flex items-center gap-2 text-on-surface-variant font-label-md text-label-md">
            <Link
              to="/workers"
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">
                arrow_back
              </span>
              Back to Workforce Directory
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-on-surface-variant font-label-md text-xs font-mono">
              Staff ID: {worker?.staff_id || "…"}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-margin-mobile md:p-margin-desktop flex-1 max-w-container-max w-full mx-auto space-y-6">
          {loading ? (
            <div className="min-h-[400px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-outline border-t-primary rounded-full animate-spin" />
                <span className="text-on-surface-variant text-sm font-semibold">
                  Loading worker profile...
                </span>
              </div>
            </div>
          ) : !worker ? (
            <div className="p-12 text-center bg-white border border-outline-variant rounded-2xl shadow-sm">
              <span className="material-symbols-outlined text-5xl text-outline mb-2">
                person_off
              </span>
              <h3 className="font-bold text-on-surface text-lg">
                Worker File Not Found
              </h3>
              <p className="text-on-surface-variant text-sm mt-1">
                Please confirm the reference ID.
              </p>
              <Link
                to="/workers"
                className="text-primary hover:underline font-semibold text-sm mt-4 inline-block"
              >
                Return to Workforce Directory
              </Link>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* Feedback Alerts */}
              {error && (
                <div className="p-4 bg-error/10 border border-error/30 text-error rounded-xl flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-[18px]">
                    error
                  </span>
                  <p>{error}</p>
                </div>
              )}
              {success && (
                <div className="p-4 bg-primary/10 border border-primary/25 text-primary rounded-xl flex items-center gap-2 text-sm font-medium">
                  <span className="material-symbols-outlined text-[18px]">
                    check_circle
                  </span>
                  <p>{success}</p>
                </div>
              )}

              {/* 1. Header Profile Banner */}
              <div className="bg-white border border-outline-variant rounded-2xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row gap-6 items-center md:items-start justify-between">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Passport Photo with Upload Trigger */}
                  <div className="relative group shrink-0">
                    {worker.photo_url ? (
                      <img
                        src={getImageUrl(worker.photo_url)}
                        alt={worker.full_name}
                        className="w-28 h-28 rounded-2xl object-cover border-2 border-primary shadow-sm bg-white"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}

                    <div
                      className={`w-28 h-28 rounded-2xl bg-gradient-to-br from-primary to-primary-container text-white font-bold text-3xl flex items-center justify-center border-2 border-primary shadow-sm ${
                        worker.photo_url ? "hidden" : "flex"
                      }`}
                    >
                      {initials}
                    </div>

                    {/* Camera Upload Overlay */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="absolute inset-0 rounded-2xl bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:opacity-0"
                      title="Upload new passport photo"
                    >
                      <span className="material-symbols-outlined text-2xl">
                        {uploadingPhoto ? "sync" : "photo_camera"}
                      </span>
                      <span className="text-[10px] font-semibold mt-1">
                        {uploadingPhoto ? "Saving…" : "Update Photo"}
                      </span>
                    </button>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoSelected}
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                    />
                  </div>

                  {/* Worker Title & Metadata */}
                  <div className="text-center sm:text-left space-y-2">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                      <h1 className="font-bold text-2xl md:text-3xl text-on-surface">
                        {worker.full_name}
                      </h1>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          worker.status === "active"
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-error/10 text-error border-error/20"
                        }`}
                      >
                        {worker.status === "active"
                          ? "Active Staff"
                          : "Inactive"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <span className="font-data-mono text-xs font-semibold bg-surface-container-high px-3 py-1 rounded-lg border border-outline-variant/60 text-on-surface">
                        ID: {worker.staff_id}
                      </span>
                      {worker.phone_number && (
                        <span className="text-xs text-on-surface-variant flex items-center gap-1 bg-surface-container-low px-2.5 py-1 rounded-lg border border-outline-variant/40">
                          <span className="material-symbols-outlined text-sm">
                            call
                          </span>
                          {worker.phone_number}
                        </span>
                      )}
                      {worker.national_id_nin && (
                        <span className="text-xs font-mono text-primary bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/20">
                          NIN: {worker.national_id_nin}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap gap-2.5 shrink-0 justify-center">
                  <button
                    onClick={() => setIsEditProfileModalOpen(true)}
                    className="px-4 py-2.5 border border-outline-variant hover:border-primary text-on-surface hover:text-primary rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 bg-surface hover:bg-surface-container-low"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      edit
                    </span>
                    Edit Details
                  </button>

                  {activeAssignment ? (
                    <button
                      onClick={handleOpenTransferModal}
                      className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        transfer_within_a_station
                      </span>
                      Request Transfer
                    </button>
                  ) : null}

                  <button
                    onClick={handleOpenAssignModal}
                    className="px-4 py-2.5 bg-primary hover:bg-[#0E4526] text-white rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      assignment_ind
                    </span>
                    {activeAssignment ? "Reassign Station" : "Deploy Worker"}
                  </button>
                </div>
              </div>

              {/* 2. Three-Column Dossier Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Active Deployment Card */}
                <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5 text-primary border-b border-outline-variant/60 pb-3">
                    <span className="material-symbols-outlined text-xl">
                      location_on
                    </span>
                    <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider">
                      Active Station
                    </h3>
                  </div>
                  {activeAssignment ? (
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <p className="text-on-surface-variant">
                          Assigned Location / Block
                        </p>
                        <p className="font-bold text-on-surface text-sm mt-0.5">
                          {activeAssignment.location_name}
                        </p>
                      </div>
                      <div>
                        <p className="text-on-surface-variant">
                          Operational Unit
                        </p>
                        <p className="font-semibold text-on-surface">
                          {activeAssignment.unit_name}
                        </p>
                      </div>
                      <div>
                        <p className="text-on-surface-variant">Division</p>
                        <p className="font-semibold text-on-surface">
                          {activeAssignment.division_name}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-outline-variant/40">
                        <span className="text-[11px] text-on-surface-variant">
                          Effective Since:{" "}
                          <strong className="font-mono text-on-surface">
                            {activeAssignment.effective_from}
                          </strong>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-on-surface-variant text-xs">
                      <span className="material-symbols-outlined text-3xl text-outline mb-1">
                        wrong_location
                      </span>
                      <p className="italic">No active duty station.</p>
                      <button
                        onClick={handleOpenAssignModal}
                        className="mt-3 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-[#0E4526]"
                      >
                        Deploy Now
                      </button>
                    </div>
                  )}
                </div>

                {/* Identity & Documentation Card */}
                <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5 text-secondary border-b border-outline-variant/60 pb-3">
                    <span className="material-symbols-outlined text-xl">
                      badge
                    </span>
                    <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider">
                      Identity & Records
                    </h3>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <p className="text-on-surface-variant">
                        National Identity Number (NIN)
                      </p>
                      <p className="font-mono font-bold text-on-surface mt-0.5">
                        {worker.national_id_nin || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-on-surface-variant">
                        Institutional Staff ID
                      </p>
                      <p className="font-mono font-bold text-primary">
                        {worker.staff_id || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-on-surface-variant">
                        Employment Status
                      </p>
                      <p className="font-semibold text-on-surface capitalize">
                        {worker.status || "Active"}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-outline-variant/40">
                      <span className="text-[11px] text-on-surface-variant">
                        Enrollment Date:{" "}
                        <strong className="font-mono text-on-surface">
                          {worker.created_at?.slice(0, 10) || "—"}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Emergency & Next of Kin Card */}
                <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5 text-tertiary border-b border-outline-variant/60 pb-3">
                    <span className="material-symbols-outlined text-xl">
                      contact_emergency
                    </span>
                    <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider">
                      Next of Kin
                    </h3>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <p className="text-on-surface-variant">
                        Emergency Contact Name
                      </p>
                      <p className="font-bold text-on-surface mt-0.5">
                        {worker.next_of_kin_name || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-on-surface-variant">
                        Emergency Phone Number
                      </p>
                      <p className="font-semibold text-on-surface">
                        {worker.next_of_kin_phone || "—"}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-outline-variant/40">
                      <p className="text-[11px] text-on-surface-variant">
                        Attendance Rate:{" "}
                        <strong className="text-primary font-bold">
                          {attRate}%
                        </strong>{" "}
                        ({stats.total_present} shifts worked)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Assignment & Transfer History Timeline */}
              <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-outline-variant pb-3">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm">
                    <span className="material-symbols-outlined text-xl">
                      history
                    </span>
                    <h3 className="uppercase tracking-wider">
                      Deployment & Relocation History
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-on-surface-variant">
                    {assignments.length} Record
                    {assignments.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {assignments.length === 0 ? (
                  <div className="py-8 text-center text-on-surface-variant text-xs italic">
                    No historical assignments recorded yet.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-outline-variant">
                    {assignments.map((a, idx) => {
                      const isActive = !a.effective_to;
                      return (
                        <div key={a.id || idx} className="relative group">
                          {/* Dot indicator */}
                          <div
                            className={`absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-2xs ${
                              isActive
                                ? "bg-primary ring-4 ring-primary/20"
                                : "bg-outline"
                            }`}
                          />
                          <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-xl p-4 space-y-1.5 hover:border-primary/40 transition-colors">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-on-surface">
                                {a.location_name}
                              </h4>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                  isActive
                                    ? "bg-primary/10 text-primary border border-primary/20"
                                    : "bg-surface-container-high text-on-surface-variant"
                                }`}
                              >
                                {isActive
                                  ? "Active Station"
                                  : "Past Assignment"}
                              </span>
                            </div>
                            <p className="text-xs text-on-surface-variant font-medium">
                              {a.unit_name} · {a.division_name}
                            </p>
                            <div className="flex items-center gap-3 text-[11px] text-on-surface-variant font-mono pt-1">
                              <span>
                                From: <strong>{a.effective_from}</strong>
                              </span>
                              <span>
                                To:{" "}
                                <strong>{a.effective_to || "Present"}</strong>
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Transfer Request Modal ─────────────────────────────────────── */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0 border border-amber-500/20">
                  <span className="material-symbols-outlined text-2xl">
                    transfer_within_a_station
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-on-surface text-base">
                    Request Worker Transfer
                  </h3>
                  <p className="text-xs text-on-surface-variant font-mono">
                    Staff: {worker?.full_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="text-outline hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Destination Unit <span className="text-red-500">*</span>
                </label>
                <select
                  value={transUnitId}
                  onChange={(e) => handleTransferUnitChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="">Select target operational unit</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Destination Location / Block{" "}
                  <span className="text-red-500">*</span>
                </label>
                <select
                  value={transLocId}
                  onChange={(e) => setTransLocId(e.target.value)}
                  disabled={!transUnitId}
                  required
                  className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary disabled:opacity-50"
                >
                  <option value="">Select target location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Administrative Reason / Ref
                </label>
                <textarea
                  value={transReason}
                  onChange={(e) => setTransReason(e.target.value)}
                  placeholder="e.g. Relocated to Ramat Hall Block B per sanitation redistribution memo"
                  rows={3}
                  className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              {transUnitId && (
                <div
                  className={`p-3 rounded-xl text-xs border ${
                    isSelectedTransferInternal
                      ? "bg-primary/5 border-primary/20 text-primary"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-0.5">
                    <span className="material-symbols-outlined text-[16px]">
                      {isSelectedTransferInternal ? "bolt" : "gavel"}
                    </span>
                    <span>
                      {isSelectedTransferInternal
                        ? "Internal Reallocation"
                        : "Inter-Unit Transfer"}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {isSelectedTransferInternal
                      ? "Same operational unit: will execute and update attendance records immediately."
                      : "Crosses unit boundaries: will be submitted to the Transfer Approvals queue for administrative authorization."}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 border border-outline-variant text-on-surface rounded-xl text-xs font-semibold hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting && (
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  )}
                  <span>Submit Transfer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Assign / Deploy Modal ─────────────────────────────────────── */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <span className="material-symbols-outlined text-2xl">
                    assignment_ind
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-on-surface text-base">
                    {activeAssignment
                      ? "Reassign Duty Station"
                      : "Deploy Worker to Station"}
                  </h3>
                  <p className="text-xs text-on-surface-variant font-mono">
                    Staff: {worker?.full_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-outline hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Division <span className="text-red-500">*</span>
                </label>
                {isDivAdmin ? (
                  <input
                    type="text"
                    disabled
                    value={divisionName}
                    className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-xl text-xs text-on-surface"
                  />
                ) : (
                  <select
                    value={assignDivId}
                    onChange={(e) => handleAssignDivChange(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
                  >
                    <option value="">Select division</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Operational Unit <span className="text-red-500">*</span>
                </label>
                <select
                  value={assignUnitId}
                  onChange={(e) => handleAssignUnitChange(e.target.value)}
                  disabled={!assignDivId}
                  required
                  className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary disabled:opacity-50"
                >
                  <option value="">Select unit</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Location / Block <span className="text-red-500">*</span>
                </label>
                <select
                  value={assignLocId}
                  onChange={(e) => setAssignLocId(e.target.value)}
                  disabled={!assignUnitId}
                  required
                  className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary disabled:opacity-50"
                >
                  <option value="">Select location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Effective From <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={assignEffectiveFrom}
                  onChange={(e) => setAssignEffectiveFrom(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 border border-outline-variant text-on-surface rounded-xl text-xs font-semibold hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-primary hover:bg-[#0E4526] text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting && (
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  )}
                  <span>Confirm Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Profile Modal ────────────────────────────────────────── */}
      {isEditProfileModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <span className="material-symbols-outlined text-2xl">
                    edit_note
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-on-surface text-base">
                    Edit Worker Details
                  </h3>
                  <p className="text-xs text-on-surface-variant font-mono">
                    Staff ID: {worker?.staff_id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditProfileModalOpen(false)}
                className="text-outline hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleEditProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, full_name: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editForm.phone_number}
                    onChange={(e) =>
                      setEditForm({ ...editForm, phone_number: e.target.value })
                    }
                    placeholder="080..."
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    National ID (NIN)
                  </label>
                  <input
                    type="text"
                    value={editForm.national_id_nin}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        national_id_nin: e.target.value,
                      })
                    }
                    placeholder="11-digit NIN"
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs text-on-surface font-mono focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Employment Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Next of Kin Name
                  </label>
                  <input
                    type="text"
                    value={editForm.next_of_kin_name}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        next_of_kin_name: e.target.value,
                      })
                    }
                    placeholder="Emergency contact full name"
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Next of Kin Phone
                  </label>
                  <input
                    type="text"
                    value={editForm.next_of_kin_phone}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        next_of_kin_phone: e.target.value,
                      })
                    }
                    placeholder="Emergency contact phone"
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsEditProfileModalOpen(false)}
                  className="px-4 py-2 border border-outline-variant text-on-surface rounded-xl text-xs font-semibold hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-primary hover:bg-[#0E4526] text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting && (
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  )}
                  <span>Save Changes</span>
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
