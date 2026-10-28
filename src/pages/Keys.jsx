import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Key,
  Plus,
  Search,
  Car,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  MoreVertical,
  Edit,
  Trash2,
  AlertCircle,
  RotateCcw
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { useAppSettings } from '@/lib/ThemeContext';
import { toast } from "sonner";
import api from "@/api/apiClient";

export default function Keys() {
  const { settings } = useAppSettings();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [formData, setFormData] = useState({
    vehicleId: '',
    driverId: '',
    action: 'issued',
    timestamp: new Date().toISOString().slice(0, 16),
    notes: '',
    issuedBy: ''
  });

  const queryClient = useQueryClient();

  const { data: keyLogs = [], isLoading } = useQuery({
    queryKey: ['keyLogs'],
    queryFn: api.getKeyLogs,
    refetchOnMount: true
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: api.getVehicles,
    refetchOnMount: true
  });

  const { data: driversRaw = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: api.getDrivers,
    refetchOnMount: true
  });

  const drivers = driversRaw.map(driver => ({
    ...driver,
    name: `${driver.firstName} ${driver.lastName}`
  }));

  // Mutacja do tworzenia nowego wpisu (wydania kluczyka)
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        vehicleId: Number(data.vehicleId),
        driverId: Number(data.driverId), // Teraz wymagane
        action: 'issued',
        timestamp: new Date(data.timestamp).toISOString(),
        notes: data.notes || '',
        issuedBy: data.issuedBy || ''
      };
      console.log('📤 Tworzenie wpisu kluczyka:', payload);
      return api.createKeyLog(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyLogs'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success('Kluczyk został wydany');
    },
    onError: (error) => {
      console.error('❌ Błąd tworzenia:', error);
      toast.error(`Nie udało się dodać wpisu: ${error.message}`);
    }
  });

  // Mutacja do zwrotu kluczyka - tworzy nowy wpis z akcją 'returned'
  const returnMutation = useMutation({
    mutationFn: async (log) => {
      const payload = {
        vehicleId: Number(log.vehicleId),
        driverId: Number(log.driverId),
        action: 'returned',
        timestamp: new Date().toISOString(),
        notes: log.notes || '',
        issuedBy: log.issuedBy || ''
      };
      console.log('📤 Zwrot kluczyka (nowy wpis):', payload);
      return api.createKeyLog(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyLogs'] });
      toast.success('Kluczyk został zwrócony');
    },
    onError: (error) => {
      console.error('❌ Błąd zwrotu:', error);
      toast.error(`Nie udało się zwrócić kluczyka: ${error.message}`);
    }
  });

  // Mutacja do edycji wpisu
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const payload = {
        vehicleId: Number(data.vehicleId),
        driverId: Number(data.driverId),
        action: data.action,
        timestamp: new Date(data.timestamp).toISOString(),
        notes: data.notes || '',
        issuedBy: data.issuedBy || ''
      };
      console.log('📤 Aktualizacja wpisu:', { id, payload });
      return api.updateKeyLog(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyLogs'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success('Wpis został zaktualizowany');
    },
    onError: (error) => {
      console.error('❌ Błąd aktualizacji:', error);
      toast.error(`Nie udało się zaktualizować wpisu: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteKeyLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyLogs'] });
      toast.success('Wpis został usunięty');
    },
    onError: (error) => {
      toast.error(`Nie udało się usunąć wpisu: ${error.message}`);
    }
  });

  const resetForm = () => {
    setFormData({
      vehicleId: '',
      driverId: '',
      action: 'issued',
      timestamp: new Date().toISOString().slice(0, 16),
      notes: '',
      issuedBy: ''
    });
    setEditingLog(null);
  };

  const handleEdit = (log) => {
    setEditingLog(log);
    setFormData({
      vehicleId: log.vehicleId ? String(log.vehicleId) : '',
      driverId: log.driverId ? String(log.driverId) : '',
      action: log.action || 'issued',
      timestamp: log.timestamp?.slice(0, 16) || new Date().toISOString().slice(0, 16),
      notes: log.notes || '',
      issuedBy: log.issuedBy || ''
    });
    setIsDialogOpen(true);
  };

  // Funkcja do szybkiego zwrotu kluczyka
  const handleQuickReturn = (log) => {
    returnMutation.mutate(log);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.vehicleId || !formData.driverId) {
      toast.error('Pojazd i kierowca są wymagane');
      return;
    }
    
    if (editingLog) {
      updateMutation.mutate({ id: editingLog.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getVehicleName = (id) => {
    const v = vehicles.find(v => v.id === id);
    return v ? `${v.make} ${v.model} (${v.registrationNumber})` : 'Nieznany';
  };

  const getDriverName = (id) => {
    if (!id) return null;
    const d = drivers.find(d => d.id === id);
    return d ? d.name : 'Nieznany';
  };

  // Pobierz ostatnią akcję dla każdego pojazdu
  const getLastActionPerVehicle = () => {
    const vehicleMap = new Map();
    
    keyLogs.forEach(log => {
      if (!log.vehicleId) return;
      const existing = vehicleMap.get(log.vehicleId);
      if (!existing || new Date(log.timestamp) > new Date(existing.timestamp)) {
        vehicleMap.set(log.vehicleId, log);
      }
    });
    
    return Array.from(vehicleMap.values());
  };

  // Aktywne wydania to te, gdzie ostatnia akcja to 'issued'
  const activeIssues = getLastActionPerVehicle().filter(log => log.action === 'issued');
  const hasActiveIssues = activeIssues.length > 0;

  const filteredLogs = keyLogs.filter(log => {
    const vehicle = vehicles.find(v => v.id === log.vehicleId);
    const driver = drivers.find(d => d.id === log.driverId);
    const searchLower = searchTerm.toLowerCase();
    return vehicle?.registrationNumber?.toLowerCase().includes(searchLower) ||
           vehicle?.make?.toLowerCase().includes(searchLower) ||
           driver?.name?.toLowerCase().includes(searchLower) ||
           log.notes?.toLowerCase().includes(searchLower);
  });

  // Sortowanie od najnowszych
  const sortedLogs = [...filteredLogs].sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ewidencja kluczyków"
        subtitle={`${keyLogs.length} wpisów w rejestrze`}
        icon={Key}
        action={
          <Button 
            onClick={() => { resetForm(); setIsDialogOpen(true); }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Wydaj kluczyk
          </Button>
        }
      />

      {settings.requireKeyForTrip && hasActiveIssues && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="state-error p-5 sm:p-6"
        >
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--danger-soft)]">
              <AlertCircle className="h-5 w-5 text-[var(--danger)]" />
            </div>
            <div className="flex-1">
              <h3 className="section-title mb-2">
                ⚠️ UWAGA – wydane kluczyki blokują możliwość rozpoczęcia trasy!
              </h3>
              <p className="mb-4 text-sm text-[var(--text-secondary)]">
                Następujące kluczyki są aktualnie poza biurem. Aby odblokować możliwość rozpoczęcia trasy, 
                wszystkie muszą zostać zwrócone.
              </p>
              <div className="space-y-2">
                {activeIssues.map(issue => {
                  const vehicle = vehicles.find(v => v.id === issue.vehicleId);
                  const driver = drivers.find(d => d.id === issue.driverId);
                  return (
                    <div key={issue.id} className="surface-raised rounded-[var(--radius-sm)] p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">
                            {vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})` : 'Nieznany pojazd'}
                          </p>
                          <p className="text-sm text-[var(--text-secondary)]">
                            Wydano: {driver?.name || 'Nieznany kierowca'} • {format(new Date(issue.timestamp), 'HH:mm, dd MMM', { locale: pl })}
                          </p>
                          {issue.notes && (
                            <p className="mt-1 text-xs text-[var(--text-muted)]">Uwagi: {issue.notes}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-[var(--danger)]/40 text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                          onClick={() => handleQuickReturn(issue)}
                          disabled={returnMutation.isPending}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Zwróć
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 rounded-[var(--radius-sm)] border border-[var(--danger)]/25 bg-[var(--danger-soft)] p-3">
                <p className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                  <span className="text-[var(--danger)]">●</span>
                  Aby rozpocząć trasę, musisz najpierw zwrócić wszystkie kluczyki!
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <GlassCard className="p-4" delay={0.1}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            placeholder="Szukaj po pojeździe lub kierowcy..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </GlassCard>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-[var(--radius-md)] bg-[var(--surface-raised)]" />
          ))}
        </div>
      ) : sortedLogs.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Key className="mx-auto mb-4 h-12 w-12 text-[var(--text-muted)]" />
          <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">Brak wpisów</h3>
          <p className="mb-4 text-[var(--text-muted)]">
            {searchTerm 
              ? "Nie znaleziono wpisów spełniających kryteria"
              : "Dodaj pierwszy wpis do ewidencji"}
          </p>
          {!searchTerm && (
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Wydaj kluczyk
            </Button>
          )}
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden" hover={false}>
          <AnimatePresence mode="popLayout">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Pojazd i kierowca</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Uwagi</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
            {sortedLogs.map((log, index) => (
              <TableRow
                key={log.id}
                className="align-top"
              >
                  <TableCell>
                    <Badge className={log.action === 'issued' ? 'status-success' : 'status-warning'}>
                      {log.action === 'issued' ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownLeft className="mr-1 h-3 w-3" />}
                      {log.action === 'issued' ? 'Wydano' : 'Zwrócono'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-[13rem] items-start gap-2 text-sm">
                      <Car className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary-light)]" />
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{getVehicleName(log.vehicleId)}</p>
                        {log.driverId && <p className="mt-1 flex items-center gap-1 text-[var(--text-muted)]"><User className="h-3.5 w-3.5" />{getDriverName(log.driverId)}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-[var(--text-secondary)]">
                    {log.timestamp && format(new Date(log.timestamp), 'dd MMM yyyy, HH:mm', { locale: pl })}
                    {log.issuedBy && <p className="mt-1 text-xs text-[var(--text-muted)]">{log.action === 'issued' ? 'Wydał' : 'Przyjął'}: {log.issuedBy}</p>}
                  </TableCell>
                  <TableCell className="max-w-[16rem] text-sm text-[var(--text-muted)]">
                    {log.notes || '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {log.action === 'issued' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-[var(--success)]/40 text-[var(--success)] hover:bg-[var(--success-soft)]"
                          onClick={() => handleQuickReturn(log)}
                          disabled={returnMutation.isPending}
                        >
                          <RotateCcw className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">Zwróć</span>
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-[var(--text-muted)]">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => handleEdit(log)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edytuj
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteMutation.mutate(log.id)}
                            className="text-[var(--danger)]"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Usuń
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
              </TableRow>
            ))}
              </TableBody>
            </Table>
          </AnimatePresence>
        </GlassCard>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingLog ? 'Edytuj wpis' : 'Wydaj kluczyk'}
            </DialogTitle>
            <DialogDescription>
              {editingLog ? 'Zmień dane istniejącego wpisu' : 'Zarejestruj wydanie kluczyka do pojazdu'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle">Pojazd *</Label>
              <Select 
                value={formData.vehicleId || undefined} 
                onValueChange={(v) => setFormData({...formData, vehicleId: v})}
                required
              >
                <SelectTrigger id="vehicle">
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
              <Label htmlFor="driver">Kierowca *</Label>
              <Select 
                value={formData.driverId || undefined}
                onValueChange={(v) => setFormData({...formData, driverId: v})}
                required
              >
                <SelectTrigger id="driver">
                  <SelectValue placeholder="Wybierz kierowcę" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map(d => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">Akcja *</Label>
              <Select 
                value={formData.action} 
                onValueChange={(v) => setFormData({...formData, action: v})}
                required
              >
                <SelectTrigger id="action">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="issued">Wydanie</SelectItem>
                  <SelectItem value="returned">Zwrot</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timestamp">Data i czas *</Label>
              <Input
                id="timestamp"
                type="datetime-local"
                value={formData.timestamp}
                onChange={(e) => setFormData({...formData, timestamp: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="issuedBy">Wydający/Przyjmujący *</Label>
              <Input
                id="issuedBy"
                value={formData.issuedBy}
                onChange={(e) => setFormData({...formData, issuedBy: e.target.value})}
                placeholder="Imię i nazwisko"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Uwagi</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                placeholder="Dodatkowe informacje..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
              >
                Anuluj
              </Button>
              <Button 
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  'Zapisywanie...'
                ) : editingLog ? (
                  'Zapisz zmiany'
                ) : (
                  'Wydaj kluczyk'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}