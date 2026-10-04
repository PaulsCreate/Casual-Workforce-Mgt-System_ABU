import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getWorkers, createWorker, uploadWorkerPhoto } from "../api/workersApi";
import { getDivisions, getUnits, getLocations } from "../api/hierarchyApi";
import SideNavBar from "../components/SideNavBar";
import MobileHeader from "../components/MobileHeader";
import WorkerImportModal from "../components/WorkerImportModal";
import BulkPhotoUploadModal from "../components/BulkPhotoUploadModal";
import { getImageUrl } from "../utils/imageUrl";

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

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBulkPhotoOpen, setIsBulkPhotoOpen] = useState(false);

  // Single create fields
  const [staffId, setStaffId] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [nationalIdNin, setNationalIdNin] = useState("");
  const [nextOfKinName, setNextOfKinName] = useState("");
  const [nextOfKinPhone, setNextOfKinPhone] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

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
  const isHealthDivision = divisionName.toLowerCase().includes("health");

  const loadWorkers = async (isActive = () => true) => {
    try {
      setLoading(true);
      setError("");
      const [workerData, locData] = await Promise.all([
        getWorkers(),
        getLocations().catch(() => []),
      ]);
      if (!isActive()) return;
      setWorkers(workerData);
      setLocations(locData);
    } catch (err) {
      console.error(err);
      if (!isActive()) return;
      setError("Failed to fetch workforce directory");
    } finally {
      if (isActive()) setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    loadWorkers(() => mounted);
    return () => {
      mounted = false;
    };
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
      setNationalIdNin("");
      setNextOfKinName("");
      setNextOfKinPhone("");
      setPhotoFile(null);
      setPhotoPreview(null);
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
    const selectedDivision = divisions.find(
      (division) => Number(division.id) === Number(divId),
    );
    setDivisionName(selectedDivision?.name || "");
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
    if (unitId && !isHealthDivision) {
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
        national_id_nin: nationalIdNin.trim() || null,
        next_of_kin_name: nextOfKinName.trim() || null,
        next_of_kin_phone: nextOfKinPhone.trim() || null,
      };

      if (assignDivId && assignUnitId && (isHealthDivision || assignLocId)) {
        payload.division_id = Number(assignDivId);
        payload.operational_unit_id = Number(assignUnitId);
        if (assignLocId) {
          payload.operational_location_id = Number(assignLocId);
        }
        payload.effective_date = assignEffectiveFrom || appointmentDate;
      }

      const newWorker = await createWorker(payload);

      // If a passport photo was selected, upload it immediately
      if (photoFile && newWorker?.id) {
        try {
          const formData = new FormData();
          formData.append("photo", photoFile);
          await uploadWorkerPhoto(newWorker.id, formData);
        } catch (photoErr) {
          console.warn("Worker created but photo upload failed:", photoErr);
        }
      }

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
          <div className="font-headline-sm text-headline-sm font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">groups</span>
            Workforce Management
          </div>
          <div className="text-on-surface-variant font-label-md text-label-md">
            Casual Employees Directory ({workers.length} registered)
          </div>
        </header>

        {/* Page Content */}
        <main className="p-margin-mobile md:p-margin-desktop flex-1 max-w-container-max w-full mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-outline-variant pb-4 gap-4">
            <div>
              <h2 className="font-display-lg text-display-lg text-on-surface mb-1 font-bold">
                Worker Directory
              </h2>
              <p className="font-body-md text-on-surface-variant">
                Manage registered casual staff, upload passport photos, view deployment histories, and bulk import rosters.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Bulk Import Button */}
              {(isAdmin || isDivAdmin) && (
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="bg-white border border-primary text-primary hover:bg-primary/5 transition-colors rounded-lg py-2.5 px-4 font-semibold text-xs flex items-center gap-2 shadow-2xs"
                  title="Upload Excel or CSV roster"
                >
                  <span className="material-symbols-outlined text-[18px]">upload_file</span>
                  Bulk Import (CSV)
                </button>
              )}

              {/* Bulk Photo Upload Button */}
              {(isAdmin || isDivAdmin) && (
                <button
                  onClick={() => setIsBulkPhotoOpen(true)}
                  className="bg-white border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors rounded-lg py-2.5 px-4 font-semibold text-xs flex items-center gap-2 shadow-2xs"
                  title="Upload passport photos for multiple workers at once"
                >
                  <span className="material-symbols-outlined text-[18px]">photo_library</span>
                  Upload Photos
                </button>
              )}

              {/* Single Register Button */}
              <button
                onClick={handleOpenRegisterModal}
                className="bg-primary text-white hover:bg-[#0E4526] transition-colors rounded-lg py-2.5 px-4 font-semibold text-xs flex items-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                Register Worker
              </button>
            </div>
          </div>

          {/* Success / Error Alerts */}
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

          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                search
              </span>
              <input
                className="w-full pl-10 pr-4 py-2 bg-white border border-[#E4E7E6] rounded font-body-md text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                placeholder="Search by name, staff ID, or location..."
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
                  className="bg-white border border-[#E4E7E6] rounded px-3 py-1.5 focus:border-primary focus:ring-0 text-on-surface text-xs font-semibold"
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
                    <th className="py-3.5 px-6 font-label-md text-xs uppercase tracking-wider text-on-surface-variant font-bold whitespace-nowrap">
                      Staff ID
                    </th>
                    <th className="py-3.5 px-6 font-label-md text-xs uppercase tracking-wider text-on-surface-variant font-bold whitespace-nowrap">
                      Worker Name & Photo
                    </th>
                    <th className="py-3.5 px-6 font-label-md text-xs uppercase tracking-wider text-on-surface-variant font-bold whitespace-nowrap">
                      Station / Hostel
                    </th>
                    <th className="py-3.5 px-6 font-label-md text-xs uppercase tracking-wider text-on-surface-variant font-bold whitespace-nowrap">
                      National ID (NIN)
                    </th>
                    <th className="py-3.5 px-6 font-label-md text-xs uppercase tracking-wider text-on-surface-variant font-bold whitespace-nowrap">
                      Status
                    </th>
                    <th className="py-3.5 px-6 font-label-md text-xs uppercase tracking-wider text-on-surface-variant font-bold whitespace-nowrap text-right">
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
                          <td className="py-3 px-6 font-data-mono text-xs font-semibold text-primary">
                            {worker.staff_id}
                          </td>
                          <td className="py-3 px-6 font-semibold flex items-center gap-3">
                            {/* Passport thumbnail / avatar */}
                            {worker.photo_url ? (
                              <img
                                src={getImageUrl(worker.photo_url)}
                                alt={worker.full_name}
                                className="w-9 h-9 rounded-full object-cover border-2 border-primary/30 shrink-0 bg-white"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  e.target.nextSibling.style.display = "flex";
                                }}
                              />
                            ) : null}
                            <div
                              className={`w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 ${worker.photo_url ? "hidden" : "flex"}`}
                            >
                              {initials}
                            </div>
                            <div>
                              <div className="text-on-surface text-sm font-semibold">{worker.full_name}</div>
                              {worker.phone_number && (
                                <div className="text-[11px] text-on-surface-variant font-normal">{worker.phone_number}</div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-6 text-on-surface-variant text-xs">
                            {worker.location_name || (
                              <span className="text-outline italic">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3 px-6 text-on-surface-variant text-xs">
                            <span className="font-mono font-semibold text-xs text-on-surface">
                              {worker.national_id_nin || <span className="text-outline italic font-sans">—</span>}
                            </span>
                          </td>
                          <td className="py-3 px-6">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-xs ${
                                worker.status === "active"
                                  ? "bg-primary/10 text-primary border border-primary/20"
                                  : "bg-error/10 text-error border border-error/20"
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
                              className="bg-white border border-outline-variant hover:border-primary text-primary px-3 py-1.5 rounded-lg transition-all text-xs font-semibold flex items-center gap-1 ml-auto shadow-2xs"
                            >
                              <span className="material-symbols-outlined text-[15px]">person</span>
                              View Profile
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

      {/* Bulk Import Modal */}
      <WorkerImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={(msg) => {
          setSuccess(msg);
          loadWorkers();
        }}
        existingWorkers={workers}
        locations={locations}
      />

      {/* Register Single Worker Modal Dialog */}
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
                    Add worker credentials, identity information, and assign their operational post.
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

                  {/* Optional Passport Photo Picker */}
                  <div className="flex items-center gap-4 p-3 bg-surface-container-low rounded-xl border border-outline-variant/60 mb-4">
                    <div className="relative w-14 h-14 rounded-full overflow-hidden bg-surface-container-high border border-outline-variant flex items-center justify-center shrink-0">
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-on-surface-variant/60 text-2xl">
                          person
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-on-surface">
                        Passport Photo <span className="text-[11px] font-normal text-on-surface-variant">(Optional)</span>
                      </p>
                      <p className="text-[11px] text-on-surface-variant truncate">
                        {photoFile ? photoFile.name : "JPEG, PNG or WebP up to 5MB"}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <label className="cursor-pointer inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark bg-white border border-outline-variant px-2.5 py-1 rounded-lg hover:bg-surface transition-colors shadow-2xs">
                          <span className="material-symbols-outlined text-[15px]">photo_camera</span>
                          {photoFile ? "Change Photo" : "Choose Photo"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 5 * 1024 * 1024) {
                                  setError("Photo exceeds 5MB limit");
                                  return;
                                }
                                setPhotoFile(file);
                                setPhotoPreview(URL.createObjectURL(file));
                              }
                            }}
                          />
                        </label>
                        {photoFile && (
                          <button
                            type="button"
                            onClick={() => {
                              setPhotoFile(null);
                              setPhotoPreview(null);
                            }}
                            className="text-xs text-error hover:text-error-dark font-medium px-2 py-1 rounded hover:bg-error-container/20 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-label-md text-xs font-semibold text-on-surface block">
                        Staff ID <span className="text-error">*</span>
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
                        placeholder="e.g. Paul Yusuf"
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
                        placeholder="e.g. 08031234567"
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

                    <div className="space-y-1">
                      <label className="font-label-md text-xs font-semibold text-on-surface block">
                        National ID (NIN)
                      </label>
                      <input
                        type="text"
                        placeholder="11-digit NIN"
                        className="w-full p-2.5 border border-outline-variant rounded-lg font-body-md text-sm bg-white text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        value={nationalIdNin}
                        onChange={(e) => setNationalIdNin(e.target.value)}
                        disabled={submitting}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-label-md text-xs font-semibold text-on-surface block">
                        Next of Kin (Name & Phone)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Name"
                          className="w-full p-2.5 border border-outline-variant rounded-lg font-body-md text-sm bg-white text-on-surface focus:border-primary outline-none"
                          value={nextOfKinName}
                          onChange={(e) => setNextOfKinName(e.target.value)}
                          disabled={submitting}
                        />
                        <input
                          type="text"
                          placeholder="Phone"
                          className="w-full p-2.5 border border-outline-variant rounded-lg font-body-md text-sm bg-white text-on-surface focus:border-primary outline-none"
                          value={nextOfKinPhone}
                          onChange={(e) => setNextOfKinPhone(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
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
                    {/* Division Field */}
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

                    {/* University Health Services workers are assigned unit-wide. */}
                    {isHealthDivision ? (
                      <p className="text-sm text-on-surface-variant sm:col-span-2">
                        No specific location is needed for this division.
                      </p>
                    ) : (
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
                    )}

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
                        disabled={submitting || !assignUnitId || (!isHealthDivision && !assignLocId)}
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

      {/* Bulk Photo Upload Modal */}
      {isBulkPhotoOpen && (
        <BulkPhotoUploadModal
          onClose={() => setIsBulkPhotoOpen(false)}
          onDone={() => { loadWorkers(); setIsBulkPhotoOpen(false); }}
        />
      )}
    </div>
  );
};

export default Workers;
