import React, { useState, useEffect } from 'react';
import { Timer, Check, Plus, Save, ArrowLeft, Trash2, Edit2, Play, Pause, RotateCcw, Bell, X, MoreVertical } from 'lucide-react';
import ExerciseConfigModal from './ExerciseConfigModal';

export default function ActiveWorkout({ dayData, onFinish }) {
    const [exercises, setExercises] = useState([]);
    const [sessionData, setSessionData] = useState({});

    // Estado para saber qué ejercicio estamos editando en el modal
    const [configModalExercise, setConfigModalExercise] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

    const [isReviewMode, setIsReviewMode] = useState(false);
    const [library, setLibrary] = useState([]);

    const [seconds, setSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [restSeconds, setRestSeconds] = useState(0);

    const STORAGE_KEY = `workout_draft_${dayData.id}`;

    useEffect(() => {
        fetch('/api/library/exercises').then(res => res.json()).then(setLibrary).catch(console.error);
    }, []);

    useEffect(() => {
        if (dayData) {
            const initialExercises = dayData.exercises || [];
            setExercises(initialExercises);
            const savedDataRaw = localStorage.getItem(STORAGE_KEY);
            let workingData = {};

            if (savedDataRaw) {
                workingData = JSON.parse(savedDataRaw);
            } else if (dayData.logs && dayData.logs.length > 0) {
                setIsReviewMode(true);
                const lastLog = dayData.logs[0];
                initialExercises.forEach(ex => {
                    const exerciseSets = lastLog.sets.filter(s => s.exercise_name === ex.name);
                    if (exerciseSets.length > 0) {
                        workingData[ex.id] = exerciseSets.map(s => ({
                            setNum: s.set_number, weight: s.weight, reps: s.reps, rpe: s.rpe || '', completed: !!s.is_completed
                        }));
                    }
                });
            }

            initialExercises.forEach(ex => {
                let parsedConfig = [];
                try { if (ex.sets_config) parsedConfig = JSON.parse(ex.sets_config); } catch (e) { }

                if (!workingData[ex.id]) {
                    const totalSets = parseInt(ex.target_sets, 10) || 1;
                    workingData[ex.id] = Array.from({ length: totalSets }).map((_, i) => {
                        const config = parsedConfig[i] || {};
                        return {
                            setNum: i + 1, weight: '', reps: '', rpe: '', completed: false,
                            target_reps: config.reps || ex.target_reps || '',
                            target_value: config.value || ex.target_value || '',
                            target_rpe: config.rpe || ex.target_rpe || ''
                        };
                    });
                } else {
                    workingData[ex.id] = workingData[ex.id].map((set, i) => {
                        const config = parsedConfig[i] || {};
                        return {
                            ...set,
                            target_reps: config.reps || ex.target_reps || '',
                            target_value: config.value || ex.target_value || '',
                            target_rpe: config.rpe || ex.target_rpe || ''
                        };
                    });
                }
            });
            setSessionData(workingData);
            setIsTimerRunning(!isReviewMode);
        }
    }, [dayData]);

    useEffect(() => {
        if (Object.keys(sessionData).length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
    }, [sessionData]);

    useEffect(() => {
        let interval = null;
        if (isTimerRunning) interval = setInterval(() => setSeconds(s => s + 1), 1000);
        return () => clearInterval(interval);
    }, [isTimerRunning]);

    useEffect(() => {
        let interval = null;
        if (restSeconds > 0) {
            interval = setInterval(() => setRestSeconds(r => r - 1), 1000);
        } else if (restSeconds === 0 && interval) {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [restSeconds]);

    const formatTime = (totalSeconds) => {
        const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleSaveExerciseConfig = async (formData) => {
        try {
            if (formData.id) {
                // MODO EDICIÓN: Impactamos en la base de datos (y semanas)
                await fetch(`/api/exercises/${formData.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                // Actualizar estado local de los ejercicios
                setExercises(prev => prev.map(e => e.id === formData.id ? { ...e, ...formData } : e));

                // Actualizar sesión actual adaptando las filas al nuevo target_sets
                setSessionData(prev => {
                    const existingSets = prev[formData.id] || [];
                    const newSetsConfig = formData.sets_config || [];

                    const updatedSets = Array.from({ length: formData.target_sets }).map((_, i) => {
                        const config = newSetsConfig[i] || {};
                        const existing = existingSets[i] || { weight: '', reps: '', rpe: '', completed: false };

                        return {
                            setNum: i + 1,
                            weight: existing.weight,
                            reps: existing.reps,
                            rpe: existing.rpe,
                            completed: existing.completed,
                            target_reps: config.reps || formData.target_reps || '',
                            target_value: config.value || formData.target_value || '',
                            target_rpe: config.rpe || formData.target_rpe || ''
                        };
                    });

                    return { ...prev, [formData.id]: updatedSets };
                });

            } else {
                // MODO CREACIÓN
                const res = await fetch('/api/exercises', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ day_id: dayData.id, ...formData, exercise_order: 999 })
                });
                const data = await res.json();

                const libEx = library.find(l => l.name.toLowerCase() === formData.name.toLowerCase());
                const newEx = {
                    id: data.id, day_id: dayData.id, ...formData, library_1rm: libEx ? libEx.one_rep_max : 0
                };

                setExercises(prev => [...prev, newEx]);

                let parsedConfig = formData.sets_config || [];
                const totalSets = parseInt(newEx.target_sets, 10) || 1;

                setSessionData(prev => ({
                    ...prev,
                    [newEx.id]: Array.from({ length: totalSets }).map((_, i) => {
                        const config = parsedConfig[i] || {};
                        return {
                            setNum: i + 1, weight: '', reps: '', rpe: '', completed: false,
                            target_reps: config.reps || newEx.target_reps || '',
                            target_value: config.value || newEx.target_value || '',
                            target_rpe: config.rpe || newEx.target_rpe || ''
                        };
                    })
                }));
            }

            setModalOpen(false);
            setConfigModalExercise(null);
        } catch (e) { alert("Error al guardar ejercicio"); }
    };

    const updateSet = (id, idx, field, val) => setSessionData(p => {
        const s = [...(p[id] || [])]; s[idx] = { ...s[idx], [field]: val };
        return { ...p, [id]: s };
    });

    const toggleComplete = (id, idx) => {
        setSessionData(p => {
            const s = [...(p[id] || [])];
            const isNowCompleted = !s[idx].completed;
            s[idx] = { ...s[idx], completed: isNowCompleted };

            if (isNowCompleted) setRestSeconds(90);
            return { ...p, [id]: s };
        });
    };

    const handleAddSetFast = async (id) => {
        // Agregado rápido inline (Opcional, pero útil si no quieren abrir el modal)
        setSessionData(p => {
            const existingSets = p[id] || [];
            const lastSet = existingSets[existingSets.length - 1] || {};
            return {
                ...p,
                [id]: [
                    ...existingSets,
                    {
                        setNum: existingSets.length + 1,
                        weight: lastSet.weight || '', reps: lastSet.reps || '', rpe: lastSet.rpe || '', completed: false,
                        target_reps: lastSet.target_reps || '', target_value: lastSet.target_value || '', target_rpe: lastSet.target_rpe || ''
                    }
                ]
            };
        });
        await fetch(`/api/exercises/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_sets: (sessionData[id]?.length || 0) + 1 }) });
    };

    const handleSaveWorkout = async () => {
        const setsToSave = [];
        Object.keys(sessionData).forEach(exId => {
            const ex = exercises.find(e => e.id === parseInt(exId));
            const sets = sessionData[exId];
            if (sets) {
                sets.forEach(set => {
                    if (set.completed || set.weight || set.reps) {
                        setsToSave.push({ exercise_name: ex ? ex.name : 'Unknown', set_number: set.setNum, weight: set.weight, reps: set.reps, rpe: set.rpe, is_completed: set.completed });
                    }
                });
            }
        });
        try {
            await fetch('/api/workouts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ day_id: dayData.id, notes: 'Log', sets: setsToSave }) });
            localStorage.removeItem(STORAGE_KEY);
            onFinish();
        } catch (e) { alert('Error guardando'); }
    };

    return (
        <div className="min-h-screen bg-background pb-40 animate-fade-in relative">
            <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-gray-800 px-4 py-3 flex justify-between items-center shadow-md">
                <button onClick={onFinish} className="p-2 -ml-2 text-gray-400 hover:text-white"><ArrowLeft /></button>
                <div className="text-center">
                    <h1 className="font-bold text-white leading-tight">{dayData.name}</h1>
                    <div className="flex justify-center items-center gap-1.5 mt-0.5">
                        <div className={`w-2 h-2 rounded-full ${isReviewMode ? 'bg-orange-500' : 'bg-green-500 animate-pulse'}`} />
                        <span className="text-[10px] text-gray-400 uppercase font-bold">{isReviewMode ? 'MODO REVISIÓN' : 'EN PROGRESO'}</span>
                    </div>
                </div>
                <div className="w-8"></div>
            </div>

            {restSeconds > 0 && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-blue-600/90 backdrop-blur-md text-white px-6 py-2 rounded-full shadow-lg shadow-blue-900/50 flex items-center gap-3 animate-slide-down border border-blue-400">
                    <Bell size={18} className="animate-pulse" />
                    <span className="font-bold text-lg">Descanso: {formatTime(restSeconds)}</span>
                    <button onClick={() => setRestSeconds(0)} className="ml-2 bg-black/20 p-1 rounded-full hover:bg-black/40">
                        <X size={14} />
                    </button>
                </div>
            )}

            <div className="max-w-xl mx-auto p-2 sm:p-3 space-y-6">
                {exercises.map((ex, i) => {
                    const sets = sessionData[ex.id] || [];
                    const completedCount = sets.filter(s => s.completed).length;

                    return (
                        <div key={ex.id} className="bg-surface rounded-2xl border border-gray-800 overflow-hidden shadow-lg">
                            <div className="p-3 bg-gray-800/50 border-b border-gray-800 flex justify-between items-center">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="text-primary font-mono text-xs font-bold bg-primary/10 px-2 py-1 rounded">#{i + 1}</span>
                                    <h3 className="font-bold text-lg text-white leading-tight truncate">{ex.name}</h3>
                                </div>
                                {/* 3 PUNTITOS PARA EDITAR CONFIGURACIÓN */}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-400 font-bold bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-800 shadow-inner">
                                        <span className={completedCount === sets.length ? 'text-green-400' : 'text-white'}>{completedCount}</span> / {sets.length}
                                    </span>
                                    <button
                                        onClick={() => { setConfigModalExercise(ex); setModalOpen(true); }}
                                        className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                                    >
                                        <MoreVertical size={20} />
                                    </button>
                                </div>
                            </div>
                            {ex.notes && <p className="px-3 py-2 text-xs text-gray-400 bg-background/30 border-b border-gray-800 italic">📝 {ex.notes}</p>}

                            <div className="p-2 space-y-1">
                                <div className="flex items-center px-1 pb-1 mb-1 text-[10px] text-gray-500 font-bold uppercase tracking-wider text-center">
                                    <div className="w-8">Set</div>
                                    <div className="w-14">Intens.</div>
                                    <div className="flex-1 min-w-[60px]">Target</div>
                                    <div className="w-16">Kg</div>
                                    <div className="w-16">Reps</div>
                                    <div className="w-12"></div>
                                </div>

                                {sets.map((set, idx) => {
                                    const tValue = set.target_value;
                                    const tRPE = set.target_rpe;
                                    const tReps = set.target_reps;

                                    let targetTextParts = [];
                                    if (ex.load_type === 'kg' && tValue) targetTextParts.push(`${tValue}kg`);
                                    if (ex.load_type === 'percent' && tValue) targetTextParts.push(`${tValue}%`);
                                    if (ex.load_type === 'rpe' && tValue) targetTextParts.push(`@${tValue}`);
                                    if (tRPE && ex.load_type !== 'rpe') targetTextParts.push(`@${tRPE}`);
                                    if (tReps) targetTextParts.push(`x ${tReps}`);

                                    const targetDisplay = targetTextParts.length > 0 ? targetTextParts.join(' ') : '-';

                                    let kgPlaceholder = '-';
                                    if (ex.load_type === 'kg' && tValue) kgPlaceholder = tValue.toString();
                                    if (ex.load_type === 'percent' && tValue && ex.library_1rm) kgPlaceholder = Math.round(ex.library_1rm * (tValue / 100)).toString();

                                    let repsPlaceholder = tReps?.split('-')[0] || '-';

                                    return (
                                        <div key={idx} className={`relative flex items-center gap-1.5 p-1.5 rounded-xl transition-all border ${set.completed ? 'bg-green-900/10 border-green-800/40' : 'bg-gray-800/30 border-transparent hover:border-gray-700'}`}>
                                            <div className="w-8 flex justify-center">
                                                <div className={`w-6 h-6 flex items-center justify-center rounded-md text-xs font-bold ${set.completed ? 'bg-green-500 text-black' : 'bg-gray-700 text-gray-300'}`}>
                                                    {set.setNum}
                                                </div>
                                            </div>

                                            <div className="w-14 flex justify-center">
                                                <input
                                                    type="text" placeholder="RPE" value={set.rpe || ''}
                                                    onChange={(e) => updateSet(ex.id, idx, 'rpe', e.target.value)}
                                                    className={`w-full h-10 bg-gray-900 border ${set.completed ? 'border-green-800/50 text-green-400' : 'border-gray-700 text-white focus:border-primary'} rounded-lg text-center font-semibold text-sm outline-none transition-colors placeholder-gray-600`}
                                                />
                                            </div>

                                            <div className="flex-1 min-w-[60px] flex justify-center items-center">
                                                <span className="text-[11px] leading-tight text-center font-medium text-gray-400 bg-gray-900/50 px-2 py-1.5 rounded-lg border border-gray-800/50 w-full truncate">
                                                    {targetDisplay}
                                                </span>
                                            </div>

                                            <div className="w-16 flex justify-center">
                                                <input
                                                    type="number" step="0.5" placeholder={kgPlaceholder} value={set.weight}
                                                    onChange={(e) => updateSet(ex.id, idx, 'weight', e.target.value)}
                                                    className={`w-full h-10 bg-gray-900 border ${set.completed ? 'border-green-800/50 text-green-400' : 'border-gray-700 text-white focus:border-primary'} rounded-lg text-center font-bold text-base outline-none transition-colors placeholder-gray-600 shadow-inner`}
                                                />
                                            </div>

                                            <div className="w-16 flex justify-center">
                                                <input
                                                    type="number" placeholder={repsPlaceholder} value={set.reps}
                                                    onChange={(e) => updateSet(ex.id, idx, 'reps', e.target.value)}
                                                    className={`w-full h-10 bg-gray-900 border ${set.completed ? 'border-green-800/50 text-green-400' : 'border-gray-700 text-white focus:border-primary'} rounded-lg text-center font-bold text-base outline-none transition-colors placeholder-gray-600 shadow-inner`}
                                                />
                                            </div>

                                            <div className="w-12 flex flex-col items-center gap-1">
                                                <button onClick={() => toggleComplete(ex.id, idx)} className={`w-10 h-10 flex items-center justify-center rounded-lg shadow-md active:scale-90 transition-all ${set.completed ? 'bg-green-500 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'}`}>
                                                    <Check size={20} strokeWidth={3} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                <button onClick={() => handleAddSetFast(ex.id)} className="w-full py-2.5 mt-2 rounded-xl border-2 border-dashed border-gray-700/50 text-gray-400 text-xs font-bold hover:bg-gray-800 hover:border-gray-600 hover:text-white transition-all flex items-center justify-center gap-2">
                                    <Plus size={16} /> AGREGAR SERIE RÁPIDA
                                </button>
                            </div>
                        </div>
                    );
                })}

                <button onClick={() => { setConfigModalExercise(null); setModalOpen(true); }} className="w-full py-4 border-2 border-dashed border-primary/30 text-primary bg-primary/5 rounded-2xl hover:bg-primary/10 transition-colors flex items-center justify-center gap-2 font-bold text-base shadow-inner">
                    <Plus size={20} /> AÑADIR EJERCICIO
                </button>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none flex flex-col items-center gap-3">
                <div className="pointer-events-auto bg-gray-900/95 backdrop-blur-xl border border-gray-700 rounded-full px-5 py-2 flex items-center gap-4 shadow-2xl">
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Tiempo</span>
                        <span className="font-mono text-lg font-bold text-white tracking-widest">{formatTime(seconds)}</span>
                    </div>
                    <div className="h-6 w-px bg-gray-700"></div>
                    <div className="flex gap-2">
                        <button onClick={() => setIsTimerRunning(!isTimerRunning)} className={`p-2.5 rounded-full text-white shadow-lg transition-colors ${isTimerRunning ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-green-600 hover:bg-green-500'}`}>
                            {isTimerRunning ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                        </button>
                        <button onClick={() => { setIsTimerRunning(false); setSeconds(0); }} className="p-2.5 rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"><RotateCcw size={18} /></button>
                    </div>
                </div>

                <button onClick={handleSaveWorkout} className="pointer-events-auto w-full max-w-md bg-primary hover:bg-blue-500 text-white font-bold py-3.5 text-base rounded-2xl shadow-[0_10px_20px_rgba(37,99,235,0.2)] flex items-center justify-center gap-2 active:scale-95 transition-all">
                    <Save size={20} /> {isReviewMode ? 'Guardar Cambios' : 'TERMINAR ENTRENAMIENTO'}
                </button>
            </div>

            <ExerciseConfigModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setConfigModalExercise(null); }}
                onSave={handleSaveExerciseConfig}
                initialData={configModalExercise}
                library={library}
            />
        </div>
    );
}