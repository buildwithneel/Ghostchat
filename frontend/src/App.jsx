import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ChatRoom from './pages/ChatRoom';
import InstallPrompt from './components/InstallPrompt';

// Theme context so any component can read/toggle theme without prop-drilling
export const ThemeContext = createContext({
  isDarkTheme: true,
  toggleTheme: () => {},
  soundEnabled: true,
  toggleSound: () => {},
});

export const useTheme = () => useContext(ThemeContext);

function App() {
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('ghostchat_theme');
      return saved !== null ? saved === 'dark' : true; // default dark
    } catch {
      return true;
    }
  });

  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('ghostchat_sound');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Apply / remove .dark class on <html> whenever isDarkTheme changes
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkTheme) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('ghostchat_theme', isDarkTheme ? 'dark' : 'light');
    } catch {}
  }, [isDarkTheme]);

  const toggleTheme = useCallback(() => {
    setIsDarkTheme(prev => !prev);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('ghostchat_sound', next ? 'true' : 'false');
      } catch {}
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ isDarkTheme, toggleTheme, soundEnabled, toggleSound }}>
      <div className="h-[100dvh] w-full overflow-hidden bg-slate-100 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 selection:bg-violet-500/30 font-sans transition-colors duration-300 flex flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:roomId" element={<ChatRoom />} />
        </Routes>
        <InstallPrompt />
      </div>
    </ThemeContext.Provider>
  );
}

export default App;
