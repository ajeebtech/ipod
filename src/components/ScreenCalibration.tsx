'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CalibrationProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: ScreenConfig) => void;
    initialConfig: ScreenConfig;
    onConfigChange: (config: ScreenConfig) => void;
}

export interface ScreenConfig {
    x: number;
    y: number;
    scale: number;
}

export default function ScreenCalibration({ isOpen, onClose, onSave, initialConfig, onConfigChange }: CalibrationProps) {
    const [config, setConfig] = useState<ScreenConfig>(initialConfig);

    useEffect(() => {
        if (isOpen) {
            setConfig(initialConfig);
        }
    }, [isOpen, initialConfig]);

    const handleChange = (key: keyof ScreenConfig, value: number) => {
        const newConfig = { ...config, [key]: value };
        setConfig(newConfig);
        onConfigChange(newConfig);
    };

    const handleReset = () => {
        const defaultConfig = { x: 0.015, y: 0.05, scale: 0.011 };
        setConfig(defaultConfig);
        onConfigChange(defaultConfig);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="fixed top-20 right-8 z-[1000] w-72 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden font-sans"
                >
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-b from-white to-gray-50/50">
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                            <Settings size={16} className="text-blue-500" />
                            Screen Calibration
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="p-5 space-y-6">
                        {/* X Position */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                                <span>Horizontal (X)</span>
                                <span className="font-mono text-gray-800">{config.x.toFixed(4)}</span>
                            </div>
                            <input
                                type="range"
                                min="-0.1"
                                max="0.1"
                                step="0.001"
                                value={config.x}
                                onChange={(e) => handleChange('x', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>

                        {/* Y Position */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                                <span>Vertical (Y)</span>
                                <span className="font-mono text-gray-800">{config.y.toFixed(4)}</span>
                            </div>
                            <input
                                type="range"
                                min="-0.1"
                                max="0.2"
                                step="0.001"
                                value={config.y}
                                onChange={(e) => handleChange('y', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>

                        {/* Scale */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                                <span>Scale</span>
                                <span className="font-mono text-gray-800">{config.scale.toFixed(5)}</span>
                            </div>
                            <input
                                type="range"
                                min="0.005"
                                max="0.02"
                                step="0.0001"
                                value={config.scale}
                                onChange={(e) => handleChange('scale', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
                        <button
                            onClick={handleReset}
                            className="flex-1 py-2 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all flex items-center justify-center gap-1.5 shadow-sm hover:shadow"
                        >
                            <RotateCcw size={14} />
                            Reset
                        </button>
                        <button
                            onClick={() => onSave(config)}
                            className="flex-[2] py-2 px-3 bg-gradient-to-b from-blue-500 to-blue-600 border border-blue-600 rounded-xl text-xs font-semibold text-white hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95"
                        >
                            <Save size={14} />
                            Save Settings
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
