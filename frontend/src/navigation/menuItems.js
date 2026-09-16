export const getMenuItems = (user) => {
  const isAdmin = user?.role === "administrator";
  const isDivAdmin = user?.role === "division_admin";
  const isAdminTier = isAdmin || isDivAdmin;

  return [
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
      show: isAdmin,
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
};
