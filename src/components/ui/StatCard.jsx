import React from "react";
import { motion } from "framer-motion";
import { useAppSettings } from "@/lib/ThemeContext";

export default function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendLabel,
  trendUp = true,
  gradient = "from-indigo-500 to-purple-500",
  delay = 0,
  onClick 
}) {
  const { cardOpacity, cardBackgroundColor, cardBorderColor, cardBorderWidth, settings } = useAppSettings();
  
  // Pobierz kolor główny z motywu (dla tła kafelka)
  const primaryColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--primary-color')
    .trim() || '#6366f1';
  
  // Konwersja hex na rgba
  const hexToRgba = (hex, alpha) => {
    if (!hex || hex === '#') return `rgba(30, 41, 59, ${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  // UŻYJ ZAPISANEGO KOLORU TŁA KAFELKA
  const bgColor = hexToRgba(cardBackgroundColor || '#1e293b', cardOpacity);
  
  // Kolor akcentu dla przycisków i elementów wewnątrz kafelka
  const accentColor = primaryColor;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      whileHover={{ y: -2, transition: { duration: 0.18 } }}
      className="relative group cursor-pointer"
      onClick={onClick}
    >
      <div 
        className="relative rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--surface)] p-5 overflow-hidden shadow-[var(--shadow-card)] transition-colors duration-200 group-hover:bg-[var(--surface-hover)]"
        style={{ 
          backgroundColor: cardBackgroundColor ? bgColor : undefined,
          borderColor: cardBorderColor || undefined,
          borderWidth: `${Number(cardBorderWidth) || 1}px`,
        }}
      >
        <div className="relative">
          <div className="flex items-start justify-between mb-5">
            <div className="w-10 h-10 rounded-[var(--radius-sm)] flex items-center justify-center border border-[var(--primary-color)]/30 bg-[var(--primary-soft)]">
              <Icon className="w-6 h-6 text-[var(--primary-light)]" />
            </div>
            {trend && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${trendUp ? 'status-success' : 'status-danger'}`}>
                {trendUp ? '↑' : '↓'} {trend}{trendLabel ? ` ${trendLabel}` : ""}
              </div>
            )}
          </div>
          
          <h3 className="text-[var(--text-secondary)] text-sm font-medium mb-1">{title}</h3>
          <p className="text-3xl font-bold text-[var(--text-primary)] mb-1 tabular-nums">{value}</p>
          {subtitle && (
            <p className="text-[var(--text-muted)] text-sm">{subtitle}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}