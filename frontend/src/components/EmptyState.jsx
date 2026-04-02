import { motion } from 'framer-motion';

export default function EmptyState() {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center h-full w-full opacity-60 pointer-events-none mt-20"
    >
      <motion.div 
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="text-8xl mb-6 opacity-80 mix-blend-screen drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]"
      >
        👻
      </motion.div>
      <h3 className="text-xl font-bold text-slate-300 tracking-wide">It's quiet in here...</h3>
      <p className="text-sm text-slate-500 mt-2 max-w-[250px] text-center">
        Send a message or drop a file to wake up the ghosts.
      </p>
    </motion.div>
  );
}
