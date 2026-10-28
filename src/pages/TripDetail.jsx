import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { AlertTriangle, Download, ArrowLeft, FileText, Edit, StopCircle, Printer } from 'lucide-react';
import KartaDrogowa from '@/components/print/KartaDrogowa.jsx';
import PolecenieWyjazdu from '@/components/print/PolecenieWyjazdu.jsx';
import api from '@/api/apiClient';
import { generatePdfFromElement, generatePdfFromElements } from '@/lib/documentPdf';
import { calculateProjectedEndFuel, calculateTripMetrics, validateTripCompletion } from '@/lib/tripCalculations';
import { toast } from 'sonner';

export default function TripDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const tripId = id ? String(id) : null;
  const editMode = searchParams.get('edit') === 'true';

  const [isEditing, setIsEditing] = useState(editMode);
  const [showEndForm, setShowEndForm] = useState(false);

  // Dane początkowe
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [orderedBy, setOrderedBy] = useState('');
  const [approvalPerson, setApprovalPerson] = useState('');
  const [purpose, setPurpose] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [startOdometer, setStartOdometer] = useState(0);
  const [startFuel, setStartFuel] = useState(0);
  // Dane końcowe
  const [endOdometer, setEndOdometer] = useState(0);
  const [endFuel, setEndFuel] = useState(0);
  const [fuelAdded, setFuelAdded] = useState(0);
  const [fuelReceiptNumber, setFuelReceiptNumber] = useState('');
  const [fuelStation, setFuelStation] = useState('');
  const [fuelCost, setFuelCost] = useState(0);
  const [returnDate, setReturnDate] = useState('');
  const [returnTime, setReturnTime] = useState('');

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfFormat, setPdfFormat] = useState('A4');
  const [activeTab, setActiveTab] = useState('karta');
  const [showFuelCalculationPrompt, setShowFuelCalculationPrompt] = useState(false);
  const [fuelCalculationMode, setFuelCalculationMode] = useState('norm');
  const [manualEndFuel, setManualEndFuel] = useState('');
  const [manualFuelUsed, setManualFuelUsed] = useState('');
  const [syncPrompt, setSyncPrompt] = useState(null);
  const [isSyncingFollowing, setIsSyncingFollowing] = useState(false);

  const kartaRef = useRef(null);
  const polecenieRef = useRef(null);
  const queryClient = useQueryClient();

  // Pobieranie danych
  const { data: tripsRaw = [], isLoading: tripsLoading } = useQuery({
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
      name: `${driver.firstName || ''} ${driver.lastName || ''}`.trim() || driver.name || 'Nieznany'
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

  const trip = useMemo(() => trips.find(t => t.id === tripId), [trips, tripId]);
  const currentVehicle = useMemo(() => trip ? vehicles.find(v => v.id === trip.vehicleId) : null, [vehicles, trip]);
  const vehicle = useMemo(() => trip && currentVehicle ? ({
    ...currentVehicle,
    make: trip.vehicleMakeSnapshot ?? currentVehicle.make,
    model: trip.vehicleModelSnapshot ?? currentVehicle.model,
    registrationNumber: trip.vehicleRegistrationSnapshot ?? currentVehicle.registrationNumber,
    bodyType: (
      typeof trip.vehicleBodyTypeSnapshot === 'string' && trip.vehicleBodyTypeSnapshot.trim()
        ? trip.vehicleBodyTypeSnapshot
        : currentVehicle.bodyType || currentVehicle.vehicleType || trip.bodyType
    ),
    fuelConsumption: trip.vehicleFuelConsumptionSnapshot ?? currentVehicle.fuelConsumption,
    tankSize: trip.vehicleTankSizeSnapshot ?? currentVehicle.tankSize,
  }) : currentVehicle, [currentVehicle, trip]);
  const currentDriver = useMemo(() => trip ? drivers.find(d => d.id === trip.driverId) : null, [drivers, trip]);
  const driver = useMemo(() => trip && currentDriver ? ({
    ...currentDriver,
    name: trip.driverNameSnapshot ?? currentDriver.name,
  }) : currentDriver, [currentDriver, trip]);

  useEffect(() => {
    if (trip) {
      if (trip.startDate || trip.startTime) {
        const startDateObj = new Date(trip.startDate || trip.startTime);
        if (!isNaN(startDateObj.getTime())) {
          setDepartureDate(startDateObj.toISOString().split('T')[0]);
          setDepartureTime(startDateObj.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }));
        }
      } else {
        setDepartureDate('');
        setDepartureTime('');
      }
      setOrderedBy(trip.orderedBy || '');
      setApprovalPerson(trip.arrivalSignature || trip.resultsControlSignature || trip.orderedBy || '');
      setPurpose(trip.purpose || '');
      setStartLocation(trip.startLocation || '');
      setEndLocation(trip.endLocation || '');
      setStartOdometer(trip.startOdometer ?? '');
      setStartFuel(trip.startFuel ?? '');
      setEndOdometer(trip.endOdometer ?? '');
      setEndFuel(trip.endFuel ?? '');
      setFuelAdded(trip.fuelAdded ?? 0);
      setFuelReceiptNumber(trip.fuelReceiptNumber || '');
      setFuelStation(trip.fuelStation || '');
      setFuelCost(trip.fuelCost || 0);
      if (trip.endDate) {
        const endDateObj = new Date(trip.endDate);
        if (!isNaN(endDateObj.getTime())) {
          setReturnDate(endDateObj.toISOString().split('T')[0]);
          setReturnTime(endDateObj.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }));
        }
      } else {
        const now = new Date();
        setReturnDate(now.toISOString().split('T')[0]);
        setReturnTime(now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }));
      }
    }
  }, [trip, vehicle]);

  const metrics = calculateTripMetrics({
    startOdometer,
    endOdometer,
    startFuel,
    endFuel,
    fuelAdded,
    vehicle,
  });
  const {
    distance,
    fuelConsumption: fuelConsumptionNorm,
    fuelUsedNorm,
    fuelUsedActual,
  } = metrics;
  const formatValue = (value, suffix = '') => (
    value === null || value === undefined || value === '' ? 'brak danych' : `${value}${suffix}`
  );

  const updateTripMutation = useMutation({
    /** @param {{
     * departureDate: string,
     * departureTime: string,
     * returnDate: string,
     * returnTime: string,
     * orderedBy: string,
     * approvalPerson: string,
     * purpose: string,
     * startLocation: string,
     * endLocation: string,
     * startOdometer: number | string,
     * startFuel: number | string,
     * endOdometer: number | string,
     * endFuel: number | string,
     * fuelAdded: number | string,
     * fuelReceiptNumber: string,
     * fuelStation: string,
     * fuelCost: number | string,
     * notes?: string
     * }} data
     */
    mutationFn: async (data) => {
      const calculated = calculateTripMetrics({
        startOdometer: data.startOdometer,
        endOdometer: data.endOdometer,
        startFuel: data.startFuel,
        endFuel: data.endFuel,
        fuelAdded: data.fuelAdded,
        vehicle,
      });
      const validation = validateTripCompletion({
        startOdometer: data.startOdometer,
        endOdometer: data.endOdometer,
        startFuel: data.startFuel,
        endFuel: data.endFuel,
        fuelAdded: data.fuelAdded,
        vehicle,
      });
      if (!validation.valid) {
        throw new Error(validation.errors.join(' '));
      }
      const {
        distance,
        fuelUsedNorm,
        fuelUsedActual,
        fuelSavings,
        fuelOveruse,
      } = calculated;

      let workHours = 0, workMinutes = 0;
      if (data.departureTime && data.returnTime) {
        const [dh, dm] = data.departureTime.split(':').map(Number);
        const [rh, rm] = data.returnTime.split(':').map(Number);
        let totalMin = (rh * 60 + rm) - (dh * 60 + dm);
        if (totalMin < 0) totalMin += 24 * 60;
        workHours = Math.floor(totalMin / 60);
        workMinutes = totalMin % 60;
      }

      const approvalName = data.approvalPerson || trip.orderedBy || trip.resultsControlSignature || trip.arrivalSignature || null;

      let startDate = null;
      if (data.departureDate && data.departureTime) {
        startDate = new Date(`${data.departureDate}T${data.departureTime}:00`).toISOString();
      }
      let endDate = null;
      if (data.returnDate && data.returnTime) {
        endDate = new Date(`${data.returnDate}T${data.returnTime}:00`).toISOString();
      }

      const driverFullName = driver?.name ||
        (driver?.firstName || driver?.lastName
          ? `${driver.firstName || ''} ${driver.lastName || ''}`.trim()
          : trip?.driverNameSnapshot || trip?.driverName || null);

      const updatedTrip = {
        ...trip,
        startTime: startDate || trip.startTime || trip.startDate,
        endTime: endDate || trip.endTime || trip.endDate,
        orderedBy: data.orderedBy,
        purpose: data.purpose,
        startLocation: data.startLocation,
        endLocation: data.endLocation,
        startOdometer: data.startOdometer,
        startFuel: data.startFuel,
        endOdometer: data.endOdometer,
        endFuel: data.endFuel,
        fuelAdded: data.fuelAdded,
        fuelReceiptNumber: data.fuelReceiptNumber,
        fuelStation: data.fuelStation,
        fuelCost: data.fuelCost,
        notes: data.notes || trip.notes,
        distance,
        fuelUsedNorm,
        fuelUsedActual,
        fuelSavings: fuelSavings ?? null,
        fuelOveruse: fuelOveruse ?? null,
        workHours,
        workMinutes,
        status: 'completed',
        vehicleMakeSnapshot: vehicle?.make ?? trip?.vehicleMakeSnapshot ?? null,
        vehicleModelSnapshot: vehicle?.model ?? trip?.vehicleModelSnapshot ?? null,
        vehicleRegistrationSnapshot: vehicle?.registrationNumber ?? trip?.vehicleRegistrationSnapshot ?? null,
        vehicleBodyTypeSnapshot: vehicle?.bodyType ?? trip?.vehicleBodyTypeSnapshot ?? null,
        vehicleFuelConsumptionSnapshot: vehicle?.fuelConsumption ?? trip?.vehicleFuelConsumptionSnapshot ?? null,
        vehicleTankSizeSnapshot: vehicle?.tankSize ?? trip?.vehicleTankSizeSnapshot ?? null,
        driverNameSnapshot: driverFullName ?? trip?.driverNameSnapshot ?? null,
        driverResultsSignature: driverFullName,
        driverTechSignature: driverFullName,
        resultsCalculatedBy: driverFullName,
        resultsControlSignature: approvalName,
        arrivalSignature: approvalName,
        fuelIssuedBy: driverFullName,
      };

      await api.updateTrip(Number(trip.id), updatedTrip);

      const changedEndOdometer = Number(data.endOdometer) !== Number(trip.endOdometer);
      const originalTripTime = Date.parse(trip.startTime || trip.startDate || '');
      const correctedTripTime = Date.parse(startDate || trip.startTime || trip.startDate || '');
      const changedStartTime = Number.isFinite(originalTripTime) &&
        Number.isFinite(correctedTripTime) &&
        correctedTripTime !== originalTripTime;
      const hasFollowingTrips = trips.filter((candidate) => {
        if (
          candidate.id === trip.id ||
          String(candidate.vehicleId) !== String(trip.vehicleId) ||
          candidate.status !== 'completed'
        ) return false;
        const candidateTime = Date.parse(candidate.startTime || candidate.startDate || '');
        const editedTripTime = Date.parse(updatedTrip.startTime || '');
        return Number.isFinite(candidateTime) &&
          Number.isFinite(editedTripTime) &&
          (candidateTime > editedTripTime ||
            (candidateTime === editedTripTime && Number(candidate.id) > Number(trip.id)));
      });

      return {
        updatedTrip,
        syncPrompt: trip.status === 'completed' &&
          (changedEndOdometer || changedStartTime) &&
          hasFollowingTrips.length > 0
          ? {
            tripId: trip.id,
            expectedPreviousEndOdometer: Number(trip.endOdometer),
            expectedCorrectedEndOdometer: Number(data.endOdometer),
            followingCount: hasFollowingTrips.length,
          }
          : null,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['refuels'] });
      setIsEditing(false);
      setShowEndForm(false);
      setShowFuelCalculationPrompt(false);
      if (result.syncPrompt) setSyncPrompt(result.syncPrompt);
    },
    onError: (error) => {
      console.error('Błąd mutacji:', error);
      toast.error(`Nie można zapisać trasy. ${error.message || 'Sprawdź dane formularza.'}`);
    },
  });

  const handleSynchronizeFollowingTrips = async () => {
    if (!syncPrompt || isSyncingFollowing) return;
    setIsSyncingFollowing(true);
    try {
      const result = await api.synchronizeFollowingTrips(
        Number(syncPrompt.tripId),
        syncPrompt.expectedPreviousEndOdometer,
        syncPrompt.expectedCorrectedEndOdometer
      );
      await queryClient.invalidateQueries({ queryKey: ['trips'] });
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setSyncPrompt(null);
      toast.success(`Zaktualizowano ${result.updatedCount} kolejnych kart podróży.`);
    } catch (error) {
      toast.error(`Nie zaktualizowano kolejnych kart. ${error.message}`);
    } finally {
      setIsSyncingFollowing(false);
    }
  };

  const handleEndTrip = async (selectedFuelMode) => {
    const isFuelMode =
      selectedFuelMode === 'norm' ||
      selectedFuelMode === 'manual_end_fuel' ||
      selectedFuelMode === 'manual_fuel_used';
    if (trip.status === 'in_progress' && !isFuelMode) {
      setFuelCalculationMode('norm');
      setManualEndFuel(endFuel === '' ? '' : String(endFuel));
      setManualFuelUsed('');
      setShowFuelCalculationPrompt(true);
      return;
    }

    try {
      let finalEndFuel = endFuel;
      if (trip.status === 'in_progress' && selectedFuelMode === 'norm') {
        const projectedFuel = calculateProjectedEndFuel({
          startFuel,
          fuelAdded,
          distance: Number(endOdometer) - Number(startOdometer),
          vehicle,
        });
        finalEndFuel = projectedFuel === null ? null : Math.max(0, projectedFuel);
      } else if (selectedFuelMode === 'manual_end_fuel') {
        finalEndFuel = manualEndFuel;
      } else if (selectedFuelMode === 'manual_fuel_used') {
        const enteredFuelUsed = Number(manualFuelUsed);
        if (!manualFuelUsed || !Number.isFinite(enteredFuelUsed) || enteredFuelUsed < 0) {
          toast.error('Podaj prawidłową ilość zużytego paliwa.');
          return;
        }
        finalEndFuel = Number(startFuel) + Number(fuelAdded) - enteredFuelUsed;
      }

      const validation = validateTripCompletion({
        startOdometer,
        endOdometer,
        startFuel,
        endFuel: finalEndFuel,
        fuelAdded,
        vehicle,
      });
      if (!validation.valid) {
        toast.error(`Nie można zakończyć trasy. ${validation.errors.join(' ')}`);
        return;
      }
      await updateTripMutation.mutateAsync({
        departureDate,
        departureTime,
        orderedBy,
        approvalPerson,
        purpose,
        startLocation,
        endLocation,
        startOdometer,
        startFuel,
        endOdometer,
        endFuel: finalEndFuel,
        fuelAdded,
        fuelReceiptNumber,
        fuelStation,
        fuelCost,
        returnDate,
        returnTime,
      });
    } catch (error) {
      console.error('Błąd zapisu trasy:', error);
    }
  };

  // ============================================================================
  // 🔧 FUNKCJA GENEROWANIA POJEDYNCZEGO PDF (Z onclone)
  // ============================================================================
  const generateSinglePdf = async (docType, fmt) => {
    setIsGeneratingPdf(true);
    setPdfFormat(fmt);
    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const element = docType === 'karta' ? kartaRef.current : polecenieRef.current;
      
      if (!element) { 
        alert('Nie znaleziono dokumentu'); 
        setIsGeneratingPdf(false);
        return; 
      }
      
      const pdf = await generatePdfFromElement(element, fmt);
      pdf.save(`${docType === 'karta' ? 'karta_drogowa' : 'polecenie_wyjazdu'}_${trip?.tripNumber || String(trip?.id).slice(-5) || 'dokument'}_${fmt}.pdf`);
    } catch (err) {
      console.error('Błąd generowania PDF:', err);
      alert('Błąd generowania PDF. Spróbuj ponownie.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // ============================================================================
  // 🔧 FUNKCJA GENEROWANIA OBU PDF (Z onclone)
  // ============================================================================
  const generateBothPdf = async (fmt) => {
    setIsGeneratingPdf(true);
    setPdfFormat(fmt);
    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const kartaElement = kartaRef.current;
      const polecenieElement = polecenieRef.current;
      
      if (!kartaElement || !polecenieElement) { 
        alert('Nie znaleziono dokumentów'); 
        setIsGeneratingPdf(false);
        return; 
      }
      
      const pdf = await generatePdfFromElements([kartaElement, polecenieElement], fmt);
      pdf.save(`cala_karta_${trip?.tripNumber || String(trip?.id).slice(-5) || 'dokument'}_${fmt}.pdf`);
    } catch (err) {
      console.error('Błąd generowania PDF:', err);
      alert('Błąd generowania PDF. Spróbuj ponownie.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 🔧 FUNKCJA DRUKOWANIA
  const handlePrint = () => {
    window.print();
  };

  if (tripsLoading) {
    return <div className="p-8 text-center">Ładowanie danych...</div>;
  }

  if (!tripId || !trip || !vehicle || !driver) {
    return (
      <div className="p-8 text-center">
        <div className="glass-card p-12 max-w-2xl mx-auto">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Nie znaleziono przejazdu</h3>
          <p className="text-gray-600 mb-6">Przejazd o podanym ID nie istnieje lub został usunięty.</p>
          <Link to={createPageUrl('Trips')} className="btn-modern">Wróć do listy przejazdów</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {showFuelCalculationPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="fuel-calculation-title"
            aria-describedby="fuel-calculation-description"
            className="w-full max-w-lg rounded-lg border border-[var(--border-color)] bg-[var(--surface)] p-6 text-[var(--text-primary)] shadow-xl"
          >
            <h2 id="fuel-calculation-title" className="text-lg font-semibold">
              Jak rozliczyć zużycie paliwa?
            </h2>
            <p id="fuel-calculation-description" className="mt-2 text-sm text-[var(--text-secondary)]">
              Wybierz sposób ustalenia danych paliwa na karcie drogowej.
            </p>
            <fieldset className="mt-5 space-y-3">
              <legend className="sr-only">Sposób rozliczenia paliwa</legend>
              <label className="flex cursor-pointer gap-3 rounded-md border border-[var(--border-color)] p-3">
                <input
                  type="radio"
                  name="fuel-calculation-mode"
                  value="norm"
                  checked={fuelCalculationMode === 'norm'}
                  onChange={() => setFuelCalculationMode('norm')}
                />
                <span>
                  <span className="block font-medium">Oblicz według normy pojazdu</span>
                  <span className="text-sm text-[var(--text-secondary)]">
                    Norma {fuelConsumptionNorm} L/100 km; przewidywany stan końcowy:{' '}
                    {(() => {
                      const projectedFuel = calculateProjectedEndFuel({
                        startFuel,
                        fuelAdded,
                        distance: Number(endOdometer) - Number(startOdometer),
                        vehicle,
                      });
                      return projectedFuel === null
                        ? 'brak danych'
                        : `${Math.max(0, projectedFuel).toFixed(2)} L`;
                    })()}
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer gap-3 rounded-md border border-[var(--border-color)] p-3">
                <input
                  type="radio"
                  name="fuel-calculation-mode"
                  value="manual_end_fuel"
                  checked={fuelCalculationMode === 'manual_end_fuel'}
                  onChange={() => setFuelCalculationMode('manual_end_fuel')}
                />
                <span className="flex-1">
                  <span className="block font-medium">Podaj końcowy stan paliwa</span>
                  <span className="mt-2 block text-sm text-[var(--text-secondary)]">Końcowy stan paliwa (L)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualEndFuel}
                    onChange={(event) => setManualEndFuel(event.target.value)}
                    className="mt-1 w-full rounded-md border border-[var(--border-color)] bg-[var(--input-bg-color,#ffffff)] px-3 py-2 text-[var(--input-text-color,#111827)]"
                  />
                </span>
              </label>
              <label className="flex cursor-pointer gap-3 rounded-md border border-[var(--border-color)] p-3">
                <input
                  type="radio"
                  name="fuel-calculation-mode"
                  value="manual_fuel_used"
                  checked={fuelCalculationMode === 'manual_fuel_used'}
                  onChange={() => setFuelCalculationMode('manual_fuel_used')}
                />
                <span className="flex-1">
                  <span className="block font-medium">Podaj rzeczywiście zużyte paliwo</span>
                  <span className="mt-2 block text-sm text-[var(--text-secondary)]">Zużycie paliwa (L)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualFuelUsed}
                    onChange={(event) => setManualFuelUsed(event.target.value)}
                    className="mt-1 w-full rounded-md border border-[var(--border-color)] bg-[var(--input-bg-color,#ffffff)] px-3 py-2 text-[var(--input-text-color,#111827)]"
                  />
                  <span className="mt-1 block text-xs text-[var(--text-secondary)]">
                    Końcowy stan paliwa zostanie wyliczony z paliwa początkowego, tankowania i podanego zużycia.
                  </span>
                </span>
              </label>
            </fieldset>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowFuelCalculationPrompt(false)}
                className="rounded-md border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              >
                Wróć do danych
              </button>
              <button
                type="button"
                onClick={() => handleEndTrip(fuelCalculationMode)}
                disabled={updateTripMutation.isPending}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {updateTripMutation.isPending ? 'Zapisywanie...' : 'Zakończ przejazd'}
              </button>
            </div>
          </div>
        </div>
      )}
      {syncPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sync-following-title"
            aria-describedby="sync-following-description"
            className="w-full max-w-lg rounded-lg border border-[var(--border-color)] bg-[var(--surface)] p-6 text-[var(--text-primary)] shadow-xl"
          >
            <h2 id="sync-following-title" className="text-lg font-semibold">
              Aktualizacja kolejnych kart podróży
            </h2>
            <p id="sync-following-description" className="mt-2 text-sm text-[var(--text-secondary)]">
              Dane karty drogowej zostały zmienione. Czy chcesz zaktualizować kolejne karty podróży tego pojazdu, aby zachować ciągłość przebiegu i prawidłowo przeliczyć zużycie paliwa?
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setSyncPrompt(null)}
                disabled={isSyncingFollowing}
                className="rounded-md border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
              >
                Nie, pozostaw bez zmian
              </button>
              <button
                type="button"
                onClick={handleSynchronizeFollowingTrips}
                disabled={isSyncingFollowing}
                className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isSyncingFollowing ? 'Aktualizowanie...' : 'Tak, zaktualizuj kolejne karty'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Nagłówek */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-token-primary">
            Karta drogowa {trip.tripNumber || `#${String(trip.id).slice(-5)}`}
          </h2>
          <p className="text-token-muted mt-1">Szczegóły przejazdu</p>
        </div>
        <Link
          to={createPageUrl('Trips')}
          className="px-5 py-2 bg-slate-700 text-token-secondary font-medium rounded-lg hover:bg-slate-600 transition-colors flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Wróć
        </Link>
      </div>

      {/* Zakładki */}
      <div className="flex surface rounded-lg p-1 max-w-md">
        {[
          { key: 'karta', label: 'Karta drogowa' },
          { key: 'polecenie', label: 'Polecenie wyjazdu' },
          { key: 'cala', label: 'Cała karta' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key ? 'bg-indigo-600 text-token-primary shadow' : 'text-token-muted hover:text-token-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Główna zawartość */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Panel boczny */}
        <div className="lg:col-span-1 space-y-6">
          <div className="surface-muted border border-token rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-token-primary flex items-center">
              <FileText className="w-5 h-5 mr-2 text-indigo-400" />
              {activeTab === 'karta' && 'Karta drogowa'}
              {activeTab === 'polecenie' && 'Polecenie wyjazdu'}
              {activeTab === 'cala' && 'Cała karta (dwa dokumenty)'}
            </h3>

            {activeTab !== 'cala' ? (
              <div className="space-y-3">
                <button
                  onClick={() => generateSinglePdf(activeTab, 'A4')}
                  disabled={isGeneratingPdf}
                  className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-token-primary font-semibold rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isGeneratingPdf && pdfFormat === 'A4' ? 'Generowanie...' : 'Pobierz PDF (A4)'}
                </button>
                <button
                  onClick={() => generateSinglePdf(activeTab, 'A5')}
                  disabled={isGeneratingPdf}
                  className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isGeneratingPdf && pdfFormat === 'A5' ? 'Generowanie...' : 'Pobierz PDF (A5)'}
                </button>
                
                {/* 🔧 PRZYCISK DRUKOWANIA */}
                <button
                  onClick={handlePrint}
                  className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-token-primary font-semibold rounded-lg transition-colors flex items-center justify-center"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Drukuj dokument
                </button>
                
                <p className="text-xs text-slate-500 mt-2">Pojedynczy dokument do druku.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => generateBothPdf('A4')}
                  disabled={isGeneratingPdf}
                  className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-token-primary font-semibold rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isGeneratingPdf && pdfFormat === 'A4' ? 'Generowanie...' : 'Pobierz oba dokumenty PDF (A4)'}
                </button>
                <button
                  onClick={() => generateBothPdf('A5')}
                  disabled={isGeneratingPdf}
                  className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isGeneratingPdf && pdfFormat === 'A5' ? 'Generowanie...' : 'Pobierz oba dokumenty PDF (A5)'}
                </button>
                
                {/* 🔧 PRZYCISK DRUKOWANIA */}
                <button
                  onClick={handlePrint}
                  className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-token-primary font-semibold rounded-lg transition-colors flex items-center justify-center"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Drukuj oba dokumenty
                </button>
                
                <p className="text-xs text-slate-500 mt-2">Dwa dokumenty w jednym pliku PDF.</p>
              </div>
            )}
          </div>

          {/* Panel z danymi i formularzami */}
          <div className="surface-muted border border-token rounded-2xl p-6">
            {trip.status === 'in_progress' && !showEndForm && (
              <div className="mb-6">
                <button
                  onClick={() => setShowEndForm(true)}
                  className="w-full py-4 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-token-primary font-bold rounded-xl flex items-center justify-center gap-3 text-lg shadow-lg"
                >
                  <StopCircle className="w-6 h-6" />
                  Zakończ przejazd
                </button>
                <p className="text-xs text-token-muted mt-2 text-center">
                  Kliknij, aby wprowadzić dane końcowe i wygenerować kartę drogową
                </p>
              </div>
            )}

            {trip.status === 'in_progress' && showEndForm && (
              <div className="mb-6 border border-emerald-500/30 rounded-xl p-4 bg-emerald-500/5">
                <h3 className="text-lg font-semibold text-token-primary mb-4 flex items-center gap-2">
                  <StopCircle className="w-5 h-5 text-emerald-400" />
                  Zakończ przejazd
                </h3>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  <div className="surface-subtle rounded-lg p-3 mb-2">
                    <p className="text-token-muted text-sm">Dane rozpoczęcia (zapamiętane):</p>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div>
                        <span className="text-slate-500 text-xs">Przebieg początkowy:</span>
                        <div className="text-token-primary font-bold text-lg">{startOdometer} km</div>
                      </div>
                      <div>
                        <span className="text-slate-500 text-xs">Stan paliwa początkowy:</span>
                        <div className="text-token-primary font-bold text-lg">{formatValue(startFuel === '' ? null : Number(startFuel).toFixed(2), ' L')}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nowy stan licznika (km) *</label>
                    <input
                      type="number"
                      value={endOdometer}
                      onChange={(e) => {
                        const newEndOdometer = Number(e.target.value);
                        setEndOdometer(newEndOdometer);
                        const newDistance = newEndOdometer - startOdometer;
                        const autoEndFuel = calculateProjectedEndFuel({
                          startFuel,
                          fuelAdded,
                          distance: newDistance,
                          vehicle,
                        });
                        setEndFuel(autoEndFuel === null ? '' : Math.max(0, autoEndFuel));
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] text-lg shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                      min={startOdometer + 1}
                      required
                    />
                  </div>

                  {endOdometer > startOdometer && (
                    <div className="bg-emerald-500/20 rounded-lg p-3">
                      <p className="text-emerald-300 text-sm font-semibold mb-2">Przejechany dystans:</p>
                      <div className="text-token-primary text-2xl font-bold">{endOdometer - startOdometer} km</div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-token-secondary mb-1">Dolano paliwa (L) - opcjonalnie</label>
                    <input
                      type="number"
                      step="0.1"
                      value={fuelAdded}
                      onChange={(e) => {
                        const newFuelAdded = Number(e.target.value);
                        setFuelAdded(newFuelAdded);
                        const newDistance = endOdometer - startOdometer;
                        const autoEndFuel = calculateProjectedEndFuel({
                          startFuel,
                          fuelAdded: newFuelAdded,
                          distance: newDistance,
                          vehicle,
                        });
                        setEndFuel(autoEndFuel === null ? '' : Math.max(0, autoEndFuel));
                      }}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-token-primary"
                    />
                  </div>

                  {endOdometer > startOdometer && (
                    <div className="bg-indigo-900/30 rounded-lg p-3">
                      <p className="text-indigo-300 text-sm font-semibold mb-2">Automatyczne wyliczenia:</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-token-muted">Norma spalania:</span>
                          <span className="text-cyan-400 font-bold ml-2">{fuelConsumptionNorm} L/100km</span>
                        </div>
                        <div>
                          <span className="text-token-muted">Zużycie wg normy:</span>
                          <span className="text-orange-400 font-bold ml-2">
                            {fuelUsedNorm === null ? 'brak danych' : `${fuelUsedNorm.toFixed(2)} L`}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-token-muted">AUTOMATYCZNY NOWY STAN PALIWA:</span>
                          <span className="text-green-400 font-bold ml-2 text-lg">{formatValue(endFuel === '' ? null : Number(endFuel).toFixed(2), ' L')}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-token-secondary mb-1">Gdzie zatankowano</label>
                    <input
                      type="text"
                      value={fuelStation}
                      onChange={(e) => setFuelStation(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-token-primary"
                      placeholder="np. Orlen"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-token-secondary mb-1">Nr kwitu</label>
                    <input
                      type="text"
                      value={fuelReceiptNumber}
                      onChange={(e) => setFuelReceiptNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-token-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-token-secondary mb-1">Koszt tankowania (zł)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={fuelCost}
                      onChange={(e) => setFuelCost(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-token-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-token-secondary mb-1">Zatwierdził przejazd</label>
                    <input
                      type="text"
                      value={approvalPerson}
                      onChange={(e) => setApprovalPerson(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-token-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-token-secondary mb-1">Data powrotu</label>
                    <input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-token-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-token-secondary mb-1">Godzina powrotu</label>
                    <input
                      type="time"
                      value={returnTime}
                      onChange={(e) => setReturnTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-token-primary"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setShowEndForm(false)}
                      className="flex-1 py-2 px-3 bg-slate-600 hover:bg-slate-700 text-token-primary rounded-lg"
                    >
                      Anuluj
                    </button>
                    <button
                      onClick={handleEndTrip}
                      disabled={updateTripMutation.isPending}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-token-primary rounded-lg font-semibold"
                    >
                      {updateTripMutation.isPending ? 'Zapisywanie...' : 'Zakończ'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {trip.status === 'completed' && !isEditing && (
              <div className="mb-6">
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full py-4 px-4 bg-indigo-600 hover:bg-indigo-700 text-token-primary font-bold rounded-xl flex items-center justify-center gap-3 text-lg shadow-lg"
                >
                  <Edit className="w-6 h-6" />
                  Edytuj przejazd
                </button>
              </div>
            )}

            {!isEditing && trip.status !== 'in_progress' ? (
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Pojazd', value: `${vehicle.make} ${vehicle.model}` },
                  { label: 'Nr rejestracyjny', value: vehicle.registrationNumber },
                  { label: 'Kierowca', value: driver.name },
                  { label: 'Data wyjazdu', value: departureDate },
                  { label: 'Godzina wyjazdu', value: departureTime },
                  { label: 'Zlecił', value: orderedBy },
                  { label: 'Zatwierdził przejazd', value: approvalPerson || trip?.arrivalSignature || trip?.resultsControlSignature },
                  { label: 'Cel', value: purpose },
                  { label: 'Trasa', value: `${startLocation || '?'} → ${endLocation || '?'}` },
                  { label: 'Przebieg początkowy', value: formatValue(startOdometer, ' km') },
                  { label: 'Paliwo na start', value: formatValue(startFuel === '' ? null : Number(startFuel).toFixed(2), ' L') },
                  { label: 'Norma zużycia', value: `${fuelConsumptionNorm} L/100km` },
                  { label: 'Przebieg końcowy', value: formatValue(endOdometer, ' km') },
                  { label: 'Paliwo końcowe', value: formatValue(endFuel === '' ? null : Number(endFuel).toFixed(2), ' L') },
                  { label: 'Pobrane paliwo', value: formatValue(fuelAdded === '' ? null : Number(fuelAdded).toFixed(2), ' L') },
                  { label: 'Data powrotu', value: returnDate },
                  { label: 'Godzina powrotu', value: returnTime },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center p-2 bg-slate-700/40 rounded-lg">
                    <span className="text-token-muted">{row.label}:</span>
                    <span className="font-semibold text-token-primary">{row.value || '-'}</span>
                  </div>
                ))}
              </div>
            ) : isEditing ? (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <h4 className="font-semibold text-token-primary border-b border-slate-600 pb-1">Dane wyjazdu</h4>
                <div>
                  <label className="block text-sm font-medium text-token-secondary mb-1">Data wyjazdu</label>
                  <input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-token-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-token-secondary mb-1">Godzina wyjazdu</label>
                  <input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-token-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-token-secondary mb-1">Zlecił</label>
                  <input type="text" value={orderedBy} onChange={(e) => setOrderedBy(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-token-primary" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-token-secondary mb-1">Zatwierdził przejazd</label>
                  <input type="text" value={approvalPerson} onChange={(e) => setApprovalPerson(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-token-primary" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-token-secondary mb-1">Cel podróży</label>                  <input type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-token-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-token-secondary mb-1">Skąd</label>
                  <input type="text" value={startLocation} onChange={(e) => setStartLocation(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-token-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-token-secondary mb-1">Dokąd</label>
                  <input type="text" value={endLocation} onChange={(e) => setEndLocation(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-token-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-token-secondary mb-1">Przebieg początkowy (km)</label>
                  <input type="number" value={startOdometer} onChange={(e) => setStartOdometer(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-token-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-token-secondary mb-1">Paliwo na start (L)</label>
                  <input type="number" step="0.1" value={startFuel} onChange={(e) => setStartFuel(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-token-primary" />
                </div>
                <h4 className="font-semibold text-token-primary border-b border-slate-600 pb-1 mt-4">Dane powrotu</h4>
                <div>
                  <label className="block text-sm font-medium text-token-secondary mb-1">Przebieg końcowy (km)</label>
                  <input type="number" value={endOdometer} onChange={(e) => setEndOdometer(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-token-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-token-secondary mb-1">Paliwo końcowe (L)</label>
                  <input type="number" step="0.1" value={endFuel} onChange={(e) => setEndFuel(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-token-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-token-secondary mb-1">Pobrane paliwo (L)</label>
                  <input type="number" step="0.1" value={fuelAdded} onChange={(e) => setFuelAdded(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-token-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-token-secondary mb-1">Gdzie zatankowano</label>
                  <input type="text" value={fuelStation} onChange={(e) => setFuelStation(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-token-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-token-secondary mb-1">Nr kwitu</label>
                  <input type="text" value={fuelReceiptNumber} onChange={(e) => setFuelReceiptNumber(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-token-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-token-secondary mb-1">Koszt tankowania (zł)</label>
                  <input type="number" step="0.01" value={fuelCost} onChange={(e) => setFuelCost(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-token-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-token-secondary mb-1">Data powrotu</label>
                  <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-token-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-token-secondary mb-1">Godzina powrotu</label>
                  <input type="time" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-token-primary" />
                </div>
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-2 px-3 bg-slate-600 hover:bg-slate-700 text-token-primary rounded-lg"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={handleEndTrip}
                    disabled={updateTripMutation.isPending}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-token-primary rounded-lg font-semibold"
                  >
                    {updateTripMutation.isPending ? 'Zapisywanie...' : 'Zapisz zmiany'}
                  </button>
                </div>
              </div>
            ) : null}

            {trip.status === 'completed' && !isEditing && (
              <div className="mt-6 pt-6 border-t border-token">
                <h3 className="text-lg font-semibold mb-4 text-token-primary">Wyniki przejazdu</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center p-2 bg-emerald-500/10 rounded-lg">
                    <span className="text-token-muted">Dystans:</span>
                    <span className="font-semibold text-emerald-400">{trip.distance || 0} km</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-blue-500/10 rounded-lg">
                    <span className="text-token-muted">Zużycie wg normy:</span>
                    <span className="font-semibold text-blue-400">{(trip.fuelUsedNorm || 0).toFixed(2)} L</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-amber-500/10 rounded-lg">
                    <span className="text-token-muted">Zużycie rzeczywiste:</span>
                    <span className="font-semibold text-amber-400">{(trip.fuelUsedActual || 0).toFixed(2)} L</span>
                  </div>
                  {(trip.fuelSavings || 0) > 0 && (
                    <div className="flex justify-between items-center p-2 bg-emerald-500/10 rounded-lg">
                      <span className="text-token-muted">Oszczędność:</span>
                      <span className="font-semibold text-emerald-400">{trip.fuelSavings.toFixed(2)} L</span>
                    </div>
                  )}
                  {(trip.fuelOveruse || 0) > 0 && (
                    <div className="flex justify-between items-center p-2 bg-red-500/10 rounded-lg">
                      <span className="text-token-muted">Przekroczenie:</span>
                      <span className="font-semibold text-red-400">{trip.fuelOveruse.toFixed(2)} L</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Podgląd dokumentu */}
        <div className="lg:col-span-2">
          <div className="surface-muted border border-token rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-token-primary mb-4">
              Podgląd: {activeTab === 'karta' && 'Karta drogowa'}
              {activeTab === 'polecenie' && 'Polecenie wyjazdu służbowego'}
              {activeTab === 'cala' && 'Karta drogowa + Polecenie wyjazdu'}
            </h3>
            <div className="overflow-auto bg-white border border-slate-600 rounded-lg" style={{ maxHeight: '80vh' }}>
              {activeTab === 'karta' && (
                <KartaDrogowa
                  ref={kartaRef}
                  trip={{
                    ...trip,
                    departureDate,
                    departureTime,
                    startDate: departureDate || trip?.startDate || trip?.startTime,
                    startTime: departureTime || trip?.startTime,
                    endDate: returnDate || trip?.endDate || trip?.endTime,
                    endTime: returnTime || trip?.endTime,
                    orderedBy,
                    purpose,
                    startLocation,
                    endLocation,
                    startOdometer,
                    startFuel,
                    endOdometer,
                    endFuel,
                    fuelAdded,
                    fuelReceiptNumber,
                    fuelStation,
                    fuelCost,
                    returnDate,
                    returnTime,
                  }}
                  vehicle={vehicle}
                  driver={driver}
                  company={settings}
                  endMileage={endOdometer}
                  endFuel={endFuel}
                  fuelAdded={fuelAdded}
                  format={pdfFormat}
                />
              )}
              {activeTab === 'polecenie' && (
                <PolecenieWyjazdu
                  ref={polecenieRef}
                  trip={{
                    ...trip,
                    departureDate,
                    departureTime,
                    orderedBy,
                    purpose,
                    startLocation,
                    endLocation,
                    startOdometer,
                    startFuel,
                    endOdometer,
                    endFuel,
                    fuelAdded,
                    fuelReceiptNumber,
                    fuelStation,
                    fuelCost,
                    returnDate,
                    returnTime,
                  }}
                  vehicle={vehicle}
                  driver={driver}
                  company={settings}
                  format={pdfFormat}
                />
              )}
              {activeTab === 'cala' && (
                <div>
                  <div className="mb-8 pb-4 border-b border-gray-300">
                    <KartaDrogowa
                      ref={kartaRef}
                      trip={{
                        ...trip,
                        departureDate,
                        departureTime,
                        startDate: departureDate || trip?.startDate || trip?.startTime,
                        startTime: departureTime || trip?.startTime,
                        endDate: returnDate || trip?.endDate || trip?.endTime,
                        endTime: returnTime || trip?.endTime,
                        orderedBy,
                        purpose,
                        startLocation,
                        endLocation,
                        startOdometer,
                        startFuel,
                        endOdometer,
                        endFuel,
                        fuelAdded,
                        fuelReceiptNumber,
                        fuelStation,
                        fuelCost,
                        returnDate,
                        returnTime,
                      }}
                      vehicle={vehicle}
                      driver={driver}
                      company={settings}
                      endMileage={endOdometer}
                      endFuel={endFuel}
                      fuelAdded={fuelAdded}
                      format={pdfFormat}
                    />
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-300">
                    <PolecenieWyjazdu
                      ref={polecenieRef}
                      trip={{
                        ...trip,
                        departureDate,
                        departureTime,
                        orderedBy,
                        purpose,
                        startLocation,
                        endLocation,
                        startOdometer,
                        startFuel,
                        endOdometer,
                        endFuel,
                        fuelAdded,
                        fuelReceiptNumber,
                        fuelStation,
                        fuelCost,
                        returnDate,
                        returnTime,
                      }}
                      vehicle={vehicle}
                      driver={driver}
                      company={settings}
                      format={pdfFormat}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}