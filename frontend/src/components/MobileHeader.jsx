import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import abuLogo from "../assets/Logo2.png";
import ChangePasswordModal from "./ChangePasswordModal";

const MobileHeader = ({ title }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isAdmin    = user?.role === "administrator";
  const isDivAdmin = user?.role === "division_admin";
  const isAdminTier = isAdmin || isDivAdmin;

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
    <>
      <header className="md:hidden flex justify-between items-center w-full px-margin-mobile h-16 sticky top-0 z-[999] bg-surface border-b border-outline-variant shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 -ml-2 text-primary"
            aria-label="Open navigation menu"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h1 className="font-title-lg text-title-lg text-primary truncate">
            {title || "CSWATMS"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs uppercase">
            {user?.username?.substring(0, 2) || "US"}
          </div>
        </div>
      </header>

      {/* Drawer Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[2000] md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer Content */}
      <div
        className={`fixed top-0 left-0 bottom-0 w-64 bg-surface-container border-r border-outline-variant p-6 flex flex-col gap-2 z-[2001] transition-transform duration-300 transform md:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white p-0.5 shadow-2xs border border-outline-variant/60 flex items-center justify-center flex-shrink-0">
              <img
                alt="ABU Crest"
                className="w-full h-full object-contain"
                src={abuLogo}
              />
            </div>
            <span className="font-bold text-primary font-headline-sm text-sm truncate">
              ABU Sanitation
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-on-surface-variant hover:bg-surface-container-high rounded"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
          {menuItems
            .filter((item) => item.show)
            .map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-label-md text-label-md transition-all ${
                    isActive
                      ? "bg-primary/10 text-primary font-semibold border-l-[3px] border-primary pl-[calc(0.75rem-3px)]"
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
          <div className="px-2 py-1 mb-2 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary-container text-white ring-2 ring-primary/20 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
              {user?.username?.substring(0, 2) || "US"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-label-md text-on-surface font-semibold truncate leading-tight text-xs">
                {user?.username}
              </p>
              <p className="font-label-md text-primary font-medium text-[10px] truncate">
                {user?.division_name || user?.role}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsOpen(false);
              setIsPasswordModalOpen(true);
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all font-label-md text-label-md text-left text-xs mb-1"
          >
            <span className="material-symbols-outlined text-[18px]">lock_reset</span>
            <span>Change Password</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600/90 hover:bg-surface-container-high transition-all font-label-md text-label-md text-left text-xs"
          >
            <span className="material-symbols-outlined text-[18px]">
              logout
            </span>
            <span>Logout</span>
          </button>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        isForced={false}
      />
    </>
  );
};

export default MobileHeader;
