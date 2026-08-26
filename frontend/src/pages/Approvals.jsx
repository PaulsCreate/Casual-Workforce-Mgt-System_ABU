import React, { useState, useEffect } from "react";
import {
  getPendingTransfers,
  approveTransfer,
  rejectTransfer,
} from "../api/transfersApi";
import SideNavBar from "../components/SideNavBar";
import MobileHeader from "../components/MobileHeader";

const Approvals = () => {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Approval Form Dialog State
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState("");
  const [letterRef, setLetterRef] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const pendingData = await getPendingTransfers();
      setTransfers(pendingData);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch pending transfer requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenApproveModal = (transfer) => {
    setSelectedTransfer(transfer);
    setEffectiveDate(new Date().toISOString().slice(0, 10));
    setLetterRef("");
    setIsApproveModalOpen(true);
  };

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    if (!effectiveDate) {
      setError("Effective Date is required to approve");
      return;
    }
    setSubmitting(true);
    try {
      setError("");
      await approveTransfer(selectedTransfer.id, {
        effective_date: effectiveDate,
        transfer_letter_reference: letterRef,
      });
      setSuccess("Transfer successfully approved!");
      setIsApproveModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Error approving transfer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (transferId) => {
    if (!window.confirm("Are you sure you want to reject this transfer request?")) return;
    try {
      setError("");
      await rejectTransfer(transferId);
      setSuccess("Transfer request rejected.");
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Error rejecting transfer");
    }
  };

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col md:flex-row">
      <SideNavBar />
      <div className="flex-1 flex flex-col min-h-screen md:ml-64 bg-surface">
        <MobileHeader title="Approvals Panel" />

        {/* Desktop Header */}
        <header className="hidden md:flex justify-between items-center w-full px-margin-desktop h-16 bg-surface border-b border-outline-variant sticky top-0 z-[900]">
          <div className="font-headline-sm text-headline-sm font-bold text-primary">
            Transfer Approvals
          </div>
          <div className="text-on-surface-variant font-label-md text-label-md">
            Pending Inter-Unit Relocations
          </div>
        </header>

        {/* Page Content */}
        <main className="p-margin-mobile md:p-margin-desktop flex-1 max-w-container-max w-full mx-auto space-y-6">
          <div className="border-b border-outline-variant pb-4">
            <h2 className="font-display-lg text-display-lg text-on-surface mb-2 font-bold">
              Pending Approvals
            </h2>
            <p className="font-body-lg text-on-surface-variant">
              Review, approve, or reject worker transfers crossing Operational Unit boundaries.
            </p>
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

          {/* Roster Pending List */}
          <div className="space-y-4">
            {loading ? (
              <div className="bg-white rounded-xl border border-outline-variant p-12 text-center text-on-surface-variant">
                <div className="flex justify-center items-center gap-2">
                  <div className="w-6 h-6 border-2 border-outline border-t-primary rounded-full animate-spin"></div>
                  <span>Fetching pending requests...</span>
                </div>
              </div>
            ) : transfers.length === 0 ? (
              <div className="bg-white rounded-xl border border-outline-variant p-12 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl mb-2 text-outline">
                  assignment_turned_in
                </span>
                <h3 className="font-title-lg font-bold text-on-surface">No Pending Approvals</h3>
                <p className="mt-1">All worker transfer requests have been processed.</p>
              </div>
            ) : (
              transfers.map((t) => (
                <div
                  key={t.id}
                  className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                >
                  <div className="space-y-3 flex-1 min-w-0">
                    <div>
                      <h4 className="font-title-lg text-on-surface font-bold text-base truncate">
                        Transfer Request #{t.id}
                      </h4>
                      <p className="font-data-mono text-data-mono text-[12px] text-on-surface-variant mt-0.5">
                        Worker ID: {t.worker_id}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div>
                        <p className="text-[11px] font-label-md text-on-surface-variant uppercase tracking-wider">
                          Current Assignment
                        </p>
                        <p className="font-semibold text-on-surface text-xs leading-relaxed truncate">
                          From Assignment ID: #{t.from_assignment_id}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-label-md text-on-surface-variant uppercase tracking-wider">
                          Target Destination
                        </p>
                        <p className="font-semibold text-secondary text-xs leading-relaxed truncate">
                          Division {t.to_division_id} &gt; Unit {t.to_operational_unit_id} &gt; Location {t.to_operational_location_id}
                        </p>
                      </div>
                    </div>

                    {t.reason && (
                      <div className="p-3 bg-surface-container-low border border-outline-variant/60 rounded text-xs text-on-surface-variant leading-relaxed">
                        <strong>Reason:</strong> {t.reason}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 w-full md:w-auto shrink-0 justify-end pt-4 md:pt-0 border-t md:border-t-0 border-outline-variant">
                    <button
                      onClick={() => handleReject(t.id)}
                      className="flex-1 md:flex-none px-4 py-2 border border-error text-error hover:bg-error/5 rounded-lg text-body-md font-semibold transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleOpenApproveModal(t)}
                      className="flex-1 md:flex-none px-4 py-2 bg-primary text-on-primary hover:bg-[#0E4526] rounded-lg text-body-md font-semibold transition-colors flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[18px]">done</span>
                      Approve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>

      {/* Approve Modal Dialog */}
      {isApproveModalOpen && selectedTransfer && (
        <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-surface border-b border-outline-variant px-6 py-4 flex justify-between items-center">
              <h3 className="font-title-lg text-title-lg text-on-surface font-semibold">
                Approve Transfer Request #{selectedTransfer.id}
              </h3>
              <button
                onClick={() => setIsApproveModalOpen(false)}
                className="text-on-surface-variant hover:bg-surface-container-high p-1 rounded"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleApproveSubmit} className="p-6 space-y-4">


              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface block">
                  Effective Date *
                </label>
                <input
                  type="date"
                  className="w-full p-2 border border-outline-variant rounded font-body-md bg-white text-on-surface"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface block">
                  Transfer Letter Reference / Doc Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. ABU/SEC/SAN/TR/1202"
                  className="w-full p-2 border border-outline-variant rounded font-body-md bg-white text-on-surface"
                  value={letterRef}
                  onChange={(e) => setLetterRef(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-outline-variant mt-6">
                <button
                  type="button"
                  onClick={() => setIsApproveModalOpen(false)}
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
                  {submitting ? "Processing..." : "Complete Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Approvals;
