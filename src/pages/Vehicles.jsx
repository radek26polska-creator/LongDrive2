import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  Plus,
  Search,
  Filter,
  Fuel,
  Gauge,
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  ArrowUpDown,
  X
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import GlassCard from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import api from "@/api/apiClient";

const statusConfig = {
  available: { label: 'Dostępny', color: 'status-success' },
  in_use: { label: 'W użyciu', color: 'status-warning' },
  maintenance: { label: 'Serwis', color: 'status-danger' },
  unavailable: { label: 'Niedostępny', color: 'status-info' }
};

const fuelTypes = ['Benzyna', 'Diesel', 'LPG', 'Elektryczny', 'Hybryda'];
const vehicleTypes = ['Osobowe', 'BUS', 'Ciężarowe', 'Dostawcze'];

export default function Vehicles() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    registrationNumber: '',
    mileage: 0,
    fuelLevel: 0,
    tankSize: 50,
    fuelConsumption: 7.5,
    status: 'available',
    vehicleType: 'Osobowe',
    fuelType: 'Benzyna',
    engineCapacity: 1600,
    bodyType: ''
  });

  const queryClient = useQueryClient();

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: api.getVehicles,
    refetchOnMount: true,
    select: (data) => data.map(v => ({ ...v, id: String(v.id) }))
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.createVehicle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateVehicle(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteVehicle(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    }
  });

  const resetForm = () => {
    setFormData({
      make: '',
      model: '',
      year: new Date().getFullYear(),
      registrationNumber: '',
      mileage: 0,
      fuelLevel: 0,
      tankSize: 50,
      fuelConsumption: 7.5,
      status: 'available',
      vehicleType: 'Osobowe',
      fuelType: 'Benzyna',
      engineCapacity: 1600,
      bodyType: ''
    });
    setEditingVehicle(null);
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      make: vehicle.make || '',
      model: vehicle.model || '',
      year: vehicle.year || new Date().getFullYear(),
      registrationNumber: vehicle.registrationNumber || '',
      mileage: vehicle.mileage || 0,
      fuelLevel: vehicle.fuelLevel || 0,
      tankSize: vehicle.tankSize || 50,
      fuelConsumption: vehicle.fuelConsumption ?? 7.5,
      status: vehicle.status || 'available',
      vehicleType: vehicle.vehicleType || 'Osobowe',
      fuelType: vehicle.fuelType || 'Benzyna',
      engineCapacity: vehicle.engineCapacity || 1600,
      bodyType: vehicle.bodyType || ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredVehicles = vehicles
    .filter(vehicle => {
      const normalizedSearch = searchTerm.trim().toLowerCase();
      const matchesSearch = !normalizedSearch ||
        vehicle.make?.toLowerCase().includes(normalizedSearch) ||
        vehicle.model?.toLowerCase().includes(normalizedSearch) ||
        vehicle.registrationNumber?.toLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'year') return (b.year || 0) - (a.year || 0);
      if (sortBy === 'mileage') return (b.mileage || 0) - (a.mileage || 0);
      return `${a.make || ''} ${a.model || ''}`.localeCompare(`${b.make || ''} ${b.model || ''}`, 'pl');
    });

  const hasActiveFilters = Boolean(searchTerm.trim()) || statusFilter !== 'all' || sortBy !== 'name';

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSortBy("name");
  };

  const summaryStats = [
    { label: 'Łącznie', value: vehicles.length, icon: Car, tone: 'primary' },
    { label: 'Dostępne', value: vehicles.filter((v) => v.status === 'available').length, icon: Gauge, tone: 'success' },
    { label: 'W użyciu', value: vehicles.filter((v) => v.status === 'in_use').length, icon: Fuel, tone: 'warning' },
    { label: 'Serwis', value: vehicles.filter((v) => v.status === 'maintenance').length, icon: Calendar, tone: 'danger' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pojazdy"
        subtitle={`${vehicles.length} pojazdów w flocie`}
        icon={Car}
        action={
          <Button 
            onClick={() => { resetForm(); setIsDialogOpen(true); }}
            aria-label="Dodaj nowy pojazd"
            className="bg-[var(--primary-color)] text-[var(--text-inverse)] hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Dodaj pojazd
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryStats.map(({ label, value, icon: Icon, tone }) => (
          <GlassCard key={label} className="p-4" delay={0.05} hover={false} animate={false}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</p>
                <p className="mt-3 text-2xl font-bold text-[var(--text-primary)]">{value}</p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                tone === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' :
                tone === 'warning' ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' :
                tone === 'danger' ? 'border-rose-500/30 bg-rose-500/10 text-rose-400' :
                'border-[var(--border-color)] bg-[var(--primary-soft)] text-[var(--primary-color)]'
              }`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-4" delay={0.1} hover={false} animate={false}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <Input
              aria-label="Szukaj pojazdu"
              placeholder="Szukaj pojazdu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 pl-10 pr-10 bg-[var(--surface)] border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
            />
            {searchTerm && (
              <button type="button" aria-label="Wyczyść wyszukiwanie" onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:shrink-0">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger aria-label="Filtr statusu pojazdu" className="h-11 w-full bg-[var(--surface)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-[var(--focus)] lg:w-48">
              <Filter className="w-4 h-4 mr-2 text-[var(--text-muted)]" />
              <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie statusy</SelectItem>
                <SelectItem value="available">Dostępne</SelectItem>
                <SelectItem value="in_use">W użyciu</SelectItem>
                <SelectItem value="maintenance">Serwis</SelectItem>
                <SelectItem value="unavailable">Niedostępne</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger aria-label="Sortuj pojazdy" className="h-11 w-full bg-[var(--surface)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-[var(--focus)] lg:w-48">
                <ArrowUpDown className="w-4 h-4 mr-2 text-[var(--text-muted)]" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nazwa A–Z</SelectItem>
                <SelectItem value="year">Najnowszy rocznik</SelectItem>
                <SelectItem value="mileage">Największy przebieg</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilters && (
            <Button type="button" variant="ghost" onClick={resetFilters} className="h-11 shrink-0 justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]">
              Wyczyść
            </Button>
          )}
        </div>
      </GlassCard>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--surface)] animate-pulse" />
          ))}
        </div>
      ) : filteredVehicles.length === 0 ? (
        <GlassCard className="p-12 text-center" hover={false} animate={false}>
          <Car className="mx-auto mb-4 h-16 w-16 text-[var(--text-muted)]" />
          <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">Brak pojazdów</h3>
          <p className="mb-4 text-[var(--text-muted)]">
            {searchTerm || statusFilter !== 'all' 
              ? "Nie znaleziono pojazdów spełniających kryteria"
              : "Dodaj pierwszy pojazd do swojej floty"}
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="bg-[var(--primary-color)] text-[var(--text-inverse)] hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Dodaj pojazd
            </Button>
          )}
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredVehicles.map((vehicle, index) => (
              <motion.div
                key={vehicle.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ delay: index * 0.04 }}
                layout
              >
                <GlassCard className="h-full p-5" hover={true} animate={false}>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--surface-raised)]">
                      <Car className="h-7 w-7 text-[var(--text-secondary)]" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${statusConfig[vehicle.status]?.color || 'status-info'} text-[var(--text-primary)]`}>
                        {statusConfig[vehicle.status]?.label || vehicle.status}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Akcje dla ${vehicle.make} ${vehicle.model}`} className="text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border-color)]">
                          <DropdownMenuItem 
                            onClick={() => handleEdit(vehicle)}
                            className="text-[var(--text-primary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edytuj
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteMutation.mutate(vehicle.id)}
                            className="text-[var(--danger)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Usuń
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <h3 className="mb-1 text-xl font-bold text-[var(--text-primary)]">
                    {vehicle.make} {vehicle.model}
                  </h3>
                  <p className="mb-4 font-mono text-sm text-[var(--primary-color)]">
                    {vehicle.registrationNumber}
                  </p>

                  <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-[var(--text-muted)]">
                      <Gauge className="h-4 w-4" />
                      {vehicle.mileage?.toLocaleString()} km
                    </div>
                    <div className="flex items-center gap-2 text-[var(--text-muted)]">
                      <Calendar className="h-4 w-4" />
                      {vehicle.year}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-1 text-[var(--text-muted)]">
                        <Fuel className="h-4 w-4" />
                        Paliwo
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {vehicle.fuelLevel?.toFixed(0)}L / {vehicle.tankSize}L
                      </span>
                    </div>
                    <Progress 
                      value={(vehicle.fuelLevel / vehicle.tankSize) * 100} 
                      className="h-2 bg-[var(--surface-hover)]"
                    />
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-1rem)] max-w-3xl overflow-y-auto border-[var(--border-color)] bg-[var(--surface)] p-0 text-[var(--text-primary)] shadow-[var(--shadow-card)] sm:rounded-[var(--radius-xl)]">
          <div className="border-b border-[var(--border-color)] bg-[var(--surface-raised)] px-5 py-4 sm:px-6">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                {editingVehicle ? 'Edytuj pojazd' : 'Dodaj nowy pojazd'}
              </DialogTitle>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--surface-raised)] p-3">
                <Label className="text-sm font-medium text-[var(--text-secondary)]">Marka</Label>
                <Input
                  value={formData.make}
                  onChange={(e) => setFormData({...formData, make: e.target.value})}
                  className="h-11 rounded-xl border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                  required
                />
              </div>
              <div className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--surface-raised)] p-3">
                <Label className="text-sm font-medium text-[var(--text-secondary)]">Model</Label>
                <Input
                  value={formData.model}
                  onChange={(e) => setFormData({...formData, model: e.target.value})}
                  className="h-11 rounded-xl border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--surface-raised)] p-3">
                <Label className="text-sm font-medium text-[var(--text-secondary)]">Nr rejestracyjny</Label>
                <Input
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({...formData, registrationNumber: e.target.value})}
                  className="h-11 rounded-xl border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                  required
                />
              </div>
              <div className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--surface-raised)] p-3">
                <Label className="text-sm font-medium text-[var(--text-secondary)]">Rok produkcji</Label>
                <Input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
                  className="h-11 rounded-xl border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--surface-raised)] p-3">
                <Label className="text-sm font-medium text-[var(--text-secondary)]">Typ pojazdu</Label>
                <Select 
                  value={formData.vehicleType} 
                  onValueChange={(v) => setFormData({...formData, vehicleType: v})}
                >
                  <SelectTrigger className="h-11 rounded-xl border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-[var(--focus)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleTypes.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--surface-raised)] p-3">
                <Label className="text-sm font-medium text-[var(--text-secondary)]">Rodzaj paliwa</Label>
                <Select 
                  value={formData.fuelType} 
                  onValueChange={(v) => setFormData({...formData, fuelType: v})}
                >
                  <SelectTrigger className="h-11 rounded-xl border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-[var(--focus)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fuelTypes.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--surface-raised)] p-3">
                <Label className="text-sm font-medium text-[var(--text-secondary)]">Rodzaj nadwozia</Label>
                <Input
                  value={formData.bodyType}
                  onChange={(e) => setFormData({ ...formData, bodyType: e.target.value })}
                  className="h-11 rounded-xl border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                  placeholder="np. sedan, kombi, furgon"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--surface-raised)] p-3">
                <Label className="text-sm font-medium text-[var(--text-secondary)]">Przebieg (km)</Label>
                <Input
                  type="number"
                  value={formData.mileage}
                  onChange={(e) => setFormData({...formData, mileage: parseInt(e.target.value)})}
                  className="h-11 rounded-xl border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                />
              </div>
              <div className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--surface-raised)] p-3">
                <Label className="text-sm font-medium text-[var(--text-secondary)]">Zbiornik (L)</Label>
                <Input
                  type="number"
                  value={formData.tankSize}
                  onChange={(e) => setFormData({...formData, tankSize: parseInt(e.target.value)})}
                  className="h-11 rounded-xl border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                />
              </div>
              <div className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--surface-raised)] p-3">
                <Label className="text-sm font-medium text-[var(--text-secondary)]">Poziom paliwa (L)</Label>
                <Input
                  type="number"
                  value={formData.fuelLevel}
                  onChange={(e) => setFormData({...formData, fuelLevel: parseInt(e.target.value)})}
                  className="h-11 rounded-xl border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                />
              </div>
            </div>

            <div className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--surface-raised)] p-3">
              <Label className="text-sm font-medium text-[var(--text-secondary)]">Średnie spalanie (l/100km)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="30"
                value={formData.fuelConsumption}
                onChange={(e) => setFormData({...formData, fuelConsumption: parseFloat(e.target.value)})}
                className="h-11 rounded-xl border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                placeholder="np. 7.5"
              />
              <p className="text-xs text-[var(--text-muted)]">Norma zużycia paliwa - używana do obliczeń</p>
            </div>

            <div className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--surface-raised)] p-3">
              <Label className="text-sm font-medium text-[var(--text-secondary)]">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData({...formData, status: v})}
              >
                <SelectTrigger className="h-11 rounded-xl border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-[var(--focus)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Dostępny</SelectItem>
                  <SelectItem value="in_use">W użyciu</SelectItem>
                  <SelectItem value="maintenance">Serwis</SelectItem>
                  <SelectItem value="unavailable">Niedostępny</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[var(--border-color)] pt-4 sm:flex-row sm:justify-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                className="h-11 border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              >
                Anuluj
              </Button>
              <Button 
                type="submit"
                className="h-11 bg-[var(--primary-color)] text-[var(--text-inverse)] hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingVehicle ? 'Zapisz zmiany' : 'Dodaj pojazd'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}