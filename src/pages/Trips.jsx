import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Route,
  Search,
  MapPin,
  Calendar,
  Gauge,
  MoreVertical,
  Trash2,
  Play,
  CheckCircle,
  Clock,
  Car,
  User,
  Flag,
  StopCircle,
  Eye,
  Printer,
  X,
  AlertTriangle,
  Edit,
  Download,
  Filter,
  ArrowUpDown,
  CalendarDays,
  CheckSquare,
  Square
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import ConfirmModal from "@/components/ConfirmModal.jsx";
import KartaDrogowa from "@/components/print/KartaDrogowa.jsx";
import { useKeyBlocker } from '@/hooks/useKeyBlocker';
import api from "@/api/apiClient";
import { calculateProjectedEndFuel, calculateTripMetrics } from "@/lib/tripCalculations";
import { validateTripCompletion } from "@/lib/tripCalculations";
import { toast } from "sonner";

const getLocalDateValue = (date = new Date()) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const getLocalTimeValue = (date = new Date()) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const buildLocalDateTime = (dateValue, timeValue) => {
  if (!dateValue || !timeValue) {
    return new Date();
  }

  const [year, month, day] = dateValue.split('-').map(Number);
  const [hours, minutes] = timeValue.split(':').map(Number);

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
};

const statusConfig = {
  in_progress: { label: 'W trakcie', color: 'status-warning', icon: Play },
  completed: { label: 'Zakończona', color: 'status-success', icon: CheckCircle },
  cancelled: { label: 'Anulowana', color: 'status-danger', icon: Trash2 }
};

const sortOptions = [
  { value: 'date_desc', label: 'Najnowsze' },
  { value: 'date_asc', label: 'Najstarsze' },
  { value: 'distance_desc', label: 'Najdłuższy dystans' },
  { value: 'distance_asc', label: 'Najkrótszy dystans' },
  { value: 'card_desc', label: 'Nr karty (malejąco)' },
  { value: 'card_asc', label: 'Nr karty (rosnąco)' }
];

const dateRangeOptions = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'today', label: 'Dzisiaj' },
  { value: 'week', label: 'Ostatnie 7 dni' },
  { value: 'month', label: 'Ostatnie 30 dni' },
  { value: 'custom', label: 'Własny zakres' }
];

export default function Trips() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date_desc");
  const [dateRange, setDateRange] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [selectedTrips, setSelectedTrips] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false);
  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false);
  const [showFuelCalculationChoice, setShowFuelCalculationChoice] = useState(false);
  const [fuelCalculationMode, setFuelCalculationMode] = useState('norm');
  const [manualEndFuel, setManualEndFuel] = useState('');
  const [manualFuelUsed, setManualFuelUsed] = useState('');
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTrip, setPreviewTrip] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  const now = new Date();
  const todayDate = getLocalDateValue(now);
  const currentTime = getLocalTimeValue(now);

  const [startFormData, setStartFormData] = useState({
    vehicleId: '',
    driverId: '',
    orderedBy: '',
    purpose: '',
    startLocation: '',
    endLocation: '',
    departureDate: todayDate,
    departureTime: currentTime,
    notes: '',
  });
  const [gpsTripDraft, setGpsTripDraft] = useState(null);
  const [endFormData, setEndFormData] = useState({
    endOdometer: 0,
    fuelAdded: 0,
    fuelCost: 0,
    fuelReceiptNumber: '',
    fuelStation: '',
    notes: ''
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const draft = location.state?.gpsTripDraft;
    if (!draft) return;

    const startDate = new Date(draft.startDate);
    const validStartDate = Number.isNaN(startDate.getTime()) ? new Date() : startDate;
    const localDateTime = new Date(validStartDate.getTime() - validStartDate.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    const gpsNote = draft.trackId
      ? `Ślad GPS ID ${draft.trackId}; dystans GPS ${Number(draft.distance).toFixed(2)} km.`
      : `Dystans trasy ${Number(draft.distance).toFixed(2)} km.`;

    setGpsTripDraft(draft);
    setStartFormData((previous) => ({
      ...previous,
      startLocation: previous.startLocation || draft.startLocation || '',
      endLocation: previous.endLocation || draft.endLocation || '',
      departureDate: localDateTime.slice(0, 10),
      departureTime: localDateTime.slice(11, 16),
      notes: previous.notes || gpsNote,
    }));
    setIsStartDialogOpen(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.key, location.pathname, location.state, navigate]);

  const { data: tripsRaw = [], isLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: () => api.getTrips().catch(() => []),
    refetchOnMount: true,
    select: (data) => data.map(trip => ({ 
      ...trip, 
      id: String(trip.id), 
      vehicleId: String(trip.vehicleId), 
      driverId: String(trip.driverId) 
    }))
  });
  const trips = tripsRaw;

  const { data: vehiclesRaw = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.getVehicles().catch(() => []),
    refetchOnMount: true,
    select: (data) => data.map(v => ({ ...v, id: String(v.id) }))
  });
  const vehicles = vehiclesRaw;

  const { data: driversRaw = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => api.getDrivers().catch(() => []),
    refetchOnMount: true,
    select: (data) => data.map(driver => ({
      ...driver,
      id: String(driver.id),
      name: `${driver.firstName} ${driver.lastName}`.trim()
    }))
  });
  const drivers = driversRaw;

  const { data: companySettings = {} } = useQuery({
    queryKey: ['companySettings'],
    queryFn: () => api.getCompanySettings().catch(() => ({})),
    refetchOnMount: true,
  });

  const settings = companySettings && !Array.isArray(companySettings)
    ? companySettings
    : (Array.isArray(companySettings) && companySettings[0]) || {};

  // ✅ ODWRÓCONA LOGIKA - pobieramy pojazdy z WYDANYMI kluczykami (DOZWOLONE)
  const { 
    requireKeyForTrip, 
    issuedVehicleIds,        // ID pojazdów z WYDANYMI kluczykami (DOZWOLONE)
    issuedVehicles,          // Lista pojazdów z wydanymi kluczykami
    isVehicleKeyIssued       // Funkcja sprawdzająca czy kluczyk jest wydany
  } = useKeyBlocker() || {};

  // Sprawdź, czy wybrany pojazd ma wydany kluczyk (DOZWOLONY)
  const hasKeyForSelectedVehicle = startFormData.vehicleId 
    ? issuedVehicleIds?.includes(String(startFormData.vehicleId)) 
    : false;

  // Czy wybrany pojazd jest ZABLOKOWANY (brak wydanego kluczyka)
  const isSelectedVehicleBlocked = requireKeyForTrip && startFormData.vehicleId && !hasKeyForSelectedVehicle;

  // Czy są jakiekolwiek pojazdy z wydanymi kluczykami
  const hasAnyIssuedKeys = issuedVehicles?.length > 0;

  const getVehicle = (id) => vehicles.find(v => v.id === id);
  const getDriver = (id) => drivers.find(d => d.id === id);

  const getTripVehicle = (trip) => {
    const vehicle = getVehicle(trip?.vehicleId);
    if (!vehicle || !trip) return vehicle;
    return {
      ...vehicle,
      fuelConsumption: trip.vehicleFuelConsumptionSnapshot ?? vehicle.fuelConsumption,
      tankSize: trip.vehicleTankSizeSnapshot ?? vehicle.tankSize,
    };
  };

  const selectedVehicle = selectedTrip ? getTripVehicle(selectedTrip) : null;
  const previewMetrics = calculateTripMetrics({
    startOdometer: selectedTrip?.startOdometer,
    endOdometer: selectedTrip ? endFormData.endOdometer : null,
    startFuel: selectedTrip?.startFuel,
    endFuel: null,
    fuelAdded: endFormData.fuelAdded,
    vehicle: selectedVehicle,
  });
  const distance = previewMetrics.distance;
  const fuelConsumptionNorm = previewMetrics.fuelConsumption;
  const fuelUsedNorm = previewMetrics.fuelUsedNorm;

  const projectedEndFuel = selectedTrip && distance !== null
    ? calculateProjectedEndFuel({
      startFuel: selectedTrip.startFuel,
      fuelAdded: endFormData.fuelAdded,
      distance,
      vehicle: selectedVehicle,
    })
    : null;
  const automaticallyCalculatedEndFuel = projectedEndFuel === null ? null : Math.max(0, projectedEndFuel);

  const predictedFuelUsed = fuelUsedNorm;

  const filteredAndSortedTrips = useMemo(() => {
    let filtered = [...trips];

    if (searchTerm) {
      filtered = filtered.filter(trip => {
        const vehicle = getVehicle(trip.vehicleId);
        const driver = getDriver(trip.driverId);
        return (
          trip.cardNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          trip.startLocation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          trip.endLocation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          trip.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          vehicle?.registrationNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          driver?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(trip => trip.status === statusFilter);
    }

    const nowFilter = new Date();
    if (dateRange === 'today') {
      const today = format(nowFilter, 'yyyy-MM-dd');
      filtered = filtered.filter(trip => {
        const d = trip.startDate || trip.startTime;
        if (!d) return false;
        return format(new Date(d), 'yyyy-MM-dd') === today;
      });
    } else if (dateRange === 'week') {
      const weekAgo = new Date(nowFilter.setDate(nowFilter.getDate() - 7));
      filtered = filtered.filter(trip => {
        const d = trip.startDate || trip.startTime;
        if (!d) return false;
        return new Date(d) >= weekAgo;
      });
    } else if (dateRange === 'month') {
      const monthAgo = new Date(nowFilter.setMonth(nowFilter.getMonth() - 1));
      filtered = filtered.filter(trip => {
        const d = trip.startDate || trip.startTime;
        if (!d) return false;
        return new Date(d) >= monthAgo;
      });
    } else if (dateRange === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59);
      filtered = filtered.filter(trip => {
        const d = trip.startDate || trip.startTime;
        if (!d) return false;
        const tripDate = new Date(d);
        return tripDate >= start && tripDate <= end;
      });
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.startDate || b.startTime) - new Date(a.startDate || a.startTime);
        case 'date_asc':
          return new Date(a.startDate || a.startTime) - new Date(b.startDate || b.startTime);
        case 'distance_desc':
          return (b.distance || 0) - (a.distance || 0);
        case 'distance_asc':
          return (a.distance || 0) - (b.distance || 0);
        case 'card_desc':
          return (b.cardNumber || '').localeCompare(a.cardNumber || '');
        case 'card_asc':
          return (a.cardNumber || '').localeCompare(b.cardNumber || '');
        default:
          return new Date(b.startDate || b.startTime) - new Date(a.startDate || a.startTime);
      }
    });
    return filtered;
  }, [trips, searchTerm, statusFilter, sortBy, dateRange, customStartDate, customEndDate]);

  const handleSelectTrip = (tripId) => {
    const newSelected = new Set(selectedTrips);
    if (newSelected.has(tripId)) {
      newSelected.delete(tripId);
    } else {
      newSelected.add(tripId);
    }
    setSelectedTrips(newSelected);
    setSelectAll(newSelected.size === filteredAndSortedTrips.length && filteredAndSortedTrips.length > 0);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedTrips(new Set());
      setSelectAll(false);
    } else {
      const allIds = filteredAndSortedTrips.map(t => t.id);
      setSelectedTrips(new Set(allIds));
      setSelectAll(true);
    }
  };

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selectedTrips).map(id => Number(id));
      for (const id of ids) {
        await api.deleteTrip(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['refuels'] });
      setSelectedTrips(new Set());
      setSelectAll(false);
      setShowBulkDeleteConfirm(false);
    },
    onError: (error) => {
      console.error('Błąd masowego usuwania podróży:', error);
      toast.error(`Nie udało się usunąć wszystkich zaznaczonych podróży. ${error.message}`);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['refuels'] });
    }
  });

  const startTripMutation = useMutation({
    mutationFn: async (data) => {
      const vehicle = getVehicle(data.vehicleId);

      const startTime = data.departureDate && data.departureTime
        ? buildLocalDateTime(data.departureDate, data.departureTime).toISOString()
        : new Date().toISOString();

      const tripData = {
        ...data,
        startTime,
        startOdometer: vehicle?.mileage || 0,
        startFuel: vehicle?.fuelLevel || 0,
        status: 'in_progress'
      };
      await api.updateVehicle(Number(data.vehicleId), { status: 'in_use' });
      return api.createTrip(tripData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['companySettings'] });
      setIsStartDialogOpen(false);
      resetStartForm();
      setGpsTripDraft(null);
    }
  });

  const endTripMutation = useMutation({
    mutationFn: async ({ trip, endData, endFuel }) => {
      const vehicle = getTripVehicle(trip);
      const distance = Number(endData.endOdometer) - Number(trip.startOdometer);
      const calculated = calculateTripMetrics({
        startOdometer: trip.startOdometer,
        endOdometer: endData.endOdometer,
        startFuel: trip.startFuel,
        endFuel,
        fuelAdded: endData.fuelAdded,
        vehicle,
      });
      const validation = validateTripCompletion({
        startOdometer: trip.startOdometer,
        endOdometer: endData.endOdometer,
        startFuel: trip.startFuel,
        endFuel,
        fuelAdded: endData.fuelAdded,
        vehicle,
      });
      if (!validation.valid) {
        throw new Error([
          ...validation.errors,
        ].join(' '));
      }
      const {
        fuelUsedNorm,
        fuelUsedActual,
      } = calculated;
      const updatedTrip = {
        ...trip,
        endDate: new Date().toISOString(),
        endTime: new Date().toISOString(),
        endOdometer: endData.endOdometer,
        endFuel: Number(endFuel),
        fuelAdded: endData.fuelAdded,
        fuelCost: endData.fuelCost,
        fuelReceiptNumber: endData.fuelReceiptNumber,
        fuelStation: endData.fuelStation,
        notes: endData.notes,
        status: 'completed',
        distance,
        fuelUsedNorm,
        fuelUsedActual,
      };

      const result = await api.updateTrip(Number(trip.id), updatedTrip);

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['refuels'] });
      setIsEndDialogOpen(false);
      setShowFuelCalculationChoice(false);
      setSelectedTrip(null);
      resetEndForm();
    },
    onError: (error) => {
      console.error('❌ Błąd mutacji:', error);
      toast.error(`Nie można zakończyć trasy. ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (tripId) => {
      return api.deleteTrip(Number(tripId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['refuels'] });
      setItemToDelete(null);
    },
    onError: (error) => {
      console.error('Błąd usuwania podróży:', error);
      toast.error(`Nie udało się usunąć podróży. ${error.message}`);
    }
  });

  const confirmDelete = () => {
    if (itemToDelete) deleteMutation.mutate(itemToDelete);
  };

  const handlePreview = (trip) => {
    setPreviewTrip(trip);
    setShowPreviewModal(true);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert('Blokada wyskakujących okien uniemożliwia drukowanie.'); return; }
    const element = document.getElementById('karta-drogowa-preview');
    if (!element) return;
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Karta drogowa</title>
      <style>
        @page { size: A4 portrait; margin: 0; }
        html,body { margin: 0; padding: 0; background: white; }
        body { font-family: Arial, sans-serif; }
        [data-print-document="karta-drogowa"] {
          width: 210mm !important;
          min-height: 297mm !important;
          box-sizing: border-box !important;
          margin: 0 auto !important;
          background: white !important;
        }
        [data-print-document="karta-drogowa"] table {
          border-collapse: collapse;
          width: 100%;
        }
        [data-print-document="karta-drogowa"] td,
        [data-print-document="karta-drogowa"] th {
          box-sizing: border-box;
        }
      </style>
      </head><body>${element.outerHTML}
      <script>
        window.onload = function () {
          window.print();
          window.onafterprint = function () { window.close(); };
        };
      </script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const resetStartForm = () => {
    const n = new Date();
    setStartFormData({
      vehicleId: '',
      driverId: '',
      orderedBy: '',
      purpose: '',
      startLocation: '',
      endLocation: '',
      departureDate: getLocalDateValue(n),
      departureTime: getLocalTimeValue(n),
      notes: '',
    });
  };

  const resetEndForm = () => {
    setEndFormData({
      endOdometer: 0,
      fuelAdded: 0,
      fuelCost: 0,
      fuelReceiptNumber: '',
      fuelStation: '',
      notes: selectedTrip?.notes || ''
    });
  };

  const handleStartTripClick = () => {
    resetStartForm();
    setIsStartDialogOpen(true);
  };

  // ✅ ODWRÓCONA LOGIKA - sprawdzanie blokady (brak kluczyka = blokada)
  const handleStartTrip = (e) => {
    e.preventDefault();
    
    // Sprawdź, czy wymagane są kluczyki i czy wybrany pojazd NIE ma wydanego kluczyka
    if (requireKeyForTrip && startFormData.vehicleId && !hasKeyForSelectedVehicle) {
      alert(`❌ Nie można rozpocząć trasy!\n\nBrak wydanego kluczyka dla tego pojazdu.\n\nNajpierw pobierz kluczyk w module "Kluczyki".`);
      return;
    }
    
    // Jeśli nie wybrano pojazdu
    if (requireKeyForTrip && !startFormData.vehicleId) {
      alert(`❌ Wybierz pojazd z wydanym kluczykiem.`);
      return;
    }
    
    startTripMutation.mutate(startFormData);
  };

  const handleEndTrip = async (e) => {
    e.preventDefault();
    if (!selectedTrip) return;
    const startOdometer = Number(selectedTrip.startOdometer);
    const endOdometer = Number(endFormData.endOdometer);
    const fuelAdded = Number(endFormData.fuelAdded);
    if (!Number.isFinite(startOdometer) || !Number.isFinite(endOdometer) || endOdometer < startOdometer) {
      toast.error('Nie można zakończyć trasy. Końcowy stan licznika musi być prawidłowy i nie mniejszy od początkowego.');
      return;
    }
    if (!Number.isFinite(fuelAdded) || fuelAdded < 0) {
      toast.error('Nie można zakończyć trasy. Ilość zatankowanego paliwa musi być nieujemną liczbą.');
      return;
    }
    setFuelCalculationMode('norm');
    setManualEndFuel('');
    setManualFuelUsed('');
    setShowFuelCalculationChoice(true);
  };

  const confirmEndTripWithFuelMode = async () => {
    if (!selectedTrip || endTripMutation.isPending) return;
    const vehicle = getTripVehicle(selectedTrip);
    const distance = Number(endFormData.endOdometer) - Number(selectedTrip.startOdometer);
    let endFuel;

    if (fuelCalculationMode === 'norm') {
      const projectedFuel = calculateProjectedEndFuel({
        startFuel: selectedTrip.startFuel,
        fuelAdded: endFormData.fuelAdded,
        distance,
        vehicle,
      });
      endFuel = projectedFuel === null ? null : Math.max(0, projectedFuel);
    } else if (fuelCalculationMode === 'manual_end_fuel') {
      endFuel = manualEndFuel === '' ? null : Number(manualEndFuel);
    } else {
      const enteredFuelUsed = manualFuelUsed === '' ? NaN : Number(manualFuelUsed);
      if (!Number.isFinite(enteredFuelUsed) || enteredFuelUsed < 0) {
        toast.error('Podaj prawidłową ilość zużytego paliwa.');
        return;
      }
      endFuel = Number(selectedTrip.startFuel) + Number(endFormData.fuelAdded) - enteredFuelUsed;
    }

    if (endFuel === null || !Number.isFinite(endFuel)) {
      toast.error('Nie można ustalić końcowego stanu paliwa. Uzupełnij dane lub wybierz inny sposób rozliczenia.');
      return;
    }

    try {
      await endTripMutation.mutateAsync({
        trip: selectedTrip,
        endData: endFormData,
        endFuel,
      });
    } catch (error) {
      console.error('Błąd zakończenia trasy:', error);
    }
  };

  const openEndTripDialog = (trip) => {
    setSelectedTrip(trip);
    setShowFuelCalculationChoice(false);
    setEndFormData({
      endOdometer: trip.startOdometer || 0,
      fuelAdded: 0,
      fuelCost: 0,
      fuelReceiptNumber: '',
      fuelStation: '',
      notes: ''
    });
    setIsEndDialogOpen(true);
  };

  const activeTrips = trips.filter(t => t.status === 'in_progress');

  const stats = useMemo(() => {
    const completed = trips.filter(t => t.status === 'completed');
    const totalDistance = completed.reduce((sum, t) => sum + (t.distance || 0), 0);
    return {
      total: trips.length,
      inProgress: activeTrips.length,
      completed: completed.length,
      totalDistance
    };
  }, [trips]);

  const exportToCSV = () => {
    const headers = ['Nr karty', 'Data', 'Pojazd', 'Kierowca', 'Trasa', 'Dystans (km)', 'Status'];
    const rows = filteredAndSortedTrips.map(trip => {
      const vehicle = getVehicle(trip.vehicleId);
      const driver = getDriver(trip.driverId);
      const d = trip.startDate || trip.startTime;
      return [
        trip.cardNumber || '-',
        d ? format(new Date(d), 'dd.MM.yyyy HH:mm') : '-',
        vehicle ? `${vehicle.make} ${vehicle.model}` : '-',
        driver ? driver.name : '-',
        `${trip.startLocation || '?'} → ${trip.endLocation || '?'}`,
        trip.distance || 0,
        statusConfig[trip.status]?.label || trip.status
      ];
    });

    const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `przejazdy_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <ConfirmModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={confirmDelete}
        title="Potwierdź usunięcie"
        message="Czy na pewno chcesz usunąć ten przejazd?"
      />

      <ConfirmModal
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={() => bulkDeleteMutation.mutate()}
        title="Masowe usuwanie"
        message={`Czy na pewno chcesz usunąć ${selectedTrips.size} wybranych przejazdów? Tej operacji nie można cofnąć.`}
      />

      {showPreviewModal && previewTrip && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            className="relative w-full h-full max-w-5xl max-h-[90vh] bg-white rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <Button
                onClick={handlePrint}
                variant="secondary"
                size="icon"
                title="Drukuj"
              >
                <Printer className="w-5 h-5" />
              </Button>
              <Button
                onClick={() => setShowPreviewModal(false)}
                variant="destructive"
                size="icon"
                title="Zamknij"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="h-full overflow-auto p-8">
              <div id="karta-drogowa-preview">
                <KartaDrogowa
                  trip={{
                    ...previewTrip,
                    startDate: previewTrip.startDate || previewTrip.startTime || previewTrip.departureDate,
                    endDate: previewTrip.endDate || previewTrip.endTime || previewTrip.returnDate,
                    startTime: previewTrip.startTime || previewTrip.departureTime || previewTrip.startDate,
                    endTime: previewTrip.endTime || previewTrip.returnTime || previewTrip.endDate,
                  }}
                  vehicle={getVehicle(previewTrip.vehicleId)}
                  driver={getDriver(previewTrip.driverId)}
                  company={settings}
                  endMileage={previewTrip.endOdometer}
                  endFuel={previewTrip.endFuel}
                  fuelAdded={previewTrip.fuelAdded}
                  format="A4"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        title="Podróże"
        subtitle={`${stats.total} tras • ${stats.inProgress} w trakcie • ${stats.totalDistance.toLocaleString()} km łącznie`}
        icon={Route}
        action={
          <div className="flex gap-2">
            {selectedTrips.size > 0 && (
              <Button
                onClick={() => setShowBulkDeleteConfirm(true)}
                variant="destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Usuń ({selectedTrips.size})
              </Button>
            )}
            <Button
              onClick={handleStartTripClick}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Play className="w-4 h-4 mr-2" />
              Rozpocznij trasę
            </Button>
          </div>
        }
      />

      {/* ✅ Informacja o dostępnych pojazdach z kluczykami */}
      {requireKeyForTrip && (
        <GlassCard className={`p-4 border-l-4 ${hasAnyIssuedKeys ? 'status-success' : 'status-danger'}`} delay={0.15}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${hasAnyIssuedKeys ? 'bg-[var(--success-soft)]' : 'bg-[var(--danger-soft)]'}`}>
              {hasAnyIssuedKeys ? (
                <CheckCircle className="w-5 h-5 text-[var(--success)]" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-[var(--danger)]" />
              )}
            </div>
            <div>
              <p className="text-[var(--text-primary)] font-medium">
                {hasAnyIssuedKeys 
                  ? `✅ Dostępne pojazdy z kluczykami: ${issuedVehicles?.length || 0}`
                  : '❌ Brak wydanych kluczyków'}
              </p>
              <p className="text-[var(--text-muted)] text-sm">
                {hasAnyIssuedKeys 
                  ? 'Możesz rozpocząć trasę tylko dla pojazdów z wydanymi kluczykami.'
                  : 'Aby rozpocząć trasę, najpierw wydaj kluczyk w module "Kluczyki".'}
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {activeTrips.length > 0 && (
        <GlassCard className="p-4 border-l-4 status-warning" delay={0.1}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--warning-soft)] flex items-center justify-center">
              <Play className="w-5 h-5 text-[var(--warning)]" />
            </div>
            <div>
              <p className="text-[var(--text-primary)] font-medium">Trasy w trakcie: {activeTrips.length}</p>
              <p className="text-[var(--text-muted)] text-sm">Zakończ aktywne trasy, aby wygenerować karty drogowe</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Filtry i sortowanie */}
      <GlassCard className="p-4" delay={0.2}>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <Input
              placeholder="Szukaj po nr karty, trasie, celu, rejestracji lub kierowcy..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[var(--surface)] border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full lg:w-40 bg-[var(--surface)] border-[var(--border-color)] text-[var(--text-primary)]">
              <Filter className="w-4 h-4 mr-2 text-[var(--text-muted)]" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="in_progress">W trakcie</SelectItem>
              <SelectItem value="completed">Zakończone</SelectItem>
              <SelectItem value="cancelled">Anulowane</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full lg:w-44 bg-[var(--surface)] border-[var(--border-color)] text-[var(--text-primary)]">
              <ArrowUpDown className="w-4 h-4 mr-2 text-[var(--text-muted)]" />
              <SelectValue placeholder="Sortuj" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-[var(--surface)] border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">
                <CalendarDays className="w-4 h-4 mr-2" />
                {dateRange === 'custom' ? 'Wybrany zakres' : dateRangeOptions.find(o => o.value === dateRange)?.label || 'Data'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border-color)]">
              {dateRangeOptions.map(opt => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => {
                    setDateRange(opt.value);
                    setShowDatePicker(opt.value === 'custom');
                  }}
                  className="text-[var(--text-primary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={exportToCSV}
            variant="outline"
            className="bg-[var(--surface)] border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
          >
            <Download className="w-4 h-4 mr-2" />
            Eksport CSV
          </Button>
        </div>

        {showDatePicker && dateRange === 'custom' && (
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <Label className="text-[var(--text-secondary)] text-sm">Od daty</Label>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-[var(--surface)] border-[var(--border-color)] text-[var(--text-primary)]"
              />
            </div>
            <div className="flex-1">
              <Label className="text-[var(--text-secondary)] text-sm">Do daty</Label>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-[var(--surface)] border-[var(--border-color)] text-[var(--text-primary)]"
              />
            </div>
          </div>
        )}
      </GlassCard>

      {/* Lista przejazdów */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 surface rounded-[var(--radius-md)] animate-pulse" />
          ))}
        </div>
      ) : filteredAndSortedTrips.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Route className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Brak tras</h3>
          <p className="text-[var(--text-muted)] mb-4">
            {searchTerm || statusFilter !== 'all' || dateRange !== 'all'
              ? "Nie znaleziono tras spełniających kryteria"
              : "Rozpocznij pierwszą trasę"}
          </p>
          {!searchTerm && statusFilter === 'all' && dateRange === 'all' && (
            <Button
              onClick={handleStartTripClick}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Play className="w-4 h-4 mr-2" />
              Rozpocznij trasę
            </Button>
          )}
        </GlassCard>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="text-[var(--text-muted)] hover:text-white"
            >
              {selectAll ? <CheckSquare className="w-4 h-4 mr-1" /> : <Square className="w-4 h-4 mr-1" />}
              {selectAll ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
            </Button>
            <span className="text-xs text-[var(--text-muted)]">
              {selectedTrips.size} z {filteredAndSortedTrips.length} zaznaczonych
            </span>
          </div>

          <AnimatePresence mode="popLayout">
            {filteredAndSortedTrips.map((trip, index) => {
              const StatusIcon = statusConfig[trip.status]?.icon || Clock;
              const vehicle = getVehicle(trip.vehicleId);
              const driver = getDriver(trip.driverId);
              const distance = (trip.endOdometer || 0) - (trip.startOdometer || 0);
              const isSelected = selectedTrips.has(trip.id);
              const tripDisplayDate = trip.startDate || trip.startTime;

              return (
                <motion.div
                  key={trip.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  layout
                >
                  <GlassCard className={`p-6 transition-all ${isSelected ? 'ring-2 ring-[var(--primary-color)] bg-[var(--primary-soft)]' : ''}`} hover={true} animate={false}>
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      <div className="flex items-center">
                        <button
                          onClick={() => handleSelectTrip(trip.id)}
                          className="p-1 hover:bg-[var(--surface-hover)] rounded"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-[var(--primary-light)]" />
                          ) : (
                            <Square className="w-5 h-5 text-[var(--text-muted)]" />
                          )}
                        </button>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge className={`${statusConfig[trip.status]?.color || 'status-info'} text-[var(--text-primary)]`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig[trip.status]?.label || trip.status}
                          </Badge>
                          <span className="text-[var(--text-muted)] text-sm font-mono">
                            {trip.cardNumber || `#${String(trip.id).slice(-6)}`}
                          </span>
                          {tripDisplayDate && (
                            <span className="text-[var(--text-muted)] text-xs flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(tripDisplayDate), 'dd.MM.yyyy HH:mm', { locale: pl })}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex items-center gap-2 text-white">
                            <MapPin className="w-4 h-4 text-[var(--primary-light)]" />
                            <span className="font-medium">{trip.startLocation || 'Start'}</span>
                          </div>
                          <div className="flex-1 h-px bg-primary text-primary-foreground hover:bg-primary/90 max-w-[100px]" />
                          <div className="flex items-center gap-2 text-white">
                            <span className="font-medium">{trip.endLocation || 'Cel'}</span>
                            <Flag className="w-4 h-4 text-[var(--accent-color)]" />
                          </div>
                        </div>

                        {trip.purpose && (
                          <p className="text-[var(--text-secondary)] mb-3">{trip.purpose}</p>
                        )}

                        <div className="flex flex-wrap gap-4 text-sm text-[var(--text-muted)]">
                          {vehicle && (
                            <div className="flex items-center gap-1">
                              <Car className="w-4 h-4" />
                              {vehicle.make} {vehicle.model} ({vehicle.registrationNumber})
                            </div>
                          )}
                          {driver && (
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {driver.name}
                            </div>
                          )}
                          {trip.status === 'completed' && distance > 0 && (
                            <div className="flex items-center gap-1">
                              <Gauge className="w-4 h-4 text-[var(--success)]" />
                              <span className="text-[var(--success)] font-medium">{distance} km</span>
                            </div>
                          )}
                          {trip.status === 'in_progress' && trip.startOdometer > 0 && (
                            <div className="flex items-center gap-1">
                              <Gauge className="w-4 h-4 text-[var(--warning)]" />
                              <span className="text-[var(--warning)] font-medium">Start: {trip.startOdometer} km</span>
                            </div>
                          )}
                        </div>

                        {trip.orderedBy && (
                          <div className="mt-3 text-sm text-[var(--text-muted)]">
                            Zlecił: <span className="text-[var(--text-secondary)]">{trip.orderedBy}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {trip.status === 'in_progress' && (
                          <Button
                            onClick={() => openEndTripDialog(trip)}
                            size="sm"
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            <StopCircle className="w-4 h-4 mr-2" />
                            Zakończ trasę
                          </Button>
                        )}

                        <Button
                          onClick={() => handlePreview(trip)}
                          size="icon"
                          className="bg-[var(--primary-soft)] text-[var(--primary-light)] border border-[var(--border-color)] hover:bg-[var(--primary-color)] hover:text-[var(--text-primary)] w-8 h-8 transition-all"
                          title="Podgląd karty drogowej"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        <Link
                          to={`/trips/${trip.id}`}
                          className="px-3 py-1.5 bg-[var(--primary-soft)] text-[var(--primary-light)] text-xs font-medium rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                        >
                          Szczegóły
                        </Link>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-[var(--text-muted)] hover:text-white w-8 h-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border-color)]">
                            <DropdownMenuItem
                              onClick={() => handlePreview(trip)}
                              className="text-[var(--text-primary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Podgląd
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                window.location.href = `/trips/${trip.id}?edit=true`;
                              }}
                              className="text-[var(--text-primary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edytuj
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-[var(--surface-hover)]" />
                            <DropdownMenuItem
                              onClick={() => setItemToDelete(trip.id)}
                              className="text-[var(--danger)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Usuń
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Start Trip Dialog */}
      <Dialog
        open={isStartDialogOpen}
        onOpenChange={(open) => {
          setIsStartDialogOpen(open);
          if (!open && gpsTripDraft) {
            setGpsTripDraft(null);
            resetStartForm();
          }
        }}
      >
        <DialogContent className="flex max-h-[calc(100dvh-3rem)] w-[calc(100%-1rem)] flex-col overflow-hidden border-[var(--border-color)] bg-[var(--surface)] p-4 text-[var(--text-primary)] sm:max-h-[90vh] sm:w-full sm:p-6">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Play className="w-5 h-5 text-[var(--success)]" />
              {gpsTripDraft ? "Utwórz podróż ze śladu" : "Rozpocznij trasę"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStartTrip} className="mt-2 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1 sm:mt-4">
            {gpsTripDraft && (
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
                <p className="text-sm font-semibold text-blue-300">
                  Dystans GPS: {Number(gpsTripDraft.distance).toFixed(2)} km
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Ślad jest zachowany w Mapie. Dystans GPS nie zastępuje odczytu licznika; przy zakończeniu podróży podaj rzeczywisty stan licznika, aby użyć standardowych obliczeń przebiegu i paliwa.
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Pojazd *</Label>
                <Select
                  value={startFormData.vehicleId}
                  onValueChange={(v) => setStartFormData({...startFormData, vehicleId: v})}
                  required
                >
                  <SelectTrigger className="bg-[var(--popover-surface)] border-[var(--border-color)]">
                    <SelectValue placeholder="Wybierz pojazd" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.filter(v => v.status === 'available').map(v => {
                      // ✅ Pojazd DOZWOLONY tylko jeśli ma wydany kluczyk (lub kluczyki nie są wymagane)
                      const hasKey = issuedVehicleIds?.includes(String(v.id));
                      const isDisabled = requireKeyForTrip && !hasKey;
                      
                      return (
                        <SelectItem 
                          key={v.id} 
                          value={v.id}
                          disabled={isDisabled}
                          className={isDisabled ? 'opacity-50' : ''}
                        >
                          {v.make} {v.model} ({v.registrationNumber}) - {v.mileage} km
                          {requireKeyForTrip && !hasKey && ' 🔒 (brak kluczyka)'}
                          {requireKeyForTrip && hasKey && ' ✅ (kluczyk wydany)'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Kierowca *</Label>
                <Select
                  value={startFormData.driverId}
                  onValueChange={(v) => setStartFormData({...startFormData, driverId: v})}
                  required
                >
                  <SelectTrigger className="bg-[var(--popover-surface)] border-[var(--border-color)]">
                    <SelectValue placeholder="Wybierz kierowcę" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.filter(d => d.status === 'active').map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ✅ Ostrzeżenie o braku kluczyka */}
            {startFormData.vehicleId && requireKeyForTrip && !hasKeyForSelectedVehicle && (
              <div className="state-error p-3">
                <p className="text-[var(--danger)] text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Brak wydanego kluczyka dla tego pojazdu! Najpierw pobierz kluczyk w module "Kluczyki".
                </p>
              </div>
            )}

            {/* ✅ Potwierdzenie wydanego kluczyka */}
            {startFormData.vehicleId && requireKeyForTrip && hasKeyForSelectedVehicle && (
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3">
                <p className="text-[var(--success)] text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Kluczyk wydany - możesz rozpocząć trasę.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Data rozpoczęcia przejazdu *</Label>
                <Input
                  type="date"
                  value={startFormData.departureDate}
                  onChange={(e) => setStartFormData({...startFormData, departureDate: e.target.value})}
                  className="bg-[var(--popover-surface)] border-[var(--border-color)]"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Godzina rozpoczęcia *</Label>
                <Input
                  type="time"
                  value={startFormData.departureTime}
                  onChange={(e) => setStartFormData({...startFormData, departureTime: e.target.value})}
                  className="bg-[var(--popover-surface)] border-[var(--border-color)]"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Kto zlecił przejazd? *</Label>
              <Input
                value={startFormData.orderedBy}
                onChange={(e) => setStartFormData({...startFormData, orderedBy: e.target.value})}
                className="bg-[var(--popover-surface)] border-[var(--border-color)]"
                placeholder="Imię i nazwisko zlecającego"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Skąd</Label>
                <Input
                  value={startFormData.startLocation}
                  onChange={(e) => setStartFormData({...startFormData, startLocation: e.target.value})}
                  className="bg-[var(--popover-surface)] border-[var(--border-color)]"
                  placeholder="Miejsce startu"
                />
              </div>
              <div className="space-y-2">
                <Label>Dokąd</Label>
                <Input
                  value={startFormData.endLocation}
                  onChange={(e) => setStartFormData({...startFormData, endLocation: e.target.value})}
                  className="bg-[var(--popover-surface)] border-[var(--border-color)]"
                  placeholder="Miejsce docelowe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cel podróży</Label>
              <Input
                value={startFormData.purpose}
                onChange={(e) => setStartFormData({...startFormData, purpose: e.target.value})}
                className="bg-[var(--popover-surface)] border-[var(--border-color)]"
                placeholder="np. Wyjazd służbowy"
              />
            </div>

            <div className="space-y-2">
              <Label>Uwagi{gpsTripDraft ? " / powiązanie śladu GPS" : ""}</Label>
              <Textarea
                value={startFormData.notes}
                onChange={(e) => setStartFormData({ ...startFormData, notes: e.target.value })}
                className="bg-[var(--popover-surface)] border-[var(--border-color)]"
                placeholder="Dodatkowe informacje o przejeździe"
              />
            </div>

            <div className="bg-[var(--primary-soft)] border border-[var(--border-color)] rounded-lg p-4">
              <p className="text-sm text-[var(--primary-light)] mb-1">Informacja - automatycznie zapisane:</p>
              <p className="text-xs text-[var(--text-muted)]">
                • Aktualny przebieg pojazdu
                <br />
                • Stan paliwa
                <br />
                • Numer karty drogowej (zgodny z ustawieniami)
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end sm:pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (gpsTripDraft) {
                    setGpsTripDraft(null);
                    resetStartForm();
                  }
                  setIsStartDialogOpen(false);
                }}
                className="w-full border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] sm:w-auto"
              >
                Anuluj
              </Button>
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
                disabled={startTripMutation.isPending || (requireKeyForTrip && startFormData.vehicleId && !hasKeyForSelectedVehicle)}
              >
                <Play className="w-4 h-4 mr-2" />
                Rozpocznij
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* End Trip Dialog */}
      <Dialog open={isEndDialogOpen} onOpenChange={setIsEndDialogOpen}>
        <DialogContent className="bg-[var(--surface)] border-[var(--border-color)] text-[var(--text-primary)] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <StopCircle className="w-5 h-5 text-[var(--danger)]" />
              Zakończ trasę
            </DialogTitle>
          </DialogHeader>

          {selectedTrip && !showFuelCalculationChoice && (
            <div className="bg-[var(--surface)] border border-[var(--border-color)] rounded-lg p-4 mb-4">
              <p className="text-sm text-[var(--text-muted)] mb-2">Dane rozpoczęcia trasy:</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[var(--text-muted)]">Przebieg początkowy:</span>
                  <div className="text-white font-bold text-lg">{selectedTrip.startOdometer} km</div>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Stan paliwa początkowy:</span>
                  <div className="text-white font-bold text-lg">{(selectedTrip.startFuel || 0).toFixed(2)} L</div>
                </div>
              </div>
              {selectedTrip.cardNumber && (
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Nr karty: {selectedTrip.cardNumber}
                </p>
              )}
              {(selectedTrip.startDate || selectedTrip.startTime) && (
                <p className="text-xs text-[var(--text-muted)]">
                  Rozpoczęto: {format(new Date(selectedTrip.startDate || selectedTrip.startTime), 'dd MMM yyyy, HH:mm', { locale: pl })}
                </p>
              )}
            </div>
          )}

          {selectedTrip && !showFuelCalculationChoice && (
          <form onSubmit={handleEndTrip} className="space-y-4">
            <div className="space-y-2">
              <Label>Nowy stan licznika (km) *</Label>
              <Input
                type="number"
                value={endFormData.endOdometer}
                onChange={(e) => {
                  const newOdometer = parseInt(e.target.value) || 0;
                  setEndFormData({...endFormData, endOdometer: newOdometer});
                }}
                className="bg-[var(--popover-surface)] border-[var(--border-color)] text-lg font-semibold"
                min={selectedTrip?.startOdometer || 0}
                required
              />
              {selectedTrip && distance > 0 && (
                <div className="mt-2 p-2 bg-[var(--success-soft)] rounded-lg">
                  <p className="text-[var(--success)] text-sm font-semibold">
                    Przejechany dystans: <span className="text-xl">{distance} km</span>
                  </p>
                  <p className="text-[var(--text-muted)] text-xs">
                    = {endFormData.endOdometer} km - {selectedTrip.startOdometer} km
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Dolano paliwa (L) – opcjonalnie</Label>
              <Input
                type="number"
                step="0.1"
                value={endFormData.fuelAdded}
                onChange={(e) => setEndFormData({...endFormData, fuelAdded: parseFloat(e.target.value) || 0})}
                className="bg-[var(--popover-surface)] border-[var(--border-color)]"
                placeholder="Ilość paliwa zatankowanego podczas trasy"
              />
            </div>

            {distance > 0 && (
              <div className="bg-[var(--primary-soft)] rounded-lg p-4 border border-[var(--border-color)]">
                <h4 className="text-[var(--primary-light)] font-semibold mb-3 text-sm uppercase tracking-wide">
                  Automatyczne wyliczenia
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-[var(--text-muted)]">Średnie spalanie normatywne:</span>
                    <div className="text-[var(--accent-color)] font-bold text-lg">{fuelConsumptionNorm} L/100km</div>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Przewidywane zużycie:</span>
                    <div className="text-[var(--warning)] font-bold text-lg">
                      {predictedFuelUsed === null ? 'brak danych' : `${predictedFuelUsed.toFixed(2)} L`}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[var(--text-muted)]">AUTOMATYCZNY NOWY STAN PALIWA:</span>
                    <div className="text-[var(--success)] font-bold text-2xl mt-1">
                      {automaticallyCalculatedEndFuel === null ? 'brak danych' : `${automaticallyCalculatedEndFuel.toFixed(2)} L`}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      = {selectedTrip?.startFuel || 0} L (start) + {endFormData.fuelAdded} L (dolane) - {predictedFuelUsed.toFixed(2)} L (zużycie)
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gdzie zatankowano</Label>
                <Input
                  type="text"
                  value={endFormData.fuelStation}
                  onChange={(e) => setEndFormData({...endFormData, fuelStation: e.target.value})}
                  className="bg-[var(--popover-surface)] border-[var(--border-color)]"
                  placeholder="np. Orlen"
                />
              </div>
              <div className="space-y-2">
                <Label>Nr kwitu paliwowego</Label>
                <Input
                  type="text"
                  value={endFormData.fuelReceiptNumber}
                  onChange={(e) => setEndFormData({...endFormData, fuelReceiptNumber: e.target.value})}
                  className="bg-[var(--popover-surface)] border-[var(--border-color)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Koszt tankowania (zł)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={endFormData.fuelCost}
                onChange={(e) => setEndFormData({...endFormData, fuelCost: parseFloat(e.target.value) || 0})}
                className="bg-[var(--popover-surface)] border-[var(--border-color)]"
              />
            </div>

            <div className="space-y-2">
              <Label>Uwagi (opcjonalnie)</Label>
              <Textarea
                value={endFormData.notes}
                onChange={(e) => setEndFormData({...endFormData, notes: e.target.value})}
                className="bg-[var(--popover-surface)] border-[var(--border-color)]"
                rows={3}
                placeholder="Dodatkowe informacje o trasie..."
              />
            </div>

            <div className="status-success rounded-lg p-4">
              <p className="text-sm text-[var(--success)]">Po zakończeniu:</p>
              <ul className="text-xs text-[var(--success)] mt-1 space-y-1">
                <li>• Stan paliwa zostanie automatycznie obliczony</li>
                <li>• Przebieg pojazdu zostanie zaktualizowany</li>
                <li>• Karta drogowa będzie dostępna do podglądu</li>
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEndDialogOpen(false)}
                className="border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              >
                Anuluj
              </Button>
              <Button
                type="submit"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={endTripMutation.isPending}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Zakończ i generuj kartę
              </Button>
            </div>
          </form>
          )}

          {selectedTrip && showFuelCalculationChoice && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Wybierz, jak zapisać zużycie paliwa na karcie drogowej.
              </p>
              <label className="flex cursor-pointer gap-3 rounded-lg border border-[var(--border-color)] p-3">
                <input
                  type="radio"
                  name="trip-fuel-calculation-mode"
                  checked={fuelCalculationMode === 'norm'}
                  onChange={() => setFuelCalculationMode('norm')}
                />
                <span>
                  <span className="block font-medium">Według normy pojazdu</span>
                  <span className="block text-sm text-[var(--text-secondary)]">
                    Zużycie normatywne: {predictedFuelUsed?.toFixed(2) ?? 'brak danych'} L.
                    Końcowy poziom paliwa:{' '}
                    {automaticallyCalculatedEndFuel === null ? 'brak danych' : `${automaticallyCalculatedEndFuel.toFixed(2)} L`}.
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer gap-3 rounded-lg border border-[var(--border-color)] p-3">
                <input
                  type="radio"
                  name="trip-fuel-calculation-mode"
                  checked={fuelCalculationMode === 'manual_end_fuel'}
                  onChange={() => setFuelCalculationMode('manual_end_fuel')}
                />
                <span className="flex-1">
                  <span className="block font-medium">Podam końcowy poziom paliwa</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualEndFuel}
                    onChange={(event) => setManualEndFuel(event.target.value)}
                    className="mt-2 bg-[var(--input-bg-color,#ffffff)] text-[var(--input-text-color,#111827)]"
                    placeholder="Końcowy stan paliwa (L)"
                    onFocus={() => setFuelCalculationMode('manual_end_fuel')}
                  />
                </span>
              </label>

              <label className="flex cursor-pointer gap-3 rounded-lg border border-[var(--border-color)] p-3">
                <input
                  type="radio"
                  name="trip-fuel-calculation-mode"
                  checked={fuelCalculationMode === 'manual_fuel_used'}
                  onChange={() => setFuelCalculationMode('manual_fuel_used')}
                />
                <span className="flex-1">
                  <span className="block font-medium">Podam rzeczywiście zużyte paliwo</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualFuelUsed}
                    onChange={(event) => setManualFuelUsed(event.target.value)}
                    className="mt-2 bg-[var(--input-bg-color,#ffffff)] text-[var(--input-text-color,#111827)]"
                    placeholder="Zużycie paliwa (L)"
                    onFocus={() => setFuelCalculationMode('manual_fuel_used')}
                  />
                  <span className="mt-1 block text-xs text-[var(--text-secondary)]">
                    Końcowy poziom zostanie wyliczony z paliwa początkowego, tankowania i zużycia.
                  </span>
                </span>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFuelCalculationChoice(false)}
                  className="border-[var(--border-color)] text-[var(--text-secondary)]"
                >
                  Wróć do danych
                </Button>
                <Button
                  type="button"
                  onClick={confirmEndTripWithFuelMode}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={endTripMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {endTripMutation.isPending ? 'Zapisywanie...' : 'Potwierdź i zakończ'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}