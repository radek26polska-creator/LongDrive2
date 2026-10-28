import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

export default function TripStartForm({ vehicles, drivers, onSubmit, onCancel }) {
  const now = new Date();
  const todayDate = getLocalDateValue(now);
  const currentTime = getLocalTimeValue(now);

  const [formData, setFormData] = useState({
    vehicleId: '',
    driverId: '',
    orderedBy: '',
    purpose: '',
    startLocation: '',
    endLocation: '',
    startFuel: '',
    departureDate: todayDate,
    departureTime: currentTime,
  });

  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const handleVehicleChange = (vehicleId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    setSelectedVehicle(vehicle);
    setFormData(prev => ({ ...prev, vehicleId }));
    if (vehicle && vehicle.fuelLevel !== undefined) {
      setFormData(prev => ({ ...prev, startFuel: vehicle.fuelLevel.toString() }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let startTime = new Date().toISOString();
    if (formData.departureDate && formData.departureTime) {
      startTime = buildLocalDateTime(formData.departureDate, formData.departureTime).toISOString();
    }

    const tripData = {
      vehicleId: formData.vehicleId,
      driverId: formData.driverId,
      orderedBy: formData.orderedBy,
      purpose: formData.purpose,
      startLocation: formData.startLocation,
      endLocation: formData.endLocation,
      startTime,
      startDate: startTime,
      departureDate: formData.departureDate,
      departureTime: formData.departureTime,
      startOdometer: selectedVehicle?.mileage || 0,
      startFuel: parseFloat(formData.startFuel) || 0,
      status: 'in_progress'
    };

    console.log('🚀 Rozpoczęcie trasy:', tripData);
    onSubmit(tripData);
  };

  const set = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-300">Pojazd *</Label>
          <Select value={formData.vehicleId} onValueChange={handleVehicleChange} required>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Wybierz pojazd" />
            </SelectTrigger>
            <SelectContent>
              {vehicles.filter(v => v.status === 'available').map(v => (
                <SelectItem key={v.id} value={v.id}>
                  {v.make} {v.model} ({v.registrationNumber})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-slate-300">Kierowca *</Label>
          <Select value={formData.driverId} onValueChange={(v) => set('driverId', v)} required>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-300">Data rozpoczęcia przejazdu *</Label>
          <Input
            type="date"
            value={formData.departureDate}
            onChange={(e) => set('departureDate', e.target.value)}
            className="bg-slate-800 border-slate-700 text-white"
            required
          />
        </div>
        <div className="space-y-2">
          <Label className="text-slate-300">Godzina rozpoczęcia *</Label>
          <Input
            type="time"
            value={formData.departureTime}
            onChange={(e) => set('departureTime', e.target.value)}
            className="bg-slate-800 border-slate-700 text-white"
            required
          />
        </div>
      </div>

      {selectedVehicle && (
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3">
          <p className="text-sm text-indigo-400 mb-1">📊 Aktualny stan pojazdu:</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-slate-400">Przebieg:</span>
              <span className="text-white font-bold ml-2">{selectedVehicle.mileage} km</span>
            </div>
            <div>
              <span className="text-slate-400">Stan paliwa:</span>
              <span className="text-white font-bold ml-2">{selectedVehicle.fuelLevel || 0} L</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-slate-300">Kto zlecił przejazd *</Label>
        <Input
          value={formData.orderedBy}
          onChange={(e) => set('orderedBy', e.target.value)}
          className="bg-slate-800 border-slate-700 text-white"
          placeholder="Imię i nazwisko zlecającego"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-300">Skąd</Label>
          <Input
            value={formData.startLocation}
            onChange={(e) => set('startLocation', e.target.value)}
            className="bg-slate-800 border-slate-700 text-white"
            placeholder="Miejsce wyjazdu"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-slate-300">Dokąd</Label>
          <Input
            value={formData.endLocation}
            onChange={(e) => set('endLocation', e.target.value)}
            className="bg-slate-800 border-slate-700 text-white"
            placeholder="Miejsce docelowe"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-300">Cel wyjazdu</Label>
        <Input
          value={formData.purpose}
          onChange={(e) => set('purpose', e.target.value)}
          className="bg-slate-800 border-slate-700 text-white"
          placeholder="np. Wyjazd służbowy"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-slate-300">Aktualny stan paliwa (litry) *</Label>
        <Input
          type="number"
          step="0.1"
          value={formData.startFuel}
          onChange={(e) => set('startFuel', e.target.value)}
          className="bg-slate-800 border-slate-700 text-white"
          placeholder="np. 45.5"
          required
        />
        <p className="text-xs text-slate-400">Stan paliwa przed rozpoczęciem przejazdu</p>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="border-slate-600 text-slate-300 hover:bg-slate-800">
          Anuluj
        </Button>
        <Button type="submit" className="bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600">
          Rozpocznij przejazd
        </Button>
      </div>
    </form>
  );
}