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
