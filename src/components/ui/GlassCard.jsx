import React from "react";
import { motion } from "framer-motion";
import { useAppSettings } from "@/lib/ThemeContext";

export default function GlassCard({ 
  children, 
  className = "",
  animate = true,
  delay = 0,
  hover = true,
  customOpacity = null 
}) {
  const { cardOpacity, cardBackgroundColor, cardBorderColor, cardBorderWidth, settings, cardColor } = useAppSettings();
  const opacity = customOpacity !== null ? customOpacity : cardOpacity;
  
  // Pobierz kolor główny z motywu (jako fallback)
  const primaryColor = typeof window !== 'undefined' 
    ? getComputedStyle(document.documentElement)
        .getPropertyValue('--primary-color')
        .trim() || '#6366f1'
    : '#6366f1';
  
  // UŻYJ KOLORU OBRÓDKI Z USTAWIEŃ (color picker) LUB FALLBACK
  const borderColorValue = settings?.cardColor && settings.cardColor !== 'slate' 
    ? settings.cardColor  // jeśli to hex z color pickera
    : cardColor && cardColor !== 'slate'
    ? cardColor  // jeśli to hex
    : primaryColor; // fallback do koloru motywu
  
  // Dla nazw kolorów (slate, blue itp.) - mapowanie na hex
  const getBorderColor = () => {
    if (!borderColorValue) return `${primaryColor}40`;
    if (borderColorValue === 'slate') return '#64748b40';
    if (borderColorValue === 'blue') return '#2563eb40';
    if (borderColorValue === 'purple') return '#7c3aed40';
    if (borderColorValue === 'green') return '#05966940';
    if (borderColorValue === 'amber') return '#d9770640';
    if (borderColorValue === 'rose') return '#e11d4840';
    if (borderColorValue === 'cyan') return '#0891b240';
    if (borderColorValue === 'orange') return '#ea580c40';
    if (borderColorValue === 'pink') return '#db277740';
    if (borderColorValue === 'lime') return '#65a30d40';
    if (borderColorValue === 'sky') return '#0284c740';
    // Jeśli to hex kolor (zaczyna się od #)
    if (borderColorValue.startsWith('#')) return `${borderColorValue}40`;
    return `${primaryColor}40`;
  };
  
  // UŻYJ ZAPISANEGO KOLORU TŁA KAFELKA Z dynamiczną przezroczystością
  const hexToRgba = (hex, alpha) => {
    if (!hex || hex === '#') return `rgba(30, 41, 59, ${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  const bgColor = hexToRgba(cardBackgroundColor || '#1e293b', opacity);
  const borderColor = cardBorderColor || getBorderColor();
  
  const content = (
    <div 
      className={`rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--surface)] shadow-[var(--shadow-card)] transition-colors duration-200 ${hover ? 'hover:bg-[var(--surface-hover)]' : ''} ${className}`}
      style={{ 
        backgroundColor: cardBackgroundColor ? bgColor : undefined,
        borderColor,
        borderWidth: `${Number(cardBorderWidth) || 1}px`,
        // Efekt hover (mignięcie) - przezroczystość i cień
        transition: 'all 0.2s ease'
      }}
    >
      {children}
    </div>
  );

  if (!animate) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      whileHover={hover ? { 
        y: -2, 
        transition: { duration: 0.18 },
        scale: 1.005
      } : {}}
    >
      {content}
    </motion.div>
  );
}