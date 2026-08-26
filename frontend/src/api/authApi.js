import apiClient from "./apiClient";

export const loginUser = async (username, password) => {
  const response = await apiClient.post("/auth/login", { username, password });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await apiClient.get("/auth/me");
  return response.data;
};
