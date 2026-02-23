import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { VehicleDataProvider } from './contexts/VehicleDataContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { BootSequence } from './components/hmi/BootSequence';
import { BulbCheckSequence } from './components/hmi/BulbCheckSequence';
import { Dashboard } from './components/hmi/Dashboard';
import { SettingsPanel } from './components/hmi/SettingsPanel';
import { Toaster } from './components/ui/sonner';
import './App.css';

const APP_PHASES = {
  BOOT_SEQUENCE: 'BOOT_SEQUENCE',
  BULB_CHECK: 'BULB_CHECK',
  LIVE_DASHBOARD: 'LIVE_DASHBOARD',
};

const HMIApp = () => {
  const [appPhase, setAppPhase] = useState(APP_PHASES.BOOT_SEQUENCE);
  const [showSettings, setShowSettings] = useState(false);
  const { settings, isLoading } = useSettings();

  const handleBootSequenceComplete = () => {
    setAppPhase(APP_PHASES.BULB_CHECK);
  };

  const handleBulbCheckComplete = () => {
    setAppPhase(APP_PHASES.LIVE_DASHBOARD);
  };

  // Apply brightness setting
  useEffect(() => {
    if (settings.brightness) {
      document.documentElement.style.filter = `brightness(${settings.brightness / 100})`;
    }
    return () => {
      document.documentElement.style.filter = '';
    };
  }, [settings.brightness]);

  // Keep boot sequence while settings initialize.
  useEffect(() => {
    if (isLoading) {
      setAppPhase(APP_PHASES.BOOT_SEQUENCE);
    }
  }, [isLoading]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {appPhase === APP_PHASES.BOOT_SEQUENCE && (
        <BootSequence onComplete={handleBootSequenceComplete} />
      )}

      {appPhase === APP_PHASES.BULB_CHECK && (
        <BulbCheckSequence onComplete={handleBulbCheckComplete} />
      )}

      {appPhase === APP_PHASES.LIVE_DASHBOARD && (
        <Dashboard onOpenSettings={() => setShowSettings(true)} />
      )}

      {/* Settings Panel (Modal) */}
      {showSettings && appPhase === APP_PHASES.LIVE_DASHBOARD && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}

      {/* Toast notifications */}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#18181b',
            border: '1px solid #27272a',
            color: '#ffffff',
          },
        }}
      />
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <VehicleDataProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/*" element={<HMIApp />} />
            </Routes>
          </BrowserRouter>
        </VehicleDataProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}

export default App;
