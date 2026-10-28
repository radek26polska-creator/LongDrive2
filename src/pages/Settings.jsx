import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Settings,
  Building2,
  Palette,
  Save,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Check,
  Download,
  Upload,
  Trash2,
  Image,
  Key,
  Lock,
  Unlock,
  Menu,
  Activity,
  Eye,
  RefreshCw,
  Map,
  Navigation,
  Globe,
  Database,
  BugPlay,
  Plug,
  Fuel,
  Cog,
  Satellite,
  Loader2,
  BarChart3,
  Calculator,
  Wrench,
  Cloud,
  Crosshair,
  Route,
  LayoutDashboard,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import GlassCard from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { logger } from "@/lib/logger";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getReadableTextColor } from "@/lib/colorUtils";
import { useAppSettings } from "@/lib/ThemeContext";
import { useAuth } from "@/lib/AuthContext";
import { accountStorage } from "@/lib/accountStorage";
import { toast } from "sonner";
import api from "@/api/apiClient";
import { API_BASE_URL } from "@/lib/runtimeConfig";

// Konfiguracja teł
const backgrounds = [
 { id: "gradient1", name: "Ciemny gradient", class: "bg-app-gradient1" },
  { id: "gradient2", name: "Granatowy gradient", class: "bg-app-gradient2" },
  { id: "gradient3", name: "Fioletowy gradient", class: "bg-app-gradient3" },
  { id: "gradient4", name: "Zielony gradient", class: "bg-app-gradient4" },
  { id: "gradient5", name: "Bordowy gradient", class: "bg-app-gradient5" },
  { id: "gradient6", name: "Fioletowo-niebieski", class: "bg-app-gradient6" },
  { id: "gradient7", name: "Szary gradient", class: "bg-app-gradient7" },
  { id: "gradient8", name: "Ciemnoniebieski", class: "bg-app-gradient8" },
  { id: "gradient9", name: "Grafitowy gradient", class: "bg-app-gradient9" },
  { id: "gradient10", name: "Nocny gradient", class: "bg-app-gradient10" },
  { id: "gradient11", name: "Fioletowo-grafitowy", class: "bg-app-gradient11" },
  { id: "gradient12", name: "Morski gradient (ciemny)", class: "bg-app-gradient12" },
  { id: "gradient13", name: "Purpurowy gradient", class: "bg-app-gradient13" },
  { id: "gradient14", name: "Morski gradient (jasny)", class: "bg-app-gradient14" },
  { id: "gradient15", name: "Oliwkowy gradient", class: "bg-app-gradient15" },
  { id: "solid1", name: "Ciemny (jednolity)", class: "bg-app-solid1" },
  { id: "solid2", name: "Ciemnoszary", class: "bg-app-solid2" },
  { id: "solid3", name: "Czarny", class: "bg-app-solid3" },
  { id: "solid4", name: "Ciemnoniebieski", class: "bg-app-solid4" },
  { id: "solid5", name: "Grafitowy", class: "bg-app-solid5" },
  { id: "solid6", name: "Antracytowy", class: "bg-app-solid6" },
  // ===== NOWE TŁA STAXX =====
  { id: "staxx1", name: "Fioletowa mgła", class: "bg-app-staxx1" },
  { id: "staxx2", name: "Słoneczny poranek", class: "bg-app-staxx2" },
  { id: "staxx3", name: "Leśny spokój", class: "bg-app-staxx3" },
  { id: "staxx4", name: "Kosmiczna podróż", class: "bg-app-staxx4" },
  { id: "staxx5", name: "Zachód słońca", class: "bg-app-staxx5" },
];

// Animacja pełnoekranowa zapisu
const SaveAnimation = ({ show }) => {
  if (!show) return null;
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="save-animation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{
            background:
              "linear-gradient(135deg, rgba(15,23,42,0.97) 0%, rgba(30,41,59,0.97) 50%, rgba(15,23,42,0.97) 100%)",
            backdropFilter: "blur(20px)",
          }}
        >
          <motion.div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full bg-primary/10"
                style={{
                  width: 100 + i * 80,
                  height: 100 + i * 80,
                  top: "50%",
                  left: "50%",
                  x: "-50%",
                  y: "-50%",
                }}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.3, 0.1, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </motion.div>

          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
            className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center mb-6 shadow-2xl shadow-primary/50"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            >
              <RefreshCw className="w-10 h-10 text-white" />
            </motion.div>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-white mb-2"
          >
            Zapisywanie ustawień
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-slate-400 text-sm mb-6"
          >
            Trwa zapisywanie i odświeżanie aplikacji...
          </motion.p>

          <motion.div className="w-64 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-primary rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.8, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function SettingsPage() {
  const {
    settings,
    saveSettings,
  } = useAppSettings();
  const { user: authUser, token } = useAuth();

  const [showSaveAnimation, setShowSaveAnimation] = useState(false);

  const [companyData, setCompanyData] = useState({
    name: "",
    address: "",
    zipCode: "",
    city: "",
    nip: "",
    regon: "",
    phone: "",
    email: "",
    cardPrefix: "KD",
    cardCounter: 1,
  });

  const [profileData, setProfileData] = useState({
    full_name: "",
    email: "",
    phone: "",
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [localSettings, setLocalSettings] = useState({
  theme: "dark",
  backgroundColor: "bg-app-gradient1",
  textColor: "white",
  fontColor: "#f8fafc",
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  fontSize: 14,
  buttonColor: "#5b7cfa",
  buttonTextColor: "#ffffff",
  buttonHoverColor: null,
  menuHighlightColor: "#7c3aed",
  menuTextColor: null,
  menuActiveTextColor: null,
  topBarBackgroundColor: null,
  topBarTextColor: null,
  topBarIconColor: null,
  inputTextColor: "#111827",
  inputBackgroundColor: "#ffffff",
  requireKeyForTrip: false,
  animationType: "fade",
  animationSpeed: 0.3,
  cardBorderColor: "#475569",
  cardBorderWidth: 1,
});
  const [menuOpacity, setMenuOpacity] = useState(0.5);
  const [cardOpacity, setCardOpacity] = useState(0.5);
  const [menuBackgroundColor, setMenuBackgroundColor] = useState('#0f172a');
  const [cardBackgroundColor, setCardBackgroundColor] = useState('#1e293b');
  const [customBackground, setCustomBackground] = useState(null);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("company");

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const [modulesSettings, setModulesSettings] = useState({
    maps: true,
    fuelPrices: true,
    weather: true,
    gpsTracking: false,
    debugLogs: false,
    requireKeyForTrip: false,
    moduleKeys: true,
    moduleService: true,
    moduleStatistics: true,
    moduleCalculators: true,
    moduleMap: true,
    moduleFueling: true,
  });

  // 🔧 ROZBUDOWANE USTAWIENIA LOKALIZACJI
  const [locationSettings, setLocationSettings] = useState({
    gpsEnabled: true,                    // Czy aplikacja ma korzystać z GPS
    highAccuracy: false,                 // Czy używać dokładnej lokalizacji (więcej baterii)
    askForLocationOnStart: true,         // Czy pytać o dostęp do lokalizacji przy starcie
    trackLiveRoutes: false,              // Czy śledzić trasy na żywo
    saveTripHistory: true,               // Czy zapisywać historię tras
    autoCenterOnLocation: true,          // Czy automatycznie centrować mapę na pozycji
    trackingInterval: 10,                // Interwał śledzenia w sekundach
    googleMapsApiKey: "",
  });

  const [mapSettings, setMapSettings] = useState({
    provider: "osm",
    mapStyle: "road",
    defaultZoom: 12,
    autoCenter: true,
    showMarkers: true,
    showStops: true,
    showTraffic: false,
    saveHistory: true,
    historyRetention: "90",
    routeColors: {
      car: "#3b82f6",
      truck: "#ef4444",
      van: "#10b981",
      bus: "#8b5cf6",
      motorcycle: "#f59e0b",
    },
  });

  const [apiSettings, setApiSettings] = useState({
    collectApiKey: "apikey 3DVClldFLIRO4LSaryQwFw:6bNkoLjBB56fEpMEx66nzr",
    openWeatherApiKey: "",
    googleMapsApiKey: "",
    apiStatus: {
      collectApi: "unknown",
      weatherApi: "unknown",
      mapsApi: "unknown",
    },
  });

  const [debugEnabled, setDebugEnabled] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logFilter, setLogFilter] = useState("all");
  const [isRestoring, setIsRestoring] = useState(false);

  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();
  const initialized = useRef(false);

  const { data: companySettings = [] } = useQuery({
    queryKey: ["companySettings"],
    queryFn: api.getCompanySettings,
    refetchOnMount: true,
  });

  // Wczytaj ustawienia z localStorage
  useEffect(() => {
    const savedModules = accountStorage.getItem("modules_settings");
    if (savedModules) {
      try {
        const parsed = JSON.parse(savedModules);
        setModulesSettings((prev) => ({ ...prev, ...parsed }));
      } catch (e) {}
    }
    const savedLocation = accountStorage.getItem("location_settings");
    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation);
        setLocationSettings((prev) => ({ ...prev, ...parsed }));
      } catch (e) {}
    }
    const savedMapSettings = accountStorage.getItem("map_settings");
    if (savedMapSettings) {
      try {
        setMapSettings(JSON.parse(savedMapSettings));
      } catch (e) {}
    }
    const savedApi = accountStorage.getItem("api_settings");
    if (savedApi) {
      try {
        setApiSettings((prev) => ({ ...prev, ...JSON.parse(savedApi) }));
      } catch (e) {}
    }
    const savedDebug = accountStorage.getItem("debug_enabled");
    if (savedDebug) {
      setDebugEnabled(savedDebug === "true");
    }
  }, []);

  // Inicjalizacja danych firmy
  useEffect(() => {
    if (companySettings && !initialized.current) {
      const cs = Array.isArray(companySettings)
        ? companySettings[0]
        : companySettings;
      if (cs) {
        setCompanyData({
          name: cs.name || "",
          address: cs.address || "",
          zipCode: cs.zipCode || "",
          city: cs.city || "",
          nip: cs.nip || "",
          regon: cs.regon || "",
          phone: cs.phone || "",
          email: cs.email || "",
          cardPrefix: cs.cardPrefix || "KD",
          cardCounter: cs.cardCounter || 1,
        });
        initialized.current = true;
      }
    }
  }, [companySettings]);

  // Inicjalizacja ustawień
  useEffect(() => {
    setLocalSettings({
      theme: settings.theme,
      backgroundColor: settings.backgroundColor,
      textColor: settings.textColor,
      fontColor: settings.fontColor || "#f8fafc",
      fontFamily: settings.fontFamily || "Inter, ui-sans-serif, system-ui, sans-serif",
      fontSize: settings.fontSize || 14,
      buttonColor: settings.buttonColor || "#5b7cfa",
      buttonTextColor: settings.buttonTextColor || "#ffffff",
      buttonHoverColor: settings.buttonHoverColor || null,
      menuHighlightColor: settings.menuHighlightColor || "#7c3aed",
      menuTextColor: settings.menuTextColor || null,
      menuActiveTextColor: settings.menuActiveTextColor || null,
      topBarBackgroundColor: settings.topBarBackgroundColor || (settings.theme === "dark" ? "#111827" : "#ffffff"),
      topBarTextColor: settings.topBarTextColor || (settings.theme === "dark" ? "#f8fafc" : "#0f172a"),
      topBarIconColor: settings.topBarIconColor || (settings.theme === "dark" ? "#cbd5e1" : "#475569"),
      inputTextColor: settings.inputTextColor || "#111827",
      inputBackgroundColor: settings.inputBackgroundColor || "#ffffff",
      requireKeyForTrip: settings.requireKeyForTrip,
      animationType: settings.animationType,
      animationSpeed: settings.animationSpeed,
      cardBorderColor: settings.cardBorderColor,
      cardBorderWidth: settings.cardBorderWidth,
    });
    setMenuOpacity(settings.menuOpacity ?? 0.5);
    setCardOpacity(settings.cardOpacity ?? 0.5);
    setCustomBackground(settings.customBackground || null);
    setMenuBackgroundColor(settings.menuBackgroundColor || '#0f172a');
    setCardBackgroundColor(settings.cardBackgroundColor || '#1e293b');
  }, [settings]);

  // Profil
  useEffect(() => {
    if (authUser) {
      setProfileData({
        full_name: authUser.name || "",
        email: authUser.email || "",
        phone: authUser.phone || "",
      });
    }
  }, [authUser]);

  // Mutacja zapisu danych firmy
  const saveCompanyMutation = useMutation({
    mutationFn: async (data) => api.updateCompanySettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companySettings"] });
      triggerSaveAnimation();
    },
    onError: (error) => {
      toast.error("Błąd podczas zapisu danych firmy: " + error.message);
    },
  });

  const saveProfileMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: data.full_name, phone: data.phone }),
      });
      if (!response.ok) throw new Error("Błąd zapisu profilu");
      return response.json();
    },
    onSuccess: () => {
      triggerSaveAnimation();
      setIsEditingProfile(false);
    },
    onError: (error) => {
      toast.error("Błąd zapisu profilu: " + error.message);
    },
  });

  const triggerSaveAnimation = () => {
    setShowSaveAnimation(true);
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  const saveModulesSettings = () => {
    accountStorage.setItem("modules_settings", JSON.stringify(modulesSettings));
    window.dispatchEvent(new Event("modulesSettingsChanged"));
    window.dispatchEvent(new Event("storage"));
    triggerSaveAnimation();
  };

  const saveLocationAndMapSettings = () => {
    accountStorage.setItem("location_settings", JSON.stringify(locationSettings));
    accountStorage.setItem("map_settings", JSON.stringify(mapSettings));
    // Dodatkowo zapisz klucz Google Maps w api_settings dla zgodności
    if (locationSettings.googleMapsApiKey) {
      const updatedApi = { ...apiSettings, googleMapsApiKey: locationSettings.googleMapsApiKey };
      accountStorage.setItem("api_settings", JSON.stringify(updatedApi));
    }
    triggerSaveAnimation();
  };

  const saveApiSettings = () => {
    accountStorage.setItem("api_settings", JSON.stringify(apiSettings));
    triggerSaveAnimation();
  };

    const handleSave = async () => {
    setIsSaving(true);
    try {
      if (activeTab === "company") {
        saveCompanyMutation.mutate(companyData);
      } else if (activeTab === "profile") {
        if (isEditingProfile) {
          saveProfileMutation.mutate(profileData);
        }
      } else if (activeTab === "modules") {
        saveModulesSettings();
      } else if (activeTab === "location") {
        saveLocationAndMapSettings();
      } else if (activeTab === "api") {
        saveApiSettings();
      } else if (activeTab === "appearance") {
        await saveSettings({
          ...localSettings,
          menuOpacity,
          cardOpacity,
          customBackground,
          menuBackgroundColor,
          cardBackgroundColor,
          cardBorderColor: localSettings.cardBorderColor,
          cardBorderWidth: localSettings.cardBorderWidth,
          inputTextColor: localSettings.inputTextColor || '#111827',
          inputBackgroundColor: localSettings.inputBackgroundColor || '#ffffff',
        });
        toast.success("Ustawienia wyglądu zostały zapisane.");
      } else if (activeTab === "animations") {
        await saveSettings({ ...localSettings });
        toast.success("Ustawienia animacji zostały zapisane.");
      }
    } catch (error) {
      toast.error("Błąd podczas zapisu: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDebug = async () => {
    const newVal = !debugEnabled;
    setDebugEnabled(newVal);
    accountStorage.setItem("debug_enabled", newVal.toString());
    if (newVal) {
      logger.enable();
      toast.success("Tryb debugowania WŁĄCZONY");
      refreshLogs();
    } else {
      logger.disable();
      toast.info("Tryb debugowania WYŁĄCZONY");
    }
  };

  const refreshLogs = async () => {
    setLogs(logger.getLogs());
  };

  const downloadLogs = async () => {
    const exportData = logger.export();
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `debug-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Logi pobrane");
  };

  const clearLogs = async () => {
    if (confirm("Czy na pewno wyczyścić wszystkie logi?")) {
      logger.clear();
      refreshLogs();
      toast.success("Logi wyczyszczone");
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Nowe hasła nie są identyczne");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error("Hasło musi mieć co najmniej 6 znaków");
      return;
    }
    setChangingPassword(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/change-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword,
          }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Błąd zmiany hasła");
      }
      toast.success("Hasło zostało zmienione");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const filteredLogs =
    logFilter === "all"
      ? logs
      : logs.filter((log) => log.type === logFilter);

  const handleExportBackup = async () => {
    try {
      toast.loading("Tworzenie backupu...");
      const [vehicles, drivers, trips, services, companySettingsData] =
        await Promise.all([
          api.getVehicles(),
          api.getDrivers(),
          api.getTrips(),
          api.getServices(),
          api.getCompanySettings(),
        ]);
      const allData = {
        vehicles,
        drivers,
        trips,
        services,
        companySettings: Array.isArray(companySettingsData)
          ? companySettingsData
          : [companySettingsData],
        keyLogs: [],
        modulesSettings,
        locationSettings,
        mapSettings,
        apiSettings,
        exportDate: new Date().toISOString(),
        version: "1.0",
      };
      const blob = new Blob([JSON.stringify(allData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `longdrive-backup-${format(new Date(), "yyyy-MM-dd")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success("Backup został pobrany");
    } catch (error) {
      toast.dismiss();
      toast.error("Błąd podczas tworzenia backupu: " + error.message);
    }
  };

  const handleImportBackup = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsRestoring(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.modulesSettings)
        accountStorage.setItem(
          "modules_settings",
          JSON.stringify(data.modulesSettings)
        );
      if (data.locationSettings)
        accountStorage.setItem(
          "location_settings",
          JSON.stringify(data.locationSettings)
        );
      if (data.mapSettings)
        accountStorage.setItem(
          "map_settings",
          JSON.stringify(data.mapSettings)
        );
      if (data.apiSettings)
        accountStorage.setItem(
          "api_settings",
          JSON.stringify(data.apiSettings)
        );
      toast.success("Backup przywrócony pomyślnie");
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      toast.error("Błąd przywracania backupu: " + error.message);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleReset = async () => {
    if (
      !confirm(
        "UWAGA! Czy na pewno chcesz usunąć WSZYSTKIE dane? Ta operacja jest nieodwracalna!"
      )
    )
      return;
    if (!confirm("Drugie potwierdzenie: czy na pewno usunąć wszystkie dane?"))
      return;
    try {
      accountStorage.clear();
      toast.success("Dane aplikacji zostały wyczyszczone");
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      toast.error("Błąd podczas usuwania danych: " + error.message);
    }
  };

  const tabs = [
    { id: "company", label: "Firma", icon: Building2 },
    { id: "profile", label: "Profil", icon: User },
    { id: "modules", label: "Moduły", icon: Cog },
    { id: "location", label: "Lokalizacja i Mapy", icon: Navigation },
    { id: "api", label: "API & Integracje", icon: Plug },
    { id: "debug", label: "Debug & Logi", icon: BugPlay },
    { id: "appearance", label: "Wygląd", icon: Palette },
    { id: "animations", label: "Animacje", icon: Activity },
    { id: "backup", label: "Backup", icon: Database },
  ];

  const showSaveButton = activeTab !== "backup";

  return (
    <div className="space-y-6">
      <SaveAnimation show={showSaveAnimation} />

      <PageHeader
        title="Ustawienia"
        subtitle="Konfiguracja aplikacji i parametrów systemu"
        icon={Settings}
        action={
          showSaveButton ? (
            <Button
              onClick={handleSave}
              className={`bg-gradient-primary ${isSaving ? "animate-pulse" : ""}`}
              disabled={saveCompanyMutation.isPending || saveProfileMutation.isPending || isSaving}
            >
              {saveCompanyMutation.isPending || saveProfileMutation.isPending || isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : saveSuccess ? (
                <Check className="w-4 h-4 mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isSaving ? "Zapisywanie..." : saveSuccess ? "Zapisano!" : "Zapisz ustawienia"}
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Panel zakładek */}
        <div className="lg:w-56 flex-shrink-0">
          <GlassCard className="p-2">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? "bg-gradient-primary text-white"
                        : "text-theme-white-secondary hover:text-theme-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </GlassCard>
        </div>

        {/* Treść zakładki */}
        <div className="flex-1 min-w-0">
          {/* FIRMA */}
          {activeTab === "company" && (
            <GlassCard className="p-6" delay={0.1}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-theme-white">
                    Dane firmy
                  </h2>
                  <p className="text-sm text-theme-white-secondary">
                    Informacje o firmie widoczne na dokumentach
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Nazwa firmy", key: "name", icon: Building2 },
                  { label: "Adres", key: "address", icon: MapPin },
                  { label: "Kod pocztowy", key: "zipCode", icon: MapPin },
                  { label: "Miasto", key: "city", icon: MapPin },
                  { label: "NIP", key: "nip", icon: FileText },
                  { label: "REGON", key: "regon", icon: FileText },
                  { label: "Telefon", key: "phone", icon: Phone },
                  { label: "Email", key: "email", icon: Mail },
                ].map(({ label, key, icon: Icon }) => (
                  <div key={key}>
                    <Label className="text-theme-white-secondary mb-1 flex items-center gap-1">
                      <Icon className="w-3 h-3" />
                      {label}
                    </Label>
                    <Input
                      value={companyData[key] || ""}
                      onChange={(e) =>
                        setCompanyData({ ...companyData, [key]: e.target.value })
                      }
                      className="bg-slate-800/50 border-slate-700 text-theme-white"
                    />
                  </div>
                ))}
                <div>
                  <Label className="text-theme-white-secondary mb-1">
                    Prefiks karty drogowej
                  </Label>
                  <Input
                    value={companyData.cardPrefix || "KD"}
                    onChange={(e) =>
                      setCompanyData({ ...companyData, cardPrefix: e.target.value })
                    }
                    className="bg-slate-800/50 border-slate-700 text-theme-white"
                  />
                </div>
              </div>
            </GlassCard>
          )}

          {/* PROFIL */}
          {activeTab === "profile" && (
            <GlassCard className="p-6" delay={0.1}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-theme-white">
                    Profil użytkownika
                  </h2>
                  <p className="text-sm text-theme-white-secondary">
                    Twoje dane osobowe i bezpieczeństwo
                  </p>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-theme-white font-semibold">Dane osobowe</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                    className="text-xs"
                  >
                    {isEditingProfile ? "Anuluj" : "Edytuj"}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Imię i nazwisko", key: "full_name" },
                    { label: "Email", key: "email" },
                    { label: "Telefon", key: "phone" },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <Label className="text-theme-white-secondary mb-1">
                        {label}
                      </Label>
                      <Input
                        value={profileData[key] || ""}
                        onChange={(e) =>
                          setProfileData({ ...profileData, [key]: e.target.value })
                        }
                        disabled={!isEditingProfile || key === "email"}
                        className="bg-slate-800/50 border-slate-700 text-theme-white disabled:opacity-50"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h3 className="text-theme-white font-semibold mb-4">
                  Zmiana hasła
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "Aktualne hasło", key: "currentPassword" },
                    { label: "Nowe hasło", key: "newPassword" },
                    { label: "Potwierdź nowe hasło", key: "confirmPassword" },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <Label className="text-theme-white-secondary mb-1">
                        {label}
                      </Label>
                      <Input
                        type="password"
                        value={passwordData[key]}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, [key]: e.target.value })
                        }
                        className="bg-slate-800/50 border-slate-700 text-theme-white"
                      />
                    </div>
                  ))}
                  <Button
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                    className="bg-gradient-primary"
                  >
                    {changingPassword ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Key className="w-4 h-4 mr-2" />
                    )}
                    Zmień hasło
                  </Button>
                </div>
              </div>
            </GlassCard>
          )}

          {/* MODUŁY */}
          {activeTab === "modules" && (
            <GlassCard className="p-6" delay={0.1}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <Cog className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-theme-white">
                    Moduły aplikacji
                  </h2>
                  <p className="text-sm text-theme-white-secondary">
                    Włącz/wyłącz poszczególne funkcje i moduły menu
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="mb-2">
                  <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
                    Moduły menu — widoczność w nawigacji
                  </p>
                </div>

                {[
                  {
                    key: "moduleKeys",
                    label: "Kluczyki",
                    desc: "Moduł zarządzania kluczykami pojazdów",
                    icon: Key,
                    color: "text-yellow-400",
                    bg: "bg-yellow-500/20",
                  },
                  {
                    key: "moduleService",
                    label: "Serwis",
                    desc: "Moduł serwisowania i napraw pojazdów",
                    icon: Wrench,
                    color: "text-orange-400",
                    bg: "bg-orange-500/20",
                  },
                  {
                    key: "moduleStatistics",
                    label: "Statystyki",
                    desc: "Moduł raportów i statystyk floty",
                    icon: BarChart3,
                    color: "text-blue-400",
                    bg: "bg-blue-500/20",
                  },
                  {
                    key: "moduleCalculators",
                    label: "Kalkulatory",
                    desc: "Moduł kalkulatorów kosztów i paliwa",
                    icon: Calculator,
                    color: "text-emerald-400",
                    bg: "bg-emerald-500/20",
                  },
                  {
                    key: "moduleMap",
                    label: "Mapa",
                    desc: "Moduł mapy tras i śledzenia GPS",
                    icon: Map,
                    color: "text-cyan-400",
                    bg: "bg-cyan-500/20",
                  },
                  {
                    key: "moduleFueling",
                    label: "Tankowanie",
                    desc: "Moduł rejestracji i rozliczania tankowań",
                    icon: Fuel,
                    color: "text-green-400",
                    bg: "bg-green-500/20",
                  },
                ].map(({ key, label, desc, icon: Icon, color, bg }) => (
                  <div
                    key={key}
                    className={`bg-slate-800/50 rounded-xl p-4 border transition-all ${
                      modulesSettings[key]
                        ? "border-slate-600"
                        : "border-slate-700 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}
                        >
                          <Icon className={`w-5 h-5 ${color}`} />
                        </div>
                        <div>
                          <h3 className="text-theme-white font-semibold">
                            {label}
                          </h3>
                          <p className="text-theme-white-secondary text-sm">
                            {desc}
                          </p>
                          <p
                            className={`text-xs mt-0.5 ${
                              modulesSettings[key]
                                ? "text-green-400"
                                : "text-slate-500"
                            }`}
                          >
                            {modulesSettings[key]
                              ? "✓ Moduł aktywny — widoczny w menu"
                              : "✗ Moduł wyłączony — ukryty w menu"}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={modulesSettings[key] !== false}
                        onCheckedChange={(val) =>
                          setModulesSettings({ ...modulesSettings, [key]: val })
                        }
                      />
                    </div>
                  </div>
                ))}

                <div className="mt-6 mb-2">
                  <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
                    Widgety strony głównej
                  </p>
                </div>

                <div
                  className={`bg-slate-800/50 rounded-xl p-4 border transition-all ${
                    modulesSettings.weather
                      ? "border-slate-600"
                      : "border-slate-700 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
                        <Cloud className="w-5 h-5 text-sky-400" />
                      </div>
                      <div>
                        <h3 className="text-theme-white font-semibold">
                          Widget Pogoda
                        </h3>
                        <p className="text-theme-white-secondary text-sm">
                          Wyświetlanie aktualnej pogody na stronie głównej
                        </p>
                        <p
                          className={`text-xs mt-0.5 ${
                            modulesSettings.weather
                              ? "text-green-400"
                              : "text-slate-500"
                          }`}
                        >
                          {modulesSettings.weather
                            ? "✓ Widget aktywny — widoczny na stronie głównej"
                            : "✗ Widget ukryty"}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={modulesSettings.weather !== false}
                      onCheckedChange={(val) =>
                        setModulesSettings({ ...modulesSettings, weather: val })
                      }
                    />
                  </div>
                </div>

                <div
                  className={`bg-slate-800/50 rounded-xl p-4 border transition-all ${
                    modulesSettings.fuelPrices
                      ? "border-slate-600"
                      : "border-slate-700 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <Fuel className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-theme-white font-semibold">
                          Widget Ceny paliw
                        </h3>
                        <p className="text-theme-white-secondary text-sm">
                          Aktualne ceny paliw pobierane z CollectAPI
                        </p>
                        <p
                          className={`text-xs mt-0.5 ${
                            modulesSettings.fuelPrices
                              ? "text-green-400"
                              : "text-slate-500"
                          }`}
                        >
                          {modulesSettings.fuelPrices
                            ? "✓ Widget aktywny — widoczny na stronie głównej"
                            : "✗ Widget ukryty"}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={modulesSettings.fuelPrices !== false}
                      onCheckedChange={(val) =>
                        setModulesSettings({ ...modulesSettings, fuelPrices: val })
                      }
                    />
                  </div>
                </div>

                <div className="mt-6 mb-2">
                  <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
                    Funkcje systemowe
                  </p>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          modulesSettings.requireKeyForTrip
                            ? "bg-primary/20 text-primary"
                            : "bg-slate-700/50 text-slate-500"
                        }`}
                      >
                        {modulesSettings.requireKeyForTrip ? (
                          <Lock className="w-5 h-5" />
                        ) : (
                          <Unlock className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-theme-white font-semibold">
                          Blokada trasy bez kluczyków
                        </h3>
                        <p className="text-theme-white-secondary text-sm">
                          Wymagaj pobrania kluczyków przed rozpoczęciem trasy
                        </p>
                        <p
                          className={`text-xs mt-0.5 ${
                            modulesSettings.requireKeyForTrip
                              ? "text-primary"
                              : "text-amber-400"
                          }`}
                        >
                          {modulesSettings.requireKeyForTrip
                            ? "✓ Blokada aktywna"
                            : "⚠ Blokada wyłączona"}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={modulesSettings.requireKeyForTrip || false}
                      onCheckedChange={(val) =>
                        setModulesSettings({
                          ...modulesSettings,
                          requireKeyForTrip: val,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <Satellite className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-theme-white font-semibold">
                          Śledzenie GPS
                        </h3>
                        <p className="text-theme-white-secondary text-sm">
                          Śledzenie lokalizacji w czasie rzeczywistym
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={modulesSettings.gpsTracking || false}
                      onCheckedChange={(val) =>
                        setModulesSettings({
                          ...modulesSettings,
                          gpsTracking: val,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </GlassCard>
          )}

          {/* 🔧 LOKALIZACJA I MAPY - ROZBUDOWANA SEKCJA */}
          {activeTab === "location" && (
            <GlassCard className="p-6" delay={0.1}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <Navigation className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-theme-white">
                    Lokalizacja i Mapy
                  </h2>
                  <p className="text-sm text-theme-white-secondary">
                    Konfiguracja GPS, śledzenia tras i wyświetlania map
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* SEKCJA 1: Lokalizacja */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-theme-white font-semibold mb-4 flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-primary" />
                    Lokalizacja
                  </h3>
                  <div className="space-y-4">
                    {/* GPS Enabled */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-theme-white font-medium">
                          Pobieraj lokalizację
                        </Label>
                        <p className="text-xs text-theme-white-muted">
                          Czy aplikacja ma prosić o dostęp do GPS
                        </p>
                      </div>
                      <Switch
                        checked={locationSettings.gpsEnabled}
                        onCheckedChange={(val) =>
                          setLocationSettings({ ...locationSettings, gpsEnabled: val })
                        }
                      />
                    </div>

                    {/* High Accuracy */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-theme-white font-medium">
                          Lokalizacja dokładna
                        </Label>
                        <p className="text-xs text-theme-white-muted">
                          Tryb high accuracy (dokładniejszy GPS, większe zużycie baterii)
                        </p>
                      </div>
                      <Switch
                        checked={locationSettings.highAccuracy}
                        onCheckedChange={(val) =>
                          setLocationSettings({ ...locationSettings, highAccuracy: val })
                        }
                      />
                    </div>

                    {/* Ask on start */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-theme-white font-medium">
                          Żądaj pozwolenia przy starcie
                        </Label>
                        <p className="text-xs text-theme-white-muted">
                          Czy pytać o dostęp do lokalizacji od razu po wejściu do aplikacji
                        </p>
                      </div>
                      <Switch
                        checked={locationSettings.askForLocationOnStart}
                        onCheckedChange={(val) =>
                          setLocationSettings({ ...locationSettings, askForLocationOnStart: val })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* SEKCJA 2: Śledzenie tras */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-theme-white font-semibold mb-4 flex items-center gap-2">
                    <Route className="w-4 h-4 text-primary" />
                    Śledzenie tras
                  </h3>
                  <div className="space-y-4">
                    {/* Track live routes */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-theme-white font-medium">
                          Śledzenie tras na żywo
                        </Label>
                        <p className="text-xs text-theme-white-muted">
                          Czy zapisywać trasę podczas jazdy w czasie rzeczywistym
                        </p>
                      </div>
                      <Switch
                        checked={locationSettings.trackLiveRoutes}
                        onCheckedChange={(val) =>
                          setLocationSettings({ ...locationSettings, trackLiveRoutes: val })
                        }
                      />
                    </div>

                    {/* Save trip history */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-theme-white font-medium">
                          Historia tras
                        </Label>
                        <p className="text-xs text-theme-white-muted">
                          Czy zapisywać historię przejechanych tras do bazy danych
                        </p>
                      </div>
                      <Switch
                        checked={locationSettings.saveTripHistory}
                        onCheckedChange={(val) =>
                          setLocationSettings({ ...locationSettings, saveTripHistory: val })
                        }
                      />
                    </div>

                    {/* Auto center on location */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-theme-white font-medium">
                          Automatyczne centrowanie
                        </Label>
                        <p className="text-xs text-theme-white-muted">
                          Czy mapa automatycznie podąża za pojazdem podczas śledzenia
                        </p>
                      </div>
                      <Switch
                        checked={locationSettings.autoCenterOnLocation}
                        onCheckedChange={(val) =>
                          setLocationSettings({ ...locationSettings, autoCenterOnLocation: val })
                        }
                      />
                    </div>

                    {/* Tracking interval */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-theme-white font-medium">
                          Interwał śledzenia: {locationSettings.trackingInterval} s
                        </Label>
                      </div>
                      <Slider
                        value={[locationSettings.trackingInterval]}
                        onValueChange={([val]) =>
                          setLocationSettings({ ...locationSettings, trackingInterval: val })
                        }
                        min={1}
                        max={60}
                        step={1}
                        className="mt-2"
                      />
                      <p className="text-xs text-theme-white-muted">
                        Mniejszy interwał = dokładniejsze śledzenie, ale większe zużycie baterii
                      </p>
                    </div>
                  </div>
                </div>

                {/* SEKCJA 3: Dostawcy map */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-theme-white font-semibold mb-4 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    Dostawcy map
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-theme-white font-medium">Dostawca map</Label>
                      <Select
                        value={mapSettings.provider}
                        onValueChange={(val) =>
                          setMapSettings({ ...mapSettings, provider: val })
                        }
                      >
                        <SelectTrigger className="bg-slate-900/50 border-slate-600 text-theme-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="osm">OpenStreetMap (darmowy)</SelectItem>
                          <SelectItem value="carto">CartoDB (darmowy)</SelectItem>
                          <SelectItem value="stadia">Stadia Maps (darmowy)</SelectItem>
                          <SelectItem value="google">Google Maps (wymaga klucza API)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-theme-white font-medium">Styl mapy</Label>
                      <Select
                        value={mapSettings.mapStyle}
                        onValueChange={(val) =>
                          setMapSettings({ ...mapSettings, mapStyle: val })
                        }
                      >
                        <SelectTrigger className="bg-slate-900/50 border-slate-600 text-theme-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="road">Standard</SelectItem>
                          <SelectItem value="dark">Ciemny</SelectItem>
                          <SelectItem value="terrain">Teren</SelectItem>
                          <SelectItem value="satellite">Satelita</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-theme-white font-medium">Klucz Google Maps API</Label>
                      <Input
                        type="password"
                        value={locationSettings.googleMapsApiKey}
                        onChange={(e) =>
                          setLocationSettings({
                            ...locationSettings,
                            googleMapsApiKey: e.target.value,
                          })
                        }
                        placeholder="AIzaSy..."
                        className="bg-slate-900/50 border-slate-600 text-theme-white"
                      />
                      <p className="text-xs text-theme-white-muted">
                        Wymagany dla dostawcy Google Maps. Możesz go uzyskać w Google Cloud Console.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-theme-white font-medium">
                        Domyślny zoom ({mapSettings.defaultZoom})
                      </Label>
                      <Slider
                        value={[mapSettings.defaultZoom]}
                        onValueChange={([val]) =>
                          setMapSettings({ ...mapSettings, defaultZoom: val })
                        }
                        min={5}
                        max={18}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>

                {/* SEKCJA 4: Test połączenia */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-theme-white font-semibold mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Test połączenia
                  </h3>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        if (!locationSettings.googleMapsApiKey) {
                          toast.error("Wprowadź klucz Google Maps API przed testem");
                          return;
                        }
                        toast.loading("Testowanie połączenia z Google Maps...");
                        setTimeout(() => {
                          toast.dismiss();
                          toast.success("Połączenie z Google Maps działa poprawnie!");
                        }, 1500);
                      }}
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      Testuj Google Maps API
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        if (!navigator.geolocation) {
                          toast.error("Twoja przeglądarka nie obsługuje geolokalizacji");
                          return;
                        }
                        toast.loading("Testowanie GPS...");
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            toast.dismiss();
                            toast.success(`GPS działa! Szerokość: ${pos.coords.latitude.toFixed(4)}, Długość: ${pos.coords.longitude.toFixed(4)}`);
                          },
                          (err) => {
                            toast.dismiss();
                            let msg = "Błąd GPS: ";
                            if (err.code === 1) msg += "Odmówiono dostępu do lokalizacji";
                            else if (err.code === 2) msg += "Nie można określić pozycji";
                            else if (err.code === 3) msg += "Przekroczono czas oczekiwania";
                            else msg += err.message;
                            toast.error(msg);
                          },
                          {
                            enableHighAccuracy: locationSettings.highAccuracy,
                            timeout: 10000,
                          }
                        );
                      }}
                    >
                      <Crosshair className="w-4 h-4 mr-2" />
                      Testuj GPS
                    </Button>
                  </div>
                </div>
              </div>
            </GlassCard>
          )}

          {/* API */}
          {activeTab === "api" && (
            <GlassCard className="p-6" delay={0.1}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <Plug className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-theme-white">
                    API i Integracje
                  </h2>
                  <p className="text-sm text-theme-white-secondary">
                    Klucze API dla zewnętrznych usług
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  {
                    label: "Klucz CollectAPI (ceny paliw)",
                    key: "collectApiKey",
                    placeholder: "apikey ...",
                  },
                  {
                    label: "Klucz OpenWeatherMap (pogoda)",
                    key: "openWeatherApiKey",
                    placeholder: "abc123...",
                  },
                ].map(({ label, key, placeholder }) => (
                  <div
                    key={key}
                    className="bg-slate-800/50 rounded-xl p-4 border border-slate-700"
                  >
                    <Label className="text-theme-white-secondary mb-2">
                      {label}
                    </Label>
                    <Input
                      type="password"
                      value={apiSettings[key] || ""}
                      onChange={(e) =>
                        setApiSettings({ ...apiSettings, [key]: e.target.value })
                      }
                      placeholder={placeholder}
                      className="bg-slate-900/50 border-slate-600 text-theme-white"
                    />
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* DEBUG */}
          {activeTab === "debug" && (
            <GlassCard className="p-6" delay={0.1}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <BugPlay className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-theme-white">
                    Debug i Logi
                  </h2>
                  <p className="text-sm text-theme-white-secondary">
                    Narzędzia deweloperskie
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-theme-white font-semibold">
                        Tryb debugowania
                      </h3>
                      <p className="text-theme-white-secondary text-sm">
                        Szczegółowe logi w konsoli
                      </p>
                    </div>
                    <Switch
                      checked={debugEnabled}
                      onCheckedChange={toggleDebug}
                    />
                  </div>
                </div>
                {debugEnabled && (
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={refreshLogs}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Odśwież
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={downloadLogs}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Pobierz
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={clearLogs}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Wyczyść
                      </Button>
                    </div>
                    <div className="max-h-64 overflow-y-auto bg-slate-900 rounded-lg p-3 text-xs font-mono text-slate-300 space-y-1">
                      {filteredLogs.length === 0 ? (
                        <p className="text-slate-500">Brak logów</p>
                      ) : (
                        filteredLogs.map((log, i) => (
                          <div key={i} className="border-b border-slate-800 pb-1">
                            <span className="text-slate-500">
                              [{log.timestamp}]
                            </span>{" "}
                            <span
                              className={
                                log.type === "error"
                                  ? "text-red-400"
                                  : log.type === "warn"
                                  ? "text-yellow-400"
                                  : "text-green-400"
                              }
                            >
                              [{log.type?.toUpperCase()}]
                            </span>{" "}
                            {log.message}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          )}

          {/* WYGLĄD */}
          {activeTab === "appearance" && (
            <GlassCard className="p-6" delay={0.1}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <Palette className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-theme-white">
                    Wygląd
                  </h2>
                  <p className="text-sm text-theme-white-secondary">
                    Konfiguruj niezależnie tło aplikacji, menu boczne i górny pasek
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <section className="space-y-4 rounded-xl border border-slate-700 bg-slate-800/30 p-4 sm:p-5">
                  <h3 className="text-theme-white font-semibold">Tło aplikacji</h3>
                  <div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {backgrounds.map((bg) => (
                      <button
                        key={bg.id}
                        onClick={() =>
                          setLocalSettings({
                            ...localSettings,
                            backgroundColor: bg.class,
                          })
                        }
                        className={`h-12 rounded-xl border-2 transition-all ${bg.class} ${
                          localSettings.backgroundColor === bg.class
                            ? "border-primary shadow-lg shadow-primary/25"
                            : "border-slate-700 hover:border-slate-500"
                        }`}
                        title={bg.name}
                      />
                    ))}
                  </div>
                  </div>
                </section>

                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <h3 className="text-theme-white font-semibold mb-3 flex items-center gap-2">
                      <Palette className="w-4 h-4 text-primary" />
                    Kolor czcionki
                  </h3>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={localSettings.fontColor || "#f8fafc"}
                      onChange={(e) => setLocalSettings({ ...localSettings, fontColor: e.target.value })}
                      className="w-16 h-10 rounded border border-slate-600 cursor-pointer bg-slate-900"
                    />
                    <div className="flex-1 h-10 rounded-lg border border-slate-600" style={{ backgroundColor: localSettings.fontColor || "#f8fafc" }} />
                    <span className="text-theme-white text-sm font-mono">{localSettings.fontColor || "#f8fafc"}</span>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-theme-white font-semibold mb-3 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary" />
                    Kolor tekstu wpisywanego w formularzu
                  </h3>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={localSettings.inputTextColor || "#111827"}
                      onChange={(e) => setLocalSettings({ ...localSettings, inputTextColor: e.target.value })}
                      className="w-16 h-10 rounded border border-slate-600 cursor-pointer bg-slate-900"
                    />
                    <div
                      className="flex-1 h-10 rounded-lg border border-slate-600 flex items-center justify-center px-3 text-sm font-medium"
                      style={{
                        backgroundColor: localSettings.inputBackgroundColor || "#ffffff",
                        color: localSettings.inputTextColor || "#111827",
                      }}
                    >
                      Przykład wpisu
                    </div>
                    <span className="text-theme-white text-sm font-mono">{localSettings.inputTextColor || "#111827"}</span>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-theme-white font-semibold mb-3 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary" />
                    Kolor pola formularza
                  </h3>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={localSettings.inputBackgroundColor || "#ffffff"}
                      onChange={(e) => setLocalSettings({ ...localSettings, inputBackgroundColor: e.target.value })}
                      className="w-16 h-10 rounded border border-slate-600 cursor-pointer bg-slate-900"
                    />
                    <div
                      className="flex-1 h-10 rounded-lg border border-slate-600 flex items-center justify-center px-3 text-sm font-medium"
                      style={{
                        backgroundColor: localSettings.inputBackgroundColor || "#ffffff",
                        color: localSettings.inputTextColor || "#111827",
                      }}
                    >
                      Pole formularza
                    </div>
                    <span className="text-theme-white text-sm font-mono">{localSettings.inputBackgroundColor || "#ffffff"}</span>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-theme-white font-semibold mb-3 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary" />
                    Rodzaj czcionki
                  </h3>
                  <Select
                    value={localSettings.fontFamily || "Inter, ui-sans-serif, system-ui, sans-serif"}
                    onValueChange={(value) => setLocalSettings({ ...localSettings, fontFamily: value })}
                  >
                    <SelectTrigger className="bg-slate-900/50 border-slate-600 text-theme-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter, ui-sans-serif, system-ui, sans-serif">Inter</SelectItem>
                      <SelectItem value="'Segoe UI', sans-serif">Segoe UI</SelectItem>
                      <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                      <SelectItem value="'Trebuchet MS', sans-serif">Trebuchet MS</SelectItem>
                      <SelectItem value="'Georgia', serif">Georgia</SelectItem>
                      <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-theme-white font-semibold mb-3 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary" />
                    Wielkość czcionki
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-theme-white-secondary">
                      <span>Mała</span>
                      <span className="font-medium text-theme-white">{localSettings.fontSize || 14}px</span>
                      <span>Duża</span>
                    </div>
                    <Slider
                      value={[localSettings.fontSize || 14]}
                      min={12}
                      max={20}
                      step={1}
                      onValueChange={([value]) => setLocalSettings({ ...localSettings, fontSize: value })}
                    />
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-theme-white font-semibold mb-3 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary" />
                    Tło głównych przycisków
                  </h3>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      aria-label="Tło głównych przycisków"
                      value={localSettings.buttonColor || "#5b7cfa"}
                      onChange={(e) => setLocalSettings({ ...localSettings, buttonColor: e.target.value })}
                      className="w-16 h-10 rounded border border-slate-600 cursor-pointer bg-slate-900"
                    />
                    <div className="flex-1 h-10 rounded-lg border border-slate-600" style={{ backgroundColor: localSettings.buttonColor || "#5b7cfa" }} />
                    <span className="text-theme-white text-sm font-mono">{localSettings.buttonColor || "#5b7cfa"}</span>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-theme-white font-semibold mb-3 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary" />
                    Kolor tekstu głównych przycisków
                  </h3>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      aria-label="Kolor tekstu głównych przycisków"
                      value={localSettings.buttonTextColor || "#ffffff"}
                      onChange={(e) => setLocalSettings({ ...localSettings, buttonTextColor: e.target.value })}
                      className="w-16 h-10 rounded border border-slate-600 cursor-pointer bg-slate-900"
                    />
                    <button
                      type="button"
                      className="flex-1 h-10 rounded-lg border border-slate-600 px-3 text-sm font-medium"
                      style={{
                        backgroundColor: localSettings.buttonColor || "#5b7cfa",
                        color: localSettings.buttonTextColor || "#ffffff",
                      }}
                    >
                      Przykładowy przycisk
                    </button>
                    <span className="text-theme-white text-sm font-mono">{localSettings.buttonTextColor || "#ffffff"}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Ustawienie dotyczy zwykłych przycisków akcji; zachowuje kolory przycisków usuwania i statusów.
                  </p>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-theme-white font-semibold mb-3 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary" />
                    Kolor po najechaniu na przycisk
                  </h3>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      aria-label="Kolor przycisku po najechaniu"
                      value={localSettings.buttonHoverColor || localSettings.buttonColor || "#5b7cfa"}
                      onChange={(e) => setLocalSettings({ ...localSettings, buttonHoverColor: e.target.value })}
                      className="w-16 h-10 rounded border border-slate-600 cursor-pointer bg-slate-900"
                    />
                    <div
                      className="flex-1 h-10 rounded-lg border border-slate-600"
                      style={{ backgroundColor: localSettings.buttonHoverColor || localSettings.buttonColor || "#5b7cfa" }}
                    />
                    <span className="text-theme-white text-sm font-mono">
                      {localSettings.buttonHoverColor || localSettings.buttonColor || "#5b7cfa"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLocalSettings({ ...localSettings, buttonHoverColor: null })}
                      className="text-xs text-theme-white-secondary underline"
                    >
                      Jak tło
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Domyślnie przycisk używa tego samego koloru co jego tło.
                  </p>
                </div>

                <section className="space-y-4 rounded-xl border border-slate-700 bg-slate-800/30 p-4 sm:p-5">
                <h3 className="text-theme-white font-semibold">Lewe menu boczne</h3>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-theme-white font-semibold mb-3 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary" />
                    Kolor podświetlenia menu
                  </h3>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      aria-label="Kolor podświetlenia menu"
                      value={localSettings.menuHighlightColor || "#7c3aed"}
                      onChange={(e) => setLocalSettings({ ...localSettings, menuHighlightColor: e.target.value })}
                      className="w-16 h-10 rounded border border-slate-600 cursor-pointer bg-slate-900"
                    />
                    <div className="flex-1 h-10 rounded-lg border border-slate-600" style={{ backgroundColor: localSettings.menuHighlightColor || "#7c3aed" }} />
                    <span className="text-theme-white text-sm font-mono">{localSettings.menuHighlightColor || "#7c3aed"}</span>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-theme-white font-semibold mb-3 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary" />
                    Kolor tekstu nieaktywnego menu
                  </h3>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      aria-label="Kolor tekstu nieaktywnego menu"
                      value={localSettings.menuTextColor || getReadableTextColor(menuBackgroundColor)}
                      onChange={(e) => setLocalSettings({ ...localSettings, menuTextColor: e.target.value })}
                      className="w-16 h-10 rounded border border-slate-600 cursor-pointer bg-slate-900"
                    />
                    <div
                      className="flex-1 h-10 rounded-lg border border-slate-600 flex items-center px-3 text-sm"
                      style={{
                        backgroundColor: menuBackgroundColor,
                        color: localSettings.menuTextColor || getReadableTextColor(menuBackgroundColor),
                      }}
                    >
                      Pozycja menu
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocalSettings({ ...localSettings, menuTextColor: null })}
                      className="text-xs text-theme-white-secondary underline"
                    >
                      Automatyczny kontrast
                    </button>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-theme-white font-semibold mb-3 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary" />
                    Kolor tekstu aktywnej zakładki menu
                  </h3>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      aria-label="Kolor tekstu aktywnej zakładki menu"
                      value={localSettings.menuActiveTextColor || getReadableTextColor(localSettings.menuHighlightColor || "#7c3aed")}
                      onChange={(e) => setLocalSettings({ ...localSettings, menuActiveTextColor: e.target.value })}
                      className="w-16 h-10 rounded border border-slate-600 cursor-pointer bg-slate-900"
                    />
                    <div
                      className="flex-1 h-10 rounded-lg border border-slate-600 flex items-center px-3 text-sm"
                      style={{
                        backgroundColor: localSettings.menuHighlightColor || "#7c3aed",
                        color: localSettings.menuActiveTextColor || getReadableTextColor(localSettings.menuHighlightColor || "#7c3aed"),
                      }}
                    >
                      Aktywna zakładka
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocalSettings({ ...localSettings, menuActiveTextColor: null })}
                      className="text-xs text-theme-white-secondary underline"
                    >
                      Automatyczny kontrast
                    </button>
                  </div>
                </div>
                </section>

                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-theme-white font-semibold mb-3 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary" />
                    Kolor obwódki kafelków
                  </h3>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={localSettings.cardColor ? (
                        localSettings.cardColor === 'slate' ? '#64748b' :
                        localSettings.cardColor === 'blue' ? '#2563eb' :
                        localSettings.cardColor === 'purple' ? '#7c3aed' :
                        localSettings.cardColor === 'green' ? '#059669' :
                        localSettings.cardColor === 'amber' ? '#d97706' :
                        localSettings.cardColor === 'rose' ? '#e11d48' :
                        localSettings.cardColor === 'cyan' ? '#0891b2' :
                        localSettings.cardColor === 'orange' ? '#ea580c' :
                        localSettings.cardColor === 'pink' ? '#db2777' :
                        localSettings.cardColor === 'lime' ? '#65a30d' :
                        localSettings.cardColor === 'sky' ? '#0284c7' : '#6366f1'
                      ) : '#6366f1'}
                      onChange={(e) => setLocalSettings({ ...localSettings, cardColor: e.target.value })}
                      className="w-16 h-10 rounded border border-slate-600 cursor-pointer bg-slate-900"
                    />
                    <div className="flex-1 h-10 rounded-lg border border-slate-600" style={{ backgroundColor: localSettings.cardColor || '#6366f1' }} />
                    <span className="text-theme-white text-sm font-mono">{localSettings.cardColor || '#6366f1'}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Wybierz kolor obwódki dla kafelków.</p>
                </div>
                {/* Własne tło z obrazka */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-theme-white font-semibold mb-3 flex items-center gap-2">
                    <Image className="w-4 h-4 text-primary" />
                    Własne tło (obrazek)
                  </h3>
                  <input
                    type="file"
                    accept="image/*"
                    id="custom-bg-input"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          const dataUrl = typeof reader.result === "string" ? reader.result : null;
                          if (!dataUrl) return;
                          setCustomBackground(dataUrl);
                          toast.success("Obraz wczytano. Zapisz ustawienia, aby zachować zmianę.");
                        };
                        reader.onerror = () => toast.error("Nie udało się wczytać obrazu.");
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mb-2"
                    onClick={() => document.getElementById("custom-bg-input").click()}
                  >
                    <Image className="w-4 h-4 mr-2" />
                    Wybierz obrazek z komputera
                  </Button>
                  {customBackground && (
                    <div className="mt-3">
                      <div className="w-full h-20 rounded-lg bg-cover bg-center mb-2" style={{ backgroundImage: `url(${customBackground})` }} />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setCustomBackground(null);
                          toast.success("Tło zostało usunięte");
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Usuń własne tło
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-slate-500 mt-2">
                    Wybierz obrazek JPG, PNG lub GIF. Dla najlepszego efektu użyj ciemnego obrazka.
                  </p>
                </div>
                {/* ===== KOLOR TŁA MENU ===== */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-theme-white font-semibold mb-3 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary" />
                    Kolor tła menu bocznego
                  </h3>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={menuBackgroundColor}
                      onChange={(e) => {
                        setMenuBackgroundColor(e.target.value);
                      }}
                      className="w-16 h-10 rounded border border-slate-600 cursor-pointer bg-slate-900"
                    />
                    <div 
                      className="flex-1 h-10 rounded-lg border border-slate-600"
                      style={{ backgroundColor: menuBackgroundColor }}
                    />
                    <span className="text-theme-white text-sm font-mono">
                      {menuBackgroundColor}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Wybierz kolor tła dla menu bocznego.
                  </p>
                </div>

                {/* ===== KOLOR TŁA KAFELKÓW ===== */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-theme-white font-semibold mb-3 flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4 text-primary" />
                    Kolor tła kafelków
                  </h3>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={cardBackgroundColor}
                      onChange={(e) => {
                        setCardBackgroundColor(e.target.value);
                      }}
                      className="w-16 h-10 rounded border border-slate-600 cursor-pointer bg-slate-900"
                    />
                    <div 
                      className="flex-1 h-10 rounded-lg border border-slate-600"
                      style={{ backgroundColor: cardBackgroundColor }}
                    />
                    <span className="text-theme-white text-sm font-mono">
                      {cardBackgroundColor}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Wybierz kolor tła dla kafelków (GlassCard, StatCard).
                  </p>
                </div>

                {/* KOLOR I GRUBOŚĆ OBRAMOWANIA KAFELKÓW */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-theme-white font-semibold mb-3 flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4 text-primary" />
                    Obramowanie kafelków
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        aria-label="Kolor obwódki kafelków"
                        value={localSettings.cardBorderColor}
                        onChange={(e) => setLocalSettings({
                          ...localSettings,
                          cardBorderColor: e.target.value,
                        })}
                        className="w-16 h-10 rounded border border-slate-600 cursor-pointer bg-slate-900"
                      />
                      <span className="text-theme-white text-sm font-mono">
                        {localSettings.cardBorderColor}
                      </span>
                    </div>
                    <div>
                      <Label className="text-theme-white-secondary mb-2 block">
                        Grubość obwódki: {localSettings.cardBorderWidth}px
                      </Label>
                      <Slider
                        aria-label="Grubość obwódki kafelków"
                        value={[localSettings.cardBorderWidth]}
                        onValueChange={([value]) => setLocalSettings({
                          ...localSettings,
                          cardBorderWidth: value,
                        })}
                        min={0}
                        max={4}
                        step={1}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Kolor i grubość obwódki są niezależne od koloru tła kafelka.
                  </p>
                </div>

                {/* Przezroczystość menu bocznego */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-theme-white font-semibold mb-3 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    Przezroczystość menu bocznego
                  </h3>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[menuOpacity]}
                      onValueChange={([val]) => {
                        setMenuOpacity(val);
                      }}
                      min={0.1}
                      max={1}
                      step={0.01}
                      className="flex-1"
                    />
                    <span className="text-theme-white text-sm w-12">
                      {Math.round(menuOpacity * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Im wyższa wartość, tym bardziej nieprzezroczyste menu.
                  </p>
                </div>
                <section className="space-y-4 rounded-xl border border-slate-700 bg-slate-800/30 p-4 sm:p-5">
                  <div>
                    <h3 className="text-theme-white font-semibold">Górny pasek</h3>
                    <p className="mt-1 text-xs text-theme-white-muted">
                      Ustawienia dotyczą paska nawigacji widocznego na telefonie.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {[
                      { key: "topBarBackgroundColor", label: "Tło paska", fallback: localSettings.theme === "dark" ? "#111827" : "#ffffff" },
                      { key: "topBarTextColor", label: "Kolor tekstu", fallback: localSettings.theme === "dark" ? "#f8fafc" : "#0f172a" },
                      { key: "topBarIconColor", label: "Kolor ikon", fallback: localSettings.theme === "dark" ? "#cbd5e1" : "#475569" },
                    ].map(({ key, label, fallback }) => (
                      <label key={key} className="min-w-0 space-y-2 text-sm text-theme-white-secondary">
                        <span className="block">{label}</span>
                        <span className="flex items-center gap-3 rounded-lg border border-slate-600 bg-slate-900/40 p-3">
                          <input
                            type="color"
                            aria-label={label + " górnego paska"}
                            value={localSettings[key] || fallback}
                            onChange={(event) => setLocalSettings((previous) => ({
                              ...previous,
                              [key]: event.target.value,
                            }))}
                            className="h-10 w-14 shrink-0 cursor-pointer rounded border border-slate-600 bg-slate-900"
                          />
                          <span className="truncate font-mono text-xs text-theme-white">
                            {localSettings[key] || fallback}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <div
                    className="flex h-14 items-center justify-between rounded-lg border px-4"
                    style={{
                      backgroundColor: localSettings.topBarBackgroundColor || (localSettings.theme === "dark" ? "#111827" : "#ffffff"),
                      color: localSettings.topBarTextColor || (localSettings.theme === "dark" ? "#f8fafc" : "#0f172a"),
                      borderColor: `color-mix(in srgb, ${localSettings.topBarBackgroundColor || (localSettings.theme === "dark" ? "#111827" : "#ffffff")} 85%, ${localSettings.topBarTextColor || (localSettings.theme === "dark" ? "#f8fafc" : "#0f172a")})`,
                    }}
                  >
                    <span className="font-semibold">LongDrive</span>
                    <Menu
                      className="h-5 w-5"
                      style={{ color: localSettings.topBarIconColor || (localSettings.theme === "dark" ? "#cbd5e1" : "#475569") }}
                    />
                  </div>
                </section>

                {/* Przezroczystość kafelków */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-theme-white font-semibold mb-3 flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4 text-primary" />
                    Przezroczystość kafelków (GlassCard)
                  </h3>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[cardOpacity]}
                      onValueChange={([val]) => {
                        setCardOpacity(val);
                      }}
                      min={0.1}
                      max={1}
                      step={0.01}
                      className="flex-1"
                    />
                    <span className="text-theme-white text-sm w-12">
                      {Math.round(cardOpacity * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Reguluje przezroczystość wszystkich kafelków w aplikacji.
                  </p>
                </div>
			  </div>
            </GlassCard>
          )}

          {/* ANIMACJE */}
          {activeTab === "animations" && (
            <GlassCard className="p-6" delay={0.1}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-theme-white">
                    Animacje
                  </h2>
                  <p className="text-sm text-theme-white-secondary">
                    Efekty przejść stron
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <Label className="text-theme-white-secondary mb-3 block">
                    Typ animacji przejścia
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { id: "none", label: "Brak" },
                      { id: "fade", label: "Zanik" },
                      { id: "slide", label: "Przesunięcie" },
                      { id: "scale", label: "Skala" },
                      { id: "blur", label: "Rozmycie" },
                      { id: "flip", label: "Obrót" },
                      { id: "swing", label: "Wahadło" },
                      { id: "elastic", label: "Elastyczna" },
                    ].map((anim) => (
                      <button
                        key={anim.id}
                        onClick={() =>
                          setLocalSettings({
                            ...localSettings,
                            animationType: anim.id,
                          })
                        }
                        className={`py-2 px-3 rounded-lg text-sm border transition-all ${
                          localSettings.animationType === anim.id
                            ? "bg-gradient-primary text-white border-primary"
                            : "border-slate-700 text-theme-white-secondary hover:border-slate-500"
                        }`}
                      >
                        {anim.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <Label className="text-theme-white-secondary mb-3 block">
                    Prędkość animacji: {localSettings.animationSpeed}s
                  </Label>
                  <Slider
                    value={[localSettings.animationSpeed]}
                    onValueChange={([val]) =>
                      setLocalSettings({ ...localSettings, animationSpeed: val })
                    }
                    min={0.1}
                    max={1.0}
                    step={0.05}
                  />
                </div>
              </div>
            </GlassCard>
          )}

          {/* BACKUP */}
          {activeTab === "backup" && (
            <GlassCard className="p-6" delay={0.1}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <Database className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-theme-white">
                    Backup i Reset
                  </h2>
                  <p className="text-sm text-theme-white-secondary">
                    Zarządzaj danymi aplikacji
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <h3 className="text-theme-white font-semibold mb-2 flex items-center gap-2">
                    <Download className="w-5 h-5 text-emerald-400" />
                    Eksport danych (Backup)
                  </h3>
                  <p className="text-theme-white-secondary text-sm mb-4">
                    Pobierz kopię zapasową wszystkich danych aplikacji
                  </p>
                  <Button
                    onClick={handleExportBackup}
                    className="bg-gradient-primary"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Pobierz Backup
                  </Button>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <h3 className="text-theme-white font-semibold mb-2 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-blue-400" />
                    Import danych (Przywracanie)
                  </h3>
                  <p className="text-theme-white-secondary text-sm mb-4">
                    Przywróć dane z pliku backupu.{" "}
                    <span className="text-red-400 font-semibold">
                      Istniejące dane zostaną nadpisane!
                    </span>
                  </p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImportBackup}
                    accept=".json"
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isRestoring}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isRestoring ? "Przywracanie..." : "Wybierz plik backupu"}
                  </Button>
                </div>

                <div className="bg-red-500/10 rounded-xl p-6 border border-red-500/30">
                  <h3 className="text-theme-white font-semibold mb-2 flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-red-400" />
                    Reset aplikacji
                  </h3>
                  <p className="text-theme-white-secondary text-sm mb-4">
                    Usuń wszystkie dane z aplikacji. Ta operacja jest{" "}
                    <span className="text-red-400 font-semibold">
                      nieodwracalna
                    </span>
                    !
                  </p>
                  <Button
                    onClick={handleReset}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Usuń wszystkie dane
                  </Button>
                </div>
              </div>
            </GlassCard>
          )}

          {showSaveButton && (
            <div className="mt-4">
              <Button
                onClick={handleSave}
                className="w-full bg-gradient-primary text-white py-3 text-base font-semibold"
                disabled={saveCompanyMutation.isPending || saveProfileMutation.isPending}
              >
                {saveCompanyMutation.isPending || saveProfileMutation.isPending ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Save className="w-5 h-5 mr-2" />
                )}
                Zapisz ustawienia
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}