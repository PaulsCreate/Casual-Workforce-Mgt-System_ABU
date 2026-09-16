import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import abuLogo from "../assets/Logo2.png";
import campusBg from "../assets/campus_bg.jpg";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter your username and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const user = await login(username.trim(), password);
      if (user.role === "supervisor") navigate("/attendance");
      else navigate("/dashboard"); // administrator and division_admin both land on dashboard
    } catch (err) {
      setError(
        err.response?.data?.error || "Invalid credentials. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: `url(${campusBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Dark green overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,40,18,0.88) 0%, rgba(0,65,32,0.80) 50%, rgba(20,90,50,0.72) 100%)",
        }}
      />

      {/* Card */}
      <main className="relative z-10 w-full max-w-[440px] flex flex-col items-center">
        <div className="mb-6 flex flex-col items-center">
          <div
            className="w-24 h-24 flex items-center justify-center rounded-xl mb-4 shadow-lg"
            style={{
              background: "linear-gradient(145deg, #004120, #145a32)",
            }}
          >
            <img
              src={abuLogo}
              alt="CSWATMS Sanitation Emblem"
              className="w-16 h-16 object-contain"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          </div>

          {/* System title above the card */}
          <h1 className="text-white font-bold text-3xl tracking-tight text-center drop-shadow-md">
            CSWATMS
          </h1>
          <p className="text-white/70 text-sm tracking-widest uppercase text-center mt-1">
            Ahmadu Bello University · Zaria
          </p>
        </div>

        <div className="w-full rounded-xl p-8 bg-white shadow-xl">
          {/* Card heading */}
          <div className="mb-7 text-center">
            <h2 className="text-on-surface font-semibold text-xl leading-snug">
              Sign In to Your Account
            </h2>
            <p className="text-on-surface-variant text-sm mt-1">
              Casual Sanitation Workforce Management System
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-error/10 border border-error/25 text-error flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-[18px] shrink-0">
                error
              </span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div className="space-y-1.5">
              <label
                htmlFor="username"
                className="font-label-md text-label-md text-on-surface font-semibold uppercase tracking-wider block"
              >
                Username
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px] select-none">
                  person
                </span>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Enter institutional ID"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 border border-outline-variant rounded-lg bg-surface-container-low text-on-surface font-body-md placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-60"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="font-label-md text-label-md text-on-surface font-semibold uppercase tracking-wider block"
              >
                Password
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px] select-none">
                  lock
                </span>
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10 pr-11 py-2.5 border border-outline-variant rounded-lg bg-surface-container-low text-on-surface font-body-md placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPass ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-lg font-semibold text-[15px] text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60"
              style={{
                background: loading
                  ? "#145a32"
                  : "linear-gradient(135deg, #004120 0%, #145a32 100%)",
                boxShadow: loading ? "none" : "0 4px 14px rgba(0,65,32,0.4)",
              }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <span className="material-symbols-outlined text-[20px]">
                    login
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-7 pt-5 border-t border-outline-variant flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5 text-outline">
              <span className="material-symbols-outlined text-[16px]">
                shield
              </span>
              <span className="font-label-md text-label-md">
                Institutional Access Only
              </span>
            </div>
            {/* <p className="text-outline text-[11px] tracking-wider mt-0.5">
              Authorised Personnel · ABU Zaria
            </p> */}
          </div>
        </div>

        {/* Bottom credits */}
        <p className="relative z-10 mt-5 text-white/40 text-[11px] tracking-wider text-center">
          © {new Date().getFullYear()} Ahmadu Bello University · CSWATMS v1.0
        </p>
      </main>
    </div>
  );
};

export default Login;
