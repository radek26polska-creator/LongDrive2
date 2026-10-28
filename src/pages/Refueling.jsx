// src/pages/Refueling.jsx
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Fuel, Plus, Edit, Trash2, TrendingUp, RefreshCw } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import SaveButton from "@/components/ui/SaveButton";
import { useToast } from "@/components/ui/use-toast";
import api from "@/api/apiClient";

// Lista województw
const voivodeships = [
  "DOLNOŚLĄSKIE", "KUJAWSKO-POMORSKIE", "LUBELSKIE", "LUBUSKIE",
  "ŁÓDZKIE", "MAŁOPOLSKIE", "MAZOWIECKIE", "OPOLSKIE",
  "PODKARPACKIE", "PODLASKIE", "POMORSKIE", "ŚLĄSKIE",
  "ŚWIĘTOKRZYSKIE", "WARMIŃSKO-MAZURSKIE", "WIELKOPOLSKIE", "ZACHODNIOPOMORSKIE"
];

// Klucz API CollectAPI (w produkcji przenieś do .env!)
const COLLECT_API_KEY = "apikey 3DVClldFLIRO4LSaryQwFw:6bNkoLjBB56fEpMEx66nzr";

export default function Refueling() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRefuel, setEditingRefuel] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [selectedVehicleFuel, setSelectedVehicleFuel] = useState(0);
  const [selectedVehicleTankSize, setSelectedVehicleTankSize] = useState(0);
  
  // Stany dla cen paliw
  const [selectedVoivodeship, setSelectedVoivodeship] = useState("");
  const [fuelPrices, setFuelPrices] = useState(null);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [dataSource, setDataSource] = useState(null);

  const { data: refuels = [], isLoading: refuelsLoading } = useQuery({
    queryKey: ['refuels'],
    queryFn: api.getRefuels,
    refetchOnMount: true
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: api.getVehicles,
    refetchOnMount: true
  });

  // Funkcja pobierająca ceny paliw
  const fetchFuelPrices = async () => {
    if (!selectedVoivodeship) {
      toast({ title: "Uwaga", description: "Wybierz województwo", variant: "destructive" });
      return;
    }
    
    setLoadingPrices(true);
    try {
      console.log("🔍 Pobieranie cen z CollectAPI...");
      
      const response = await fetch("https://api.collectapi.com/gasPrice/europeanCountries", {
        method: "GET",
        headers: {
          "authorization": COLLECT_API_KEY,
          "content-type": "application/json"
        }
      });
      
      console.log("📡 Status odpowiedzi:", response.status);
      
      if (response.status === 429) {
        console.warn("⚠️ Limit zapytań wyczerpany");
        toast({ 
          title: "Limit zapytań", 
          description: "Przekroczono limit 100 zapytań dziennie. Używam danych zapasowych.", 
          variant: "destructive" 
        });
        
        setFuelPrices({
          pb95: "7.06",
          on: "8.21",
          lpg: "3.54"
        });
        setLastUpdate(new Date());
        setDataSource("dane zapasowe (limit API)");
        return;
      }
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      console.log("✅ Otrzymane dane z CollectAPI:", data);
      
      const poland = data.result?.find(c => c.country?.toLowerCase() === "poland");
      
      if (poland) {
        console.log("🇵🇱 Znaleziono Polskę:", poland);
        const euroToPln = 4.30;
        const pb95 = (parseFloat(poland.gasoline?.replace(',', '.')) * euroToPln).toFixed(2);
        const on = (parseFloat(poland.diesel?.replace(',', '.')) * euroToPln).toFixed(2);
        let lpg = "3.25";
        if (poland.lpg && poland.lpg !== "-") {
          lpg = (parseFloat(poland.lpg?.replace(',', '.')) * euroToPln).toFixed(2);
        }
        
        console.log(`💰 Ceny w PLN: Pb95=${pb95}, ON=${on}, LPG=${lpg}`);
        
        setFuelPrices({ pb95, on, lpg });
        setLastUpdate(new Date());
        setDataSource("collectapi.com");
        toast({ title: "Sukces", description: `Pobrano ceny dla ${selectedVoivodeship.toLowerCase()}` });
      } else {
        throw new Error("Nie znaleziono danych dla Polski");
      }
    } catch (error) {
      console.error("❌ Błąd pobierania cen:", error);
      setFuelPrices({
        pb95: "7.06",
        on: "8.21",
        lpg: "3.54"
      });
      setLastUpdate(new Date());
      setDataSource("dane zapasowe");
      toast({ title: "Uwaga", description: "Używam danych zapasowych", variant: "warning" });
    } finally {
      setLoadingPrices(false);
    }
  };

  useEffect(() => {
    if (selectedVehicleId) {
      const vehicle = vehicles.find(v => v.id === Number(selectedVehicleId));
      if (vehicle) {
        setSelectedVehicleFuel(vehicle.fuelLevel || 0);
        setSelectedVehicleTankSize(vehicle.tankSize || 0);
      }
    } else {
      setSelectedVehicleFuel(0);
      setSelectedVehicleTankSize(0);
    }
  }, [selectedVehicleId, vehicles]);

  useEffect(() => {
    if (editingRefuel) {
      setSelectedVehicleId(String(editingRefuel.vehicleId));
    } else {
      setSelectedVehicleId("");
    }
  }, [editingRefuel]);

  const sortedRefuels = [...refuels].sort((a, b) => new Date(b.date) - new Date(a.date));

  const updateVehicleFuel = async (vehicleId, liters, fullTank) => {
    try {
      const vehicle = await api.getVehicle(Number(vehicleId));
      if (!vehicle) return;
      let newFuelLevel;
      if (fullTank) {
        newFuelLevel = vehicle.tankSize;
      } else {
        newFuelLevel = Math.min((vehicle.fuelLevel || 0) + liters, vehicle.tankSize);
      }
      await api.updateVehicle(Number(vehicleId), { fuelLevel: newFuelLevel });
    } catch (error) {
      console.error('Błąd aktualizacji paliwa:', error);
    }
  };

  const mutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        vehicleId: Number(data.vehicleId),
        date: data.date,
        liters: Number(data.liters),
        cost: Number(data.cost),
        mileage: data.mileage ? Number(data.mileage) : null,
        invoiceNumber: data.invoiceNumber || null,
        notes: data.notes || null,
        fullTank: data.fullTank ? 1 : 0,
      };
      if (data.id) {
        return api.updateRefuel(data.id, payload);
      } else {
        return api.createRefuel(payload);
      }
    },
    onSuccess: async (data, variables) => {
      if (!variables.id) {
        await updateVehicleFuel(variables.vehicleId, Number(variables.liters), variables.fullTank);
      }
      queryClient.invalidateQueries({ queryKey: ['refuels'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast({
        title: "Sukces",
        description: variables.id ? "Zaktualizowano tankowanie" : "Dodano tankowanie",
      });
      setIsAddModalOpen(false);
      setEditingRefuel(null);
      setSelectedVehicleId("");
    },
    onError: (error) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zapisać tankowania",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      vehicleId: selectedVehicleId,
      date: formData.get('date'),
      liters: formData.get('liters'),
      cost: formData.get('cost'),
      mileage: formData.get('mileage'),
      invoiceNumber: formData.get('invoiceNumber'),
      notes: formData.get('notes'),
      fullTank: formData.get('fullTank') === 'on',
    };
    if (editingRefuel) {
      data.id = editingRefuel.id;
    }
    mutation.mutate(data);
  };

  const openEditModal = (refuel) => {
    setEditingRefuel(refuel);
    setIsAddModalOpen(true);
  };

  const deleteRefuel = async (id) => {
    if (window.confirm('Czy na pewno usunąć to tankowanie?')) {
      try {
        await api.deleteRefuel(id);
        queryClient.invalidateQueries({ queryKey: ['refuels'] });
        toast({ title: "Usunięto", description: "Tankowanie zostało usunięte" });
      } catch (error) {
        toast({ title: "Błąd", variant: "destructive", description: "Nie udało się usunąć" });
      }
    }
  };

  const isSaving = mutation.isPending;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tankowania"
        subtitle="Rejestr tankowań i wpływ na stan paliwa"
        icon={Fuel}
        action={
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Dodaj tankowanie
          </Button>
        }
      />

      {/* AKTUALNE CENY PALIW */}
      <GlassCard className="p-5 mb-6" hover={false}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--primary-soft)] border border-[var(--border-color)] flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-[var(--primary-light)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Aktualne ceny paliw w Polsce</h3>
            <p className="text-xs text-[var(--text-muted)]">Wybierz województwo i odśwież</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <Select value={selectedVoivodeship} onValueChange={setSelectedVoivodeship}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Wybierz województwo" />
              </SelectTrigger>
              <SelectContent>
                {voivodeships.map(v => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={fetchFuelPrices}
            disabled={loadingPrices || !selectedVoivodeship}
            size="sm"
            className="h-9"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${loadingPrices ? 'animate-spin' : ''}`} />
            {loadingPrices ? 'Pobieranie...' : 'Pobierz ceny'}
          </Button>
        </div>
        
        {fuelPrices ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="surface-raised rounded-[var(--radius-sm)] p-3 text-center">
                <div className="text-lg font-bold text-[var(--text-primary)]">{fuelPrices.pb95} <span className="text-xs font-normal text-[var(--text-muted)]">zł/l</span></div>
                <div className="text-[10px] text-[var(--text-muted)]">Benzyna Pb95</div>
              </div>
              <div className="surface-raised rounded-[var(--radius-sm)] p-3 text-center">
                <div className="text-lg font-bold text-[var(--text-primary)]">{fuelPrices.on} <span className="text-xs font-normal text-[var(--text-muted)]">zł/l</span></div>
                <div className="text-[10px] text-[var(--text-muted)]">Olej napędowy</div>
              </div>
              <div className="surface-raised rounded-[var(--radius-sm)] p-3 text-center">
                <div className="text-lg font-bold text-[var(--text-primary)]">{fuelPrices.lpg} <span className="text-xs font-normal text-[var(--text-muted)]">zł/l</span></div>
                <div className="text-[10px] text-[var(--text-muted)]">Autogaz LPG</div>
              </div>
            </div>
            {lastUpdate && (
              <div className="flex justify-between items-center mt-3 text-[10px] text-[var(--text-muted)]">
                <span>Źródło: {dataSource || 'collectapi.com'}</span>
                <span>Aktualizacja: {lastUpdate.toLocaleTimeString()}</span>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-2 text-[var(--text-muted)] text-xs">
            {selectedVoivodeship ? 'Kliknij "Pobierz ceny" aby wyświetlić dane' : 'Wybierz województwo aby pobrać ceny'}
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-0 overflow-hidden" hover={false}>
        {refuelsLoading ? (
          <div className="text-center py-12">Ładowanie...</div>
        ) : sortedRefuels.length === 0 ? (
          <div className="text-center py-12 px-6">
            <Fuel className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4 opacity-60" />
            <p className="text-[var(--text-muted)]">Brak tankowań w systemie</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="surface-raised">
                <tr className="text-left text-xs uppercase tracking-wide text-[var(--text-muted)] border-b border-[var(--border-color)]">
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 font-medium">Pojazd</th>
                  <th className="px-5 py-3 font-medium">Ilość (l)</th>
                  <th className="px-5 py-3 font-medium">Koszt</th>
                  <th className="px-5 py-3 font-medium">Przebieg</th>
                  <th className="px-5 py-3 font-medium">Faktura</th>
                  <th className="px-5 py-3 font-medium">Uwagi</th>
                  <th className="px-5 py-3 font-medium">Akcje</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {sortedRefuels.map((refuel, index) => {
                  const vehicle = vehicles.find(v => v.id === refuel.vehicleId);
                  return (
                    <motion.tr
                      key={refuel.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-[var(--border-color)] hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <td className="px-5 py-3 text-[var(--text-secondary)]">{new Date(refuel.date).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-[var(--text-primary)]">
                        {vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})` : 'Nieznany'}
                      </td>
                      <td className="px-5 py-3 text-[var(--text-secondary)]">{refuel.liters} l</td>
                      <td className="px-5 py-3 font-medium text-[var(--text-primary)]">{Number(refuel.cost).toFixed(2)} zł</td>
                      <td className="px-5 py-3 text-[var(--text-secondary)]">{refuel.mileage ? refuel.mileage.toLocaleString() + ' km' : '-'}</td>
                      <td className="px-5 py-3"><Badge variant="outline" className="normal-case tracking-normal">{refuel.invoiceNumber || 'Brak'}</Badge></td>
                      <td className="px-5 py-3 text-[var(--text-muted)]">{refuel.notes || '-'}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(refuel)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteRefuel(refuel.id)}>
                            <Trash2 className="w-4 h-4 text-[var(--danger)]" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <Dialog open={isAddModalOpen} onOpenChange={(open) => {
        setIsAddModalOpen(open);
        if (!open) {
          setEditingRefuel(null);
          setSelectedVehicleId("");
        }
      }}>
        <DialogContent className="bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border-color)] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRefuel ? 'Edytuj tankowanie' : 'Nowe tankowanie'}</DialogTitle>
            <DialogDescription className="text-[var(--text-muted)]">
              Wprowadź dane tankowania. Po zapisaniu stan paliwa w pojeździe zostanie zaktualizowany.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pojazd *</Label>
                  <Select
                    value={selectedVehicleId}
                    onValueChange={(value) => setSelectedVehicleId(value)}
                  >
                    <SelectTrigger className="bg-[var(--popover-surface)] border-[var(--border-color)]">
                      <SelectValue placeholder="Wybierz pojazd" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map(vehicle => (
                        <SelectItem key={vehicle.id} value={String(vehicle.id)}>
                          {vehicle.make} {vehicle.model} ({vehicle.registrationNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    name="date"
                    defaultValue={editingRefuel?.date?.split('T')[0] || new Date().toISOString().split('T')[0]}
                    required
                    className="bg-[var(--popover-surface)] border-[var(--border-color)]"
                  />
                </div>
              </div>

              {selectedVehicleId && (
                <div className="surface-raised p-3 rounded-[var(--radius-sm)] text-sm space-y-1 border border-[var(--border-color)]">
                  <p className="text-[var(--text-secondary)]">
                    Aktualny stan paliwa: <span className="font-bold text-[var(--text-primary)]">{selectedVehicleFuel.toFixed(2)} L</span>
                    {selectedVehicleTankSize > 0 && (
                      <> / {selectedVehicleTankSize} L (do pełna: {(selectedVehicleTankSize - selectedVehicleFuel).toFixed(2)} L)</>
                    )}
                  </p>
                  <p className="text-[var(--text-secondary)]">
                    Aktualny przebieg: <span className="font-bold text-[var(--text-primary)]">
                      {vehicles.find(v => v.id === Number(selectedVehicleId))?.mileage?.toLocaleString() || 0} km
                    </span>
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ilość (l) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    name="liters"
                    defaultValue={editingRefuel?.liters}
                    required
                    className="bg-[var(--popover-surface)] border-[var(--border-color)]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Koszt (zł) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    name="cost"
                    defaultValue={editingRefuel?.cost}
                    required
                    className="bg-[var(--popover-surface)] border-[var(--border-color)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Przebieg (km)</Label>
                  <Input
                    type="number"
                    name="mileage"
                    defaultValue={editingRefuel?.mileage}
                    className="bg-[var(--popover-surface)] border-[var(--border-color)]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Numer faktury</Label>
                  <Input
                    type="text"
                    name="invoiceNumber"
                    defaultValue={editingRefuel?.invoiceNumber}
                    className="bg-[var(--popover-surface)] border-[var(--border-color)]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Uwagi</Label>
                <Textarea
                  name="notes"
                  defaultValue={editingRefuel?.notes}
                  className="bg-[var(--popover-surface)] border-[var(--border-color)]"
                  rows={2}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="fullTank"
                  id="fullTank"
                  defaultChecked={editingRefuel?.fullTank}
                  className="rounded border-[var(--border-color)] bg-[var(--popover-surface)] accent-[var(--primary)]"
                />
                <Label htmlFor="fullTank">Zatankowano do pełna</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Anuluj
              </Button>
              <SaveButton
                onSave={() => {
                  const formDataElem = document.querySelector('form');
                  if (formDataElem) {
                    const formDataObj = new FormData(formDataElem);
                    const data = {
                      vehicleId: selectedVehicleId,
                      date: formDataObj.get('date'),
                      liters: formDataObj.get('liters'),
                      cost: formDataObj.get('cost'),
                      mileage: formDataObj.get('mileage'),
                      invoiceNumber: formDataObj.get('invoiceNumber'),
                      notes: formDataObj.get('notes'),
                      fullTank: formDataObj.get('fullTank') === 'on',
                    };
                    if (editingRefuel) {
                      data.id = editingRefuel.id;
                    }
                    return mutation.mutateAsync(data);
                  }
                  return Promise.reject(new Error('Formularz nie znaleziony'));
                }}
                text={editingRefuel ? 'Zapisz zmiany' : 'Dodaj tankowanie'}
                savingText="Zapisywanie..."
                successText={editingRefuel ? 'Zapisano!' : 'Dodano!'}
                variant="default"
                className="min-w-[140px]"
                queryClient={queryClient}
                invalidateQueries={[['refuels'], ['vehicles']]}
                disabled={isSaving}
              />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}