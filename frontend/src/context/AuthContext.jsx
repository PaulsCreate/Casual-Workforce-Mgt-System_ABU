import React, { createContext, useState, useEffect, useContext } from "react";
import { loginUser } from "../api/authApi";
import ChangePasswordModal from "../components/ChangePasswordModal";

const AuthContext = createContext(null);

function decodeToken(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.id || !payload.username || !payload.role || !Number.isFinite(payload.exp)) {
      return null;
    }
    return payload;
  } catch (error) {
    console.error("Failed to decode token", error);
    return null;
  }
}

function userFromToken(token) {
  const decoded = decodeToken(token);
  if (!decoded || Date.now() >= decoded.exp * 1000) return null;

  return {
    id: decoded.id,
    full_name: decoded.full_name,
    username: decoded.username,
    role: decoded.role,
    division_id: decoded.division_id,
    division_name: decoded.division_name,
    must_change_password: Boolean(decoded.must_change_password),
  };
}

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoredUser = token ? userFromToken(token) : null;
    if (token && !restoredUser) {
      localStorage.removeItem("token");
      setToken(null);
    }
    setUser(restoredUser);
    setLoading(false);
  }, [token]);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const data = await loginUser(username, password);
      localStorage.setItem("token", data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const updateUserToken = (newToken, updatedUser) => {
    if (newToken) {
      localStorage.setItem("token", newToken);
      setToken(newToken);
    }
    if (updatedUser) {
      setUser(updatedUser);
    } else if (newToken) {
      setUser(userFromToken(newToken));
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const handleForcedPasswordClose = () => {
    logout();
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUserToken, loading }}>
      {children}
      {user && user.must_change_password && (
        <ChangePasswordModal
          isOpen={true}
          isForced={true}
          onClose={handleForcedPasswordClose}
        />
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
