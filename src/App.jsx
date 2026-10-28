import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate, Outlet } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { AppSettingsProvider, useAppSettings } from '@/lib/ThemeContext';
import { motion } from 'framer-motion';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import WeatherPage from '@/pages/WeatherPage';  // 🔧 DODANY IMPORT
import { useState, useEffect, useCallback } from 'react';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

// ProtectedRoute jako layout route
const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 flex items-center justify-center bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800"
      >
        <div className="w-12 h-12 border-4 border-slate-800 dark:border-slate-200 border-t-transparent rounded-full animate-spin" />
      </motion.div>
    );
  }
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

// AppLayout jako layout route
const AppLayout = () => {
  const location = useLocation();
  const getCurrentPageName = () => {
    if (location.pathname === '/') return mainPageKey;
    const pathSegment = location.pathname.replace(/^\//, '').split('/')[0];
    const pageKeys = Object.keys(Pages);
    const matchedKey = pageKeys.find(key => key.toLowerCase() === pathSegment.toLowerCase());
    return matchedKey || null;
  };

  const currentPageName = getCurrentPageName();

  if (Layout) {
    return <Layout currentPageName={currentPageName}><Outlet /></Layout>;
  }
  return <Outlet />;
};

// Definicje animacji stron
const getAnimationVariants = (type) => {
  switch(type) {
    case 'fade':
      return { initial: { opacity: 0 }, animate: { opacity: 1 } };
    case 'slide':
      return { initial: { x: -30, opacity: 0 }, animate: { x: 0, opacity: 1 } };
    case 'scale':
      return { initial: { scale: 0.8, opacity: 0 }, animate: { scale: 1, opacity: 1 } };
    case 'zoom-rotate':
      return { initial: { scale: 0.5, rotate: -180, opacity: 0 }, animate: { scale: 1, rotate: 0, opacity: 1 } };
    case 'flip':
      return { initial: { rotateX: 90, opacity: 0 }, animate: { rotateX: 0, opacity: 1 } };
    case 'swing':
      return { initial: { rotateZ: -15, x: -50, opacity: 0 }, animate: { rotateZ: 0, x: 0, opacity: 1 } };
    case 'elastic':
      return { initial: { scale: 0.3, y: -100, opacity: 0 }, animate: { scale: 1, y: 0, opacity: 1 } };
    case 'blur':
      return { initial: { filter: "blur(10px)", opacity: 0 }, animate: { filter: "blur(0px)", opacity: 1 } };
    default:
      return { initial: { opacity: 1 }, animate: { opacity: 1 } };
  }
};

// Komponent animacji ładowania po zmianie ustawień
const SettingsRefreshAnimation = ({ settingsChanged, onComplete }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!settingsChanged) {
      setShow(false);
      return undefined;
    }

    setShow(true);
    const timer = setTimeout(() => {
      setShow(false);
      if (onComplete) onComplete();
    }, 1200);
    return () => clearTimeout(timer);
  }, [settingsChanged, onComplete]);

  if (!show) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center bg-gradient-to-r from-slate-900/90 to-slate-800/90 backdrop-blur-md z-50 pointer-events-none"
    >
      <div className="text-center">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 360, 360] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-16 border-4 border-slate-200 border-t-blue-500 rounded-full mx-auto mb-4"
        />
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-white text-lg font-medium"
        >
          Zapisywanie ustawień...
        </motion.p>
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="h-1 bg-gradient-to-r from-blue-500 to-purple-500 mt-4 rounded-full max-w-xs mx-auto"
        />
      </div>
    </motion.div>
  );
};

// Komponent animujący strony
const AnimatedPage = () => {
  const location = useLocation();
  const { settings } = useAppSettings();
  const [settingsChanged, setSettingsChanged] = useState(false);
  const [prevSettings, setPrevSettings] = useState(settings);
  const [shouldRefresh, setShouldRefresh] = useState(false);

  useEffect(() => {
    if (JSON.stringify(prevSettings) !== JSON.stringify(settings)) {
      setSettingsChanged(true);
      setPrevSettings(settings);
      setTimeout(() => setSettingsChanged(false), 1000);
    }
  }, [settings, prevSettings]);

  const handleAnimationComplete = useCallback(() => {
    if (shouldRefresh) {
      window.location.reload();
    }
  }, [shouldRefresh]);

  const variants = getAnimationVariants(settings.animationType);
  const pageKey = location.pathname + location.search;

  return (
    <>
      <SettingsRefreshAnimation 
        settingsChanged={settingsChanged} 
        onComplete={handleAnimationComplete}
      />
      <motion.div
        key={pageKey}
        variants={variants}
        initial="initial"
        animate="animate"
        transition={{ duration: settings.animationSpeed, ease: "easeInOut" }}
        className="w-full h-full"
      >
        <Outlet />
      </motion.div>
    </>
  );
};

// Główny komponent App - POPRAWIONA struktura routingu
function App() {
  return (
    <AuthProvider>
      <AppSettingsProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <NavigationTracker />
            <Routes>
              {/* Publiczne trasy */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              {/* Chronione trasy - użycie Outlet zamiast zagnieżdżonych Routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route element={<AnimatedPage />}>
                    <Route path="/" element={<MainPage />} />
                    <Route path="/dashboard" element={<Pages.Dashboard />} />
                    <Route path="/drivers" element={<Pages.Drivers />} />
                    <Route path="/keys" element={<Pages.Keys />} />
                    <Route path="/services" element={<Pages.Services />} />
                    <Route path="/settings" element={<Pages.Settings />} />
                    <Route path="/statistics" element={<Pages.Statistics />} />
                    <Route path="/trips" element={<Pages.Trips />} />
                    <Route path="/vehicles" element={<Pages.Vehicles />} />
                    <Route path="/trips/:id" element={<Pages.TripDetail />} />
                    <Route path="/calculators" element={<Pages.Calculators />} />
                    <Route path="/refueling" element={<Pages.Refueling />} />
                    <Route path="/map" element={<Pages.MapPage />} />
                    <Route path="/weather" element={<WeatherPage />} />  {/* 🔧 DODANY ROUTE */}
                    <Route path="*" element={<PageNotFound />} />
                  </Route>
                </Route>
              </Route>
            </Routes>
          </Router>
          <Toaster />
          <SonnerToaster />
        </QueryClientProvider>
      </AppSettingsProvider>
    </AuthProvider>
  );
}

export default App;