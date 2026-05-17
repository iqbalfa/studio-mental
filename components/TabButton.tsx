import React from 'react';
import { motion } from 'motion/react';

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label }) => {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-6 py-3 text-sm font-bold transition-colors rounded-t-xl ${
        active ? 'text-blue-400 bg-slate-900' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'
      }`}
    >
      {icon}
      {label}
      {active && (
        <motion.div
          layoutId="activeTab"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
          initial={false}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </button>
  );
};

export default TabButton;
