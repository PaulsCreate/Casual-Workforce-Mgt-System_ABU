import React, { useState } from "react";
import { changePasswordApi } from "../api/authApi";
import { useAuth } from "../context/AuthContext";

const ChangePasswordModal = ({ isOpen, onClose, isForced = false }) => {
  const { updateUserToken } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password cannot be the same as your current password.");
      return;
    }

    try {
      setLoading(true);
      const res = await changePasswordApi(currentPassword, newPassword);
      setSuccess("Password updated successfully!");

      if (updateUserToken && res.token) {
        updateUserToken(res.token, res.user);
      }

      setTimeout(() => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setSuccess("");
        if (onClose) onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to update password. Please check your current password.");
    } finally {
      setLoading(false);
    }
  };

  const calculateStrength = (pwd) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return Math.min(score, 4);
  };

  const strength = calculateStrength(newPassword);
  const strengthLabels = ["Weak", "Fair", "Good", "Strong"];
  const strengthColors = ["bg-red-500", "bg-amber-500", "bg-emerald-400", "bg-emerald-600"];

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-surface rounded-2xl shadow-2xl border border-outline-variant max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#004120] to-[#0A5A30] p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <span className="material-symbols-outlined text-[22px]">
                {isForced ? "lock_reset" : "password"}
              </span>
            </div>
            <div>
              <h3 className="font-headline-sm text-lg font-bold text-white">
                {isForced ? "Set New Password (Required)" : "Change Password"}
              </h3>
              <p className="text-xs text-emerald-200/80">
                {isForced
                  ? "You must change your temporary password to continue"
                  : "Update your account credentials"}
              </p>
            </div>
          </div>

          {!isForced && (
            <button
              onClick={onClose}
              disabled={loading}
              className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>{success}</span>
            </div>
          )}

          {/* Current Password */}
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1.5">
              Current Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:outline-none focus:border-primary pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showCurrent ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1.5">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                required
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:outline-none focus:border-primary pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showNew ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>

            {/* Strength Meter */}
            {newPassword && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-on-surface-variant">Strength:</span>
                  <span className="font-semibold text-primary">
                    {strengthLabels[strength - 1] || "Very Weak"}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1 h-1.5">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className={`rounded-full transition-all duration-300 ${
                        idx < strength ? strengthColors[strength - 1] : "bg-outline-variant/40"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1.5">
              Confirm New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                required
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:outline-none focus:border-primary pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showConfirm ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant">
            {!isForced && (
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-medium text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-white hover:bg-[#0E4526] text-xs font-semibold px-5 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              <span>{isForced ? "Save & Proceed to Portal" : "Update Password"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
