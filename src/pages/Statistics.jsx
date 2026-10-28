import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import {
  BarChart3,
  Car,
  Route,
  Wrench,
  Gauge,
  Download,
  Filter,
  Calendar,
  User
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import GlassCard from "@/components/ui/GlassCard";
import StatCard from "@/components/ui/StatCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from "recharts";
import api from "@/api/apiClient";

const COLORS = ['var(--primary-color)', '#22d3ee', '#a855f7', '#f59e0b', '#10b981', '#ef4444'];

export default function Statistics() {
  const [selectedVehicle, setSelectedVehicle] = useState("all");
  const [selectedDriver, setSelectedDriver] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [chartType, setChartType] = useState("overview");

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: api.getVehicles,
    refetchOnMount: true
  });

  // 🔧 Transformacja kierowców – dodajemy pole `name` z firstName + lastName
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: api.getDrivers,
    refetchOnMount: true,
    select: (data) => data.map(driver => ({
      ...driver,
      name: `${driver.firstName} ${driver.lastName}`.trim()
    }))
  });

  const { data: trips = [] } = useQuery({
    queryKey: ['trips'],
    queryFn: api.getTrips,
    refetchOnMount: true
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: api.getServices,
    refetchOnMount: true
  });

  // Filtrowanie danych
  const filterByDate = (items, dateField = 'date') => {
    if (dateRange === 'all') return items;
    
    const now = new Date();
    const filterDate = new Date();
    
    if (dateRange === 'month') {
      filterDate.setMonth(now.getMonth() - 1);
    } else if (dateRange === 'quarter') {
      filterDate.setMonth(now.getMonth() - 3);
    } else if (dateRange === 'year') {
      filterDate.setFullYear(now.getFullYear() - 1);
    }
    
    return items.filter(item => new Date(item[dateField]) >= filterDate);
  };

  const filterByVehicle = (items, vehicleField = 'vehicleId') => {
    if (selectedVehicle === 'all') return items;
    return items.filter(item => item[vehicleField] === selectedVehicle);
  };

  const filterByDriver = (items) => {
    if (selectedDriver === 'all') return items;
    return items.filter(trip => trip.driverId === selectedDriver);
  };

  const filteredTrips = filterByDate(filterByDriver(filterByVehicle(trips)), 'startDate');
  const filteredServices = filterByDate(filterByVehicle(services), 'date');

  // Obliczenia
  const totalMileage = vehicles.reduce((sum, v) => sum + (v.mileage || 0), 0);
  const avgMileage = vehicles.length > 0 ? Math.round(totalMileage / vehicles.length) : 0;
  const totalServiceCost = filteredServices.reduce((sum, s) => sum + (s.cost || 0), 0);
  const completedTrips = filteredTrips.filter(t => t.status === 'completed').length;
  const totalTripDistance = filteredTrips.reduce((sum, t) => {
    if (t.endMileage && t.startMileage) {
      return sum + (t.endMileage - t.startMileage);
    }
    return sum;
  }, 0);

  // Status pojazdów
  const statusCounts = {
    available: vehicles.filter(v => v.status === 'available').length,
    in_use: vehicles.filter(v => v.status === 'in_use').length,
    maintenance: vehicles.filter(v => v.status === 'maintenance').length,
    unavailable: vehicles.filter(v => v.status === 'unavailable').length
  };

  const statusData = [
    { name: 'Dostępne', value: statusCounts.available, color: '#10b981' },
    { name: 'W użyciu', value: statusCounts.in_use, color: '#f59e0b' },
    { name: 'Serwis', value: statusCounts.maintenance, color: '#ef4444' },
    { name: 'Niedostępne', value: statusCounts.unavailable, color: '#64748b' }
  ].filter(d => d.value > 0);

  // Statystyki po pojazdach
  const vehicleStats = vehicles.map(vehicle => {
    const vehicleTrips = filteredTrips.filter(t => t.vehicleId === vehicle.id);
    const distance = vehicleTrips.reduce((sum, t) => 
      sum + ((t.endMileage || 0) - (t.startMileage || 0)), 0);
    const tripCount = vehicleTrips.length;
    
    return {
      id: vehicle.id,
      name: `${vehicle.make} ${vehicle.model}`,
      regNumber: vehicle.registrationNumber,
      distance,
      tripCount,
      avgDistance: tripCount > 0 ? Math.round(distance / tripCount) : 0
    };
  }).sort((a, b) => b.distance - a.distance);

  // Statystyki po kierowcach
  const driverStats = drivers.map(driver => {
    const driverTrips = filteredTrips.filter(t => t.driverId === driver.id);
    const distance = driverTrips.reduce((sum, t) => 
      sum + ((t.endMileage || 0) - (t.startMileage || 0)), 0);
    const tripCount = driverTrips.length;
    
    return {
      id: driver.id,
      name: driver.name,
      distance,
      tripCount,
      avgDistance: tripCount > 0 ? Math.round(distance / tripCount) : 0
    };
  }).sort((a, b) => b.distance - a.distance);

  // 🔧 Koszty serwisów – grupowanie po opisie (description) zamiast serviceType
  const serviceCostsByType = filteredServices.reduce((acc, s) => {
    const type = s.description?.trim() || 'inne';
    acc[type] = (acc[type] || 0) + (s.cost || 0);
    return acc;
  }, {});

  const serviceCostsData = Object.entries(serviceCostsByType).map(([type, cost]) => ({
    name: type,
    koszt: cost
  }));

  // Miesięczne statystyki
  const monthlyStats = filteredTrips.reduce((acc, trip) => {
    if (!trip.startDate) return acc;
    const month = format(new Date(trip.startDate), 'yyyy-MM');
    if (!acc[month]) {
      acc[month] = { month, distance: 0, trips: 0, services: 0 };
    }
    const distance = (trip.endMileage || 0) - (trip.startMileage || 0);
    if (distance > 0) {
      acc[month].distance += distance;
      acc[month].trips += 1;
    }
    return acc;
  }, {});

  const monthlyData = Object.values(monthlyStats).map(item => ({
    ...item,
    month: format(new Date(item.month + '-01'), 'MMM yyyy', { locale: pl })
  }));

  // Eksport statystyk do CSV
  const exportStatistics = () => {
    try {
      const data = {
        exportDate: new Date().toISOString(),
        period: dateRange === 'all' ? 'cały okres' : 
                dateRange === 'month' ? 'ostatni miesiąc' :
                dateRange === 'quarter' ? 'ostatni kwartał' : 'ostatni rok',
        totals: {
          vehicles: vehicles.length,
          drivers: drivers.length,
          trips: filteredTrips.length,
          completedTrips,
          totalDistance: totalTripDistance,
          totalServiceCost
        },
        vehicleStats,
        driverStats,
        monthlyData
      };

      const csvRows = [];
      
      // Nagłówki
      csvRows.push('=== RAPORT STATYSTYCZNY ===');
      csvRows.push(`Data eksportu: ${format(new Date(), 'dd.MM.yyyy HH:mm', { locale: pl })}`);
      csvRows.push(`Okres: ${data.period}`);
      csvRows.push('');
      
      // Podsumowanie
      csvRows.push('PODSUMOWANIE');
      csvRows.push(`Pojazdy,${data.totals.vehicles}`);
      csvRows.push(`Kierowcy,${data.totals.drivers}`);
      csvRows.push(`Wszystkie trasy,${data.totals.trips}`);
      csvRows.push(`Ukończone trasy,${data.totals.completedTrips}`);
      csvRows.push(`Łączny dystans,${data.totals.totalDistance} km`);
      csvRows.push(`Koszty serwisów,${data.totals.totalServiceCost} PLN`);
      csvRows.push('');
      
      // Statystyki pojazdów
      csvRows.push('STATYSTYKI POJAZDÓW');
      csvRows.push('Pojazd,Rejestracja,Liczba tras,Łączny dystans (km),Średni dystans (km)');
      vehicleStats.forEach(v => {
        csvRows.push(`${v.name},${v.regNumber},${v.tripCount},${v.distance},${v.avgDistance}`);
      });
      csvRows.push('');
      
      // Statystyki kierowców
      csvRows.push('STATYSTYKI KIEROWCÓW');
      csvRows.push('Kierowca,Liczba tras,Łączny dystans (km),Średni dystans (km)');
      driverStats.forEach(d => {
        csvRows.push(`${d.name},${d.tripCount},${d.distance},${d.avgDistance}`);
      });

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `statystyki-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Raport wyeksportowany pomyślnie');
    } catch (error) {
      toast.error('Błąd podczas eksportu: ' + error.message);
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <PageHeader
        title="Statystyki"
        subtitle="Analiza i raporty floty"
        icon={BarChart3}
        action={
          <Button
            onClick={exportStatistics}
            className="w-full sm:w-auto"
          >
            <Download className="h-4 w-4" />
            Eksportuj raport
          </Button>
        }
      />

      {/* Filtry */}
      <GlassCard className="p-4 sm:p-5" delay={0.1} hover={false}>
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Filtruj dane</h2>
          <Badge variant="outline" className="ml-auto normal-case tracking-normal text-[var(--text-muted)]">
            {dateRange === "all" ? "Cały okres" : dateRange === "month" ? "Ostatni miesiąc" : dateRange === "quarter" ? "Ostatni kwartał" : "Ostatni rok"}
          </Badge>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex-1">
            <Label className="mb-1.5 block text-xs text-[var(--text-muted)]">Pojazd</Label>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger>
                <Car className="mr-2 h-4 w-4 text-[var(--text-muted)]" />
                <SelectValue placeholder="Wszystkie pojazdy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie pojazdy</SelectItem>
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.make} {v.model} ({v.registrationNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label className="mb-1.5 block text-xs text-[var(--text-muted)]">Kierowca</Label>
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger>
                <User className="mr-2 h-4 w-4 text-[var(--text-muted)]" />
                <SelectValue placeholder="Wszyscy kierowcy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszyscy kierowcy</SelectItem>
                {drivers.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label className="mb-1.5 block text-xs text-[var(--text-muted)]">Okres</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <Calendar className="mr-2 h-4 w-4 text-[var(--text-muted)]" />
                <SelectValue placeholder="Cały okres" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Cały okres</SelectItem>
                <SelectItem value="month">Ostatni miesiąc</SelectItem>
                <SelectItem value="quarter">Ostatni kwartał</SelectItem>
                <SelectItem value="year">Ostatni rok</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </GlassCard>

      {/* Karty statystyk */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-4">
        <StatCard
          title="Łączny przebieg"
          value={`${(totalMileage / 1000).toFixed(0)}k km`}
          subtitle={`Śr. ${avgMileage.toLocaleString()} km/pojazd`}
          icon={Gauge}
          gradient="from-indigo-500 to-purple-500"
          delay={0}
        />
        <StatCard
          title="Ukończone trasy"
          value={completedTrips}
          subtitle={`${totalTripDistance.toLocaleString()} km przejechane`}
          icon={Route}
          gradient="from-emerald-500 to-teal-500"
          delay={0.1}
        />
        <StatCard
          title="Koszty serwisów"
          value={`${(totalServiceCost / 1000).toFixed(1)}k PLN`}
          subtitle={`${filteredServices.length} serwisów`}
          icon={Wrench}
          gradient="from-amber-500 to-orange-500"
          delay={0.2}
        />
        <StatCard
          title="Flota"
          value={vehicles.length}
          subtitle={`${statusCounts.available} dostępnych`}
          icon={Car}
          gradient="from-rose-500 to-pink-500"
          delay={0.3}
        />
      </div>

      {/* Wykresy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status pojazdów */}
        <GlassCard className="p-5 sm:p-6" delay={0.4} hover={false}>
          <h3 className="mb-6 text-base font-semibold text-[var(--text-primary)]">Status pojazdów</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <RePieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
                />
                <Legend 
                  formatter={(value) => <span className="text-[var(--text-secondary)]">{value}</span>}
                />
              </RePieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-[var(--text-muted)]">
              Brak danych
            </div>
          )}
        </GlassCard>

        {/* Statystyki miesięczne */}
        <GlassCard className="p-5 sm:p-6" delay={0.5} hover={false}>
          <h3 className="mb-6 text-base font-semibold text-[var(--text-primary)]">Dystans w czasie</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="distance" 
                  stroke="var(--primary-color)" 
                  strokeWidth={2}
                  dot={{ fill: 'var(--primary-color)', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-[var(--text-muted)]">
              Brak danych
            </div>
          )}
        </GlassCard>

        {/* Koszty serwisów – teraz grupujemy po opisie */}
        <GlassCard className="p-5 sm:p-6" delay={0.6} hover={false}>
          <h3 className="mb-6 text-base font-semibold text-[var(--text-primary)]">Koszty serwisów wg opisu</h3>
          {serviceCostsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={serviceCostsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
                  formatter={(value) => [`${value.toLocaleString()} PLN`, 'Koszt']}
                />
                <Bar dataKey="koszt" fill="var(--primary-color)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-[var(--text-muted)]">
              Brak danych o serwisach
            </div>
          )}
        </GlassCard>

        {/* Top pojazdy */}
        <GlassCard className="p-5 sm:p-6" delay={0.7} hover={false}>
          <h3 className="mb-6 text-base font-semibold text-[var(--text-primary)]">Top 5 pojazdów wg przebiegu</h3>
          {vehicleStats.slice(0, 5).length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vehicleStats.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={11} width={120} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
                  formatter={(value) => [`${value.toLocaleString()} km`, 'Przebieg']}
                />
                <Bar dataKey="distance" fill="var(--primary-color)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-[var(--text-muted)]">
              Brak danych o pojazdach
            </div>
          )}
        </GlassCard>
      </div>

      {/* Tabela statystyk kierowców */}
      {driverStats.length > 0 && (
        <GlassCard className="p-5 sm:p-6" delay={0.8} hover={false}>
          <h3 className="mb-6 text-base font-semibold text-[var(--text-primary)]">Statystyki kierowców</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kierowca</TableHead>
                <TableHead className="text-right">Liczba tras</TableHead>
                <TableHead className="text-right">Łączny dystans</TableHead>
                <TableHead className="text-right">Średni dystans</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {driverStats.map((driver, index) => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium text-[var(--text-primary)]">{driver.name}</TableCell>
                    <TableCell className="text-right text-[var(--text-secondary)]">{driver.tripCount}</TableCell>
                    <TableCell className="text-right text-[var(--text-secondary)]">{driver.distance.toLocaleString()} km</TableCell>
                    <TableCell className="text-right text-[var(--text-secondary)]">{driver.avgDistance.toLocaleString()} km</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </GlassCard>
      )}
    </div>
  );
}