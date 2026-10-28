import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Clock, Wrench, Circle, Shield, FileText,
  Plus, X, Edit2, Trash2, CheckCircle, CalendarDays,
  Bell, Car
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, isSameDay, addMonths, subMonths, isValid, differenceInDays } from "date-fns";
import { pl } from "date-fns/locale";
import { toast } from "sonner";
import { accountStorage } from "@/lib/accountStorage";

const STORAGE_KEY = "calendar_events";

const eventTypeOptions = [
  { id: "inspection", name: "Przegląd techniczny", icon: Shield, color: "bg-red-500", text: "text-red-400" },
  { id: "insurance", name: "Polisa OC/AC", icon: FileText, color: "bg-blue-500", text: "text-blue-400" },
  { id: "service", name: "Serwis", icon: Wrench, color: "bg-yellow-500", text: "text-yellow-400" },
  { id: "tire_change", name: "Wymiana opon", icon: Circle, color: "bg-green-500", text: "text-green-400" },
  { id: "tax", name: "Podatek", icon: FileText, color: "bg-purple-500", text: "text-purple-400" },
  { id: "meeting", name: "Spotkanie", icon: CalendarDays, color: "bg-cyan-500", text: "text-cyan-400" },
  { id: "other", name: "Inne", icon: Clock, color: "bg-slate-500", text: "text-slate-400" },
];

const getEventTypeConfig = (type) =>
  eventTypeOptions.find((o) => o.id === type) || eventTypeOptions[eventTypeOptions.length - 1];

// Pomocnik do budowania dni miesiąca
const buildMonthDays = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = (firstDay.getDay() + 6) % 7; // Mon=0
  const days = [];
  for (let i = 0; i < startWeekday; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
};

const CalendarWidget = ({
  trips = [],
  services = [],
  refuelings = [],
  vehicles = [],
  className = "",
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showAddEventForm, setShowAddEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [customEvents, setCustomEvents] = useState([]);
  const [upcomingReminders, setUpcomingReminders] = useState([]);

  const [eventForm, setEventForm] = useState({
    title: "",
    type: "inspection",
    date: "",
    time: "",
    vehicleId: "",
    description: "",
    reminder: true,
    reminderDays: 7,
  });

  // Wczytaj zapisane wydarzenia
  useEffect(() => {
    const saved = accountStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCustomEvents(parsed);
        checkReminders(parsed);
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Sprawdź przypomnienia
  const checkReminders = (events) => {
    const now = new Date();
    const reminders = events.filter((e) => {
      if (!e.reminder || !e.date) return false;
      const eventDate = new Date(e.date);
      if (!isValid(eventDate)) return false;
      const daysLeft = differenceInDays(eventDate, now);
      return daysLeft >= 0 && daysLeft <= (e.reminderDays || 7);
    });
    setUpcomingReminders(reminders);
  };

  const saveCustomEvents = (events) => {
    accountStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    setCustomEvents(events);
    checkReminders(events);
  };

  // Połącz wszystkie wydarzenia
  const events = useMemo(() => {
    const tripEvents = trips.map((trip) => ({
      id: `trip-${trip.id}`,
      type: "trip",
      title: `${trip.startLocation || "Trasa"} → ${trip.endLocation || "?"}`,
      date: trip.startDate,
      endDate: trip.endDate,
      vehicleId: trip.vehicleId,
      details: trip,
      isCustom: false,
    }));

    const serviceEvents = services.map((service) => ({
      id: `service-${service.id}`,
      type: "service",
      title: service.name || "Serwis",
      date: service.date,
      vehicleId: service.vehicleId,
      details: service,
      isCustom: false,
    }));

    const refuelingEvents = refuelings.map((refueling) => ({
      id: `refueling-${refueling.id}`,
      type: "refueling",
      title: `Tankowanie — ${refueling.liters}L`,
      date: refueling.date,
      vehicleId: refueling.vehicleId,
      details: refueling,
      isCustom: false,
    }));

    const custom = customEvents.map((e) => ({ ...e, isCustom: true }));

    return [...tripEvents, ...serviceEvents, ...refuelingEvents, ...custom];
  }, [trips, services, refuelings, customEvents]);

  const monthDays = useMemo(() => buildMonthDays(currentDate), [currentDate]);

  const getEventsForDay = (day) =>
    day
      ? events.filter((e) => {
          if (!e.date) return false;
          try {
            return isSameDay(new Date(e.date), day);
          } catch {
            return false;
          }
        })
      : [];

  const selectedEvents = useMemo(
    () => (selectedDate ? getEventsForDay(selectedDate) : []),
    [selectedDate, events]
  );

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
    setShowEventDetails(true);
  };

  const handleDayClick = (day) => {
    if (!day) return;
    setSelectedDate(day);
    setShowEventDetails(true);
    setShowAddEventForm(false);
    setEditingEvent(null);
  };

  const handleAddEvent = () => {
    setEditingEvent(null);
    setEventForm({
      title: "",
      type: "inspection",
      date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      time: "",
      vehicleId: "",
      description: "",
      reminder: true,
      reminderDays: 7,
    });
    setShowAddEventForm(true);
  };

  const handleSaveEvent = () => {
    if (!eventForm.title.trim()) {
      toast.error("Podaj tytuł wydarzenia");
      return;
    }
    if (!eventForm.date) {
      toast.error("Podaj datę wydarzenia");
      return;
    }

    if (editingEvent) {
      const updated = customEvents.map((e) =>
        e.id === editingEvent.id ? { ...e, ...eventForm } : e
      );
      saveCustomEvents(updated);
      toast.success("Wydarzenie zaktualizowane");
    } else {
      const newEvent = {
        ...eventForm,
        id: `custom-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      saveCustomEvents([...customEvents, newEvent]);
      toast.success("Wydarzenie zapisane!");
    }

    setShowAddEventForm(false);
    setEditingEvent(null);
    // Pokaż dzień, w którym dodano wydarzenie
    if (eventForm.date) {
      const d = new Date(eventForm.date);
      if (isValid(d)) {
        setSelectedDate(d);
        setCurrentDate(d);
        setShowEventDetails(true);
      }
    }
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title || "",
      type: event.type || "other",
      date: event.date || "",
      time: event.time || "",
      vehicleId: event.vehicleId || "",
      description: event.description || "",
      reminder: event.reminder ?? true,
      reminderDays: event.reminderDays || 7,
    });
    setShowAddEventForm(true);
  };

  const handleDeleteEvent = (eventId) => {
    if (!confirm("Czy na pewno usunąć to wydarzenie?")) return;
    const updated = customEvents.filter((e) => e.id !== eventId);
    saveCustomEvents(updated);
    toast.success("Wydarzenie usunięte");
  };

  const getEventDotColor = (type) => {
    const config = getEventTypeConfig(type);
    return config.color;
  };

  const weekdays = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

  return (
    <GlassCard className={`p-4 ${className}`}>
      {/* Nagłówek */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" />
          <h3 className="text-theme-white font-semibold">Kalendarz</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-xs px-2" onClick={goToToday}>
            Dziś
          </Button>
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-theme-white text-sm font-medium min-w-[120px] text-center">
            {format(currentDate, "LLLL yyyy", { locale: pl })}
          </span>
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Przypomnienia */}
      <AnimatePresence>
        {upcomingReminders.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-3"
          >
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 text-sm font-semibold">
                  Nadchodzące przypomnienia ({upcomingReminders.length})
                </span>
              </div>
              <div className="space-y-1">
                {upcomingReminders.map((r) => {
                  const daysLeft = differenceInDays(new Date(r.date), new Date());
                  return (
                    <div key={r.id} className="flex items-center justify-between text-xs">
                      <span className="text-theme-white-secondary">{r.title}</span>
                      <Badge className="bg-amber-500/20 text-amber-400 text-xs">
                        {daysLeft === 0 ? "Dziś!" : `Za ${daysLeft} dni`}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Siatka kalendarza */}
      <div className="grid grid-cols-7 gap-0.5 mb-2">
        {weekdays.map((d) => (
          <div key={d} className="text-center text-xs text-theme-white-muted py-1 font-medium">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {monthDays.map((day, idx) => {
          const dayEvents = day ? getEventsForDay(day) : [];
          const isToday = day && isSameDay(day, new Date());
          const isSelected = day && selectedDate && isSameDay(day, selectedDate);
          const isPast = day && day < new Date() && !isToday;

          return (
            <button
              key={idx}
              onClick={() => handleDayClick(day)}
              disabled={!day}
              className={`relative aspect-square flex flex-col items-center justify-start p-1 rounded-lg text-xs transition-all
                ${!day ? "invisible" : ""}
                ${isSelected ? "bg-gradient-primary text-white shadow-md" : ""}
                ${isToday && !isSelected ? "border border-primary text-primary font-bold" : ""}
                ${!isSelected && !isToday ? "hover:bg-white/5 text-theme-white-secondary" : ""}
                ${isPast && !isSelected ? "opacity-50" : ""}
              `}
            >
              <span className="font-medium leading-none">{day?.getDate()}</span>
              {dayEvents.length > 0 && (
                <div className="flex flex-wrap gap-0.5 mt-0.5 justify-center max-w-full">
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${getEventDotColor(e.type)}`}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[8px] text-theme-white-muted">+{dayEvents.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Szczegóły dnia */}
      <AnimatePresence>
        {showEventDetails && selectedDate && (
          <motion.div
            key="event-details"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-4 border-t border-slate-700 pt-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-theme-white font-semibold text-sm">
                {format(selectedDate, "EEEE, d MMMM yyyy", { locale: pl })}
              </h4>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  className="bg-gradient-primary text-xs h-7"
                  onClick={handleAddEvent}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Dodaj
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-7 h-7"
                  onClick={() => setShowEventDetails(false)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Formularz dodawania/edycji */}
            <AnimatePresence>
              {showAddEventForm && (
                <motion.div
                  key="add-form"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 mb-3 space-y-3">
                    <h5 className="text-theme-white font-medium text-sm">
                      {editingEvent ? "Edytuj wydarzenie" : "Nowe wydarzenie"}
                    </h5>

                    <div>
                      <Label className="text-theme-white-secondary text-xs mb-1 block">
                        Tytuł *
                      </Label>
                      <Input
                        value={eventForm.title}
                        onChange={(e) =>
                          setEventForm({ ...eventForm, title: e.target.value })
                        }
                        placeholder="np. Przegląd techniczny pojazdu"
                        className="bg-slate-900/50 border-slate-600 text-theme-white h-8 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-theme-white-secondary text-xs mb-1 block">
                          Typ
                        </Label>
                        <Select
                          value={eventForm.type}
                          onValueChange={(v) =>
                            setEventForm({ ...eventForm, type: v })
                          }
                        >
                          <SelectTrigger className="bg-slate-900/50 border-slate-600 text-theme-white h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {eventTypeOptions.map((opt) => (
                              <SelectItem key={opt.id} value={opt.id} className="text-xs">
                                {opt.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-theme-white-secondary text-xs mb-1 block">
                          Pojazd
                        </Label>
                        <Select
                          value={eventForm.vehicleId || "none"}
                          onValueChange={(v) =>
                            setEventForm({ ...eventForm, vehicleId: v === "none" ? "" : v })
                          }
                        >
                          <SelectTrigger className="bg-slate-900/50 border-slate-600 text-theme-white h-8 text-xs">
                            <SelectValue placeholder="Brak" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="text-xs">
                              Brak
                            </SelectItem>
                            {vehicles.map((v) => (
                              <SelectItem key={v.id} value={String(v.id)} className="text-xs">
                                {v.name || v.make} ({v.licensePlate})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-theme-white-secondary text-xs mb-1 block">
                          Data *
                        </Label>
                        <Input
                          type="date"
                          value={eventForm.date}
                          onChange={(e) =>
                            setEventForm({ ...eventForm, date: e.target.value })
                          }
                          className="bg-slate-900/50 border-slate-600 text-theme-white h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-theme-white-secondary text-xs mb-1 block">
                          Godzina
                        </Label>
                        <Input
                          type="time"
                          value={eventForm.time}
                          onChange={(e) =>
                            setEventForm({ ...eventForm, time: e.target.value })
                          }
                          className="bg-slate-900/50 border-slate-600 text-theme-white h-8 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-theme-white-secondary text-xs mb-1 block">
                        Opis
                      </Label>
                      <Textarea
                        value={eventForm.description}
                        onChange={(e) =>
                          setEventForm({ ...eventForm, description: e.target.value })
                        }
                        placeholder="Opcjonalny opis..."
                        className="bg-slate-900/50 border-slate-600 text-theme-white text-sm resize-none"
                        rows={2}
                      />
                    </div>

                    {/* Przypomnienie */}
                    <div className="bg-slate-900/30 rounded-lg p-3 border border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-amber-400" />
                          <Label className="text-theme-white text-sm">
                            Przypomnienie
                          </Label>
                        </div>
                        <button
                          onClick={() =>
                            setEventForm({
                              ...eventForm,
                              reminder: !eventForm.reminder,
                            })
                          }
                          className={`w-10 h-5 rounded-full transition-all relative ${
                            eventForm.reminder ? "bg-primary" : "bg-slate-600"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow ${
                              eventForm.reminder ? "left-5" : "left-0.5"
                            }`}
                          />
                        </button>
                      </div>
                      {eventForm.reminder && (
                        <div className="flex items-center gap-2">
                          <span className="text-theme-white-secondary text-xs">
                            Przypomnij
                          </span>
                          <Select
                            value={String(eventForm.reminderDays)}
                            onValueChange={(v) =>
                              setEventForm({ ...eventForm, reminderDays: parseInt(v) })
                            }
                          >
                            <SelectTrigger className="bg-slate-900/50 border-slate-600 text-theme-white h-7 text-xs w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 3, 7, 14, 30].map((d) => (
                                <SelectItem key={d} value={String(d)} className="text-xs">
                                  {d} {d === 1 ? "dzień" : "dni"} wcześniej
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-gradient-primary"
                        onClick={handleSaveEvent}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {editingEvent ? "Zapisz zmiany" : "Zapisz wydarzenie"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowAddEventForm(false);
                          setEditingEvent(null);
                        }}
                      >
                        Anuluj
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Lista wydarzeń dnia */}
            {selectedEvents.length === 0 && !showAddEventForm ? (
              <div className="text-center py-6">
                <CalendarDays className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-theme-white-muted text-sm">
                  Brak wydarzeń w tym dniu
                </p>
                <Button
                  size="sm"
                  className="mt-3 bg-gradient-primary text-xs"
                  onClick={handleAddEvent}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Dodaj wydarzenie
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map((event) => {
                  const config = getEventTypeConfig(event.type);
                  const Icon = config.icon;
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg ${config.color}/20 flex items-center justify-center flex-shrink-0`}
                      >
                        <Icon className={`w-4 h-4 ${config.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-theme-white text-sm font-medium truncate">
                          {event.title}
                        </p>
                        <p className={`text-xs ${config.text}`}>{config.name}</p>
                        {event.time && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-theme-white-muted">
                            <Clock className="w-3 h-3" />
                            {event.time}
                          </div>
                        )}
                        {event.vehicleId && vehicles.length > 0 && (
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-theme-white-muted">
                            <Car className="w-3 h-3" />
                            {vehicles.find((v) => String(v.id) === String(event.vehicleId))
                              ? `${vehicles.find((v) => String(v.id) === String(event.vehicleId))?.name || ""} (${vehicles.find((v) => String(v.id) === String(event.vehicleId))?.licensePlate || ""})`
                              : "Pojazd"}
                          </div>
                        )}
                        {event.description && (
                          <p className="text-xs text-theme-white-muted mt-1 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                        {event.reminder && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-amber-400">
                            <Bell className="w-3 h-3" />
                            Przypomnienie: {event.reminderDays || 7} dni wcześniej
                          </div>
                        )}
                      </div>
                      {event.isCustom && (
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-blue-400 hover:text-blue-300"
                            onClick={() => handleEditEvent(event)}
                            title="Edytuj"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-red-400 hover:text-red-300"
                            onClick={() => handleDeleteEvent(event.id)}
                            title="Usuń"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legenda */}
      <div className="mt-4 pt-3 border-t border-slate-700">
        <div className="flex flex-wrap gap-3">
          {[
            { type: "trip", label: "Trasy" },
            { type: "service", label: "Serwis" },
            { type: "inspection", label: "Przegląd" },
            { type: "insurance", label: "OC/AC" },
            { type: "refueling", label: "Tankowania" },
          ].map(({ type, label }) => {
            const config = getEventTypeConfig(type);
            return (
              <div key={type} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${config.color} flex-shrink-0`} />
                <span className="text-xs text-theme-white-muted">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
};

export default CalendarWidget;
