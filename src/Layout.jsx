import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Car,
  Users,
  Route,
  Key,
  Settings,
  Wrench,
  BarChart3,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Fuel,
  Calculator,
  Map
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getReadableTextColor } from "@/lib/colorUtils";
import { useAppSettings } from "@/lib/ThemeContext";
import { useAuth } from "@/lib/AuthContext";
import { accountStorage } from "@/lib/accountStorage";
import { toast } from "sonner";

// Mapowanie stron na ścieżki URL
const pageToPath = {
  Dashboard: "/",
  Vehicles: "/vehicles",
  Drivers: "/drivers",
  Trips: "/trips",
  TripDetail: "/trips",
  Keys: "/keys",
  Services: "/services",
  Statistics: "/statistics",
  Refueling: "/refueling",
  Calculators: "/calculators",
  MapPage: "/map",
  Settings: "/settings",
};

// Wszystkie pozycje menu z powiązaniem do klucza modułu
const allNavItems = [
  { name: "Strona główna", icon: LayoutDashboard, page: "Dashboard", moduleKey: null },
  { name: "Pojazdy", icon: Car, page: "Vehicles", moduleKey: null },
  { name: "Kierowcy", icon: Users, page: "Drivers", moduleKey: null },
  { name: "Podróże", icon: Route, page: "Trips", moduleKey: null },
  { name: "Kluczyki", icon: Key, page: "Keys", moduleKey: "moduleKeys" },
  { name: "Serwisy", icon: Wrench, page: "Services", moduleKey: "moduleService" },
  { name: "Statystyki", icon: BarChart3, page: "Statistics", moduleKey: "moduleStatistics" },
  { name: "Tankowania", icon: Fuel, page: "Refueling", moduleKey: "moduleFueling" },
  { name: "Kalkulatory", icon: Calculator, page: "Calculators", moduleKey: "moduleCalculators" },
  { name: "Mapa", icon: Map, page: "MapPage", moduleKey: "moduleMap" },
  { name: "Ustawienia", icon: Settings, page: "Settings", moduleKey: null },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modulesSettings, setModulesSettings] = useState({});
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: "Administrator",
    email: "",
    avatarUrl: "",
  });
  const { settings, menuOpacity, customBackground, menuBackgroundColor, menuHighlightColor } = useAppSettings();
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const PROFILE_STORAGE_KEY = "profile_settings";

  // Wczytaj ustawienia modułów z localStorage przy każdym renderze
  useEffect(() => {
    const loadModules = () => {
      const saved = accountStorage.getItem("modules_settings");
      if (saved) {
        try {
          setModulesSettings(JSON.parse(saved));
        } catch {
          // Ignore parse errors
        }
      }
    };
    loadModules();
    window.addEventListener("storage", loadModules);
    window.addEventListener("modulesSettingsChanged", loadModules);
    return () => {
      window.removeEventListener("storage", loadModules);
      window.removeEventListener("modulesSettingsChanged", loadModules);
    };
  }, []);

  // Filtruj pozycje menu wg ustawień modułów
  const navItems = allNavItems.filter((item) => {
    if (!item.moduleKey) return true;
    const moduleValue = modulesSettings[item.moduleKey];
    return moduleValue !== false;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedProfile = accountStorage.getItem(PROFILE_STORAGE_KEY);
    if (!savedProfile) {
      setProfileForm((prev) => ({
        ...prev,
        displayName: user?.name || prev.displayName || "Administrator",
        email: user?.email || prev.email || "",
      }));
      return;
    }

    try {
      const parsed = JSON.parse(savedProfile);
      setProfileForm((prev) => ({
        ...prev,
        displayName: user?.name || parsed.displayName || prev.displayName || "Administrator",
        email: user?.email || parsed.email || prev.email || "",
        avatarUrl: parsed.avatarUrl || prev.avatarUrl || "",
      }));
    } catch {
      setProfileForm((prev) => ({
        ...prev,
        displayName: user?.name || prev.displayName || "Administrator",
        email: user?.email || prev.email || "",
      }));
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      toast.error(error.message || "Nie udało się wylogować. Sprawdź połączenie z serwerem.");
    }
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const avatarUrl = typeof reader.result === "string" ? reader.result : "";
      setProfileForm((prev) => ({ ...prev, avatarUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = () => {
    if (typeof window === "undefined") return;

    const normalized = {
      displayName: profileForm.displayName || "Administrator",
      email: profileForm.email || user?.email || "",
      avatarUrl: profileForm.avatarUrl || "",
    };

    accountStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalized));
    if (updateUser) {
      updateUser({
        ...user,
        name: normalized.displayName,
        email: normalized.email,
        avatarUrl: normalized.avatarUrl,
      });
    }
    setProfileMenuOpen(false);
  };

  const isActive = (page) => {
    if (page === "Dashboard") return location.pathname === "/";
    if (page === "TripDetail") return location.pathname.startsWith("/trips/");
    return location.pathname.toLowerCase() === `/${page.toLowerCase()}` ||
           location.pathname.toLowerCase().startsWith(`/${page.toLowerCase()}/`);
  };

  const getPageUrl = (page) => {
    return pageToPath[page] || `/${page.toLowerCase()}`;
  };

  const menuColorOpacity = Math.round(Math.min(1, Math.max(0, Number(menuOpacity) || 0.5)) * 100);
  const sidebarBgColor = `color-mix(in srgb, ${menuBackgroundColor || '#0f172a'} ${menuColorOpacity}%, transparent)`;

  const sidebarTextColor = settings.menuTextColor || getReadableTextColor(menuBackgroundColor);
  const sidebarHeaderTextColor = sidebarTextColor;
  const isDarkTheme = settings.theme === 'dark';
  const topBarBackgroundColor = settings.topBarBackgroundColor || (isDarkTheme ? '#111827' : '#ffffff');
  const topBarTextColor = settings.topBarTextColor || (isDarkTheme ? '#f8fafc' : '#0f172a');
  const topBarIconColor = settings.topBarIconColor || (isDarkTheme ? '#cbd5e1' : '#475569');

  // Oblicz tło głównego kontenera (własne lub gradient)
  const mainBgStyle = customBackground 
    ? { backgroundImage: `url(${customBackground})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }
    : {};

  return (
    <div className="min-h-screen" style={mainBgStyle}>
      {/* Mobile Header */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-50 border-b"
        style={{
          backgroundColor: topBarBackgroundColor,
          color: topBarTextColor,
          borderColor: `color-mix(in srgb, ${topBarBackgroundColor} 85%, ${topBarTextColor})`,
        }}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] shadow-sm"
              style={{ backgroundColor: `color-mix(in srgb, ${topBarIconColor} 18%, transparent)` }}
            >
              <Car className="h-5 w-5" style={{ color: topBarIconColor }} />
            </div>
            <span className="text-lg font-bold tracking-tight">LongDrive</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={sidebarOpen ? "Zamknij menu" : "Otwórz menu"}
            aria-expanded={sidebarOpen}
            aria-controls="main-navigation"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hover:bg-white/10"
            style={{ color: topBarIconColor }}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <motion.aside
        id="main-navigation"
        initial={false}
        className={`app-sidebar fixed inset-y-0 left-0 z-40 w-[272px] -translate-x-full border-r transition-transform duration-200 ease-out lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : ""}`}
        style={{ backgroundColor: sidebarBgColor, borderColor: "var(--border-color)", boxShadow: "var(--shadow-card)", color: sidebarTextColor }}
      >
            <div className="flex h-full flex-col px-4 py-5">
              {/* Logo */}
              <div className="mb-8 flex items-center gap-3 px-2">
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-color)] shadow-md"
                >
                  <Car className="h-6 w-6 text-[var(--text-inverse)]" />
                </motion.div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight" style={{ color: sidebarHeaderTextColor }}>LongDrive</h1>
                  <p className="text-xs font-medium" style={{ color: sidebarHeaderTextColor, opacity: 0.8 }}>Zarządzanie Flotą</p>
                </div>
              </div>

              {/* Menu */}
              <nav aria-label="Główna nawigacja" className="scrollbar-none flex-1 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.page);
                  return (
                    <Link
                      key={item.page}
                      to={getPageUrl(item.page)}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setSidebarOpen(false)}
                      className="group block rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
                    >
                      <motion.div
                        whileHover={{ x: 3 }}
                        className={`relative flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 transition-colors duration-150 ${active
                          ? "font-semibold"
                          : "hover:bg-[var(--surface-hover)]"
                        }`}
                        style={{
                          backgroundColor: active ? (menuHighlightColor || 'var(--menu-highlight-color)') : undefined,
                          color: active
                            ? (settings.menuActiveTextColor || getReadableTextColor(menuHighlightColor))
                            : sidebarTextColor,
                          opacity: 1,
                        }}
                      >
                        {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[var(--primary-color)]" />}
                        <Icon className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={active ? 2.2 : 1.9} />
                        <span className="whitespace-nowrap text-sm leading-none tracking-[-0.01em] text-current">{item.name}</span>
                        {active && (
                          <ChevronRight className="ml-auto h-4 w-4 opacity-70" />
                        )}
                      </motion.div>
                    </Link>
                  );
                })}
              </nav>

              {/* User section */}
              {user && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative mt-5 border-t border-[var(--border-color)] pt-5"
                >
                  <button
                    type="button"
                    onClick={() => setProfileMenuOpen((prev) => !prev)}
                    className="mb-4 flex w-full items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 text-left transition-colors hover:bg-[var(--surface-hover)]"
                    aria-expanded={profileMenuOpen}
                    aria-label="Otwórz ustawienia profilu"
                  >
                    <Avatar className="h-10 w-10 border-2 border-[var(--primary-color)]/40">
                      {profileForm.avatarUrl ? (
                        <AvatarImage src={profileForm.avatarUrl} alt={profileForm.displayName || "Avatar użytkownika"} />
                      ) : null}
                      <AvatarFallback className="bg-[var(--primary-color)] font-semibold text-[var(--text-inverse)]">
                        {(profileForm.displayName || user.name || user.email || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold" style={{ color: sidebarHeaderTextColor }}>
                        {profileForm.displayName || user.name || "Użytkownik"}
                      </p>
                      <p className="truncate text-xs" style={{ color: sidebarHeaderTextColor, opacity: 0.8 }}>
                        {profileForm.email || user.email}
                      </p>
                    </div>
                  </button>

                  {profileMenuOpen && (
                    <div className="mb-3 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--surface)] p-3 shadow-sm">
                      <div className="mb-3 flex items-center justify-center">
                        <label className="relative flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-[var(--border-color)] bg-[var(--surface-muted)] hover:border-[var(--primary-color)]">
                          {profileForm.avatarUrl ? (
                            <img src={profileForm.avatarUrl} alt="Awatar użytkownika" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-lg font-semibold text-[var(--text-primary)]">
                              {(profileForm.displayName || user.name || user.email || "U").charAt(0).toUpperCase()}
                            </span>
                          )}
                          <input type="file" accept="image/*" onChange={handleAvatarChange} className="sr-only" />
                        </label>
                      </div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                        Imię i nazwisko
                        <input
                          type="text"
                          value={profileForm.displayName}
                          onChange={(event) => setProfileForm((prev) => ({ ...prev, displayName: event.target.value }))}
                          className="mt-1 w-full rounded-md border border-[var(--border-color)] bg-[var(--surface)] px-2.5 py-2 text-sm text-[var(--text-primary)] outline-none ring-0 transition-colors focus:border-[var(--primary-color)]"
                        />
                      </label>
                      <label className="mb-3 block text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                        E-mail
                        <input
                          type="email"
                          value={profileForm.email}
                          onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                          className="mt-1 w-full rounded-md border border-[var(--border-color)] bg-[var(--surface)] px-2.5 py-2 text-sm text-[var(--text-primary)] outline-none ring-0 transition-colors focus:border-[var(--primary-color)]"
                        />
                      </label>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" className="flex-1" onClick={handleSaveProfile}>
                          Zapisz
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setProfileMenuOpen(false)}>
                          Zamknij
                        </Button>
                      </div>
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    className="h-10 w-full justify-start text-[var(--text-secondary)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Wyloguj się
                  </Button>
                </motion.div>
              )}
            </div>
      </motion.aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-[1px] lg:hidden"
        />
      )}

      {/* Main Content */}
      <main className="app-main min-h-screen pt-16 lg:ml-[272px] lg:pt-0">
        <div className="app-content mx-auto max-w-[1600px] p-4 md:p-6 lg:px-10 lg:py-8">{children}</div>
      </main>
    </div>
  );
}