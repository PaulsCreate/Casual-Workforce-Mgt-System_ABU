import apiClient from "./apiClient";

export const loginUser = async (username, password) => {
  const response = await apiClient.post("/auth/login", { username, password });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await apiClient.get("/auth/me");
  return response.data;
};

export const changePasswordApi = async (currentPassword, newPassword) => {
  const response = await apiClient.post("/auth/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return response.data;
};
