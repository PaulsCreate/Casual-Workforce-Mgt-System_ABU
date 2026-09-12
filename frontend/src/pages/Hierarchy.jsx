import React, { useState, useEffect } from "react";
import {
  getDivisions,
  createDivision,
  updateDivision,
  deleteDivision,
  getUnits,
  createUnit,
  updateUnit,
  deleteUnit,
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} from "../api/hierarchyApi";
import {
  getSupervisorsForLocation,
  assignSupervisor,
  unassignSupervisor,
} from "../api/attendanceApi";
import { getUsers } from "../api/usersApi";
import { useAuth } from "../context/AuthContext";
import SideNavBar from "../components/SideNavBar";
import MobileHeader from "../components/MobileHeader";

const Hierarchy = () => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "administrator";
  const isDivAdmin = currentUser?.role === "division_admin";

  const [divisions, setDivisions] = useState([]);
  const [unitsByDivision, setUnitsByDivision] = useState({});
  const [locationsByUnit, setLocationsByUnit] = useState({});
  const [expandedDivisions, setExpandedDivisions] = useState({});
  const [expandedUnits, setExpandedUnits] = useState({});
  const [expandedHostels, setExpandedHostels] = useState({});

  // Supervisors & Users dropdown
  const [allSupervisors, setAllSupervisors] = useState([]);
  const [locationSupervisors, setLocationSupervisors] = useState([]);

  // Form Management
  const [formMode, setFormMode] = useState("stats"); // stats | add_div | edit_div | add_unit | edit_unit | add_loc | edit_loc | supervisors
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Input states
  const [divName, setDivName] = useState("");
  const [divDesc, setDivDesc] = useState("");
  const [unitName, setUnitName] = useState("");
  const [unitDesc, setUnitDesc] = useState("");
  const [locName, setLocName] = useState("");
  const [locDesc, setLocDesc] = useState("");
  const [selectedSupervisorId, setSelectedSupervisorId] = useState("");

  const handleToggleHostel = (hostelKey) => {
    setExpandedHostels((prev) => ({
      ...prev,
      [hostelKey]: prev[hostelKey] === false ? true : false,
    }));
  };

  const loadData = async () => {
    try {
      setError("");
      const divData = await getDivisions();
      setDivisions(divData);

      // Auto-expand division if division_admin
      if (divData.length > 0) {
        const autoExp = {};
        divData.forEach((d) => {
          autoExp[d.id] = true;
        });
        setExpandedDivisions(autoExp);
      }

      // Load all units and locations
      const unitData = await getUnits();
      const locData = await getLocations();

      // Group units by division
      const uGroup = {};
      unitData.forEach((u) => {
        if (!uGroup[u.division_id]) uGroup[u.division_id] = [];
        uGroup[u.division_id].push(u);
      });
      setUnitsByDivision(uGroup);

      // Group locations by unit
      const lGroup = {};
      locData.forEach((l) => {
        if (!lGroup[l.operational_unit_id]) lGroup[l.operational_unit_id] = [];
        lGroup[l.operational_unit_id].push(l);
      });
      setLocationsByUnit(lGroup);

      // Load all system supervisors
      const supervisorsList = await getUsers("supervisor");
      setAllSupervisors(supervisorsList);
    } catch (err) {
      console.error(err);
      setError("Failed to load hierarchical structures");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleDivision = (divId) => {
    setExpandedDivisions((prev) => ({ ...prev, [divId]: !prev[divId] }));
  };

  const handleToggleUnit = (unitId) => {
    setExpandedUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  // Division Actions
  const handleAddDivision = async (e) => {
    e.preventDefault();
    if (!divName.trim()) return;
    try {
      setError("");
      await createDivision({ name: divName, description: divDesc });
      setSuccess("Division created successfully!");
      setDivName("");
      setDivDesc("");
      setFormMode("stats");
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Error creating division");
    }
  };

  const handleEditDivision = async (e) => {
    e.preventDefault();
    if (!divName.trim()) return;
    try {
      setError("");
      await updateDivision(selectedEntity.id, { name: divName, description: divDesc });
      setSuccess("Division updated successfully!");
      setFormMode("stats");
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Error updating division");
    }
  };

  const handleDeleteDivision = async (id) => {
    if (!window.confirm("Are you sure you want to delete this division? This will fail if units exist under it.")) return;
    try {
      setError("");
      await deleteDivision(id);
      setSuccess("Division deleted successfully!");
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Error deleting division");
    }
  };

  // Unit Actions
  const handleAddUnit = async (e) => {
    e.preventDefault();
    if (!unitName.trim()) return;
    try {
      setError("");
      await createUnit({
        division_id: selectedEntity.id,
        name: unitName,
        description: unitDesc,
      });
      setSuccess("Operational Unit created successfully!");
      setUnitName("");
      setUnitDesc("");
      setFormMode("stats");
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Error creating unit");
    }
  };

  const handleEditUnit = async (e) => {
    e.preventDefault();
    if (!unitName.trim()) return;
    try {
      setError("");
      await updateUnit(selectedEntity.id, { name: unitName, description: unitDesc });
      setSuccess("Operational Unit updated successfully!");
      setFormMode("stats");
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Error updating unit");
    }
  };

  const handleDeleteUnit = async (id) => {
    if (!window.confirm("Are you sure you want to delete this unit? This will fail if locations exist under it.")) return;
    try {
      setError("");
      await deleteUnit(id);
      setSuccess("Unit deleted successfully!");
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Error deleting unit");
    }
  };

  // Location Actions
  const handleAddLocation = async (e) => {
    e.preventDefault();
    if (!locName.trim()) return;
    try {
      setError("");
      await createLocation({
        operational_unit_id: selectedEntity.id,
        name: locName,
        description: locDesc,
      });
      setSuccess("Operational Location created!");
      setLocName("");
      setLocDesc("");
      setFormMode("stats");
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Error creating location");
    }
  };

  const handleEditLocation = async (e) => {
    e.preventDefault();
    if (!locName.trim()) return;
    try {
      setError("");
      await updateLocation(selectedEntity.id, { name: locName, description: locDesc });
      setSuccess("Location updated successfully!");
      setFormMode("stats");
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Error updating location");
    }
  };

  const handleDeleteLocation = async (id) => {
    if (!window.confirm("Are you sure you want to delete this location?")) return;
    try {
      setError("");
      await deleteLocation(id);
      setSuccess("Location deleted successfully!");
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Error deleting location");
    }
  };

  const [applyToHostel, setApplyToHostel] = useState(true);

  // Manage Location Supervisors
  const handleSelectLocationSupervisors = async (loc) => {
    setSelectedEntity(loc);
    setFormMode("supervisors");
    setSelectedSupervisorId("");
    setApplyToHostel(true);
    try {
      const activeSups = await getSupervisorsForLocation(loc.id);
      setLocationSupervisors(activeSups);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch supervisors for this location");
    }
  };

  const handleAssignSupervisor = async (e) => {
    e.preventDefault();
    if (!selectedSupervisorId) return;
    try {
      setError("");
      const res = await assignSupervisor({
        location_id: selectedEntity.id,
        user_id: Number(selectedSupervisorId),
        apply_to_hostel: applyToHostel,
      });
      setSuccess(res.message || "Supervisor assigned successfully!");
      // Reload this location's supervisors
      const activeSups = await getSupervisorsForLocation(selectedEntity.id);
      setLocationSupervisors(activeSups);
      setSelectedSupervisorId("");
    } catch (err) {
      setError(err.response?.data?.error || "Error assigning supervisor");
    }
  };

  const handleUnassignSupervisor = async (supId) => {
    try {
      setError("");
      const res = await unassignSupervisor({
        location_id: selectedEntity.id,
        user_id: supId,
        apply_to_hostel: applyToHostel,
      });
      setSuccess(res.message || "Supervisor unassigned!");
      // Reload this location's supervisors
      const activeSups = await getSupervisorsForLocation(selectedEntity.id);
      setLocationSupervisors(activeSups);
    } catch (err) {
      setError(err.response?.data?.error || "Error removing supervisor");
    }
  };

  // Calculate totals
  const totalDivs = divisions.length;
  const totalUnits = Object.values(unitsByDivision).reduce((acc, curr) => acc + curr.length, 0);
  const totalLocs = Object.values(locationsByUnit).reduce((acc, curr) => acc + curr.length, 0);

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col md:flex-row">
      <SideNavBar />
      <main className="flex-1 flex flex-col md:ml-64 overflow-hidden bg-background">
        <MobileHeader title="Institutional Hierarchy" />

        {/* Desktop Header */}
        <header className="hidden md:flex justify-between items-center w-full px-margin-desktop h-16 bg-surface border-b border-outline-variant sticky top-0 z-[900]">
          <div className="font-headline-sm text-headline-sm font-bold text-primary">
            Institutional Framework
          </div>
          <div className="text-on-surface-variant font-label-md text-label-md">
            Management Panel
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-margin-mobile md:p-margin-desktop">
          <div className="max-w-container-max mx-auto w-full space-y-6">
            {/* Title block */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-outline-variant pb-4 gap-4">
              <div>
                <h2 className="font-display-lg text-display-lg text-on-surface mb-2 font-bold">
                  Divisions & Units
                </h2>
                <p className="font-body-lg text-on-surface-variant">
                  Manage organizational hierarchy and operational zones.
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => {
                    setFormMode("add_div");
                    setDivName("");
                    setDivDesc("");
                  }}
                  className="bg-primary text-on-primary hover:bg-[#0E4526] transition-colors rounded-lg py-2.5 px-4 font-label-md text-label-md flex items-center gap-2 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    add_business
                  </span>
                  New Division
                </button>
              )}
              {isDivAdmin && divisions.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedEntity(divisions[0]);
                    setUnitName("");
                    setUnitDesc("");
                    setFormMode("add_unit");
                  }}
                  className="bg-primary text-on-primary hover:bg-[#0E4526] transition-colors rounded-lg py-2.5 px-4 font-label-md text-label-md flex items-center gap-2 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    add
                  </span>
                  New Operational Unit
                </button>
              )}
            </div>

            {/* Notifications */}
            {error && (
              <div className="p-4 bg-error-container/20 border border-error/30 text-error rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined">error</span>
                <p className="font-body-md">{error}</p>
              </div>
            )}
            {success && (
              <div className="p-4 bg-primary/10 border border-primary/25 text-primary rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined">check_circle</span>
                <p className="font-body-md">{success}</p>
              </div>
            )}

            {/* Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Hierarchy Tree Panel */}
              <div className="lg:col-span-8 bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="bg-surface border-b border-outline-variant px-6 py-4 flex justify-between items-center">
                  <h3 className="font-title-lg text-title-lg text-on-surface font-semibold">
                    Organizational Tree
                  </h3>
                </div>
                <div className="p-6 flex-1 overflow-y-auto space-y-4">
                  {divisions.length === 0 ? (
                    <div className="text-center py-12 text-on-surface-variant">
                      <span className="material-symbols-outlined text-4xl mb-2 text-outline">
                        domain_disabled
                      </span>
                      <p>No divisions registered yet.</p>
                    </div>
                  ) : (
                    divisions.map((div) => {
                      const divUnits = unitsByDivision[div.id] || [];
                      const isDivExp = expandedDivisions[div.id];

                      return (
                        <div key={div.id} className="space-y-1">
                          {/* Division Row */}
                          <div className="flex items-center gap-2 group p-2 hover:bg-surface-container-low rounded-lg border border-transparent hover:border-outline-variant transition-colors cursor-pointer">
                            <button
                              onClick={() => handleToggleDivision(div.id)}
                              className="w-6 h-6 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                {isDivExp ? "expand_more" : "chevron_right"}
                              </span>
                            </button>
                            <span className="material-symbols-outlined text-[20px] text-primary">
                              domain
                            </span>
                            <span
                              onClick={() => {
                                if (isAdmin) {
                                  setSelectedEntity(div);
                                  setDivName(div.name);
                                  setDivDesc(div.description || "");
                                  setFormMode("edit_div");
                                }
                              }}
                              className={`font-body-lg text-body-lg font-semibold text-on-surface ${isAdmin ? "hover:text-primary cursor-pointer" : ""}`}
                            >
                              {div.name}
                            </span>
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-md text-label-md text-[10px] uppercase">
                              Division
                            </span>

                            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                              <button
                                onClick={() => {
                                  setSelectedEntity(div);
                                  setUnitName("");
                                  setUnitDesc("");
                                  setFormMode("add_unit");
                                }}
                                className="text-primary hover:bg-primary-container/10 p-1 rounded transition-colors"
                                title="Add Unit"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  add
                                </span>
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteDivision(div.id)}
                                  className="text-error hover:bg-error-container/15 p-1 rounded transition-colors"
                                  title="Delete Division"
                                >
                                  <span className="material-symbols-outlined text-[18px]">
                                    delete
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Level 2: Units */}
                          {isDivExp && (
                            <div className="pl-6 border-l border-outline-variant/60 ml-5 space-y-1">
                              {divUnits.length === 0 ? (
                                <p className="text-xs text-on-surface-variant pl-6 py-1 italic">
                                  No operational units in this division.
                                </p>
                              ) : (
                                divUnits.map((unit) => {
                                  const unitLocs = locationsByUnit[unit.id] || [];
                                  const isUnitExp = expandedUnits[unit.id];

                                  return (
                                    <div key={unit.id} className="space-y-1">
                                      {/* Unit Row */}
                                      <div className="flex items-center gap-2 group p-2 hover:bg-surface-container-low rounded-lg border border-transparent hover:border-outline-variant transition-colors cursor-pointer">
                                        <button
                                          onClick={() => handleToggleUnit(unit.id)}
                                          className="w-6 h-6 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                                        >
                                          <span className="material-symbols-outlined text-[20px]">
                                            {isUnitExp
                                              ? "expand_more"
                                              : "chevron_right"}
                                          </span>
                                        </button>
                                        <span className="material-symbols-outlined text-[18px] text-secondary">
                                          cleaning_services
                                        </span>
                                        <span
                                          onClick={() => {
                                            setSelectedEntity(unit);
                                            setUnitName(unit.name);
                                            setUnitDesc(unit.description || "");
                                            setFormMode("edit_unit");
                                          }}
                                          className="font-body-md text-body-md text-on-surface font-medium hover:text-primary"
                                        >
                                          {unit.name}
                                        </span>
                                        <span className="ml-2 px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-md text-label-md text-[10px] uppercase">
                                          Unit
                                        </span>

                                        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                          <button
                                            onClick={() => {
                                              setSelectedEntity(unit);
                                              setLocName("");
                                              setLocDesc("");
                                              setFormMode("add_loc");
                                            }}
                                            className="text-primary hover:bg-primary-container/10 p-1 rounded transition-colors"
                                            title="Add Location"
                                          >
                                            <span className="material-symbols-outlined text-[18px]">
                                              add
                                            </span>
                                          </button>
                                          <button
                                            onClick={() => handleDeleteUnit(unit.id)}
                                            className="text-error hover:bg-error-container/15 p-1 rounded transition-colors"
                                            title="Delete Unit"
                                          >
                                            <span className="material-symbols-outlined text-[18px]">
                                              delete
                                            </span>
                                          </button>
                                        </div>
                                      </div>

                                      {/* Level 3: Locations & Hostel Folders */}
                                      {isUnitExp && (
                                        <div className="pl-6 border-l border-outline-variant/60 ml-5 space-y-2">
                                          {unitLocs.length === 0 ? (
                                            <p className="text-xs text-on-surface-variant pl-6 py-1 italic">
                                              No deployed locations.
                                            </p>
                                          ) : (() => {
                                            const hostelGroups = {};
                                            const flatLocs = [];

                                            unitLocs.forEach((loc) => {
                                              if (loc.name.includes(" — ")) {
                                                const [hostel, block] = loc.name.split(" — ");
                                                const hName = hostel.trim();
                                                if (!hostelGroups[hName]) hostelGroups[hName] = [];
                                                hostelGroups[hName].push({ ...loc, blockName: block.trim() });
                                              } else {
                                                flatLocs.push(loc);
                                              }
                                            });

                                            const hasHostelGroups = Object.keys(hostelGroups).length > 0;

                                            return (
                                              <>
                                                {/* Grouped Hostels Accordions */}
                                                {hasHostelGroups &&
                                                  Object.entries(hostelGroups).map(([hostelName, blocks]) => {
                                                    const hostelKey = `${unit.id}_${hostelName}`;
                                                    const isHostelExp = expandedHostels[hostelKey] !== false; // expanded by default

                                                    return (
                                                      <div key={hostelName} className="space-y-1 my-1">
                                                        {/* Hostel Header Card */}
                                                        <div className="flex items-center gap-2 group py-1.5 px-2.5 bg-surface-container-low hover:bg-surface-container rounded-lg border border-outline-variant/60 transition-colors">
                                                          <button
                                                            onClick={() => handleToggleHostel(hostelKey)}
                                                            className="w-5 h-5 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                                                          >
                                                            <span className="material-symbols-outlined text-[18px]">
                                                              {isHostelExp ? "expand_more" : "chevron_right"}
                                                            </span>
                                                          </button>
                                                          <span className="material-symbols-outlined text-[18px] text-primary">
                                                            apartment
                                                          </span>
                                                          <span
                                                            onClick={() => handleToggleHostel(hostelKey)}
                                                            className="font-body-md text-sm font-bold text-on-surface hover:text-primary cursor-pointer"
                                                          >
                                                            {hostelName}
                                                          </span>
                                                          <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                                                            {blocks.length} {blocks.length === 1 ? "block" : "blocks"}
                                                          </span>

                                                          {/* Quick Hostel Actions */}
                                                          <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                                                            {/* Assign Supervisor to entire Hostel */}
                                                            <button
                                                              onClick={() => {
                                                                handleSelectLocationSupervisors(blocks[0]);
                                                              }}
                                                              className="text-secondary hover:bg-secondary/10 px-2 py-0.5 rounded text-xs flex items-center gap-1 transition-colors border border-secondary/20"
                                                              title={`Assign Supervisor to all blocks in ${hostelName}`}
                                                            >
                                                              <span className="material-symbols-outlined text-[15px]">
                                                                supervisor_account
                                                              </span>
                                                              <span className="text-[11px] font-semibold">Supervisors</span>
                                                            </button>

                                                            {/* Add block to this Hostel */}
                                                            <button
                                                              onClick={() => {
                                                                setSelectedEntity(unit);
                                                                setLocName(`${hostelName} — `);
                                                                setLocDesc("");
                                                                setFormMode("add_loc");
                                                              }}
                                                              className="text-primary hover:bg-primary-container/15 p-1 rounded transition-colors"
                                                              title={`Add new block under ${hostelName}`}
                                                            >
                                                              <span className="material-symbols-outlined text-[18px]">
                                                                add
                                                              </span>
                                                            </button>
                                                          </div>
                                                        </div>

                                                        {/* Expanded Blocks under this Hostel */}
                                                        {isHostelExp && (
                                                          <div className="pl-6 border-l-2 border-primary/20 ml-4 space-y-1 py-1">
                                                            {blocks.map((loc) => (
                                                              <div
                                                                key={loc.id}
                                                                className="flex items-center gap-2 group py-1 px-2 hover:bg-surface-container-low rounded-md transition-colors"
                                                              >
                                                                <span className="material-symbols-outlined text-[15px] text-tertiary">
                                                                  location_on
                                                                </span>
                                                                <span
                                                                  onClick={() =>
                                                                    handleSelectLocationSupervisors(loc)
                                                                  }
                                                                  className="font-data-mono text-xs text-on-surface hover:text-primary cursor-pointer flex-1"
                                                                >
                                                                  {loc.blockName || loc.name}
                                                                </span>
                                                                <span className="text-[9px] text-on-surface-variant/70 px-1.5 py-0.2 rounded bg-surface-container-high font-mono">
                                                                  BLOCK
                                                                </span>

                                                                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                                  <button
                                                                    onClick={() =>
                                                                      handleSelectLocationSupervisors(loc)
                                                                    }
                                                                    className="text-secondary hover:bg-secondary/10 p-1 rounded"
                                                                    title="Manage Block Supervisors"
                                                                  >
                                                                    <span className="material-symbols-outlined text-[15px]">
                                                                      supervisor_account
                                                                    </span>
                                                                  </button>
                                                                  <button
                                                                    onClick={() => {
                                                                      setSelectedEntity(loc);
                                                                      setLocName(loc.name);
                                                                      setLocDesc(loc.description || "");
                                                                      setFormMode("edit_loc");
                                                                    }}
                                                                    className="text-on-surface-variant hover:bg-surface-container-high p-1 rounded"
                                                                    title="Edit Block"
                                                                  >
                                                                    <span className="material-symbols-outlined text-[15px]">
                                                                      edit
                                                                    </span>
                                                                  </button>
                                                                  <button
                                                                    onClick={() => handleDeleteLocation(loc.id)}
                                                                    className="text-error hover:bg-error-container/15 p-1 rounded"
                                                                    title="Delete Block"
                                                                  >
                                                                    <span className="material-symbols-outlined text-[15px]">
                                                                      delete
                                                                    </span>
                                                                  </button>
                                                                </div>
                                                              </div>
                                                            ))}
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  })}

                                                {/* Regular Flat Locations (for units without hostel prefix) */}
                                                {flatLocs.map((loc) => (
                                                  <div
                                                    key={loc.id}
                                                    className="flex items-center gap-2 group py-1.5 px-2 hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer"
                                                  >
                                                    <span className="material-symbols-outlined text-[16px] text-tertiary">
                                                      location_on
                                                    </span>
                                                    <span
                                                      onClick={() =>
                                                        handleSelectLocationSupervisors(
                                                          loc
                                                        )
                                                      }
                                                      className="font-data-mono text-data-mono text-on-surface-variant hover:text-primary flex-1"
                                                    >
                                                      {loc.name}
                                                    </span>
                                                    <span className="text-[10px] text-outline px-1.5 py-0.5 rounded bg-surface-container-high font-semibold">
                                                      LOC
                                                    </span>

                                                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                                      <button
                                                        onClick={() => {
                                                          setSelectedEntity(loc);
                                                          setLocName(loc.name);
                                                          setLocDesc(
                                                            loc.description || ""
                                                          );
                                                          setFormMode("edit_loc");
                                                        }}
                                                        className="text-on-surface-variant hover:bg-surface-container-high p-1 rounded transition-colors"
                                                        title="Edit Location"
                                                      >
                                                        <span className="material-symbols-outlined text-[16px]">
                                                          edit
                                                        </span>
                                                      </button>
                                                      <button
                                                        onClick={() =>
                                                          handleDeleteLocation(
                                                            loc.id
                                                          )
                                                        }
                                                        className="text-error hover:bg-error-container/15 p-1 rounded transition-colors"
                                                        title="Delete Location"
                                                      >
                                                        <span className="material-symbols-outlined text-[16px]">
                                                          delete
                                                        </span>
                                                      </button>
                                                    </div>
                                                  </div>
                                                ))}
                                              </>
                                            );
                                          })()}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Side Context Panel */}
              <div className="lg:col-span-4 space-y-6">
                {/* Stats Summary Widget */}
                {formMode === "stats" && (
                  <div className="bg-white border border-outline-variant rounded-xl shadow-sm p-6 space-y-6">
                    <h4 className="font-title-lg text-title-lg text-on-surface font-semibold pb-2 border-b border-outline-variant">
                      Institutional Statistics
                    </h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-outline-variant/30">
                        <span className="font-body-md text-on-surface-variant">
                          Total Divisions
                        </span>
                        <span className="font-headline-sm text-headline-sm text-primary font-bold">
                          {totalDivs}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-outline-variant/30">
                        <span className="font-body-md text-on-surface-variant">
                          Operational Units
                        </span>
                        <span className="font-headline-sm text-headline-sm text-secondary font-bold">
                          {totalUnits}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-body-md text-on-surface-variant">
                          Active Locations
                        </span>
                        <span className="font-headline-sm text-headline-sm text-tertiary font-bold">
                          {totalLocs}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Create/Edit Division Form */}
                {isAdmin && (formMode === "add_div" || formMode === "edit_div") && (
                  <div className="bg-white border border-outline-variant rounded-xl shadow-sm p-6">
                    <h4 className="font-title-lg text-title-lg text-on-surface font-semibold mb-4">
                      {formMode === "add_div"
                        ? "New Division"
                        : "Edit Division"}
                    </h4>
                    <form
                      onSubmit={
                        formMode === "add_div"
                          ? handleAddDivision
                          : handleEditDivision
                      }
                      className="space-y-4"
                    >
                      <div className="space-y-1">
                        <label className="font-label-md text-label-md text-on-surface">
                          Division Name
                        </label>
                        <input
                          type="text"
                          className="w-full p-2 border border-outline-variant rounded font-body-md bg-white text-on-surface"
                          placeholder="e.g. Main Campus"
                          value={divName}
                          onChange={(e) => setDivName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-label-md text-label-md text-on-surface">
                          Description
                        </label>
                        <textarea
                          rows="3"
                          className="w-full p-2 border border-outline-variant rounded font-body-md bg-white text-on-surface"
                          placeholder="Provide details"
                          value={divDesc}
                          onChange={(e) => setDivDesc(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setFormMode("stats")}
                          className="px-4 py-2 border border-outline-variant hover:bg-surface-container rounded text-body-md"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-primary text-white hover:bg-[#0E4526] rounded text-body-md font-semibold"
                        >
                          Save
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Create/Edit Unit Form */}
                {(formMode === "add_unit" || formMode === "edit_unit") && (
                  <div className="bg-white border border-outline-variant rounded-xl shadow-sm p-6">
                    <h4 className="font-title-lg text-title-lg text-on-surface font-semibold mb-4">
                      {formMode === "add_unit" ? (
                        <>New Unit under <span className="text-primary">{selectedEntity?.name}</span></>
                      ) : (
                        "Edit Unit"
                      )}
                    </h4>
                    <form
                      onSubmit={
                        formMode === "add_unit" ? handleAddUnit : handleEditUnit
                      }
                      className="space-y-4"
                    >
                      <div className="space-y-1">
                        <label className="font-label-md text-label-md text-on-surface">
                          Unit Name
                        </label>
                        <input
                          type="text"
                          className="w-full p-2 border border-outline-variant rounded font-body-md bg-white text-on-surface"
                          placeholder="e.g. Waste Management"
                          value={unitName}
                          onChange={(e) => setUnitName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-label-md text-label-md text-on-surface">
                          Description
                        </label>
                        <textarea
                          rows="3"
                          className="w-full p-2 border border-outline-variant rounded font-body-md bg-white text-on-surface"
                          placeholder="Provide details"
                          value={unitDesc}
                          onChange={(e) => setUnitDesc(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setFormMode("stats")}
                          className="px-4 py-2 border border-outline-variant hover:bg-surface-container rounded text-body-md"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-primary text-white hover:bg-[#0E4526] rounded text-body-md font-semibold"
                        >
                          Save
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Create/Edit Location Form */}
                {(formMode === "add_loc" || formMode === "edit_loc") && (
                  <div className="bg-white border border-outline-variant rounded-xl shadow-sm p-6">
                    <h4 className="font-title-lg text-title-lg text-on-surface font-semibold mb-4">
                      {formMode === "add_loc" ? (
                        <>New Location under <span className="text-secondary">{selectedEntity?.name}</span></>
                      ) : (
                        "Edit Location"
                      )}
                    </h4>
                    <form
                      onSubmit={
                        formMode === "add_loc"
                          ? handleAddLocation
                          : handleEditLocation
                      }
                      className="space-y-4"
                    >
                      <div className="space-y-1">
                        <label className="font-label-md text-label-md text-on-surface">
                          Location Name
                        </label>
                        <input
                          type="text"
                          className="w-full p-2 border border-outline-variant rounded font-body-md bg-white text-on-surface"
                          placeholder="e.g. Danfodio Hall"
                          value={locName}
                          onChange={(e) => setLocName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-label-md text-label-md text-on-surface">
                          Description
                        </label>
                        <textarea
                          rows="3"
                          className="w-full p-2 border border-outline-variant rounded font-body-md bg-white text-on-surface"
                          placeholder="Provide details"
                          value={locDesc}
                          onChange={(e) => setLocDesc(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setFormMode("stats")}
                          className="px-4 py-2 border border-outline-variant hover:bg-surface-container rounded text-body-md"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-primary text-white hover:bg-[#0E4526] rounded text-body-md font-semibold"
                        >
                          Save
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Location Supervisors Manager Panel */}
                {formMode === "supervisors" && (
                  <div className="bg-white border border-outline-variant rounded-xl shadow-sm p-6 space-y-6">
                    <div>
                      <h4 className="font-title-lg text-title-lg text-on-surface font-semibold">
                        Location Supervisors
                      </h4>
                      <p className="font-label-md text-on-surface-variant text-[11px] mt-0.5 uppercase tracking-wide">
                        {selectedEntity?.name}
                      </p>
                    </div>

                    {/* Active Supervisors List */}
                    <div className="space-y-3">
                      <h5 className="font-body-md font-bold text-on-surface">
                        Assigned Supervisors
                      </h5>
                      {locationSupervisors.length === 0 ? (
                        <p className="text-xs text-on-surface-variant italic">
                          No supervisors assigned to this location. Mark attendance will be locked.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {locationSupervisors.map((sup) => (
                            <div
                              key={sup.id}
                              className="flex justify-between items-center bg-surface-container-low p-2.5 rounded border border-outline-variant/60"
                            >
                              <div>
                                <p className="font-body-md font-semibold text-on-surface">
                                  {sup.full_name}
                                </p>
                                <p className="font-label-md text-on-surface-variant text-[10px]">
                                  @{sup.username}
                                </p>
                              </div>
                              <button
                                onClick={() =>
                                  handleUnassignSupervisor(sup.id)
                                }
                                className="text-error hover:bg-error/10 p-1 rounded"
                                title="Remove"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  delete
                                </span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Assign Form */}
                    <form
                      onSubmit={handleAssignSupervisor}
                      className="pt-4 border-t border-outline-variant space-y-3"
                    >
                      <h5 className="font-body-md font-bold text-on-surface">
                        Assign Supervisor
                      </h5>
                      <div className="flex gap-2">
                        <select
                          className="flex-1 p-2 border border-outline-variant rounded font-body-md bg-white text-on-surface"
                          value={selectedSupervisorId}
                          onChange={(e) =>
                            setSelectedSupervisorId(e.target.value)
                          }
                        >
                          <option value="">Select Supervisor...</option>
                          {allSupervisors
                            .filter(
                              (sup) =>
                                !locationSupervisors.some(
                                  (active) => active.id === sup.id
                                )
                            )
                            .map((sup) => (
                              <option key={sup.id} value={sup.id}>
                                {sup.full_name} (@{sup.username})
                              </option>
                            ))}
                        </select>
                        <button
                          type="submit"
                          disabled={!selectedSupervisorId}
                          className="px-4 py-2 bg-primary text-white rounded font-semibold text-body-md disabled:opacity-50 hover:bg-[#0E4526] transition-colors"
                        >
                          Assign
                        </button>
                      </div>

                      {selectedEntity?.name?.includes(" — ") && (
                        <label className="flex items-center gap-2 text-xs font-semibold text-on-surface cursor-pointer select-none bg-secondary/10 p-2.5 rounded-lg border border-secondary/20 hover:bg-secondary/15 transition-colors">
                          <input
                            type="checkbox"
                            checked={applyToHostel}
                            onChange={(e) => setApplyToHostel(e.target.checked)}
                            className="rounded text-primary focus:ring-primary h-4 w-4"
                          />
                          <span>
                            Apply to all blocks in <strong>{selectedEntity.name.split(" — ")[0]}</strong>
                          </span>
                        </label>
                      )}
                    </form>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => setFormMode("stats")}
                        className="px-4 py-2 border border-outline-variant hover:bg-surface-container rounded text-body-md font-medium"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Hierarchy;
