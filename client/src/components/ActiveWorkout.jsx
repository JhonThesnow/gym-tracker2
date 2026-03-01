import React, { useState, useEffect } from 'react';
import { Timer, Check, Plus, Save, ArrowLeft, Trash2, Edit2, Play, Pause, RotateCcw, X } from 'lucide-react';
import ExerciseConfigModal from './ExerciseConfigModal';

export default function ActiveWorkout({ dayData, onFinish }) {
    const [exercises, setExercises] = useState([]);
    const [sessionData, setSessionData] = useState({});
    const [editingExerciseId, setEditingExerciseId] = useState(null);
    const [isReviewMode, setIsReviewMode] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [library, setLibrary] = useState([]);

    const [seconds, setSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

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
                            setNum: s.set_number, weight: s.weight, reps: s.reps, rpe: s.rpe, completed: !!s.is_completed
                        }));
                    }
                });
            }

            initialExercises.forEach(ex => {
                if (!workingData[ex.id]) {
                    // Aseguramos que lea target_sets como número
                    const totalSets = parseInt(ex.target_sets, 10) || 1;
                    workingData[ex.id] = Array.from({ length: totalSets }).map((_, i) => ({
                        setNum: i + 1, weight: '', reps: '', rpe: '', completed: false
                    }));
                }
            });
            setSessionData(workingData);
        }
    }, [dayData]);

    useEffect(() => { if (Object.keys(sessionData).length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData)); }, [sessionData]);
    useEffect(() => { let interval = null; if (isTimerRunning) interval = setInterval(() => setSeconds(s => s + 1), 1000); return () => clearInterval(interval); }, [isTimerRunning]);

    const formatTime = (totalSeconds) => {
        const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleAddNewExercise = async (formData) => {
        try {
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

            const totalSets = parseInt(newEx.target_sets, 10) || 1;
            setSessionData(prev => ({
                ...prev,
                [newEx.id]: Array.from({ length: totalSets }).map((_, i) => ({ setNum: i + 1, weight: '', reps: '', rpe: '', completed: false }))
            }));
            setModalOpen(false);
        } catch (e) { alert("Error al crear ejercicio"); }
    };

    const updateSet = (id, idx, field, val) => setSessionData(p => { const s = [...(p[id] || [])]; s[idx] = { ...s[idx], [field]: val }; return { ...p, [id]: s }; });
    const toggleComplete = (id, idx) => setSessionData(p => { const s = [...(p[id] || [])]; s[idx] = { ...s[idx], completed: !s[idx].completed }; return { ...p, [id]: s }; });
    const handleUpdateName = async (id, name) => { await fetch(`/api/exercises/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }); setExercises(p => p.map(e => e.id === id ? { ...e, name } : e)); setEditingExerciseId(null); };
    const handleAddSet = async (id) => { setSessionData(p => ({ ...p, [id]: [...(p[id] || []), { setNum: (p[id]?.length || 0) + 1, weight: p[id]?.slice(-1)[0]?.weight || '', reps: '', rpe: '', completed: false }] })); await fetch(`/api/exercises/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_sets: (sessionData[id]?.length || 0) + 1 }) }); };
    const handleDeleteSet = async (id, idx) => { setSessionData(p => { const s = [...(p[id] || [])]; s.splice(idx, 1); return { ...p, [id]: s.map((set, i) => ({ ...set, setNum: i + 1 })) }; }); await fetch(`/api/exercises/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_sets: Math.max(0, (sessionData[id]?.length || 1) - 1) }) }); };

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
        <div className="min-h-screen bg-background pb-32 animate-fade-in">
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

            <div className="max-w-xl mx-auto p-3 space-y-6">
                {exercises.map((ex, i) => {
                    const sets = sessionData[ex.id] || [];
                    const isEditing = editingExerciseId === ex.id;
                    const completedCount = sets.filter(s => s.completed).length;

                    const isRPE = ex.load_type === 'rpe';

                    // Cálculo inteligente del placeholder
                    let intensityPlaceholder = '';
                    let targetIntensityDisplay = '-'; // Meta específica para mostrar abajo del input

                    if (isRPE && ex.target_value) {
                        targetIntensityDisplay = `Meta: ${ex.target_value}`;
                    } else if (ex.load_type === 'percent' && ex.target_value) {
                        if (ex.library_1rm) {
                            const calcKg = Math.round(ex.library_1rm * (ex.target_value / 100));
                            intensityPlaceholder = calcKg.toString();
                            targetIntensityDisplay = `Meta: ${ex.target_value}%`;
                        } else {
                            targetIntensityDisplay = `Meta: ${ex.target_value}%`;
                        }
                    } else if (ex.load_type === 'kg' && ex.target_value) {
                        intensityPlaceholder = ex.target_value.toString();
                        targetIntensityDisplay = `Meta: ${ex.target_value}kg`;
                    }

                    const repsPlaceholder = ex.target_reps?.split('-')[0] || '';

                    return (
                        <div key={ex.id} className="bg-surface rounded-2xl border border-gray-800 overflow-hidden shadow">
                            <div className="p-4 bg-gray-800/30 border-b border-gray-800">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 flex-1">
                                        <span className="text-primary font-mono text-xs font-bold bg-primary/10 px-1.5 py-0.5 rounded">#{i + 1}</span>
                                        {isEditing ? (
                                            <input autoFocus defaultValue={ex.name} onBlur={(e) => handleUpdateName(ex.id, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUpdateName(ex.id, e.currentTarget.value)} className="bg-gray-900 text-white px-2 rounded w-full border border-primary outline-none font-bold" />
                                        ) : (
                                            <h3 onClick={() => setEditingExerciseId(ex.id)} className="font-bold text-lg text-white leading-none cursor-pointer hover:text-blue-300 truncate">{ex.name}</h3>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-500 font-bold bg-gray-900 px-2 py-1 rounded ml-2">{completedCount} / {sets.length}</span>
                                </div>
                                {ex.notes && <p className="text-[10px] text-gray-400 mt-2 italic px-1 font-bold">Nota: {ex.notes}</p>}
                            </div>

                            <div className="px-3 py-3 space-y-2">
                                {/* Las filas de los sets se escriben aquí directamente para que no pierdan foco al escribir */}
                                {sets.map((set, idx) => (
                                    <div key={idx} className={`flex items-center justify-between gap-2 p-2.5 rounded-xl transition-colors border ${set.completed ? 'bg-green-900/20 border-green-800/50' : 'bg-gray-800/40 border-transparent hover:border-gray-700'}`}>

                                        {/* Numero Set */}
                                        <div className="flex flex-col items-center gap-1 w-6">
                                            <div className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold ${set.completed ? 'bg-green-500 text-black' : 'bg-gray-700 text-gray-300'}`}>{set.setNum}</div>
                                        </div>

                                        {/* Inputs Container */}
                                        <div className="flex gap-4 items-end flex-1 justify-center">
                                            {/* CARGA / RPE */}
                                            <div className="flex flex-col items-center">
                                                <span className="text-[9px] text-gray-400 font-bold mb-1 tracking-widest uppercase">
                                                    {isRPE ? 'RPE' : (ex.load_type === 'percent' ? 'CARGA' : 'CARGA FIJA')}
                                                </span>
                                                <input
                                                    type="number" step="0.5"
                                                    placeholder={intensityPlaceholder}
                                                    value={set.weight}
                                                    onChange={(e) => updateSet(ex.id, idx, 'weight', e.target.value)}
                                                    className={`w-16 h-10 bg-gray-900 border ${set.completed ? 'border-green-800 text-green-300' : 'border-gray-700 text-white'} rounded-lg text-center font-bold text-base outline-none focus:border-primary transition-colors placeholder-gray-600 shadow-inner`}
                                                />
                                                <span className="text-[9px] text-accent font-bold mt-1 h-3">{targetIntensityDisplay !== '-' ? targetIntensityDisplay : ''}</span>
                                            </div>

                                            {/* REPS */}
                                            <div className="flex flex-col items-center">
                                                <span className="text-[9px] text-gray-400 font-bold mb-1 tracking-widest uppercase">REPS</span>
                                                <input
                                                    type="number"
                                                    placeholder={repsPlaceholder}
                                                    value={set.reps}
                                                    onChange={(e) => updateSet(ex.id, idx, 'reps', e.target.value)}
                                                    className={`w-16 h-10 bg-gray-900 border ${set.completed ? 'border-green-800 text-green-300' : 'border-gray-700 text-white'} rounded-lg text-center font-bold text-base outline-none focus:border-primary transition-colors placeholder-gray-600 shadow-inner`}
                                                />
                                                <span className="text-[9px] text-gray-500 font-bold mt-1 h-3">Meta: {ex.target_reps}</span>
                                            </div>
                                        </div>

                                        {/* Botones de acción */}
                                        <div className="flex flex-col gap-2 w-8">
                                            <button onClick={() => toggleComplete(ex.id, idx)} className={`w-8 h-8 flex items-center justify-center rounded-lg shadow-md active:scale-95 transition-all ${set.completed ? 'bg-green-500 text-black' : 'bg-gray-700 text-gray-400 hover:text-white'}`}>
                                                <Check size={18} strokeWidth={3} />
                                            </button>
                                            <button onClick={() => handleDeleteSet(ex.id, idx)} className="w-8 flex items-center justify-center text-gray-600 hover:text-red-400 transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <button onClick={() => handleAddSet(ex.id)} className="w-full py-2.5 mt-1 rounded-xl border border-dashed border-gray-700 text-gray-500 text-xs font-bold hover:bg-gray-800 hover:text-white transition-all flex items-center justify-center gap-2">
                                    <Plus size={14} /> AGREGAR SERIE
                                </button>
                            </div>
                        </div>
                    );
                })}

                <button onClick={() => setModalOpen(true)} className="w-full py-4 border-2 border-dashed border-gray-700 text-gray-400 rounded-2xl hover:text-white hover:border-gray-500 hover:bg-gray-800/30 transition-colors flex items-center justify-center gap-2 font-bold">
                    <Plus size={20} /> AGREGAR EJERCICIO
                </button>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pointer-events-none flex flex-col items-center gap-4">
                <div className="pointer-events-auto bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-full px-5 py-2 flex items-center gap-4 shadow-2xl scale-110">
                    <span className="font-mono text-xl font-bold text-white tracking-widest min-w-[60px] text-center">{formatTime(seconds)}</span>
                    <div className="h-6 w-px bg-gray-700"></div>
                    <div className="flex gap-2">
                        <button onClick={() => setIsTimerRunning(!isTimerRunning)} className={`p-2 rounded-full text-white transition-colors ${isTimerRunning ? 'bg-yellow-600' : 'bg-green-600'}`}>
                            {isTimerRunning ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                        </button>
                        <button onClick={() => { setIsTimerRunning(false); setSeconds(0); }} className="p-2 rounded-full bg-gray-800 text-gray-400 hover:text-white"><RotateCcw size={16} /></button>
                    </div>
                </div>

                <button onClick={handleSaveWorkout} className="pointer-events-auto w-full max-w-md bg-primary hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-transform">
                    <Save size={20} /> {isReviewMode ? 'Guardar Cambios' : 'Terminar Entrenamiento'}
                </button>
            </div>

            <ExerciseConfigModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleAddNewExercise} library={library} />
        </div>
    );
}