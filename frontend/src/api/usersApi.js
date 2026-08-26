import apiClient from "./apiClient";

export const getUsers = async (role) => {
  const params = role ? { role } : {};
  const res = await apiClient.get("/users", { params });
  return res.data;
};

export const getUser = async (id) => {
  const res = await apiClient.get(`/users/${id}`);
  return res.data;
};

export const createUser = async (data) => {
  const res = await apiClient.post("/users", data);
  return res.data;
};

export const deactivateUser = async (id) => {
  const res = await apiClient.patch(`/users/${id}/deactivate`);
  return res.data;
};

export const reactivateUser = async (id) => {
  const res = await apiClient.patch(`/users/${id}/reactivate`);
  return res.data;
};

export const getAuditLogs = async () => {
  const res = await apiClient.get("/audit-logs");
  return res.data;
};
