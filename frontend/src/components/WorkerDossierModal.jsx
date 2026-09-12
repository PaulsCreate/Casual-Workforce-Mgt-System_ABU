import React, { useState, useEffect, useRef } from "react";
import { getWorkerDossier, uploadWorkerPhoto, updateWorker } from "../api/workersApi";
import { getImageUrl } from "../utils/imageUrl";

const WorkerDossierModal = ({ isOpen, workerId, onClose, onWorkerUpdated }) => {
  const [dossierData, setDossierData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const loadDossier = async () => {
    if (!workerId) return;
    try {
      setLoading(true);
      setError("");
      const data = await getWorkerDossier(workerId);
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
      setError("Failed to load worker dossier");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && workerId) {
      loadDossier();
      setEditing(false);
      setSuccess("");
    }
  }, [isOpen, workerId]);

  if (!isOpen) return null;

  // ── Handle Photo Upload ────────────────────────────────────────────
  const handlePhotoSelected = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size (max 5MB)
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
      const res = await uploadWorkerPhoto(workerId, formData);
      setSuccess("Passport photo updated successfully!");
      if (onWorkerUpdated) onWorkerUpdated();
      loadDossier();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ── Save Worker Details ────────────────────────────────────────────
  const handleSaveDetails = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await updateWorker(workerId, editForm);
      setSuccess("Worker details updated successfully!");
      setEditing(false);
      if (onWorkerUpdated) onWorkerUpdated();
      loadDossier();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to update worker details");
    } finally {
      setSaving(false);
    }
  };

  const worker = dossierData?.worker;
  const assignments = dossierData?.assignments || [];
  const stats = dossierData?.attendance_stats || { total_present: 0, total_recorded_days: 0, total_months_active: 0 };
  const attRate = stats.total_recorded_days > 0 ? Math.round((stats.total_present / stats.total_recorded_days) * 100) : 0;

  // Format initials
  const initials = worker?.full_name
    ? worker.full_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "CW";

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-outline-variant flex flex-col max-h-[90vh] overflow-hidden animate-fadeIn">
        
        {/* Header */}
        <div className="px-6 py-4 bg-surface-container border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl">badge</span>
            </div>
            <div>
              <h2 className="font-bold text-on-surface text-lg">Casual Worker 360° Profile</h2>
              <p className="text-xs text-on-surface-variant font-mono">Staff ID: {worker?.staff_id || "…"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3 bg-error/10 border border-error/30 text-error rounded-xl text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              <p>{error}</p>
            </div>
          )}
          {success && (
            <div className="p-3 bg-[#e8f5e9] border border-[#c8e6c9] text-[#1b5e20] rounded-xl text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              <p>{success}</p>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-16 gap-3 text-on-surface-variant">
              <div className="w-8 h-8 border-2 border-outline border-t-primary rounded-full animate-spin" />
              <span>Loading worker dossier...</span>
            </div>
          ) : !worker ? (
            <div className="text-center py-12 text-on-surface-variant">
              <p>Worker profile not found</p>
            </div>
          ) : (
            <div className="space-y-6">

              {/* 1. Header Profile Banner */}
              <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-5 flex flex-col sm:flex-row items-center sm:items-start gap-5">
                
                {/* Passport Photo */}
                <div className="relative group shrink-0">
                  {worker.photo_url ? (
                    <img
                      src={getImageUrl(worker.photo_url)}
                      alt={worker.full_name}
                      className="w-24 h-24 rounded-2xl object-cover border-2 border-primary shadow-sm bg-white"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : null}

                  <div
                    className={`w-24 h-24 rounded-2xl bg-primary text-white font-bold text-2xl flex items-center justify-center border-2 border-primary shadow-sm ${worker.photo_url ? "hidden" : "flex"}`}
                  >
                    {initials}
                  </div>

                  {/* Upload overlay */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-semibold gap-1"
                    title="Upload new passport photo"
                  >
                    {uploadingPhoto ? (
                      <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-xl">photo_camera</span>
                        <span>Change</span>
                      </>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelected}
                    className="hidden"
                  />
                </div>

                {/* Worker Headline Details */}
                <div className="flex-1 text-center sm:text-left space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="font-bold text-on-surface text-xl">{worker.full_name}</h3>
                    <div className="flex items-center gap-2 justify-center sm:justify-end">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${worker.status === "active" ? "bg-[#e8f5e9] text-[#1b5e20]" : "bg-surface-container-high text-on-surface-variant"}`}>
                        <span className="w-2 h-2 rounded-full bg-current" />
                        {worker.status === "active" ? "Active Staff" : "Inactive"}
                      </span>
                      <button
                        onClick={() => setEditing(!editing)}
                        className="p-1.5 rounded-lg border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors text-xs font-semibold flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">{editing ? "cancel" : "edit"}</span>
                        {editing ? "Cancel" : "Edit"}
                      </button>
                    </div>
                  </div>

                  <p className="font-mono text-xs text-primary font-semibold">Staff ID: {worker.staff_id}</p>
                  
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-xs text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">apartment</span>
                      {worker.location_name ? `Assigned: ${worker.location_name}` : "Unassigned"}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">calendar_month</span>
                      Appointed: {new Date(worker.appointment_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                    {worker.phone_number && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">phone</span>
                        {worker.phone_number}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Edit Form (When Active) */}
              {editing && (
                <form onSubmit={handleSaveDetails} className="bg-surface-container/50 border border-primary/30 rounded-2xl p-5 space-y-4 animate-fadeIn">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">edit_note</span>
                    Update Worker Details
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="font-bold text-on-surface block mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                        className="w-full p-2 border border-outline-variant rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-on-surface block mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={editForm.phone_number}
                        onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                        className="w-full p-2 border border-outline-variant rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-on-surface block mb-1">National ID (NIN)</label>
                      <input
                        type="text"
                        value={editForm.national_id_nin}
                        onChange={(e) => setEditForm({ ...editForm, national_id_nin: e.target.value })}
                        placeholder="11-digit NIN"
                        className="w-full p-2 border border-outline-variant rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-on-surface block mb-1">Status</label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full p-2 border border-outline-variant rounded-lg bg-white"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-on-surface block mb-1">Next of Kin Name</label>
                      <input
                        type="text"
                        value={editForm.next_of_kin_name}
                        onChange={(e) => setEditForm({ ...editForm, next_of_kin_name: e.target.value })}
                        placeholder="Full Name"
                        className="w-full p-2 border border-outline-variant rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-on-surface block mb-1">Next of Kin Phone</label>
                      <input
                        type="text"
                        value={editForm.next_of_kin_phone}
                        onChange={(e) => setEditForm({ ...editForm, next_of_kin_phone: e.target.value })}
                        placeholder="e.g. 08031234567"
                        className="w-full p-2 border border-outline-variant rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="px-3 py-1.5 border border-outline-variant rounded-lg text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-1.5 bg-primary text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              )}

              {/* 3. Identification & Emergency Compliance Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Identification info */}
                <div className="border border-outline-variant rounded-xl p-4 space-y-3 bg-white">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                    <span className="material-symbols-outlined text-sm">badge</span>
                    Identification & Official Records
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between border-b border-outline-variant/40 pb-1">
                      <span className="text-on-surface-variant">Staff ID:</span>
                      <span className="font-mono font-bold text-primary">{worker.staff_id || "—"}</span>
                    </div>
                    <div className="flex justify-between border-b border-outline-variant/40 pb-1">
                      <span className="text-on-surface-variant">National ID (NIN):</span>
                      <span className="font-mono font-semibold text-on-surface">{worker.national_id_nin || "Not Provided"}</span>
                    </div>
                    <div className="flex justify-between border-b border-outline-variant/40 pb-1">
                      <span className="text-on-surface-variant">Phone Contact:</span>
                      <span className="font-semibold text-on-surface">{worker.phone_number || "Not Provided"}</span>
                    </div>
                    <div className="flex justify-between border-b border-outline-variant/40 pb-1">
                      <span className="text-on-surface-variant">Date of Appointment:</span>
                      <span className="font-semibold text-on-surface">
                        {new Date(worker.appointment_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact & Attendance Analytics */}
                <div className="border border-outline-variant rounded-xl p-4 space-y-3 bg-white">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                    <span className="material-symbols-outlined text-sm">insights</span>
                    Attendance & Emergency Records
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between border-b border-outline-variant/40 pb-1">
                      <span className="text-on-surface-variant">Total Days Present:</span>
                      <span className="font-bold text-[#1b5e20]">{stats.total_present} days</span>
                    </div>
                    <div className="flex justify-between border-b border-outline-variant/40 pb-1">
                      <span className="text-on-surface-variant">Months Recorded:</span>
                      <span className="font-semibold text-on-surface">{stats.total_months_active} month(s)</span>
                    </div>
                    <div className="flex justify-between border-b border-outline-variant/40 pb-1">
                      <span className="text-on-surface-variant">Next of Kin Name:</span>
                      <span className="font-semibold text-on-surface">{worker.next_of_kin_name || "Not Specified"}</span>
                    </div>
                    <div className="flex justify-between border-b border-outline-variant/40 pb-1">
                      <span className="text-on-surface-variant">Next of Kin Contact:</span>
                      <span className="font-semibold text-on-surface">{worker.next_of_kin_phone || "Not Specified"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Deployment History Timeline */}
              <div className="border border-outline-variant rounded-xl p-4 space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                    <span className="material-symbols-outlined text-sm">history_edu</span>
                    Station Deployment & Transfer History
                  </div>
                  <span className="text-xs text-on-surface-variant font-medium">
                    {assignments.length} deployment record{assignments.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {assignments.length === 0 ? (
                  <p className="text-xs text-on-surface-variant py-4 text-center">No assignment history recorded for this worker.</p>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-outline-variant">
                    {assignments.map((asg, idx) => {
                      const isCurrent = !asg.effective_to;
                      return (
                        <div key={asg.id || idx} className="relative">
                          {/* Dot */}
                          <div className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${isCurrent ? "bg-primary" : "bg-outline-variant"}`} />

                          <div className="bg-surface-container-low rounded-xl p-3 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-on-surface text-sm">
                                {asg.location_name || asg.unit_name || "General Deployment"}
                              </span>
                              {isCurrent ? (
                                <span className="px-2 py-0.5 rounded-full bg-[#e8f5e9] text-[#1b5e20] font-bold text-[10px]">
                                  Current Station
                                </span>
                              ) : (
                                <span className="text-[11px] text-on-surface-variant">
                                  Completed
                                </span>
                              )}
                            </div>

                            <p className="text-on-surface-variant text-[11px]">
                              {asg.unit_name ? `Unit: ${asg.unit_name} · ` : ""}Division: {asg.division_name || "Student Affairs"}
                            </p>

                            <div className="text-[11px] text-on-surface-variant pt-1 flex items-center gap-1 font-mono">
                              <span className="material-symbols-outlined text-xs">calendar_today</span>
                              <span>Effective: {new Date(asg.effective_from).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                              {asg.effective_to && (
                                <span> → {new Date(asg.effective_to).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                              )}
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
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-surface-container border-t border-outline-variant flex justify-between items-center text-xs">
          <span className="text-on-surface-variant">ABU Casual Sanitation Workforce System</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-primary text-white rounded-lg font-bold hover:bg-[#0E4526] transition-colors shadow-2xs"
          >
            Close Dossier
          </button>
        </div>

      </div>
    </div>
  );
};

export default WorkerDossierModal;
