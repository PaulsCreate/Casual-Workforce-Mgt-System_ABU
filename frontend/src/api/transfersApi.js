import apiClient from "./apiClient";

export const createTransfer = async (data) => {
  const response = await apiClient.post("/transfers", data);
  return response.data;
};

export const approveTransfer = async (id, data) => {
  const response = await apiClient.post(`/transfers/${id}/approve`, data);
  return response.data;
};

export const rejectTransfer = async (id) => {
  const response = await apiClient.post(`/transfers/${id}/reject`);
  return response.data;
};

export const getPendingTransfers = async () => {
  const response = await apiClient.get("/transfers/pending");
  return response.data;
};

export const getWorkerTransfers = async (workerId) => {
  const response = await apiClient.get(`/transfers/worker/${workerId}`);
  return response.data;
};
