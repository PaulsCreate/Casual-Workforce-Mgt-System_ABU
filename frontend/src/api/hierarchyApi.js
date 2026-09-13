import apiClient from "./apiClient";

// Divisions
export const getDivisions = async (params = {}) => {
  const response = await apiClient.get("/divisions", { params });
  return response.data;
};

export const createDivision = async (data) => {
  const response = await apiClient.post("/divisions", data);
  return response.data;
};

export const updateDivision = async (id, data) => {
  const response = await apiClient.put(`/divisions/${id}`, data);
  return response.data;
};

export const deleteDivision = async (id) => {
  const response = await apiClient.delete(`/divisions/${id}`);
  return response.data;
};

// Units
export const getUnits = async (divisionId) => {
  const url = divisionId ? `/operational-units?division_id=${divisionId}` : "/operational-units";
  const response = await apiClient.get(url);
  return response.data;
};

export const createUnit = async (data) => {
  const response = await apiClient.post("/operational-units", data);
  return response.data;
};

export const updateUnit = async (id, data) => {
  const response = await apiClient.put(`/operational-units/${id}`, data);
  return response.data;
};

export const deleteUnit = async (id) => {
  const response = await apiClient.delete(`/operational-units/${id}`);
  return response.data;
};

// Locations
export const getLocations = async (unitId) => {
  const url = unitId ? `/operational-locations?operational_unit_id=${unitId}` : "/operational-locations";
  const response = await apiClient.get(url);
  return response.data;
};

export const createLocation = async (data) => {
  const response = await apiClient.post("/operational-locations", data);
  return response.data;
};

export const updateLocation = async (id, data) => {
  const response = await apiClient.put(`/operational-locations/${id}`, data);
  return response.data;
};

export const deleteLocation = async (id) => {
  const response = await apiClient.delete(`/operational-locations/${id}`);
  return response.data;
};
