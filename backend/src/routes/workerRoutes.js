const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");
const { authenticate, authorize } = require("../middleware/auth");
const controller = require("../controllers/workerController");

// Configure multer storage for passport photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads/worker_photos"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".png";
    cb(null, `worker_${req.params.id || "temp"}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Multer for ZIP uploads (stored in temp, deleted after processing)
const zipUpload = multer({
  dest: path.join(__dirname, "../../uploads/tmp"),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB ZIP max
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "application/zip" ||
      file.mimetype === "application/x-zip-compressed" ||
      file.originalname.toLowerCase().endsWith(".zip")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only ZIP files are allowed"), false);
    }
  },
});

router.use(authenticate);

// Bulk import workers (Excel / CSV ingestion)
router.post("/bulk-import", authorize("administrator", "division_admin"), controller.bulkImport);

// Bulk photo upload via ZIP file
router.post(
  "/bulk-photos",
  authorize("administrator", "division_admin"),
  zipUpload.single("photos_zip"),
  controller.bulkUploadPhotos
);

// Worker 360° Dossier (profile, assignment history, lifetime stats)
router.get("/:id/dossier", controller.dossier);

// Photo upload (multipart or json body)
router.post("/:id/photo", authorize("administrator", "division_admin", "supervisor"), upload.single("photo"), controller.uploadPhoto);

// Standard CRUD
router.post("/", authorize("administrator", "division_admin"), controller.create);
router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.put("/:id", authorize("administrator", "division_admin"), controller.update);

module.exports = router;
