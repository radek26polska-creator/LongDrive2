import React from "react";
import { motion } from "framer-motion";

export default function StatCardSTAXX({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  trendUp = true,
  onClick,
  delay = 0,
}) {
  const trendColor = trendUp ? "text-emerald-400" : "text-red-400";
  const trendIcon = trendUp ? "↑" : "↓";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={`group relative cursor-pointer ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="relative bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/5 p-5 shadow-xl hover:shadow-indigo-500/10 transition-all duration-300">
        {/* Ikona */}
        <div className="flex items-center justify-between mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            {Icon && <Icon className="w-6 h-6 text-indigo-400" />}
          </div>
          {trend && trendValue && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-700/50 ${trendColor}`}>
              <span>{trendIcon}</span>
              <span>{trendValue}</span>
            </div>
          )}
        </div>

        {/* Wartość i tytuł */}
        <div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-white mb-1">{value}</p>
          {subtitle && <p className="text-slate-500 text-xs">{subtitle}</p>}
        </div>

        {/* Delikatny gradient na krawędzi */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/0 via-indigo-500/0 to-purple-500/0 group-hover:from-indigo-500/5 group-hover:to-purple-500/5 transition-all duration-500 pointer-events-none" />
      </div>
    </motion.div>
  );
}