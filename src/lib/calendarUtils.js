import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';

// Generowanie dni tygodnia
export const getWeekDays = (currentDate) => {
  const start = startOfWeek(currentDate, { weekStartsOn: 1 });
  const end = endOfWeek(currentDate, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
};

// Generowanie dni miesiąca
export const getMonthDays = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const start = startOfWeek(firstDay, { weekStartsOn: 1 });
  const end = endOfWeek(lastDay, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
};

// Sprawdzanie czy dzień ma wydarzenia
export const getEventsForDay = (date, events) => {
  return events.filter(event => isSameDay(new Date(event.date), date));
};

// Grupowanie wydarzeń po dacie
export const groupEventsByDate = (events) => {
  const grouped = {};
  events.forEach(event => {
    const dateKey = format(new Date(event.date), 'yyyy-MM-dd');
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(event);
  });
  return grouped;
};

// Typy wydarzeń z kolorami
export const eventTypes = {
  trip: { name: 'Trasa', color: 'bg-blue-500', icon: '🚛' },
  service: { name: 'Serwis', color: 'bg-yellow-500', icon: '🔧' },
  refueling: { name: 'Tankowanie', color: 'bg-green-500', icon: '⛽' },
  inspection: { name: 'Przegląd', color: 'bg-red-500', icon: '🔍' },
  meeting: { name: 'Spotkanie', color: 'bg-purple-500', icon: '📅' },
  other: { name: 'Inne', color: 'bg-slate-500', icon: '📌' },
};