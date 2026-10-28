import React, { useState } from "react";
import { motion } from "framer-motion";
import { Calculator, Fuel, Gauge, DollarSign, TrendingUp, MapPin, RefreshCw, AlertCircle, ExternalLink } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import PageHeader from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// Lista województw
const voivodeships = [
  "DOLNOŚLĄSKIE", "KUJAWSKO-POMORSKIE", "LUBELSKIE", "LUBUSKIE",
  "ŁÓDZKIE", "MAŁOPOLSKIE", "MAZOWIECKIE", "OPOLSKIE",
  "PODKARPACKIE", "PODLASKIE", "POMORSKIE", "ŚLĄSKIE",
  "ŚWIĘTOKRZYSKIE", "WARMIŃSKO-MAZURSKIE", "WIELKOPOLSKIE", "ZACHODNIOPOMORSKIE"
];

// ============================================
// COLLECTAPI - DZIAŁAJĄCE ŹRÓDŁO DANYCH
// ============================================
const COLLECT_API_KEY = "apikey 3DVClldFLIRO4LSaryQwFw:6bNkoLjBB56fEpMEx66nzr";

const fetchFuelPricesFromCollectAPI = async () => {
  try {
    console.log("🔍 Łączę z CollectAPI...");
    
    const response = await fetch("https://api.collectapi.com/gasPrice/europeanCountries", {
      method: "GET",
      headers: {
        "authorization": COLLECT_API_KEY,
        "content-type": "application/json"
      }
    });

    console.log("📡 Status odpowiedzi:", response.status);
    
    if (response.status === 401) {
      console.error("❌ Błąd 401: Nieprawidłowy klucz API lub brak subskrypcji");
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Otrzymane dane z CollectAPI:", data);

    if (data.result && Array.isArray(data.result)) {
      const poland = data.result.find(country => 
        country.country?.toLowerCase() === "poland" ||
        country.country?.toLowerCase() === "polska"
      );
      
      if (poland) {
        console.log("🇵🇱 Znaleziono Polskę:", poland);
        const euroToPln = 4.30;
        
        const gasolinePln = parseFloat(poland.gasoline?.replace(',', '.')) * euroToPln;
        const dieselPln = parseFloat(poland.diesel?.replace(',', '.')) * euroToPln;
        let lpgPln = 3.25;
        
        if (poland.lpg && poland.lpg !== "-") {
          lpgPln = parseFloat(poland.lpg?.replace(',', '.')) * euroToPln;
        }
        
        return {
          pb95: gasolinePln.toFixed(2),
          on: dieselPln.toFixed(2),
          lpg: lpgPln.toFixed(2),
          source: "collectapi.com (dane aktualne)",
          note: `Średnie ceny w Polsce (przeliczone z EUR, kurs ${euroToPln} zł)`
        };
      } else {
        console.warn("⚠️ Nie znaleziono Polski w danych. Dostępne kraje:", 
          data.result.slice(0, 5).map(c => c.country));
      }
    }
    
    return null;
    
  } catch (error) {
    console.error("❌ Błąd CollectAPI:", error.message);
    return null;
  }
};

// ============================================
// DANE ZAPASOWE (jeśli API nie działa)
// ============================================
const getFallbackPrices = (voivodeship) => {
  const fallbackPrices = {
    "DOLNOŚLĄSKIE": { pb95: 6.85, on: 7.95, lpg: 3.25 },
    "KUJAWSKO-POMORSKIE": { pb95: 6.94, on: 7.88, lpg: 3.22 },
    "LUBELSKIE": { pb95: 6.95, on: 7.93, lpg: 3.28 },
    "LUBUSKIE": { pb95: 6.71, on: 7.87, lpg: 3.20 },
    "ŁÓDZKIE": { pb95: 6.79, on: 7.85, lpg: 3.23 },
    "MAŁOPOLSKIE": { pb95: 6.88, on: 7.90, lpg: 3.26 },
    "MAZOWIECKIE": { pb95: 7.00, on: 7.78, lpg: 3.30 },
    "OPOLSKIE": { pb95: 6.82, on: 7.82, lpg: 3.24 },
    "PODKARPACKIE": { pb95: 6.71, on: 7.93, lpg: 3.21 },
    "PODLASKIE": { pb95: 6.90, on: 7.89, lpg: 3.27 },
    "POMORSKIE": { pb95: 6.80, on: 7.85, lpg: 3.19 },
    "ŚLĄSKIE": { pb95: 6.78, on: 7.75, lpg: 3.18 },
    "ŚWIĘTOKRZYSKIE": { pb95: 6.94, on: 7.95, lpg: 3.26 },
    "WARMIŃSKO-MAZURSKIE": { pb95: 6.88, on: 7.90, lpg: 3.24 },
    "WIELKOPOLSKIE": { pb95: 6.90, on: 7.84, lpg: 3.25 },
    "ZACHODNIOPOMORSKIE": { pb95: 6.83, on: 7.95, lpg: 3.22 }
  };
  
  return {
    ...fallbackPrices[voivodeship],
    source: "dane zapasowe (marzec 2026)",
    note: "Dane orientacyjne - API niedostępne"
  };
};

// Główna funkcja pobierania cen
const fetchFuelPrices = async (voivodeship) => {
  // Próba przez CollectAPI
  const liveData = await fetchFuelPricesFromCollectAPI();
  if (liveData && liveData.pb95 > 0) {
    return liveData;
  }
  
  // Fallback - dane zapasowe
  console.log("📦 Używam danych zapasowych dla", voivodeship);
  return getFallbackPrices(voivodeship);
};

// ============================================
// KOMPONENT KALKULATORÓW
// ============================================
export default function Calculators() {
  const [fuelConsumption, setFuelConsumption] = useState({ distance: '', fuel: '', result: null });
  const [range, setRange] = useState({ fuel: '', consumption: '', result: null });
  const [cost, setCost] = useState({ price: '', liters: '', result: null });
  const [tripFuel, setTripFuel] = useState({ distance: '', consumption: '', result: null });
  
  const [selectedVoivodeship, setSelectedVoivodeship] = useState("");
  const [fuelPrices, setFuelPrices] = useState(null);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [dataSource, setDataSource] = useState(null);

  const fetchPrices = async () => {
    if (!selectedVoivodeship) {
      toast.error("Wybierz województwo");
      return;
    }
    
    setLoadingPrices(true);
    try {
      const prices = await fetchFuelPrices(selectedVoivodeship);
      setFuelPrices(prices);
      setDataSource(prices.source);
      setLastUpdate(new Date());
      
      if (prices.source && prices.source.includes('zapasowe')) {
        toast.warning(`Użyto danych zapasowych - API może być niedostępne`);
      } else {
        toast.success(`Pobrano aktualne ceny z ${prices.source}`);
      }
    } catch (error) {
      console.error("Błąd pobierania cen:", error);
      toast.error("Nie udało się pobrać cen. Spróbuj ponownie później.");
    } finally {
      setLoadingPrices(false);
    }
  };

  const calculateFuelConsumption = () => {
    const d = parseFloat(fuelConsumption.distance);
    const f = parseFloat(fuelConsumption.fuel);
    if (d > 0 && f > 0) {
      const result = (f / d) * 100;
      setFuelConsumption(prev => ({ ...prev, result: result.toFixed(2) }));
    }
  };

  const calculateRange = () => {
    const f = parseFloat(range.fuel);
    const c = parseFloat(range.consumption);
    if (f > 0 && c > 0) {
      const result = (f / c) * 100;
      setRange(prev => ({ ...prev, result: result.toFixed(0) }));
    }
  };

  const calculateCost = () => {
    const p = parseFloat(cost.price);
    const l = parseFloat(cost.liters);
    if (p > 0 && l > 0) {
      const result = p * l;
      setCost(prev => ({ ...prev, result: result.toFixed(2) }));
    }
  };

  const calculateTripFuel = () => {
    const d = parseFloat(tripFuel.distance);
    const c = parseFloat(tripFuel.consumption);
    if (d > 0 && c > 0) {
      const result = (d * c) / 100;
      setTripFuel(prev => ({ ...prev, result: result.toFixed(2) }));
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Kalkulatory"
        subtitle="Przydatne narzędzia do obliczeń paliwowych + aktualne ceny w Polsce"
        icon={Calculator}
      />

      {/* MODUŁ: Aktualne ceny paliw w Polsce */}
      <GlassCard className="p-6" delay={0}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
            <Fuel className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Aktualne ceny paliw w Polsce</h2>
            <p className="text-sm text-slate-400">Dane pobierane z internetu (średnie krajowe)</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Label className="text-slate-300 mb-2 block">Wybierz województwo</Label>
            <Select value={selectedVoivodeship} onValueChange={setSelectedVoivodeship}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Wybierz województwo" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {voivodeships.map(v => (
                  <SelectItem key={v} value={v} className="text-slate-200 hover:bg-slate-700">
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={fetchPrices}
              disabled={loadingPrices || !selectedVoivodeship}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              {loadingPrices ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Pobieranie...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Pobierz aktualne ceny
                </>
              )}
            </Button>
          </div>
        </div>

        {fuelPrices && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/50 rounded-xl p-6 border border-slate-700"
          >
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h3 className="text-lg font-semibold text-white">
                Ceny paliw {fuelPrices.note ? '(średnia krajowa)' : `w województwie ${selectedVoivodeship.toLowerCase()}`}
              </h3>
              <div className="flex gap-2">
                {lastUpdate && (
                  <span className="text-xs text-slate-500 bg-slate-700/30 px-2 py-1 rounded">
                    Aktualizacja: {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
                {dataSource && (
                  <span className="text-xs text-slate-400 bg-slate-700/30 px-2 py-1 rounded">
                    Źródło: {dataSource}
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-yellow-400">{fuelPrices.pb95}</div>
                <div className="text-sm text-slate-400 mt-1">Benzyna Pb95</div>
                <div className="text-xs text-slate-500">zł/litr</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-orange-400">{fuelPrices.on}</div>
                <div className="text-sm text-slate-400 mt-1">Olej napędowy</div>
                <div className="text-xs text-slate-500">zł/litr</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-400">{fuelPrices.lpg}</div>
                <div className="text-sm text-slate-400 mt-1">Autogaz LPG</div>
                <div className="text-xs text-slate-500">zł/litr</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700 text-xs text-slate-500 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3 h-3" />
                <span>Dane średnie dla Polski. Ceny mogą się różnić w zależności od regionu i stacji.</span>
              </div>
              <a 
                href="https://ceny-paliw.pl" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-green-400 hover:text-green-300 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Sprawdź na ceny-paliw.pl
              </a>
            </div>
          </motion.div>
        )}

        {!fuelPrices && selectedVoivodeship && !loadingPrices && (
          <div className="bg-slate-800/30 rounded-xl p-6 text-center border border-dashed border-slate-700">
            <p className="text-slate-400">Kliknij "Pobierz aktualne ceny" aby wyświetlić dane</p>
          </div>
        )}
      </GlassCard>

      {/* Reszta kalkulatorów */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kalkulator spalania */}
        <GlassCard className="p-6" delay={0.1}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Gauge className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-white">Średnie spalanie</h2>
          </div>
          <div className="space-y-4">
            <div>
              <Label>Przejechane kilometry</Label>
              <Input
                type="number"
                value={fuelConsumption.distance}
                onChange={(e) => setFuelConsumption(prev => ({ ...prev, distance: e.target.value }))}
                className="bg-slate-700 border-slate-600 mt-1"
                placeholder="np. 500"
              />
            </div>
            <div>
              <Label>Zużyte paliwo (l)</Label>
              <Input
                type="number"
                value={fuelConsumption.fuel}
                onChange={(e) => setFuelConsumption(prev => ({ ...prev, fuel: e.target.value }))}
                className="bg-slate-700 border-slate-600 mt-1"
                placeholder="np. 40"
              />
            </div>
            <Button onClick={calculateFuelConsumption} className="w-full bg-indigo-600 hover:bg-indigo-700">
              Oblicz
            </Button>
            {fuelConsumption.result !== null && (
              <div className="p-3 bg-slate-700/50 rounded-lg text-center">
                <p className="text-sm text-slate-400">Średnie spalanie:</p>
                <p className="text-2xl font-bold text-indigo-400">{fuelConsumption.result} l/100km</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Kalkulator zasięgu */}
        <GlassCard className="p-6" delay={0.2}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Fuel className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-white">Zasięg</h2>
          </div>
          <div className="space-y-4">
            <div>
              <Label>Stan paliwa (l)</Label>
              <Input
                type="number"
                value={range.fuel}
                onChange={(e) => setRange(prev => ({ ...prev, fuel: e.target.value }))}
                className="bg-slate-700 border-slate-600 mt-1"
                placeholder="np. 50"
              />
            </div>
            <div>
              <Label>Średnie spalanie (l/100km)</Label>
              <Input
                type="number"
                value={range.consumption}
                onChange={(e) => setRange(prev => ({ ...prev, consumption: e.target.value }))}
                className="bg-slate-700 border-slate-600 mt-1"
                placeholder="np. 8.5"
              />
            </div>
            <Button onClick={calculateRange} className="w-full bg-emerald-600 hover:bg-emerald-700">
              Oblicz
            </Button>
            {range.result !== null && (
              <div className="p-3 bg-slate-700/50 rounded-lg text-center">
                <p className="text-sm text-slate-400">Możesz przejechać:</p>
                <p className="text-2xl font-bold text-emerald-400">{range.result} km</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Kalkulator kosztów */}
        <GlassCard className="p-6" delay={0.3}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-white">Koszt paliwa</h2>
          </div>
          <div className="space-y-4">
            <div>
              <Label>Cena za litr (zł)</Label>
              <Input
                type="number"
                step="0.01"
                value={cost.price}
                onChange={(e) => setCost(prev => ({ ...prev, price: e.target.value }))}
                className="bg-slate-700 border-slate-600 mt-1"
                placeholder="np. 6.50"
              />
            </div>
            <div>
              <Label>Litry</Label>
              <Input
                type="number"
                step="0.1"
                value={cost.liters}
                onChange={(e) => setCost(prev => ({ ...prev, liters: e.target.value }))}
                className="bg-slate-700 border-slate-600 mt-1"
                placeholder="np. 40"
              />
            </div>
            <Button onClick={calculateCost} className="w-full bg-amber-600 hover:bg-amber-700">
              Oblicz
            </Button>
            {cost.result !== null && (
              <div className="p-3 bg-slate-700/50 rounded-lg text-center">
                <p className="text-sm text-slate-400">Całkowity koszt:</p>
                <p className="text-2xl font-bold text-amber-400">{cost.result} zł</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Kalkulator paliwa na trasę */}
        <GlassCard className="p-6" delay={0.4}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-white">Paliwo na trasę</h2>
          </div>
          <div className="space-y-4">
            <div>
              <Label>Długość trasy (km)</Label>
              <Input
                type="number"
                value={tripFuel.distance}
                onChange={(e) => setTripFuel(prev => ({ ...prev, distance: e.target.value }))}
                className="bg-slate-700 border-slate-600 mt-1"
                placeholder="np. 300"
              />
            </div>
            <div>
              <Label>Średnie spalanie (l/100km)</Label>
              <Input
                type="number"
                value={tripFuel.consumption}
                onChange={(e) => setTripFuel(prev => ({ ...prev, consumption: e.target.value }))}
                className="bg-slate-700 border-slate-600 mt-1"
                placeholder="np. 7.5"
              />
            </div>
            <Button onClick={calculateTripFuel} className="w-full bg-rose-600 hover:bg-rose-700">
              Oblicz
            </Button>
            {tripFuel.result !== null && (
              <div className="p-3 bg-slate-700/50 rounded-lg text-center">
                <p className="text-sm text-slate-400">Potrzebne paliwo:</p>
                <p className="text-2xl font-bold text-rose-400">{tripFuel.result} l</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}