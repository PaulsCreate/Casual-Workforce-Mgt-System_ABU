import apiClient from "./apiClient";

export const getWorkers = async () => {
  const response = await apiClient.get("/workers");
  return response.data;
};

export const getWorker = async (id) => {
  const response = await apiClient.get(`/workers/${id}`);
  return response.data;
};

export const createWorker = async (data) => {
  const response = await apiClient.post("/workers", data);
  return response.data;
};

export const updateWorker = async (id, data) => {
  const response = await apiClient.put(`/workers/${id}`, data);
  return response.data;
};

export const getWorkerDossier = async (id) => {
  const response = await apiClient.get(`/workers/${id}/dossier`);
  return response.data;
};

export const bulkImportWorkers = async (workers) => {
  const response = await apiClient.post("/workers/bulk-import", { workers });
  return response.data;
};

export const uploadWorkerPhoto = async (id, data) => {
  if (data instanceof FormData) {
    const response = await apiClient.post(`/workers/${id}/photo`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }
  const response = await apiClient.post(`/workers/${id}/photo`, { image_data: data });
  return response.data;
};

// Assignments
export const createAssignment = async (data) => {
  const response = await apiClient.post("/assignments", data);
  return response.data;
};

export const getWorkerAssignmentHistory = async (workerId) => {
  const response = await apiClient.get(`/assignments/worker/${workerId}/history`);
  return response.data;
};

export const getWorkerCurrentAssignment = async (workerId) => {
  const response = await apiClient.get(`/assignments/worker/${workerId}/current`);
  return response.data;
};

export const bulkUploadWorkerPhotos = async (zipFile, onProgress) => {
  const formData = new FormData();
  formData.append("photos_zip", zipFile);
  const response = await apiClient.post("/workers/bulk-photos", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress,
  });
  return response.data;
};
