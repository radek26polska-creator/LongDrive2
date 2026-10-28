import '@/lib/logger'; // inicjalizacja globalnego łapania błędów
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { setupGlobalErrorHandler } from '@/lib/errorHandler'

// DODANIE CSS DLA MAPY LEAFLET
import 'leaflet/dist/leaflet.css'

// Uruchom globalny handler błędów PRZED renderowaniem aplikacji
setupGlobalErrorHandler()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)