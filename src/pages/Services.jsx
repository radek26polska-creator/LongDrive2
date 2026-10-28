import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Wrench,
  Plus,
  Search,
  Car,
  DollarSign,
  Gauge,
  MoreVertical,
  Edit,
  Trash2,
  FileText,
  Settings2,
  Filter
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import GlassCard from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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

const serviceTypeConfig = {
  inspection: { label: 'Przegląd', color: 'status-info' },
  oil_change: { label: 'Wymiana oleju', color: 'status-warning' },
  tires: { label: 'Opony', color: 'status-info' },
  brakes: { label: 'Hamulce', color: 'status-danger' },
  repair: { label: 'Naprawa', color: 'status-success' },
  other: { label: 'Inne', color: 'status-info' }
};

export default function Services() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    vehicleId: '',
    serviceType: 'inspection',
    date: new Date().toISOString().slice(0, 10),
    mileageAtService: 0,
    cost: 0,
    description: '',
    nextServiceDate: '',
    nextServiceMileage: 0,
    workshopName: '',
    invoiceNumber: ''
  });

  const queryClient = useQueryClient();

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: api.getServices,
    refetchOnMount: true
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: api.getVehicles,
    refetchOnMount: true
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Konwersja vehicleId na liczbę
      const payload = {
        ...data,
        vehicleId: data.vehicleId ? Number(data.vehicleId) : null,
        mileageAtService: Number(data.mileageAtService),
        cost: Number(data.cost),
        nextServiceMileage: Number(data.nextServiceMileage)
      };
      return api.createService(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const payload = {
        ...data,
        vehicleId: data.vehicleId ? Number(data.vehicleId) : null,
        mileageAtService: Number(data.mileageAtService),
        cost: Number(data.cost),
        nextServiceMileage: Number(data.nextServiceMileage)
      };
      return api.updateService(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    }
  });

  const resetForm = () => {
    setFormData({
      vehicleId: '',
      serviceType: 'inspection',
      date: new Date().toISOString().slice(0, 10),
      mileageAtService: 0,
      cost: 0,
      description: '',
      nextServiceDate: '',
      nextServiceMileage: 0,
      workshopName: '',
      invoiceNumber: ''
    });
    setEditingService(null);
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setFormData({
      vehicleId: service.vehicleId ? String(service.vehicleId) : '',
      serviceType: service.serviceType || 'inspection',
      date: service.date || new Date().toISOString().slice(0, 10),
      mileageAtService: service.mileageAtService || 0,
      cost: service.cost || 0,
      description: service.description || '',
      nextServiceDate: service.nextServiceDate || '',
      nextServiceMileage: service.nextServiceMileage || 0,
      workshopName: service.workshopName || '',
      invoiceNumber: service.invoiceNumber || ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingService) {
      updateMutation.mutate({ id: editingService.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getVehicleName = (id) => {
    const v = vehicles.find(v => v.id === id);
    return v ? `${v.make} ${v.model} (${v.registrationNumber})` : 'Nieznany';
  };

  const filteredServices = services.filter(service => {
    const vehicle = vehicles.find(v => v.id === service.vehicleId);
    const matchesSearch = 
      vehicle?.registrationNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle?.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.workshopName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || service.serviceType === typeFilter;
    const matchesVehicle = vehicleFilter === 'all' || String(service.vehicleId) === vehicleFilter;
    
    return matchesSearch && matchesType && matchesVehicle;
  });

  const totalCost = services.reduce((sum, s) => sum + (s.cost || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Serwisy"
        subtitle={`${services.length} serwisów • Łącznie: ${totalCost.toLocaleString()} PLN`}
        icon={Wrench}
        action={
          <Button 
            onClick={() => { resetForm(); setIsDialogOpen(true); }}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Dodaj serwis
          </Button>
        }
      />

      {/* Filtry */}
      <GlassCard className="p-4" delay={0.1}>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <Input
              placeholder="Szukaj serwisu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[var(--surface)] border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-[var(--surface)] border-[var(--border-color)] text-[var(--text-primary)]">
              <Filter className="w-4 h-4 mr-2 text-[var(--text-muted)]" />
              <SelectValue placeholder="Typ serwisu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie typy</SelectItem>
              <SelectItem value="inspection">Przegląd</SelectItem>
              <SelectItem value="oil_change">Wymiana oleju</SelectItem>
              <SelectItem value="tires">Opony</SelectItem>
              <SelectItem value="brakes">Hamulce</SelectItem>
              <SelectItem value="repair">Naprawa</SelectItem>
              <SelectItem value="other">Inne</SelectItem>
            </SelectContent>
          </Select>
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-[var(--surface)] border-[var(--border-color)] text-[var(--text-primary)]">
              <Car className="w-4 h-4 mr-2 text-[var(--text-muted)]" />
              <SelectValue placeholder="Pojazd" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie pojazdy</SelectItem>
              {vehicles.map(v => (
                <SelectItem key={v.id} value={String(v.id)}>
                  {v.make} {v.model} ({v.registrationNumber})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      {/* Services List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 surface rounded-[var(--radius-md)] animate-pulse" />
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Wrench className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Brak serwisów</h3>
          <p className="text-[var(--text-muted)] mb-4">
            {searchTerm || typeFilter !== 'all' || vehicleFilter !== 'all'
              ? "Nie znaleziono serwisów spełniających kryteria"
              : "Dodaj pierwszy serwis"}
          </p>
          {!searchTerm && typeFilter === 'all' && vehicleFilter === 'all' && (
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Dodaj serwis
            </Button>
          )}
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredServices.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                <GlassCard className="p-6" hover={true} animate={false}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-color)] flex items-center justify-center">
                        <Settings2 className="w-6 h-6 text-[var(--text-secondary)]" />
                      </div>
                      <div>
                        <Badge className={`${serviceTypeConfig[service.serviceType]?.color || 'status-info'} text-[var(--text-primary)]`}>
                          {serviceTypeConfig[service.serviceType]?.label || service.serviceType}
                        </Badge>
                        <p className="text-sm text-[var(--text-muted)] mt-1">
                          {service.date && format(new Date(service.date), 'dd MMM yyyy', { locale: pl })}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-[var(--text-muted)] hover:text-white">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border-color)]">
                        <DropdownMenuItem 
                          onClick={() => handleEdit(service)}
                          className="text-[var(--text-primary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edytuj
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteMutation.mutate(service.id)}
                          className="text-[var(--danger)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Usuń
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-white">
                      <Car className="w-4 h-4 text-[var(--primary-light)]" />
                      <span className="font-medium">{getVehicleName(service.vehicleId)}</span>
                    </div>

                    {service.description && (
                      <p className="text-[var(--text-muted)] text-sm">{service.description}</p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-[var(--text-muted)] pt-2 border-t border-[var(--border-color)]">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">{service.cost?.toLocaleString()} PLN</span>
                      </div>
                      {service.mileageAtService > 0 && (
                        <div className="flex items-center gap-1">
                          <Gauge className="w-4 h-4" />
                          {service.mileageAtService?.toLocaleString()} km
                        </div>
                      )}
                      {service.workshopName && (
                        <div className="flex items-center gap-1">
                          <Wrench className="w-4 h-4" />
                          {service.workshopName}
                        </div>
                      )}
                      {service.invoiceNumber && (
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {service.invoiceNumber}
                        </div>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[var(--surface)] border-[var(--border-color)] text-[var(--text-primary)] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingService ? 'Edytuj serwis' : 'Nowy serwis'}
            </DialogTitle>
            <DialogDescription className="text-[var(--text-muted)]">
              {editingService ? 'Zmień dane istniejącego serwisu' : 'Dodaj nowy wpis serwisowy'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle">Pojazd *</Label>
                <Select 
                  value={formData.vehicleId} 
                  onValueChange={(v) => setFormData({...formData, vehicleId: v})}
                  required
                  name="vehicle"
                >
                  <SelectTrigger id="vehicle" className="bg-[var(--popover-surface)] border-[var(--border-color)]">
                    <SelectValue placeholder="Wybierz pojazd" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map(v => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.make} {v.model} ({v.registrationNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="serviceType">Typ serwisu *</Label>
                <Select 
                  value={formData.serviceType} 
                  onValueChange={(v) => setFormData({...formData, serviceType: v})}
                  required
                  name="serviceType"
                >
                  <SelectTrigger id="serviceType" className="bg-[var(--popover-surface)] border-[var(--border-color)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inspection">Przegląd</SelectItem>
                    <SelectItem value="oil_change">Wymiana oleju</SelectItem>
                    <SelectItem value="tires">Opony</SelectItem>
                    <SelectItem value="brakes">Hamulce</SelectItem>
                    <SelectItem value="repair">Naprawa</SelectItem>
                    <SelectItem value="other">Inne</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Data serwisu *</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="bg-[var(--popover-surface)] border-[var(--border-color)]"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mileage">Przebieg (km)</Label>
                <Input
                  id="mileage"
                  name="mileage"
                  type="number"
                  value={formData.mileageAtService}
                  onChange={(e) => setFormData({...formData, mileageAtService: parseInt(e.target.value) || 0})}
                  className="bg-[var(--popover-surface)] border-[var(--border-color)]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Koszt (PLN)</Label>
                <Input
                  id="cost"
                  name="cost"
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({...formData, cost: parseFloat(e.target.value) || 0})}
                  className="bg-[var(--popover-surface)] border-[var(--border-color)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="workshop">Warsztat</Label>
                <Input
                  id="workshop"
                  name="workshop"
                  value={formData.workshopName}
                  onChange={(e) => setFormData({...formData, workshopName: e.target.value})}
                  className="bg-[var(--popover-surface)] border-[var(--border-color)]"
                  placeholder="Nazwa warsztatu"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice">Nr faktury</Label>
                <Input
                  id="invoice"
                  name="invoice"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
                  className="bg-[var(--popover-surface)] border-[var(--border-color)]"
                  placeholder="FV 2025/01"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Opis wykonanych prac</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="bg-[var(--popover-surface)] border-[var(--border-color)]"
                rows={3}
                placeholder="Opisz wykonane prace..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nextDate">Następny serwis (data)</Label>
                <Input
                  id="nextDate"
                  name="nextDate"
                  type="date"
                  value={formData.nextServiceDate}
                  onChange={(e) => setFormData({...formData, nextServiceDate: e.target.value})}
                  className="bg-[var(--popover-surface)] border-[var(--border-color)]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nextMileage">Następny serwis (km)</Label>
                <Input
                  id="nextMileage"
                  name="nextMileage"
                  type="number"
                  value={formData.nextServiceMileage}
                  onChange={(e) => setFormData({...formData, nextServiceMileage: parseInt(e.target.value) || 0})}
                  className="bg-[var(--popover-surface)] border-[var(--border-color)]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                className="border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              >
                Anuluj
              </Button>
              <Button 
                type="submit"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingService ? 'Zapisz zmiany' : 'Dodaj serwis'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}