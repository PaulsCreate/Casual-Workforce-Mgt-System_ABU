import { API_BASE_URL } from "../api/apiClient";

/**
 * Resolves a worker photo URL.
 * Handles: full URLs (http://...), relative paths (/uploads/...), and null/undefined.
 */
export function getImageUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path}`;
}
