import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { VehicleDataProvider } from './contexts/VehicleDataContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { BootSequence } from './components/hmi/BootSequence';
import { Dashboard } from './components/hmi/Dashboard';
import { SettingsPanel } from './components/hmi/SettingsPanel';
import { Toaster } from './components/ui/sonner';
import './App.css';

const HMIApp = () => {
  const [isBooting, setIsBooting] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const { settings, isLoading } = useSettings();

  // Handle boot completion
  const handleBootComplete = () => {
    setIsBooting(false);
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

  // Skip boot sequence if already loaded settings
  useEffect(() => {
    if (!isLoading && !isBooting) return;
    // Could add logic here to skip boot on refresh
  }, [isLoading, isBooting]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Boot Sequence */}
      {isBooting && (
        <BootSequence onComplete={handleBootComplete} />
      )}

      {/* Main Dashboard */}
      {!isBooting && (
        <Dashboard onOpenSettings={() => setShowSettings(true)} />
      )}

      {/* Settings Panel (Modal) */}
      {showSettings && (
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
