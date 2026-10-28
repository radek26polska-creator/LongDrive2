import React from "react";
import { motion } from "framer-motion";

export default function MentorCard({
  driver,
  onClick,
  delay = 0,
}) {
  const getInitials = (firstName, lastName) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return `${first}${last}`.toUpperCase() || "K";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-emerald-500";
      case "inactive":
        return "bg-slate-500";
      case "on_leave":
        return "bg-amber-500";
      default:
        return "bg-indigo-500";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "active":
        return "Aktywny";
      case "inactive":
        return "Nieaktywny";
      case "on_leave":
        return "Urlop";
      default:
        return "Kierowca";
    }
  };

  const calculateExperience = (licenseExpiry) => {
    if (!licenseExpiry) return "Brak danych";
    const startDate = new Date(licenseExpiry);
    const now = new Date();
    const years = now.getFullYear() - startDate.getFullYear();
    if (years < 1) return "Poniżej roku";
    if (years === 1) return "1 rok";
    if (years < 5) return `${years} lata`;
    return `${years} lat`;
  };

  const fullName = `${driver?.firstName || ""} ${driver?.lastName || ""}`.trim() || driver?.name || "Nieznany";
  const initials = getInitials(driver?.firstName, driver?.lastName);
  const statusColor = getStatusColor(driver?.status);
  const statusLabel = getStatusLabel(driver?.status);
  const experience = calculateExperience(driver?.licenseExpiry);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ x: 4, transition: { duration: 0.2 } }}
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-all cursor-pointer border border-slate-700/50 hover:border-indigo-500/30 group"
    >
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg flex-shrink-0`}>
        {initials}
      </div>

      {/* Informacje */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-white font-medium text-sm truncate">{fullName}</p>
          <div className={`w-2 h-2 rounded-full ${statusColor}`} />
        </div>
        <p className="text-xs text-slate-400">{statusLabel}</p>
        {driver?.phone && (
          <p className="text-xs text-slate-500 mt-0.5 truncate">{driver.phone}</p>
        )}
      </div>

      {/* Doświadczenie */}
      <div className="text-right flex-shrink-0">
        <p className="text-xs text-indigo-400 font-medium">{experience}</p>
        <p className="text-xs text-slate-500">doświadczenia</p>
      </div>
    </motion.div>
  );
}