import React, { useState, useEffect } from 'react';
import { Timer, Check, Plus, Save, ArrowLeft, Trash2, Edit2, Play, Pause, RotateCcw, History, X, Dumbbell } from 'lucide-react';

// --- MODAL AGREGAR EJERCICIO ---
const ExerciseModal = ({ isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState({ name: '', target_sets: 3, target_reps: '8-12', target_weight: '', target_rpe: '' });
    const [library, setLibrary] = useState([]);

    useEffect(() => {
        if (isOpen) {
            fetch('/api/library/exercises').then(res => res.json()).then(data => setLibrary(data)).catch(console.error);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[100] backdrop-blur-md animate-fade-in">
            <div className="bg-surface border border-gray-700 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white"><X size={20} /></button>
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Dumbbell className="text-primary" /> Agregar</h3>
                <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-5">
                    <div>
                        <label className="block text-xs text-gray-500 mb-2 uppercase font-bold tracking-wider">Ejercicio</label>
                        <input required autoFocus list="modal-lib" className="w-full bg-background border border-gray-700 rounded-xl p-4 text-white focus:border-primary outline-none font-bold text-lg"
                            placeholder="Nombre..." value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        <datalist id="modal-lib">{library.map(ex => <option key={ex.id} value={ex.name} />)}</datalist>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs text-gray-500 mb-2 uppercase font-bold">Sets</label><input type="number" className="w-full bg-background border border-gray-700 rounded-xl p-3 text-center text-white font-bold" value={formData.target_sets} onChange={e => setFormData({ ...formData, target_sets: e.target.value })} /></div>
                        <div><label className="block text-xs text-gray-500 mb-2 uppercase font-bold">Reps</label><input className="w-full bg-background border border-gray-700 rounded-xl p-3 text-center text-white font-bold" value={formData.target_reps} onChange={e => setFormData({ ...formData, target_reps: e.target.value })} /></div>
                    </div>
                    <div><label className="block text-xs text-gray-500 mb-2 uppercase font-bold">RPE (Opcional)</label><input type="number" step="0.5" className="w-full bg-background border border-gray-700 rounded-xl p-3 text-center text-white font-bold" placeholder="-" value={formData.target_rpe} onChange={e => setFormData({ ...formData, target_rpe: e.target.value })} /></div>
                    <button type="submit" className="w-full bg-primary hover:bg-blue-600 text-white p-4 rounded-xl font-bold mt-2 shadow-lg shadow-blue-500/30 transform active:scale-95 transition-all">Agregar a la Rutina</button>
                </form>
            </div>
        </div>
    );
};

export default function ActiveWorkout({ dayData, onFinish }) {
    const [exercises, setExercises] = useState([]);
    const [sessionData, setSessionData] = useState({});
    const [editingExerciseId, setEditingExerciseId] = useState(null);
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    const STORAGE_KEY = `workout_draft_${dayData.id}`;

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
                    workingData[ex.id] = Array.from({ length: ex.target_sets || 3 }).map((_, i) => ({
                        setNum: i + 1, weight: ex.target_weight || '', reps: '', rpe: '', completed: false
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

    // Actions
    const handleAddNewExercise = async (formData) => {
        try {
            const res = await fetch('/api/exercises', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ day_id: dayData.id, name: formData.name, target_sets: formData.target_sets, target_reps: formData.target_reps, target_weight: 0, target_rpe: formData.target_rpe || 0, exercise_order: 999 })
            });
            const data = await res.json();
            const newEx = { id: data.id, day_id: dayData.id, name: formData.name, target_sets: formData.target_sets, target_reps: formData.target_reps, target_weight: 0, target_rpe: formData.target_rpe || 0 };
            setExercises(prev => [...prev, newEx]);
            setSessionData(prev => ({ ...prev, [newEx.id]: Array.from({ length: newEx.target_sets }).map((_, i) => ({ setNum: i + 1, weight: '', reps: '', rpe: '', completed: false })) }));
            setModalOpen(false);
        } catch (e) { alert("Error"); }
    };

    const updateSet = (id, idx, field, val) => setSessionData(p => { const s = [...(p[id] || [])]; s[idx] = { ...s[idx], [field]: val }; return { ...p, [id]: s }; });
    const toggleComplete = (id, idx) => setSessionData(p => { const s = [...(p[id] || [])]; s[idx] = { ...s[idx], completed: !s[idx].completed }; return { ...p, [id]: s }; });
    const handleUpdateName = async (id, name) => { await fetch(`/api/exercises/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }); setExercises(p => p.map(e => e.id === id ? { ...e, name } : e)); setEditingExerciseId(null); };
    const handleAddSet = async (id) => { setSessionData(p => ({ ...p, [id]: [...(p[id] || []), { setNum: (p[id]?.length || 0) + 1, weight: p[id]?.slice(-1)[0]?.weight || '', reps: '', rpe: '', completed: false }] })); await fetch(`/api/exercises/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_sets: (sessionData[id]?.length || 0) + 1 }) }); };
    const handleDeleteSet = async (id, idx) => { setSessionData(p => { const s = [...(p[id] || [])]; s.splice(idx, 1); return { ...p, [id]: s.map((set, i) => ({ ...set, setNum: i + 1 })) }; }); await fetch(`/api/exercises/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_sets: Math.max(0, (sessionData[id]?.length || 1) - 1) }) }); };

    const handleSaveWorkout = async () => {
        const setsToSave = []; const updatePromises = [];
        Object.keys(sessionData).forEach(exId => {
            const ex = exercises.find(e => e.id === parseInt(exId));
            const sets = sessionData[exId];
            if (sets) {
                sets.forEach(set => { if (set.completed || set.weight || set.reps) setsToSave.push({ exercise_name: ex ? ex.name : 'Unknown', set_number: set.setNum, weight: set.weight, reps: set.reps, rpe: set.rpe, is_completed: set.completed }); });
                const valid = sets.filter(s => s.weight && s.weight > 0);
                if (valid.length > 0) { const last = valid[valid.length - 1]; updatePromises.push(fetch(`/api/exercises/${exId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_weight: last.weight, target_rpe: last.rpe || (ex ? ex.target_rpe : 0) }) })); }
            }
        });
        try { await Promise.all([fetch('/api/workouts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ day_id: dayData.id, notes: 'Log', sets: setsToSave }) }), ...updatePromises]); localStorage.removeItem(STORAGE_KEY); onFinish(); } catch (e) { alert('Error guardando'); }
    };

    // UI HELPER
    const SetRow = ({ exId, set, idx, onDelete, onUpdate, onToggle, target }) => {
        const isDone = set.completed;
        return (
            <div className={`grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 items-center p-2 rounded-xl mb-2 transition-all duration-300 border ${isDone ? 'bg-green-900/20 border-green-800' : 'bg-gray-800/40 border-transparent hover:border-gray-700'}`}>
                {/* SET NUM */}
                <div className="flex flex-col items-center justify-center w-8">
                    <span className={`text-xs font-bold mb-1 ${isDone ? 'text-green-400' : 'text-gray-500'}`}>SET</span>
                    <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${isDone ? 'bg-green-500 text-black' : 'bg-gray-700 text-gray-300'}`}>{set.setNum}</div>
                </div>

                {/* KG */}
                <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-gray-500 text-center uppercase font-bold">KG</label>
                    <input type="number" placeholder={target.weight || '-'} value={set.weight} onChange={(e) => onUpdate(idx, 'weight', e.target.value)}
                        className={`w-full bg-gray-900/80 border ${isDone ? 'border-green-800 text-green-300' : 'border-gray-700 text-white'} rounded-lg p-2 text-center font-bold outline-none focus:border-primary transition-colors`} />
                </div>

                {/* REPS */}
                <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-gray-500 text-center uppercase font-bold">REPS</label>
                    <input type="number" placeholder={target.reps?.split('-')[0] || '-'} value={set.reps} onChange={(e) => onUpdate(idx, 'reps', e.target.value)}
                        className={`w-full bg-gray-900/80 border ${isDone ? 'border-green-800 text-green-300' : 'border-gray-700 text-white'} rounded-lg p-2 text-center font-bold outline-none focus:border-primary transition-colors`} />
                </div>

                {/* RPE */}
                <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-gray-500 text-center uppercase font-bold">RPE</label>
                    <input type="number" placeholder={target.rpe || '-'} value={set.rpe} onChange={(e) => onUpdate(idx, 'rpe', e.target.value)}
                        className={`w-full bg-gray-900/80 border ${isDone ? 'border-green-800 text-green-300' : 'border-gray-700 text-white'} rounded-lg p-2 text-center font-bold outline-none focus:border-primary transition-colors`} />
                </div>

                {/* ACTIONS */}
                <div className="flex flex-col gap-1 items-center justify-end h-full pt-4">
                    <button onClick={() => onDelete(idx)} className="p-1.5 text-gray-600 hover:text-red-400 rounded-full hover:bg-gray-800 mb-1"><X size={12} /></button>
                    <button onClick={() => onToggle(idx)} className={`p-2 rounded-lg transition-all shadow-lg active:scale-90 ${isDone ? 'bg-green-500 text-black shadow-green-900/20' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                        <Check size={18} strokeWidth={3} />
                    </button>
                </div>
            </div>
        )
    };

    return (
        <div className="min-h-screen bg-background pb-32 animate-fade-in">
            {/* --- HEADER --- */}
            <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-gray-800 px-4 py-3 flex justify-between items-center">
                <button onClick={onFinish} className="p-2 -ml-2 text-gray-400 hover:text-white"><ArrowLeft /></button>
                <div>
                    <h1 className="font-bold text-white text-center leading-tight">{dayData.name}</h1>
                    <div className="flex justify-center items-center gap-2 mt-0.5">
                        <div className={`w-2 h-2 rounded-full ${isReviewMode ? 'bg-orange-500' : 'bg-green-500 animate-pulse'}`} />
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{isReviewMode ? 'MODO REVISIÓN' : 'EN PROGRESO'}</span>
                    </div>
                </div>
                <div className="w-8"></div> {/* Spacer */}
            </div>

            {/* --- LISTA DE EJERCICIOS --- */}
            <div className="max-w-xl mx-auto p-4 space-y-6">
                {exercises.map((ex, i) => {
                    const sets = sessionData[ex.id] || [];
                    const isEditing = editingExerciseId === ex.id;
                    const completedCount = sets.filter(s => s.completed).length;
                    const totalCount = sets.length;
                    const progress = (completedCount / totalCount) * 100;

                    return (
                        <div key={ex.id} className="bg-surface rounded-2xl border border-gray-800 overflow-hidden shadow-sm">
                            {/* HEADER EJERCICIO */}
                            <div className="p-4 bg-gray-800/30 border-b border-gray-800 flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-primary font-mono text-xs font-bold">#{i + 1}</span>
                                        {isEditing ? (
                                            <input autoFocus defaultValue={ex.name} onBlur={(e) => handleUpdateName(ex.id, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUpdateName(ex.id, e.currentTarget.value)} className="bg-gray-900 text-white px-2 rounded w-full border border-primary outline-none" />
                                        ) : (
                                            <h3 onClick={() => setEditingExerciseId(ex.id)} className="font-bold text-lg text-white leading-none cursor-pointer hover:text-blue-300 transition-colors">{ex.name}</h3>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 font-medium">Meta: {ex.target_sets} x {ex.target_reps} {ex.target_weight > 0 && `• ${ex.target_weight}kg`}</p>
                                </div>
                                {/* PROGRESS RING MINI */}
                                <div className="relative w-8 h-8 flex items-center justify-center">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-gray-800" />
                                        <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-primary transition-all duration-500" strokeDasharray={88} strokeDashoffset={88 - (88 * progress) / 100} />
                                    </svg>
                                    <span className="absolute text-[9px] font-bold text-gray-300">{completedCount}</span>
                                </div>
                            </div>

                            {/* SETS */}
                            <div className="p-3">
                                {sets.map((set, idx) => (
                                    <SetRow key={idx} exId={ex.id} set={set} idx={idx} onDelete={() => handleDeleteSet(ex.id, idx)} onUpdate={(i, f, v) => updateSet(ex.id, i, f, v)} onToggle={() => toggleComplete(ex.id, idx)} target={{ weight: ex.target_weight, reps: ex.target_reps, rpe: ex.target_rpe }} />
                                ))}
                                <button onClick={() => handleAddSet(ex.id)} className="w-full py-3 mt-2 rounded-xl border border-dashed border-gray-700 text-gray-500 text-sm font-bold hover:bg-gray-800 hover:text-white transition-all flex items-center justify-center gap-2">
                                    <Plus size={16} /> Agregar Serie
                                </button>
                            </div>
                        </div>
                    );
                })}

                <button onClick={() => setModalOpen(true)} className="w-full py-4 bg-gray-800 rounded-2xl text-gray-400 font-bold hover:bg-gray-700 hover:text-white transition-all flex items-center justify-center gap-2">
                    <Plus size={20} /> AGREGAR EJERCICIO
                </button>
            </div>

            {/* --- CONTROLES INFERIORES --- */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pointer-events-none flex flex-col items-center gap-4">
                {/* TIMER FLOTANTE */}
                <div className="pointer-events-auto bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-full px-5 py-2 flex items-center gap-4 shadow-2xl scale-110">
                    <span className="font-mono text-xl font-bold text-white tracking-widest min-w-[60px] text-center">{formatTime(seconds)}</span>
                    <div className="h-6 w-px bg-gray-700"></div>
                    <div className="flex gap-2">
                        <button onClick={() => setIsTimerRunning(!isTimerRunning)} className={`p-2 rounded-full text-white transition-colors ${isTimerRunning ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-green-600 hover:bg-green-500'}`}>
                            {isTimerRunning ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                        </button>
                        <button onClick={() => { setIsTimerRunning(false); setSeconds(0); }} className="p-2 rounded-full bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white">
                            <RotateCcw size={16} />
                        </button>
                    </div>
                </div>

                {/* BOTÓN TERMINAR */}
                <button onClick={handleSaveWorkout} className="pointer-events-auto w-full max-w-md bg-primary hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 transition-transform active:scale-95">
                    <Save size={20} /> {isReviewMode ? 'Guardar Cambios' : 'Terminar Entrenamiento'}
                </button>
            </div>

            <ExerciseModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleAddNewExercise} />
        </div>
    );
}