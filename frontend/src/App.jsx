import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ChatRoom from './pages/ChatRoom';
import InstallPrompt from './components/InstallPrompt';

function App() {
  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-slate-100 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 selection:bg-violet-500/30 font-sans transition-colors duration-300 flex flex-col">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomId" element={<ChatRoom />} />
      </Routes>
      <InstallPrompt />
    </div>
  );
}

export default App;
