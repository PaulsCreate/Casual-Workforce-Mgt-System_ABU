import apiClient from "./apiClient";

export const markAttendance = async (data) => {
  const response = await apiClient.post("/attendance", data);
  return response.data;
};

export const unmarkAttendance = async (data) => {
  const response = await apiClient.delete("/attendance", { data });
  return response.data;
};

export const markBatchAttendance = async (data) => {
  const response = await apiClient.post("/attendance/batch", data);
  return response.data;
};

export const getAttendanceForAssignment = async (assignmentId, month, year) => {
  const response = await apiClient.get(`/attendance/assignment/${assignmentId}?month=${month}&year=${year}`);
  return response.data;
};

export const getAttendanceSummary = async (assignmentId, month, year) => {
  const response = await apiClient.get(`/attendance/assignment/${assignmentId}/summary?month=${month}&year=${year}`);
  return response.data;
};

export const getAttendanceForLocation = async (locationId, date) => {
  const response = await apiClient.get(`/attendance/location/${locationId}/date/${date}`);
  return response.data;
};

// Location Supervisors
export const assignSupervisor = async (data) => {
  const response = await apiClient.post("/location-supervisors", data);
  return response.data;
};

export const unassignSupervisor = async (data) => {
  // Note: delete request expects config object containing data body
  const response = await apiClient.delete("/location-supervisors", { data });
  return response.data;
};

export const getSupervisorsForLocation = async (locationId) => {
  const response = await apiClient.get(`/location-supervisors/location/${locationId}`);
  return response.data;
};

export const getLocationsForSupervisor = async (userId) => {
  const response = await apiClient.get(`/location-supervisors/supervisor/${userId}`);
  return response.data;
};
