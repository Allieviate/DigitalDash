import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useSettings, useSettingsSelector } from './SettingsContext';

const ThemeContext = createContext();

export const THEMES = {
  type_r: {
    id: 'type_r',
    name: 'Type R',
    accent: '#DC2626',
    glow: '0 0 20px rgba(220, 38, 38, 0.5)',
    bgTexture: 'carbon_fiber'
  },
  retro_89: {
    id: 'retro_89',
    name: "Retro '89",
    accent: '#F59E0B',
    glow: '0 0 15px rgba(245, 158, 11, 0.4)',
    bgTexture: 'grid_scanlines'
  },
  clean_oem: {
    id: 'clean_oem',
    name: 'Clean OEM',
    accent: '#ffffff',
    glow: 'none',
    bgTexture: 'matte_black'
  }
};

export const DEFAULT_THEME_ID = 'type_r';

/**
 * Theme state now lives in settings rather than in local component
 * state.
 *
 * Previously this held themeId in useState initialised to 'type_r',
 * and ThemeProvider was mounted OUTSIDE SettingsProvider in App.js -
 * so it could not have read settings.theme_id even if it tried. Pick
 * a theme, reload, back to Type R.
 *
 * App.js now nests the other way round, so this can subscribe.
 */
export const ThemeProvider = ({ children }) => {
  const themeId = useSettingsSelector((s) => s.theme_id ?? DEFAULT_THEME_ID);
  const { updateSetting } = useSettings();

  const theme = THEMES[themeId] || THEMES[DEFAULT_THEME_ID];

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme.id);
    document.documentElement.style.setProperty('--hmi-accent', theme.accent);
    document.documentElement.style.setProperty('--hmi-accent-glow', theme.glow);
  }, [theme]);

  const switchTheme = useCallback(
    (newThemeId) => {
      if (THEMES[newThemeId]) {
        updateSetting('theme_id', newThemeId);
      }
    },
    [updateSetting],
  );

  const value = useMemo(
    () => ({ theme, themeId: theme.id, switchTheme, themes: THEMES }),
    [switchTheme, theme],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
