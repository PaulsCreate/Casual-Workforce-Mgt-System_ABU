import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import abuLogo from "../assets/Logo2.png";
import ChangePasswordModal from "./ChangePasswordModal";

const SideNavBar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isAdmin    = user?.role === "administrator";
  const isDivAdmin = user?.role === "division_admin";
  const isAdminTier = isAdmin || isDivAdmin; // either admin level

  const ROLE_LABELS = {
    administrator:  "General Admin",
    division_admin: "Division Admin",
    supervisor:     "Supervisor",
  };

  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: "dashboard",
      show: isAdminTier,
    },
    {
      name: "Hierarchy",
      path: "/hierarchy",
      icon: "account_tree",
      show: isAdminTier,
    },
    {
      name: "Workforce",
      path: "/workers",
      icon: "groups",
      show: isAdminTier,
    },
    {
      name: "Approvals",
      path: "/approvals",
      icon: "approval",
      show: isAdminTier,
    },
    {
      name: "Attendance",
      path: "/attendance",
      icon: "assignment_turned_in",
      show: true,
    },
    {
      name: "Reports",
      path: "/reports",
      icon: "assessment",
      show: true,
    },
    {
      name: "Pending Reports",
      path: "/pending-reports",
      icon: "pending_actions",
      show: isAdminTier,
    },
    {
      name: "Users",
      path: "/users",
      icon: "manage_accounts",
      show: isAdminTier,
    },
    {
      name: "Audit Logs",
      path: "/audit-logs",
      icon: "history",
      show: isAdmin,
    },
  ];

  return (
    <nav className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 bg-surface-container py-6 px-4 gap-2 border-r border-outline-variant z-[1000] overflow-y-auto">
      <div className="mb-6 px-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-white p-1 shadow-2xs border border-outline-variant/60 flex items-center justify-center flex-shrink-0">
            <img
              alt="ABU Crest"
              className="w-full h-full object-contain"
              src={abuLogo}
            />
          </div>
          <div className="min-w-0">
            <h2 className="font-headline-md text-[17px] text-primary leading-tight font-bold truncate">
              ABU Sanitation
            </h2>
            <p className="font-label-md text-[10.5px] text-on-surface-variant uppercase tracking-wider truncate">
              Workforce Portal
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-1">
        {menuItems
          .filter((item) => item.show)
          .map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all font-label-md text-label-md ${
                  isActive
                    ? "bg-primary/8 text-primary font-semibold border-l-[3px] border-primary pl-[calc(0.75rem-3px)]"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </Link>
            );
          })}
      </div>

      <div className="mt-auto pt-4 border-t border-outline-variant">
        <div className="px-3 py-2 mb-2 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-container ring-2 ring-primary/20 text-white flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
            {user?.username?.substring(0, 2) || "US"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-label-md text-on-surface font-semibold truncate leading-tight text-xs">
              {user?.username}
            </p>
            <p className="font-label-md text-primary font-medium text-[10px] truncate">
              {user?.division_name || ROLE_LABELS[user?.role] || user?.role}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsPasswordModalOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all font-label-md text-label-md text-left text-xs"
        >
          <span className="material-symbols-outlined text-[18px]">lock_reset</span>
          <span>Change Password</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all font-label-md text-label-md text-left text-xs text-red-600/90 hover:text-red-700"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          <span>Logout</span>
        </button>
      </div>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        isForced={false}
      />
    </nav>
  );
};

export default SideNavBar;
