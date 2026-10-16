import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ChatRoom from './pages/ChatRoom';
import InstallPrompt from './components/InstallPrompt';

function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 selection:bg-violet-500/30 font-sans flex items-center justify-center container mx-auto p-4 md:p-8">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomId" element={<ChatRoom />} />
      </Routes>
      <InstallPrompt />
    </div>
  );
}

export default App;
