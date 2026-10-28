/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 */
import Dashboard from './pages/Dashboard';
import Drivers from './pages/Drivers';
import Keys from './pages/Keys';
import Services from './pages/Services';
import Settings from './pages/Settings';
import Statistics from './pages/Statistics';
import Trips from './pages/Trips';
import Vehicles from './pages/Vehicles';
import TripDetail from './pages/TripDetail';
import Calculators from './pages/Calculators';
import Refueling from './pages/Refueling';
import MapPage from './pages/MapPage';
import __Layout from './Layout.jsx';

export const PAGES = {
    Dashboard: Dashboard,
    Drivers: Drivers,
    Keys: Keys,
    Services: Services,
    Settings: Settings,
    Statistics: Statistics,
    Trips: Trips,
    Vehicles: Vehicles,
    TripDetail: TripDetail,
    Calculators: Calculators,
    Refueling: Refueling,
    MapPage: MapPage,
};

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};