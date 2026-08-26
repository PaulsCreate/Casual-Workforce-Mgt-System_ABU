import apiClient from "./apiClient";

export const generateReport = async (locationId, month, year) => {
  const response = await apiClient.get(`/reports/location/${locationId}?month=${month}&year=${year}`);
  return response.data;
};

export const generateBatchReport = async (locationIds, month, year) => {
  const locsParam = Array.isArray(locationIds) ? locationIds.join(",") : locationIds;
  const response = await apiClient.get(`/reports/location-batch?location_ids=${locsParam}&month=${month}&year=${year}`);
  return response.data;
};

export const getDivisionAggregateReport = async (divisionId, month, year) => {
  const divParam = divisionId ? `&division_id=${divisionId}` : "";
  const response = await apiClient.get(`/reports/division-aggregate?month=${month}&year=${year}${divParam}`);
  return response.data;
};

export const submitReport = async (data) => {
  const response = await apiClient.post("/reports/submit", data);
  return response.data;
};

export const submitBatchReports = async (data) => {
  const response = await apiClient.post("/reports/submit-batch", data);
  return response.data;
};

export const verifyReport = async (id) => {
  const response = await apiClient.post(`/reports/${id}/verify`);
  return response.data;
};

export const verifyBatchReports = async (data) => {
  const response = await apiClient.post("/reports/verify-batch", data);
  return response.data;
};

export const getPendingReports = async () => {
  const response = await apiClient.get("/reports/pending");
  return response.data;
};

export const getDashboardStats = async () => {
  const response = await apiClient.get("/reports/dashboard/stats");
  return response.data;
};
