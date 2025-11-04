
import React from 'react';

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  enabledLabel: string;
  disabledLabel: string;
}

export const Toggle: React.FC<ToggleProps> = ({ enabled, onChange, enabledLabel, disabledLabel }) => {
  return (
    <div className="flex items-center justify-center space-x-2 w-full">
        <span className={`font-medium ${!enabled ? 'text-green-400' : 'text-gray-400'}`}>{disabledLabel}</span>
        <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
            <div className="w-14 h-7 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-600"></div>
        </label>
        <span className={`font-medium ${enabled ? 'text-red-400' : 'text-gray-400'}`}>{enabledLabel}</span>
    </div>
  );
};
