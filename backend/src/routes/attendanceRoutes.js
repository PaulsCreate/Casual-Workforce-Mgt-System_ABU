const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const controller = require('../controllers/attendanceController');

router.use(authenticate);

router.post('/', authorize('administrator', 'supervisor', 'division_admin'), controller.mark);
router.post('/batch', authorize('administrator', 'supervisor', 'division_admin'), controller.markBatch);
router.delete('/', authorize('administrator', 'supervisor', 'division_admin'), controller.unmark);
router.get('/assignment/:assignmentId', controller.forAssignment);
router.get('/assignment/:assignmentId/summary', controller.summary);
router.get('/location/:locationId/date/:date', controller.forLocationOnDate);

module.exports = router;