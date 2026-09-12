import React, { createContext, useState, useEffect, useContext } from "react";
import { loginUser } from "../api/authApi";
import ChangePasswordModal from "../components/ChangePasswordModal";

const AuthContext = createContext(null);

function decodeToken(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to decode token", error);
    return null;
  }
}

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      const decoded = decodeToken(token);
      if (decoded) {
        // Simple token expiration check
        const expiry = decoded.exp * 1000;
        if (Date.now() > expiry) {
          logout();
        } else {
          setUser({
            id: decoded.id,
            full_name: decoded.full_name,
            username: decoded.username,
            role: decoded.role,
            division_id: decoded.division_id,
            division_name: decoded.division_name,
            must_change_password: Boolean(decoded.must_change_password),
          });
        }
      } else {
        logout();
      }
    } else {
      setUser(null);
    }
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
    } catch (error) {
      throw error;
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
      const decoded = decodeToken(newToken);
      if (decoded) {
        setUser({
          id: decoded.id,
          full_name: decoded.full_name,
          username: decoded.username,
          role: decoded.role,
          division_id: decoded.division_id,
          division_name: decoded.division_name,
          must_change_password: Boolean(decoded.must_change_password),
        });
      }
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUserToken, loading }}>
      {children}
      {user && user.must_change_password && (
        <ChangePasswordModal
          isOpen={true}
          isForced={true}
          onClose={() => {}}
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
