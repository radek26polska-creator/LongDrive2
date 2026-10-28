import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Truck, Users,
  Fuel, Wrench, TrendingUp, Plus, ArrowRight,
  Car, AlertTriangle, CheckCircle, Gauge, Route, Navigation
} from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import GlassCard from "@/components/ui/GlassCard";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import WeatherWidget from "@/components/weather/WeatherWidget";
import CalendarWidget from "@/components/calendar/CalendarWidget";
import api from "@/api/apiClient";
import { useAppSettings } from "@/lib/ThemeContext";
import { useAuth } from "@/lib/AuthContext";
import { format, formatDistanceToNow, isValid } from "date-fns";
import { pl } from "date-fns/locale";
import { accountStorage } from "@/lib/accountStorage";

const serviceTypeLabels = {
  oil_change: "Wymiana oleju",
  tires: "Wymiana opon",
  brakes: "Hamulce",
  repair: "Naprawa",
  inspection: "Przegląd",
  other: "Inne",
};

const statusColors = {
  available: "status-success",
  in_use: "status-info",
  maintenance: "status-warning",
  unavailable: "status-danger",
};

const statusLabels = {
  available: "Dostępny",
  in_use: "W użyciu",
  maintenance: "Serwis",
  unavailable: "Niedostępny",
};

const tripStatusColors = {
  in_progress: "status-info",
  completed: "status-success",
  cancelled: "status-danger",
};

const tripStatusLabels = {
  in_progress: "W trakcie",
  completed: "Zakończona",
  cancelled: "Anulowana",
};

const safeFormatDistanceToNow = (date) => {
  if (!date) return "data nieznana";
  const parsedDate = new Date(date);
  if (!isValid(parsedDate)) return "nieprawidłowa data";
  return formatDistanceToNow(parsedDate, { addSuffix: true, locale: pl });
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { settings } = useAppSettings();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [modulesSettings, setModulesSettings] = useState({
    weather: true,
    fuelPrices: true,
  });

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => api.getVehicles().catch(() => []),
  });

  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ["drivers"],
    queryFn: () => api.getDrivers().catch(() => []),
  });

  const { data: trips = [], isLoading: tripsLoading } = useQuery({
    queryKey: ["trips"],
    queryFn: () => api.getTrips().catch(() => []),
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => api.getServices().catch(() => []),
  });

  const { data: refuelings = [], isLoading: refuelingsLoading } = useQuery({
    queryKey: ["refuelings"],
    queryFn: () => api.getRefuels().catch(() => []),
  });

  const { data: companySettings = {} } = useQuery({
    queryKey: ["companySettings"],
    queryFn: () => api.getCompanySettings().catch(() => ({})),
  });

  const [apiSettings, setApiSettings] = useState({
    openWeatherApiKey: "",
    collectApiKey: "",
  });

  // Wczytaj ustawienia modułów i API z localStorage
  useEffect(() => {
    const loadSettings = () => {
      const savedApi = accountStorage.getItem("api_settings");
      if (savedApi) {
        try { setApiSettings(JSON.parse(savedApi)); } catch (e) {}
      }
      const savedModules = accountStorage.getItem("modules_settings");
      if (savedModules) {
        try { setModulesSettings(JSON.parse(savedModules)); } catch (e) {}
      }
    };
    loadSettings();
    window.addEventListener("modulesSettingsChanged", loadSettings);
    window.addEventListener("storage", loadSettings);
    return () => {
      window.removeEventListener("modulesSettingsChanged", loadSettings);
      window.removeEventListener("storage", loadSettings);
    };
  }, []);

  // Statystyki
  const stats = useMemo(() => {
    const availableVehicles = vehicles.filter((v) => v.status === "available").length;
    const inUseVehicles = vehicles.filter((v) => v.status === "in_use").length;
    const maintenanceVehicles = vehicles.filter((v) => v.status === "maintenance").length;
    const activeTrips = trips.filter((t) => t.status === "in_progress").length;
    const completedTrips = trips.filter((t) => t.status === "completed").length;
    const totalMileage = vehicles.reduce((sum, v) => sum + (v.mileage || 0), 0);
    const totalServiceCost = services.reduce((sum, s) => sum + (s.cost || 0), 0);
    const totalFuelCost = refuelings.reduce((sum, r) => sum + (r.cost || 0), 0);

    return {
      availableVehicles,
      inUseVehicles,
      maintenanceVehicles,
      activeTrips,
      completedTrips,
      totalMileage,
      totalServiceCost,
      totalFuelCost,
      totalTrips: trips.length,
    };
  }, [vehicles, trips, services, refuelings]);

  const recentTrips = useMemo(() =>
    [...trips]
      .filter((t) => t.startDate && isValid(new Date(t.startDate)))
      .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
      .slice(0, 5),
    [trips]
  );

  const upcomingServices = useMemo(() => {
    const now = new Date();
    return [...services]
      .filter((s) => s.date && isValid(new Date(s.date)) && new Date(s.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 3);
  }, [services]);

  const recentRefuelings = useMemo(() =>
    [...refuelings]
      .filter((r) => r.date && isValid(new Date(r.date)))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3),
    [refuelings]
  );

  const lowFuelVehicles = useMemo(
    () => vehicles.filter((v) => (v.fuelLevel || 0) < 20),
    [vehicles]
  );

  const activeTripsList = useMemo(
    () => trips.filter((t) => t.status === "in_progress"),
    [trips]
  );

  const getVehicleName = (id) => {
    const v = vehicles.find((v) => v.id === id);
    return v ? `${v.name || v.make || "Pojazd"} ${v.licensePlate || v.registrationNumber || ""}`.trim() : "Nieznany";
  };

  const getDriverName = (id) => {
    const d = drivers.find((d) => d.id === id);
    if (!d) return "Nieznany";
    return d.name || `${d.firstName || ""} ${d.lastName || ""}`.trim() || "Nieznany";
  };

  const formatDate = (date) => {
    if (!date) return "---";
    const p = new Date(date);
    return isValid(p) ? format(p, "dd MMM yyyy, HH:mm", { locale: pl }) : "---";
  };

  const formatDistance = (km) => {
    if (!km && km !== 0) return "0 km";
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  };

  const isLoading = vehiclesLoading || driversLoading || tripsLoading || servicesLoading;

  if (isLoading) {
    return (
      <div className="surface rounded-[var(--radius-md)] flex flex-col items-center justify-center gap-3 h-96" role="status" aria-live="polite">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--primary-color)]" />
        <span className="text-sm text-[var(--text-muted)]">Ładowanie danych floty…</span>
      </div>
    );
  }

  // Lokalizacja do widgetu pogody
  const weatherLocation = companySettings?.city
    ? { city: companySettings.city }
    : null;

  return (
    <div className="space-y-7 pb-8">
      <PageHeader
        title="Panel główny"
        subtitle={`Witaj${user?.name ? `, ${user.name}` : ""}! Oto podsumowanie Twojej floty.`}
        icon={LayoutDashboard}
      />

      <div className="ops-commandbar rounded-[var(--radius-lg)]">
        <div className="flex items-center gap-3 min-w-0">
          <span className="ops-live-dot" aria-hidden="true" />
          <div className="min-w-0">
            <p className="ops-eyebrow">OPERACJE FLOTY · LIVE</p>
            <p className="ops-command-copy">Stan systemu aktualizowany na bieżąco</p>
          </div>
        </div>
        <div className="ops-command-metrics">
          <span><strong>{stats.availableVehicles}</strong> dostępnych</span>
          <span><strong>{stats.activeTrips}</strong> w trasie</span>
          <span><strong>{stats.maintenanceVehicles}</strong> w serwisie</span>
        </div>
        <Button size="sm" onClick={() => navigate("/trips")} className="shrink-0 bg-primary hover:bg-primary-dark">
          <Plus className="w-4 h-4 mr-1.5" /> Nowa trasa
        </Button>
      </div>

      {/* Karty statystyk */}
      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pojazdy"
          value={vehicles.length}
          icon={Truck}
          trend={stats.availableVehicles}
          trendLabel="dostępnych"
          color="blue"
          onClick={() => navigate("/vehicles")}
        />
        <StatCard
          title="Kierowcy"
          value={drivers.length}
          icon={Users}
          trend={drivers.filter((d) => d.status === "active").length}
          trendLabel="aktywnych"
          color="green"
          onClick={() => navigate("/drivers")}
        />
        <StatCard
          title="Aktywne trasy"
          value={stats.activeTrips}
          icon={Route}
          trend={stats.completedTrips}
          trendLabel="zakończonych"
          color="purple"
          onClick={() => navigate("/trips")}
        />
        <StatCard
          title="Przejechane km"
          value={`${(stats.totalMileage / 1000).toFixed(0)}k`}
          icon={Gauge}
          trend={stats.totalTrips}
          trendLabel="tras łącznie"
          color="orange"
          onClick={() => navigate("/trips")}
        />
      </div>

      {/* Alerty i szybkie akcje */}
      {(lowFuelVehicles.length > 0 || activeTripsList.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lowFuelVehicles.length > 0 && (
            <GlassCard className="p-4 border border-[var(--danger)]/25">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-[var(--danger)]" />
                <h3 className="text-[var(--text-primary)] font-semibold">
                  Niski poziom paliwa ({lowFuelVehicles.length})
                </h3>
              </div>
              <div className="space-y-2">
                {lowFuelVehicles.slice(0, 3).map((v) => (
                  <div key={v.id} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">
                      {v.name || v.make} — {v.licensePlate}
                    </span>
                    <Badge variant="destructive" className="text-xs">
                      {v.fuelLevel || 0} L
                    </Badge>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full text-xs"
                onClick={() => navigate("/refueling")}
              >
                Zarejestruj tankowanie
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </GlassCard>
          )}
          {activeTripsList.length > 0 && (
            <GlassCard className="p-4 border border-[var(--info)]/25">
              <div className="flex items-center gap-2 mb-3">
                <Navigation className="w-5 h-5 text-[var(--info)]" />
                <h3 className="text-[var(--text-primary)] font-semibold">
                  Aktywne trasy ({activeTripsList.length})
                </h3>
              </div>
              <div className="space-y-2">
                {activeTripsList.slice(0, 3).map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">
                      {getVehicleName(t.vehicleId)}
                    </span>
                    <Badge className="text-xs status-info">
                      W trakcie
                    </Badge>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full text-xs"
                onClick={() => navigate("/trips")}
              >
                Zobacz wszystkie trasy
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </GlassCard>
          )}
        </div>
      )}

      {/* Widgety: Pogoda + Ceny paliw */}
      {(modulesSettings.weather !== false || modulesSettings.fuelPrices !== false) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modulesSettings.weather !== false && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <WeatherWidget
                location={weatherLocation}
                apiKey={apiSettings.openWeatherApiKey || null}
                showForecast={true}
                autoRefresh={true}
              />
            </motion.div>
          )}
          {modulesSettings.fuelPrices !== false && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <GlassCard className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Fuel className="w-5 h-5 text-[var(--success)]" />
                  <h3 className="text-[var(--text-primary)] font-semibold">Ceny paliw</h3>
                  <Badge className="text-xs status-info ml-auto">
                    Orientacyjne
                  </Badge>
                </div>
                <div className="space-y-3">
                  {[
                    { name: "Pb95", color: "text-[var(--success)]", price: "5.89", unit: "zł/L" },
                    { name: "Pb98", color: "text-[var(--info)]", price: "6.29", unit: "zł/L" },
                    { name: "ON", color: "text-[var(--warning)]", price: "5.99", unit: "zł/L" },
                    { name: "LPG", color: "text-[var(--accent-color)]", price: "2.99", unit: "zł/L" },
                  ].map((fuel) => (
                    <div
                      key={fuel.name}
                      className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-raised)]"
                    >
                      <span className={`font-semibold ${fuel.color}`}>
                        {fuel.name}
                      </span>
                      <span className="text-[var(--text-primary)] font-bold">
                        {fuel.price}{" "}
                        <span className="text-xs text-[var(--text-muted)]">
                          {fuel.unit}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-3 text-center">
                  * Ceny orientacyjne — skonfiguruj klucz CollectAPI w ustawieniach
                </p>
              </GlassCard>
            </motion.div>
          )}
        </div>
      )}

      {/* Kalendarz */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <CalendarWidget
          trips={trips}
          services={services}
          refuelings={refuelings}
          vehicles={vehicles}
        />
      </motion.div>

      {/* Zakładki z danymi */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto bg-[var(--surface-raised)] border border-[var(--border-color)] p-1.5 flex flex-nowrap gap-1 h-auto rounded-[var(--radius-lg)] scrollbar-none">
          {[
            { id: "overview", label: "Przegląd", icon: LayoutDashboard },
            { id: "trips", label: "Trasy", icon: Route },
            { id: "services", label: "Serwisy", icon: Wrench },
            { id: "fuel", label: "Tankowania", icon: Fuel },
            { id: "fleet", label: "Flota", icon: Car },
          ].map(({ id, label, icon: Icon }) => (
            <TabsTrigger
              key={id}
              value={id}
              className="min-w-max flex-1 data-[state=active]:bg-[var(--primary-color)] data-[state=active]:text-[var(--text-inverse)] flex items-center gap-1.5 text-xs transition-colors"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* PRZEGLĄD */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Statystyki kosztów */}
            <GlassCard className="p-4">
              <h3 className="text-[var(--text-primary)] font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Koszty
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-secondary)] text-sm">Serwisy</span>
                  <span className="text-[var(--text-primary)] font-semibold">
                    {stats.totalServiceCost.toFixed(2)} zł
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-secondary)] text-sm">Tankowania</span>
                  <span className="text-[var(--text-primary)] font-semibold">
                    {stats.totalFuelCost.toFixed(2)} zł
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-[var(--border-color)] pt-2">
                  <span className="text-[var(--text-primary)] font-semibold text-sm">Łącznie</span>
                  <span className="text-primary font-bold">
                    {(stats.totalServiceCost + stats.totalFuelCost).toFixed(2)} zł
                  </span>
                </div>
              </div>
            </GlassCard>

            {/* Stan floty */}
            <GlassCard className="p-4">
              <h3 className="text-[var(--text-primary)] font-semibold mb-3 flex items-center gap-2">
                <Car className="w-4 h-4 text-[var(--info)]" />
                Stan floty
              </h3>
              <div className="space-y-2">
                {[
                  { label: "Dostępne", count: stats.availableVehicles, color: "bg-[var(--success)]" },
                  { label: "W użyciu", count: stats.inUseVehicles, color: "bg-[var(--info)]" },
                  { label: "W serwisie", count: stats.maintenanceVehicles, color: "bg-[var(--warning)]" },
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-[var(--text-secondary)] text-sm flex-1">{label}</span>
                    <span className="text-[var(--text-primary)] font-semibold">{count}</span>
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 w-full text-xs"
                onClick={() => navigate("/vehicles")}
              >
                Zarządzaj flotą <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </GlassCard>

            {/* Nadchodzące serwisy */}
            <GlassCard className="p-4">
              <h3 className="text-[var(--text-primary)] font-semibold mb-3 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[var(--warning)]" />
                Nadchodzące serwisy
              </h3>
              {upcomingServices.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle className="w-8 h-8 text-[var(--success)] mx-auto mb-2" />
                  <p className="text-[var(--text-secondary)] text-sm">Brak zaplanowanych serwisów</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingServices.map((s) => (
                    <div key={s.id} className="p-2 rounded-lg bg-[var(--surface-raised)] border border-[var(--border-color)]">
                      <p className="text-[var(--text-primary)] text-sm font-medium">
                        {serviceTypeLabels[s.serviceType] || s.name || "Serwis"}
                      </p>
                      <p className="text-[var(--text-muted)] text-xs">
                        {getVehicleName(s.vehicleId)} •{" "}
                        {s.date ? format(new Date(s.date), "dd MMM yyyy", { locale: pl }) : "---"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 w-full text-xs"
                onClick={() => navigate("/services")}
              >
                Wszystkie serwisy <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </GlassCard>
          </div>
        </TabsContent>

        {/* TRASY */}
        <TabsContent value="trips" className="mt-4">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[var(--text-primary)] font-semibold flex items-center gap-2">
                <Route className="w-4 h-4 text-primary" />
                Ostatnie trasy
              </h3>
              <Button size="sm" variant="outline" onClick={() => navigate("/trips")}>
                <Plus className="w-4 h-4 mr-1" /> Nowa trasa
              </Button>
            </div>
            {recentTrips.length === 0 ? (
              <div className="text-center py-8">
                <Route className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
                <p className="text-[var(--text-secondary)]">Brak zarejestrowanych tras</p>
                <Button
                  className="mt-3 bg-primary hover:bg-primary-dark"
                  size="sm"
                  onClick={() => navigate("/trips")}
                >
                  Dodaj pierwszą trasę
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentTrips.map((trip) => (
                  <div
                    key={trip.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Otwórz trasę ${trip.startLocation || "Start"} do ${trip.endLocation || "Cel"}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-color)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
                    onClick={() => navigate(`/trips/${trip.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/trips/${trip.id}`);
                      }
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[var(--text-primary)] font-medium text-sm truncate">
                        {trip.startLocation || "Start"} → {trip.endLocation || "Cel"}
                      </p>
                      <p className="text-[var(--text-muted)] text-xs">
                        {getVehicleName(trip.vehicleId)} • {getDriverName(trip.driverId)}
                      </p>
                      <p className="text-[var(--text-muted)] text-xs">
                        {formatDate(trip.startDate)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-3">
                      <Badge
                        className={`text-xs ${tripStatusColors[trip.status] || "text-[var(--text-muted)] bg-[var(--surface-hover)]"}`}
                      >
                        {tripStatusLabels[trip.status] || trip.status}
                      </Badge>
                      {trip.distance && (
                        <span className="text-xs text-[var(--text-muted)]">
                          {formatDistance(trip.distance)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </TabsContent>

        {/* SERWISY */}
        <TabsContent value="services" className="mt-4">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[var(--text-primary)] font-semibold flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[var(--warning)]" />
                Serwisy
              </h3>
              <Button size="sm" variant="outline" onClick={() => navigate("/services")}>
                <Plus className="w-4 h-4 mr-1" /> Nowy serwis
              </Button>
            </div>
            {services.length === 0 ? (
              <div className="text-center py-8">
                <Wrench className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
                <p className="text-[var(--text-secondary)]">Brak serwisów</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...services]
                  .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
                  .slice(0, 6)
                  .map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-color)]">
                      <div>
                        <p className="text-[var(--text-primary)] font-medium text-sm">
                          {serviceTypeLabels[s.serviceType] || s.name || "Serwis"}
                        </p>
                        <p className="text-[var(--text-muted)] text-xs">
                          {getVehicleName(s.vehicleId)} •{" "}
                          {s.date ? format(new Date(s.date), "dd MMM yyyy", { locale: pl }) : "---"}
                        </p>
                      </div>
                      {s.cost && (
                        <span className="text-[var(--text-primary)] font-semibold text-sm">
                          {s.cost} zł
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </GlassCard>
        </TabsContent>

        {/* TANKOWANIA */}
        <TabsContent value="fuel" className="mt-4">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[var(--text-primary)] font-semibold flex items-center gap-2">
                <Fuel className="w-4 h-4 text-[var(--success)]" />
                Ostatnie tankowania
              </h3>
              <Button size="sm" variant="outline" onClick={() => navigate("/refueling")}>
                <Plus className="w-4 h-4 mr-1" /> Nowe tankowanie
              </Button>
            </div>
            {recentRefuelings.length === 0 ? (
              <div className="text-center py-8">
                <Fuel className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
                <p className="text-[var(--text-secondary)]">Brak tankowań</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentRefuelings.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-color)]">
                    <div>
                      <p className="text-[var(--text-primary)] font-medium text-sm">
                        {getVehicleName(r.vehicleId)}
                      </p>
                      <p className="text-[var(--text-muted)] text-xs">
                        {r.date ? format(new Date(r.date), "dd MMM yyyy", { locale: pl }) : "---"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[var(--text-primary)] font-semibold text-sm">
                        {r.liters || 0} L
                      </p>
                      {r.cost && (
                        <p className="text-[var(--text-muted)] text-xs">{r.cost} zł</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </TabsContent>

        {/* FLOTA */}
        <TabsContent value="fleet" className="mt-4">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[var(--text-primary)] font-semibold flex items-center gap-2">
                <Car className="w-4 h-4 text-[var(--info)]" />
                Pojazdy floty
              </h3>
              <Button size="sm" variant="outline" onClick={() => navigate("/vehicles")}>
                Zarządzaj flotą
              </Button>
            </div>
            {vehicles.length === 0 ? (
              <div className="text-center py-8">
                <Car className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
                <p className="text-[var(--text-secondary)]">Brak pojazdów</p>
                <Button
                  className="mt-3 bg-primary hover:bg-primary-dark"
                  size="sm"
                  onClick={() => navigate("/vehicles")}
                >
                  Dodaj pojazd
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {vehicles.map((vehicle) => {
                  const fuelPercent = vehicle.tankCapacity
                    ? ((vehicle.fuelLevel || 0) / vehicle.tankCapacity) * 100
                    : 0;
                  const fuelColor =
                    fuelPercent < 20
                      ? "bg-[var(--danger)]"
                      : fuelPercent < 40
                      ? "bg-[var(--warning)]"
                      : "bg-[var(--success)]";
                  return (
                    <div
                      key={vehicle.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Otwórz pojazd ${vehicle.name || vehicle.make || "Pojazd"}`}
                      className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-color)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
                      onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          navigate(`/vehicles/${vehicle.id}`);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-[var(--text-primary)] font-medium text-sm">
                            {vehicle.name || vehicle.make || "Pojazd"}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {vehicle.licensePlate || vehicle.registrationNumber}
                          </p>
                        </div>
                        <Badge
                          className={`text-xs ${statusColors[vehicle.status] || "text-[var(--text-muted)] bg-[var(--surface-hover)]"}`}
                        >
                          {statusLabels[vehicle.status] || vehicle.status || "---"}
                        </Badge>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                          <span>Paliwo</span>
                          <span>
                            {vehicle.fuelLevel || 0} / {vehicle.tankCapacity || 60} L (
                            {Math.round(Math.min(100, fuelPercent))}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[var(--surface-hover)] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${fuelColor} rounded-full transition-all`}
                            style={{ width: `${Math.min(100, fuelPercent)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
