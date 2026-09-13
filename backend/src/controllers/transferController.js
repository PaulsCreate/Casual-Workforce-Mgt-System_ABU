const {
  createTransfer,
  completeTransfer,
  rejectTransfer,
  getTransferById,
  getTransfersForWorker,
  getTransfersByStatus,
} = require("../models/transferModel");
const { getActiveAssignmentForWorker } = require("../models/assignmentModel");
const { logAction } = require("../models/auditLogModel");

async function create(req, res) {
  try {
    const {
      worker_id,
      to_division_id,
      to_operational_unit_id,
      to_operational_location_id,
      reason,
    } = req.body;

    if (!worker_id || !to_operational_unit_id || !to_operational_location_id) {
      return res.status(400).json({
        error:
          "worker_id, to_operational_unit_id, and to_operational_location_id are required",
      });
    }

    const currentAssignment = await getActiveAssignmentForWorker(worker_id);
    if (!currentAssignment) {
      return res.status(400).json({
        error: "This worker has no active assignment to transfer from",
      });
    }

    // Division Admin can only initiate transfers for workers currently in their division
    if (
      req.user.role === "division_admin" &&
      Number(currentAssignment.division_id) !== Number(req.user.division_id)
    ) {
      return res.status(403).json({
        error: "Access denied. This worker is not in your division.",
      });
    }

    // Target division defaults to current division if not explicitly specified
    const targetDivisionId = to_division_id
      ? Number(to_division_id)
      : Number(currentAssignment.division_id);

    // Prevent transferring to the exact same station
    if (
      targetDivisionId === Number(currentAssignment.division_id) &&
      Number(to_operational_unit_id) === Number(currentAssignment.operational_unit_id) &&
      Number(to_operational_location_id) === Number(currentAssignment.operational_location_id)
    ) {
      return res.status(400).json({
        error: "Destination is the same as the current assignment - nothing to transfer",
      });
    }

    // Determine Transfer Scope:
    // 1. intra_division: Within the same division (e.g. Ramat Hall -> Suleiman Hall).
    //    Completed INSTANTLY by Division Admin or Super Admin without approval queue.
    // 2. inter_division: Across different divisions (e.g. Student Affairs -> UHS).
    //    Requires Super Admin ('administrator') review and approval.
    const isIntraDivision = targetDivisionId === Number(currentAssignment.division_id);
    const transfer_type = isIntraDivision ? "intra_division" : "inter_division";

    const transfer = await createTransfer({
      worker_id,
      from_assignment_id: currentAssignment.id,
      to_division_id: targetDivisionId,
      to_operational_unit_id,
      to_operational_location_id,
      transfer_type,
      reason,
      requested_by: req.user.id,
    });

    await logAction({
      user_id: req.user.id,
      action: "create_transfer",
      entity_type: "transfer",
      entity_id: transfer.id,
      details: { transfer_type, worker_id, targetDivisionId },
    });

    // ── CASE A: Intra-Division (Instant Completion) ──────────────────────────
    if (isIntraDivision) {
      const effective_date = new Date().toISOString().slice(0, 10);
      const result = await completeTransfer({
        transfer_id: transfer.id,
        worker_id,
        current_assignment_id: currentAssignment.id,
        to_division_id: targetDivisionId,
        to_operational_unit_id,
        to_operational_location_id,
        effective_date,
        authorized_by: req.user.id,
        transfer_letter_reference: null,
      });

      await logAction({
        user_id: req.user.id,
        action: "complete_transfer",
        entity_type: "transfer",
        entity_id: transfer.id,
        details: { transfer_type: "intra_division", worker_id },
      });

      return res.status(201).json({
        message: "Worker reassigned successfully within division.",
        status: "completed",
        ...result,
      });
    }

    // ── CASE B: Inter-Division (Pending Super Admin Approval) ────────────────
    return res.status(201).json({
      message:
        "Inter-division transfer request submitted and forwarded to Central Administrator for approval.",
      status: "pending",
      transfer,
    });
  } catch (err) {
    console.error("Create transfer error:", err);
    res.status(500).json({ error: "Something went wrong creating the transfer" });
  }
}

// Only Super Admin can approve cross-division transfers
async function approve(req, res) {
  try {
    if (req.user.role !== "administrator") {
      return res.status(403).json({
        error: "Access denied. Only Central Administrators can approve inter-division transfers.",
      });
    }

    const { effective_date, transfer_letter_reference } = req.body;
    const transfer = await getTransferById(req.params.id);

    if (!transfer) {
      return res.status(404).json({ error: "Transfer not found" });
    }
    if (transfer.status !== "pending") {
      return res.status(409).json({ error: `Transfer is already ${transfer.status}` });
    }
    if (!effective_date) {
      return res.status(400).json({ error: "effective_date is required to approve" });
    }

    const result = await completeTransfer({
      transfer_id: transfer.id,
      worker_id: transfer.worker_id,
      current_assignment_id: transfer.from_assignment_id,
      to_division_id: transfer.to_division_id,
      to_operational_unit_id: transfer.to_operational_unit_id,
      to_operational_location_id: transfer.to_operational_location_id,
      effective_date,
      authorized_by: req.user.id,
      transfer_letter_reference: transfer_letter_reference || null,
    });

    await logAction({
      user_id: req.user.id,
      action: "approve_transfer",
      entity_type: "transfer",
      entity_id: transfer.id,
      details: {
        authorized_by: req.user.id,
        worker_id: transfer.worker_id,
        transfer_letter_reference,
      },
    });

    res.json({
      message: "Inter-division transfer approved successfully.",
      ...result,
    });
  } catch (err) {
    console.error("Approve transfer error:", err);
    res.status(500).json({ error: "Something went wrong approving the transfer" });
  }
}

// Only Super Admin can reject cross-division transfers
async function reject(req, res) {
  try {
    if (req.user.role !== "administrator") {
      return res.status(403).json({
        error: "Access denied. Only Central Administrators can reject inter-division transfers.",
      });
    }

    const transfer = await getTransferById(req.params.id);
    if (!transfer) {
      return res.status(404).json({ error: "Transfer not found" });
    }

    const result = await rejectTransfer(req.params.id);
    if (!result) {
      return res.status(400).json({ error: "Transfer could not be rejected or is not pending" });
    }

    await logAction({
      user_id: req.user.id,
      action: "reject_transfer",
      entity_type: "transfer",
      entity_id: result.id,
      details: { worker_id: result.worker_id },
    });

    res.json({ message: "Transfer request rejected.", transfer: result });
  } catch (err) {
    console.error("Reject transfer error:", err);
    res.status(500).json({ error: "Something went wrong rejecting the transfer" });
  }
}

async function history(req, res) {
  try {
    const transfers = await getTransfersForWorker(req.params.workerId);
    res.json(transfers);
  } catch (err) {
    console.error("Transfer history error:", err);
    res.status(500).json({ error: "Something went wrong fetching transfer history" });
  }
}

// Returns pending transfers awaiting approval (strictly for Super Admin)
async function pending(req, res) {
  try {
    if (req.user.role !== "administrator") {
      return res.status(403).json({
        error: "Access denied. Approvals panel is restricted to Central Administrators.",
      });
    }
    const transfers = await getTransfersByStatus("pending");
    res.json(transfers);
  } catch (err) {
    console.error("Pending transfers error:", err);
    res.status(500).json({ error: "Something went wrong fetching pending transfers" });
  }
}

module.exports = { create, approve, reject, history, pending };

