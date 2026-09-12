import React, { useState, useRef } from "react";
import { bulkUploadWorkerPhotos } from "../api/workersApi";

export default function BulkPhotoUploadModal({ onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null); // { matched_count, unmatched_count, unmatched[] }
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  function handleFilePick(e) {
    const picked = e.target.files?.[0];
    if (picked) { setFile(picked); setResult(null); setError(""); }
  }

  function handleDrop(e) {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped?.name.toLowerCase().endsWith(".zip")) {
      setFile(dropped); setResult(null); setError("");
    } else {
      setError("Please drop a .zip file.");
    }
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError("");
    setProgress(0);
    try {
      const res = await bulkUploadWorkerPhotos(file, (evt) => {
        if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100));
      });
      setResult(res);
      onDone?.(); // refresh worker list in parent
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[8000] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-on-surface text-base">Bulk Photo Upload</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Upload a ZIP of scanned photos — matched automatically by Staff ID in filename.
            </p>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* How it works tip */}
        <div className="bg-surface-container-low rounded-xl px-4 py-3 text-xs text-on-surface-variant space-y-1">
          <p className="font-semibold text-on-surface">How filenames are matched:</p>
          <p>Each photo filename just needs to contain the worker's Staff ID anywhere.</p>
          <p className="font-mono bg-white rounded px-2 py-1 text-[11px] mt-1 text-on-surface">
            ABU-CW-005.jpg &nbsp;✓ &nbsp;|&nbsp; photo_ABU-CW-005_john.jpg &nbsp;✓
          </p>
        </div>

        {/* Drop zone */}
        {!result && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              file
                ? "border-primary bg-primary/5"
                : "border-outline-variant hover:border-primary hover:bg-surface-container-lowest"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={handleFilePick}
            />
            <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2 block">
              {file ? "folder_zip" : "upload_file"}
            </span>
            {file ? (
              <>
                <p className="font-semibold text-on-surface text-sm">{file.name}</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  {(file.size / 1024 / 1024).toFixed(1)} MB · Click to change
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-on-surface">Drop your ZIP here</p>
                <p className="text-xs text-on-surface-variant mt-1">or click to browse</p>
              </>
            )}
          </div>
        )}

        {/* Upload progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-on-surface-variant">
              <span>Uploading & processing…</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-surface-container-high rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Result summary */}
        {result && (
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1 bg-primary/10 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-primary">{result.matched_count}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">Photos matched</p>
              </div>
              <div className={`flex-1 rounded-xl p-3 text-center ${
                result.unmatched_count > 0 ? "bg-amber-50" : "bg-surface-container-low"
              }`}>
                <p className={`text-2xl font-bold ${result.unmatched_count > 0 ? "text-amber-600" : "text-on-surface-variant"}`}>
                  {result.unmatched_count}
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">Unmatched</p>
              </div>
            </div>

            {/* Unmatched file list */}
            {result.unmatched?.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-700 mb-2">
                  Unmatched files — rename to include the Staff ID and re-upload:
                </p>
                <ul className="space-y-0.5 max-h-28 overflow-y-auto">
                  {result.unmatched.map((f) => (
                    <li key={f} className="text-[11px] font-mono text-amber-800 truncate">
                      · {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-on-surface-variant text-center">
              You can upload individual photos via the dossier for remaining workers.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs text-error bg-error/10 rounded-xl px-3 py-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">error</span>
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-outline-variant rounded-xl text-sm text-on-surface-variant hover:bg-surface-container-low transition-colors font-medium"
          >
            {result ? "Close" : "Cancel"}
          </button>
          {!result && (
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-[#0E4526] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {uploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">upload</span>
                  Upload & Match
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
