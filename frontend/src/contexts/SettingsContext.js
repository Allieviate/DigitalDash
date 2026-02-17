import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const SettingsContext = createContext();

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DEFAULT_SETTINGS = {
  theme_id: 'type_r',
  data_source: 'simulation',
  units: 'imperial',
  gauge_style: 'modern',
  warning_sounds: true,
  chime_volume: 70,
  bluetooth_enabled: true,
  brightness: 100,
  show_diagnostics: false,
  custom_gauges: {}
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/settings`);
      setSettings(prev => ({ ...prev, ...response.data }));
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSettings = async (updates) => {
    setIsSaving(true);
    try {
      const response = await axios.post(`${API_URL}/settings`, updates);
      setSettings(prev => ({ ...prev, ...response.data }));
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = async (key, value) => {
    return updateSettings({ [key]: value });
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      isLoading,
      isSaving,
      updateSettings,
      updateSetting,
      reloadSettings: loadSettings
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
