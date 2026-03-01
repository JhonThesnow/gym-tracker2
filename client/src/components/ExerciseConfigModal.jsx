import React, { useState, useEffect } from 'react';
import { X, Calculator, Dumbbell, Percent, Activity, Plus, Trash2, Check } from 'lucide-react';

export default function ExerciseConfigModal({ isOpen, onClose, onSave, initialData, library }) {
    const [name, setName] = useState('');
    const [loadType, setLoadType] = useState('kg');
    const [notes, setNotes] = useState('');
    const [setsConfig, setSetsConfig] = useState([{ reps: '8-12', value: '', rpe: '' }]);
    const [current1RM, setCurrent1RM] = useState(0);

    // Estados para la calculadora
    const [calcW, setCalcW] = useState('');
    const [calcR, setCalcR] = useState('');

    useEffect(() => {
        if (isOpen) {
            setName(initialData?.name || '');
            setLoadType(initialData?.load_type || 'kg');
            setNotes(initialData?.notes || '');
            setCalcW('');
            setCalcR('');

            let parsed = null;
            if (initialData?.sets_config) {
                try { parsed = typeof initialData.sets_config === 'string' ? JSON.parse(initialData.sets_config) : initialData.sets_config; }
                catch (e) { }
            }

            if (parsed && Array.isArray(parsed) && parsed.length > 0) {
                setSetsConfig(parsed);
            } else if (initialData?.target_sets) {
                setSetsConfig(Array.from({ length: initialData.target_sets }).map(() => ({
                    reps: initialData.target_reps || '',
                    value: initialData.target_value || '',
                    rpe: initialData.target_rpe || ''
                })));
            } else {
                setSetsConfig([{ reps: '8-12', value: '', rpe: '' }]);
            }
        }
    }, [isOpen, initialData]);

    useEffect(() => {
        if (name && library) {
            const libEx = library.find(l => l.name.toLowerCase() === name.toLowerCase());
            setCurrent1RM(libEx?.one_rep_max || 0);
        }
    }, [name, library]);

    const handleSave1RM = async (estimated) => {
        try {
            await fetch('/api/library/exercises/1rm', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, one_rep_max: estimated })
            });
            setCurrent1RM(estimated);
        } catch (e) {
            console.error("Error guardando 1RM");
        }
    };

    const handleAddSet = () => {
        const lastSet = setsConfig[setsConfig.length - 1] || { reps: '', value: '', rpe: '' };
        setSetsConfig([...setsConfig, { ...lastSet }]);
    };

    const updateSet = (index, field, val) => {
        const newSets = [...setsConfig];
        newSets[index][field] = val;
        setSetsConfig(newSets);
    };

    const removeSet = (index) => {
        setSetsConfig(setsConfig.filter((_, i) => i !== index));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            id: initialData?.id, // Clave para saber si es edición
            name,
            load_type: loadType,
            notes,
            target_sets: setsConfig.length,
            sets_config: setsConfig,
            target_reps: setsConfig[0]?.reps || '',
            target_value: setsConfig[0]?.value || '',
            target_rpe: setsConfig[0]?.rpe || ''
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-surface border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl relative my-8">
                <div className="flex justify-between items-center p-5 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {initialData?.id ? 'Editar Configuración' : 'Nuevo Ejercicio'}
                    </h2>
                    <button onClick={onClose} className="p-2 bg-gray-900 rounded-full text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nombre del Ejercicio</label>
                            <input
                                required autoFocus list="exercise-library"
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white font-bold focus:border-primary outline-none transition-colors shadow-inner"
                                value={name} onChange={e => setName(e.target.value)}
                                placeholder="Ej: Press Banca"
                            />
                            {library && (
                                <datalist id="exercise-library">
                                    {library.map((ex, i) => <option key={i} value={ex.name} />)}
                                </datalist>
                            )}
                            {current1RM > 0 && (
                                <p className="text-xs text-green-400 mt-1.5 font-bold flex items-center gap-1">
                                    <Check size={12} /> 1RM Registrado: {current1RM}kg
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tipo de Carga</label>
                            <div className="flex gap-2 p-1 bg-gray-900 rounded-xl border border-gray-800">
                                {[
                                    { id: 'kg', label: 'Kg Fijos', icon: Dumbbell },
                                    { id: 'percent', label: '% del 1RM', icon: Percent },
                                    { id: 'rpe', label: 'Solo RPE', icon: Activity }
                                ].map(type => (
                                    <button
                                        key={type.id} type="button"
                                        onClick={() => setLoadType(type.id)}
                                        className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-bold transition-all ${loadType === type.id ? 'bg-gray-700 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        <type.icon size={16} /> {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Calculadora de 1RM Condicional */}
                        {loadType === 'percent' && (
                            <div className="bg-blue-900/10 border border-blue-900/40 rounded-xl p-3 space-y-3 shadow-inner">
                                <div className="flex items-center gap-2 text-blue-400 font-bold text-[10px] uppercase tracking-wider">
                                    <Calculator size={14} /> Calculadora de 1RM Estimar
                                </div>
                                <div className="flex gap-2 items-center">
                                    <input type="number" placeholder="Kg usados" value={calcW} onChange={e => setCalcW(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white text-sm text-center outline-none focus:border-blue-500" />
                                    <span className="text-gray-500 font-bold text-xs">x</span>
                                    <input type="number" placeholder="Reps" value={calcR} onChange={e => setCalcR(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white text-sm text-center outline-none focus:border-blue-500" />
                                    <div className="bg-gray-800 text-white font-bold rounded-lg px-3 py-2 text-sm border border-gray-700 whitespace-nowrap">
                                        {calcW && calcR ? Math.round(calcW * (1 + calcR / 30)) : 0} kg
                                    </div>
                                </div>
                                {calcW && calcR && (
                                    <button type="button" onClick={() => handleSave1RM(Math.round(calcW * (1 + calcR / 30)))} className="w-full py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded-lg text-xs font-bold transition-colors">
                                        Guardar en Librería
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800 space-y-3">
                        <div className="flex justify-between items-end mb-2">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Activity size={16} className="text-primary" /> Series & Objetivos
                            </h3>
                            <span className="text-xs text-gray-500 font-bold bg-gray-800 px-2 py-1 rounded-md">{setsConfig.length} Series</span>
                        </div>

                        <div className="flex text-[10px] text-gray-500 font-bold uppercase tracking-wider px-1">
                            <span className="w-8 text-center">Set</span>
                            <span className="flex-1 text-center">Reps</span>
                            {loadType !== 'rpe' && <span className="flex-1 text-center">Target ({loadType === 'percent' ? '%' : 'Kg'})</span>}
                            <span className="flex-1 text-center">RPE</span>
                            <span className="w-8"></span>
                        </div>

                        <div className="space-y-2">
                            {setsConfig.map((set, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-gray-900 border border-gray-700 p-2 rounded-xl focus-within:border-primary transition-colors">
                                    <span className="w-6 text-center text-xs font-bold text-gray-500">{idx + 1}</span>
                                    <input
                                        type="text" placeholder="Ej: 8-12"
                                        value={set.reps} onChange={(e) => updateSet(idx, 'reps', e.target.value)}
                                        className="flex-1 w-full bg-transparent text-center text-sm font-bold text-white outline-none placeholder-gray-600"
                                    />
                                    {loadType !== 'rpe' && (
                                        <input
                                            type="number" step="0.5" placeholder={loadType === 'percent' ? '%' : 'Kg'}
                                            value={set.value} onChange={(e) => updateSet(idx, 'value', e.target.value)}
                                            className="flex-1 w-full bg-transparent text-center text-sm font-bold text-accent outline-none placeholder-gray-600 border-l border-gray-800 pl-1"
                                        />
                                    )}
                                    <input
                                        type="number" step="0.5" placeholder="-"
                                        value={set.rpe} onChange={(e) => updateSet(idx, 'rpe', e.target.value)}
                                        className="flex-1 w-full bg-transparent text-center text-sm font-bold text-yellow-500 outline-none placeholder-gray-600 border-l border-gray-800 pl-1"
                                    />
                                    <button type="button" onClick={() => removeSet(idx)} disabled={setsConfig.length === 1} className="w-8 flex justify-center text-gray-600 hover:text-red-400 disabled:opacity-20">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button type="button" onClick={handleAddSet} className="w-full py-2.5 mt-2 rounded-lg border-2 border-dashed border-gray-700 text-gray-400 text-xs font-bold hover:bg-gray-800 hover:text-white transition-all flex items-center justify-center gap-2">
                            <Plus size={16} /> AGREGAR SERIE
                        </button>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Notas / Tempo</label>
                        <textarea
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-gray-300 focus:border-primary outline-none resize-none h-20 shadow-inner transition-colors"
                            value={notes} onChange={e => setNotes(e.target.value)}
                            placeholder="Ej: Bajada de 3 segundos, pausa abajo."
                        />
                    </div>

                    <button type="submit" disabled={!name} className="w-full bg-primary hover:bg-blue-500 text-white p-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all disabled:opacity-50">
                        {initialData?.id ? 'GUARDAR CAMBIOS' : 'CREAR EJERCICIO'}
                    </button>
                </form>
            </div>
        </div>
    );
}