import React, { createContext, useContext, useState, useEffect } from 'react';

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

export const ThemeProvider = ({ children }) => {
  const [themeId, setThemeId] = useState('type_r');
  const [theme, setTheme] = useState(THEMES.type_r);

  useEffect(() => {
    const newTheme = THEMES[themeId] || THEMES.type_r;
    setTheme(newTheme);
    
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', themeId);
    document.documentElement.style.setProperty('--hmi-accent', newTheme.accent);
    document.documentElement.style.setProperty('--hmi-accent-glow', newTheme.glow);
  }, [themeId]);

  const switchTheme = (newThemeId) => {
    if (THEMES[newThemeId]) {
      setThemeId(newThemeId);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, themeId, switchTheme, themes: THEMES }}>
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
