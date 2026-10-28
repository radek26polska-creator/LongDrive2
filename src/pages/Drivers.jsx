import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MoreVertical,
  Edit,
  Trash2,
  CreditCard,
  Filter,
  ArrowUpDown,
  X
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import GlassCard from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { toast } from "sonner";
import api from "@/api/apiClient";

const statusConfig = {
  active: { label: 'Aktywny', color: 'status-success' },
  inactive: { label: 'Nieaktywny', color: 'status-info' },
  on_leave: { label: 'Urlop', color: 'status-warning' }
};

export default function Drivers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    licenseNumber: '',
    licenseExpiry: '',
    status: 'active'
  });

  const queryClient = useQueryClient();

  // Pobranie kierowców – surowe dane z backendu (firstName, lastName)
  const { data: rawDrivers = [], isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: api.getDrivers,
    refetchOnMount: true
  });

  // Transformacja – dodajemy pole name do każdego kierowcy
  const drivers = rawDrivers.map(driver => ({
    ...driver,
    name: `${driver.firstName} ${driver.lastName}`
  }));

  // Funkcja sprawdzająca duplikat emaila
  const isEmailDuplicate = (email, currentDriverId = null) => {
    if (!email) return false;
    return drivers.some(driver => 
      driver.email?.toLowerCase() === email.toLowerCase() &&
      driver.id !== currentDriverId
    );
  };

  // 🔧 POPRAWIONA: Sprawdza duplikat numeru prawa jazdy (pomija puste wartości)
  const isLicenseNumberDuplicate = (licenseNumber, currentDriverId = null) => {
    // Jeśli numer jest pusty, nie sprawdzamy duplikatu
    if (!licenseNumber || licenseNumber.trim() === '') return false;
    
    return drivers.some(driver => 
      driver.licenseNumber && 
      driver.licenseNumber.toLowerCase() === licenseNumber.toLowerCase() &&
      driver.id !== currentDriverId
    );
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // 🔧 POPRAWA: Jeśli licenseNumber jest pusty, wyślij null zamiast pustego stringa
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        email: data.email || null,
        licenseNumber: data.licenseNumber && data.licenseNumber.trim() !== '' ? data.licenseNumber : null,
        licenseExpiry: data.licenseExpiry || null,
        status: data.status
      };
      return api.createDriver(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success('Kierowca został dodany pomyślnie');
    },
    onError: (error) => {
      console.error('Błąd dodawania kierowcy:', error);
      
      const errorMessage = error.message || '';
      
      if (errorMessage.includes('numerem prawa jazdy już istnieje')) {
        toast.error('Podaj unikalny numer prawa jazdy lub pozostaw pole puste');
      } else if (errorMessage.includes('409') || errorMessage.includes('Conflict')) {
        toast.error('Konflikt danych: kierowca o podanych danych już istnieje');
      } else if (errorMessage.includes('email już istnieje')) {
        toast.error('Kierowca z tym adresem email już istnieje w systemie');
      } else if (errorMessage.includes('400')) {
        toast.error('Nieprawidłowe dane kierowcy. Sprawdź poprawność wszystkich pól.');
      } else {
        toast.error(`Nie udało się dodać kierowcy: ${errorMessage || 'Błąd serwera'}`);
      }
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      // 🔧 POPRAWA: Jeśli licenseNumber jest pusty, wyślij null zamiast pustego stringa
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        email: data.email || null,
        licenseNumber: data.licenseNumber && data.licenseNumber.trim() !== '' ? data.licenseNumber : null,
        licenseExpiry: data.licenseExpiry || null,
        status: data.status
      };
      return api.updateDriver(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success('Dane kierowcy zostały zaktualizowane');
    },
    onError: (error) => {
      console.error('Błąd aktualizacji kierowcy:', error);
      
      const errorMessage = error.message || '';
      
      if (errorMessage.includes('numerem prawa jazdy już istnieje')) {
        toast.error('Podaj unikalny numer prawa jazdy lub pozostaw pole puste');
      } else if (errorMessage.includes('409') || errorMessage.includes('Conflict')) {
        toast.error('Konflikt danych: kierowca o podanych danych już istnieje');
      } else {
        toast.error(`Nie udało się zaktualizować danych: ${errorMessage || 'Błąd serwera'}`);
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteDriver,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Kierowca został usunięty');
    },
    onError: (error) => {
      console.error('Błąd usuwania kierowcy:', error);
      toast.error('Nie udało się usunąć kierowcy. Sprawdź czy nie ma przypisanych tras.');
    }
  });

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      licenseNumber: '',
      licenseExpiry: '',
      status: 'active'
    });
    setEditingDriver(null);
  };

  const handleEdit = (driver) => {
    setEditingDriver(driver);
    setFormData({
      firstName: driver.firstName || '',
      lastName: driver.lastName || '',
      phone: driver.phone || '',
      email: driver.email || '',
      licenseNumber: driver.licenseNumber || '',
      licenseExpiry: driver.licenseExpiry || '',
      status: driver.status || 'active'
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Walidacja przed wysłaniem
    if (!formData.firstName.trim()) {
      toast.error('Imię jest wymagane');
      return;
    }
    
    if (!formData.lastName.trim()) {
      toast.error('Nazwisko jest wymagane');
      return;
    }
    
    // Sprawdź duplikat emaila przed wysłaniem (tylko jeśli email został podany)
    if (formData.email && isEmailDuplicate(formData.email, editingDriver?.id)) {
      toast.error('Kierowca z tym adresem email już istnieje w systemie');
      return;
    }
    
    // 🔧 POPRAWA: Sprawdź duplikat numeru prawa jazdy tylko jeśli został podany
    if (formData.licenseNumber && formData.licenseNumber.trim() !== '' && 
        isLicenseNumberDuplicate(formData.licenseNumber, editingDriver?.id)) {
      toast.error('Kierowca z tym numerem prawa jazdy już istnieje w systemie');
      return;
    }
    
    if (editingDriver) {
      updateMutation.mutate({ id: editingDriver.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredDrivers = drivers
    .filter(driver => {
      const normalizedSearch = searchTerm.trim().toLowerCase();
      const fullName = `${driver.firstName || ''} ${driver.lastName || ''}`.toLowerCase();
      const matchesSearch = !normalizedSearch ||
        fullName.includes(normalizedSearch) ||
        driver.email?.toLowerCase().includes(normalizedSearch) ||
        driver.phone?.includes(normalizedSearch);
      const matchesStatus = statusFilter === 'all' || driver.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'status') return (statusConfig[a.status]?.label || '').localeCompare(statusConfig[b.status]?.label || '', 'pl');
      return `${a.firstName || ''} ${a.lastName || ''}`.localeCompare(`${b.firstName || ''} ${b.lastName || ''}`, 'pl');
    });

  const hasActiveFilters = Boolean(searchTerm.trim()) || statusFilter !== 'all' || sortBy !== 'name';

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSortBy("name");
  };

  const summaryStats = [
    { label: 'Łącznie', value: drivers.length, icon: Users, tone: 'primary' },
    { label: 'Aktywni', value: drivers.filter((d) => d.status === 'active').length, icon: CreditCard, tone: 'success' },
    { label: 'Urlop', value: drivers.filter((d) => d.status === 'on_leave').length, icon: Phone, tone: 'warning' },
    { label: 'Nieaktywni', value: drivers.filter((d) => d.status === 'inactive').length, icon: Mail, tone: 'info' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kierowcy"
        subtitle={`${drivers.length} kierowców w systemie`}
        icon={Users}
        action={
          <Button 
            onClick={() => { resetForm(); setIsDialogOpen(true); }}
            aria-label="Dodaj nowego kierowcę"
            className="bg-[var(--primary-color)] text-[var(--text-inverse)] hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Dodaj kierowcę
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
                tone === 'info' ? 'border-sky-500/30 bg-sky-500/10 text-sky-400' :
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
              aria-label="Szukaj kierowcy"
              placeholder="Szukaj kierowcy, telefonu lub emaila..."
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
              <SelectTrigger aria-label="Filtr statusu kierowcy" className="h-11 w-full bg-[var(--surface)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-[var(--focus)] lg:w-48">
                <Filter className="w-4 h-4 mr-2 text-[var(--text-muted)]" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszyscy kierowcy</SelectItem>
                <SelectItem value="active">Aktywni</SelectItem>
                <SelectItem value="on_leave">Na urlopie</SelectItem>
                <SelectItem value="inactive">Nieaktywni</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger aria-label="Sortuj kierowców" className="h-11 w-full bg-[var(--surface)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-[var(--focus)] lg:w-48">
                <ArrowUpDown className="w-4 h-4 mr-2 text-[var(--text-muted)]" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nazwa A–Z</SelectItem>
                <SelectItem value="status">Według statusu</SelectItem>
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
            <div key={i} className="h-48 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--surface)] animate-pulse" />
          ))}
        </div>
      ) : filteredDrivers.length === 0 ? (
        <GlassCard className="p-12 text-center" hover={false} animate={false}>
          <Users className="mx-auto mb-4 h-16 w-16 text-[var(--text-muted)]" />
          <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">Brak kierowców</h3>
          <p className="mb-4 text-[var(--text-muted)]">
            {searchTerm || statusFilter !== 'all'
              ? "Nie znaleziono kierowców spełniających kryteria"
              : "Dodaj pierwszego kierowcę do systemu"}
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="bg-[var(--primary-color)] text-[var(--text-inverse)] hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Dodaj kierowcę
            </Button>
          )}
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredDrivers.map((driver, index) => (
              <motion.div
                key={driver.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ delay: index * 0.04 }}
                layout
              >
                <GlassCard className="p-5" hover={true} animate={false}>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <Avatar className="h-14 w-14 border-2 border-[var(--primary-color)]/40">
                      <AvatarFallback className="border border-[var(--border-color)] bg-[var(--primary-soft)] text-lg font-semibold text-[var(--text-primary)]">
                        {driver.firstName?.charAt(0)}{driver.lastName?.charAt(0) || 'K'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-2">
                      <Badge className={`${statusConfig[driver.status]?.color || 'status-info'} text-[var(--text-primary)]`}>
                        {statusConfig[driver.status]?.label || driver.status}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Akcje dla ${driver.firstName} ${driver.lastName}`} className="text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border-color)]">
                          <DropdownMenuItem 
                            onClick={() => handleEdit(driver)}
                            className="text-[var(--text-primary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edytuj
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              if (confirm('Czy na pewno chcesz usunąć tego kierowcę?')) {
                                deleteMutation.mutate(driver.id);
                              }
                            }}
                            className="text-[var(--danger)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Usuń
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <h3 className="mb-3 text-xl font-bold text-[var(--text-primary)]">
                    {driver.firstName} {driver.lastName}
                  </h3>

                  <div className="space-y-2">
                    {driver.phone && (
                      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                        <Phone className="w-4 h-4" />
                        {driver.phone}
                      </div>
                    )}
                    {driver.email && (
                      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                        <Mail className="w-4 h-4" />
                        {driver.email}
                      </div>
                    )}
                    {driver.licenseNumber && (
                      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                        <CreditCard className="w-4 h-4" />
                        {driver.licenseNumber}
                      </div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-1rem)] max-w-2xl overflow-y-auto border-[var(--border-color)] bg-[var(--surface)] p-0 text-[var(--text-primary)] shadow-[var(--shadow-card)] sm:rounded-[var(--radius-xl)]">
          <div className="border-b border-[var(--border-color)] bg-[var(--surface-raised)] px-5 py-4 sm:px-6">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                {editingDriver ? 'Edytuj kierowcę' : 'Dodaj nowego kierowcę'}
              </DialogTitle>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--surface-raised)] p-3">
                <Label className="text-sm font-medium text-[var(--text-secondary)]">Imię *</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  className="h-11 rounded-xl border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                  required
                />
              </div>
              <div className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--surface-raised)] p-3">
                <Label className="text-sm font-medium text-[var(--text-secondary)]">Nazwisko *</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  className="h-11 rounded-xl border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--surface-raised)] p-3">
                <Label className="text-sm font-medium text-[var(--text-secondary)]">Telefon</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="h-11 rounded-xl border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                />
              </div>
              <div className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--surface-raised)] p-3">
                <Label className="text-sm font-medium text-[var(--text-secondary)]">Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="h-11 rounded-xl border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--surface-raised)] p-3">
                <Label className="text-sm font-medium text-[var(--text-secondary)]">Nr prawa jazdy</Label>
                <Input
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})}
                  className="h-11 rounded-xl border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                  placeholder="Opcjonalne - pozostaw puste jeśli brak"
                />
                <p className="text-xs text-[var(--text-muted)]">Pole opcjonalne - zostaw puste jeśli nie chcesz podawać</p>
              </div>
              <div className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--surface-raised)] p-3">
                <Label className="text-sm font-medium text-[var(--text-secondary)]">Ważność prawa jazdy</Label>
                <Input
                  type="date"
                  value={formData.licenseExpiry}
                  onChange={(e) => setFormData({...formData, licenseExpiry: e.target.value})}
                  className="h-11 rounded-xl border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                />
              </div>
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
                  <SelectItem value="active">Aktywny</SelectItem>
                  <SelectItem value="inactive">Nieaktywny</SelectItem>
                  <SelectItem value="on_leave">Urlop</SelectItem>
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
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {editingDriver ? 'Zapisywanie...' : 'Dodawanie...'}
                  </div>
                ) : (
                  editingDriver ? 'Zapisz zmiany' : 'Dodaj kierowcę'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}