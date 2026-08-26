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
      to_operational_unit_id,
      to_operational_location_id,
      reason,
    } = req.body;

    if (!worker_id || !to_operational_unit_id || !to_operational_location_id) {
      return res
        .status(400)
        .json({
          error:
            "worker_id, to_operational_unit_id, and to_operational_location_id are required",
        });
    }

    const currentAssignment = await getActiveAssignmentForWorker(worker_id);
    if (!currentAssignment) {
      return res
        .status(400)
        .json({
          error: "This worker has no active assignment to transfer from",
        });
    }

    if (req.user.role === "division_admin" && Number(currentAssignment.division_id) !== Number(req.user.division_id)) {
      return res.status(403).json({ error: "Access denied. This worker is not in your division." });
    }

    // Transfers never cross divisions - a worker's division is fixed by their
    // appointment letter. Moving divisions would be a new appointment, not a transfer.
    const to_division_id = currentAssignment.division_id;

    if (
      to_operational_unit_id == currentAssignment.operational_unit_id &&
      to_operational_location_id == currentAssignment.operational_location_id
    ) {
      return res
        .status(400)
        .json({
          error:
            "Destination is the same as the current assignment - nothing to transfer",
        });
    }

    // transfer_type is derived, never trusted from the client, so an inter-unit
    // move can't be mislabeled as internal to bypass the approval requirement.
    const transfer_type =
      to_operational_unit_id == currentAssignment.operational_unit_id
        ? "internal"
        : "inter_unit";

    const transfer = await createTransfer({
      worker_id,
      from_assignment_id: currentAssignment.id,
      to_division_id,
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
      details: { transfer_type, worker_id },
    });

    // Internal transfers complete immediately - no approval gate required.
    if (transfer_type === "internal") {
      const result = await completeTransfer({
        transfer_id: transfer.id,
        worker_id,
        current_assignment_id: currentAssignment.id,
        to_division_id,
        to_operational_unit_id,
        to_operational_location_id,
        effective_date: new Date().toISOString().slice(0, 10),
        authorized_by: null,
        transfer_letter_reference: null,
      });

      await logAction({
        user_id: req.user.id,
        action: "complete_transfer",
        entity_type: "transfer",
        entity_id: transfer.id,
        details: { transfer_type: "internal", worker_id },
      });

      return res.status(201).json(result);
    }

    // inter_unit stays pending until explicitly approved via /approve
    res.status(201).json(transfer);
  } catch (err) {
    console.error("Create transfer error:", err);
    res
      .status(500)
      .json({ error: "Something went wrong creating the transfer" });
  }
}

async function approve(req, res) {
  try {
    const { effective_date, transfer_letter_reference } = req.body;
    const transfer = await getTransferById(req.params.id);

    if (!transfer) {
      return res.status(404).json({ error: "Transfer not found" });
    }
    if (req.user.role === "division_admin" && Number(transfer.to_division_id) !== Number(req.user.division_id)) {
      return res.status(403).json({ error: "Access denied" });
    }
    if (transfer.status !== "pending") {
      return res
        .status(409)
        .json({ error: `Transfer is already ${transfer.status}` });
    }
    if (transfer.transfer_type !== "inter_unit") {
      return res
        .status(400)
        .json({ error: "Only inter_unit transfers require approval" });
    }
    if (!effective_date) {
      return res
        .status(400)
        .json({
          error: "effective_date is required to approve",
        });
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
      transfer_letter_reference,
    });

    await logAction({
      user_id: req.user.id,
      action: "approve_transfer",
      entity_type: "transfer",
      entity_id: transfer.id,
      details: { authorized_by: req.user.id, worker_id: transfer.worker_id, transfer_letter_reference },
    });

    await logAction({
      user_id: req.user.id,
      action: "complete_transfer",
      entity_type: "transfer",
      entity_id: transfer.id,
      details: { transfer_type: "inter_unit", worker_id: transfer.worker_id },
    });

    res.json(result);
  } catch (err) {
    console.error("Approve transfer error:", err);
    res
      .status(500)
      .json({ error: "Something went wrong approving the transfer" });
  }
}

async function reject(req, res) {
  try {
    const transfer = await getTransferById(req.params.id);
    if (!transfer) {
      return res.status(404).json({ error: "Transfer not found" });
    }
    if (req.user.role === "division_admin" && Number(transfer.to_division_id) !== Number(req.user.division_id)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const result = await rejectTransfer(req.params.id);
    if (!result) {
      return res
        .status(400)
        .json({ error: "Transfer could not be rejected or is not pending" });
    }

    await logAction({
      user_id: req.user.id,
      action: "reject_transfer",
      entity_type: "transfer",
      entity_id: result.id,
      details: { worker_id: result.worker_id },
    });

    res.json(result);
  } catch (err) {
    console.error("Reject transfer error:", err);
    res
      .status(500)
      .json({ error: "Something went wrong rejecting the transfer" });
  }
}

async function history(req, res) {
  try {
    const transfers = await getTransfersForWorker(req.params.workerId);
    res.json(transfers);
  } catch (err) {
    console.error("Transfer history error:", err);
    res
      .status(500)
      .json({ error: "Something went wrong fetching transfer history" });
  }
}

async function pending(req, res) {
  try {
    let divisionId = null;
    if (req.user.role === "division_admin") {
      divisionId = req.user.division_id;
    }
    const transfers = await getTransfersByStatus("pending", divisionId);
    res.json(transfers);
  } catch (err) {
    console.error("Pending transfers error:", err);
    res
      .status(500)
      .json({ error: "Something went wrong fetching pending transfers" });
  }
}

module.exports = { create, approve, reject, history, pending };
