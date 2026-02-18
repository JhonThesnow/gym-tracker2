import React, { useState, useEffect } from 'react';
import { Timer, Check, Plus, Save, ArrowLeft, Trash2, Edit2, Play, Pause, RotateCcw, History, X } from 'lucide-react';

// --- MODAL PARA AGREGAR EJERCICIO (EMPOTRADO) ---
const ExerciseModal = ({ isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: '', target_sets: 3, target_reps: '8-12', target_weight: '', target_rpe: '',
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] backdrop-blur-sm animate-fade-in">
            <div className="bg-surface border border-gray-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">Agregar Ejercicio</h3>
                    <button onClick={onClose}><X className="text-gray-400 hover:text-white" /></button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Nombre</label>
                        <input required autoFocus className="w-full bg-background border border-gray-700 rounded p-3 text-white focus:border-primary outline-none"
                            placeholder="Ej: Curl de Bíceps"
                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Sets</label>
                            <input type="number" className="w-full bg-background border border-gray-700 rounded p-3 text-white text-center font-bold"
                                value={formData.target_sets} onChange={e => setFormData({ ...formData, target_sets: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Reps Meta</label>
                            <input className="w-full bg-background border border-gray-700 rounded p-3 text-white text-center font-bold"
                                value={formData.target_reps} onChange={e => setFormData({ ...formData, target_reps: e.target.value })} />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-primary hover:bg-blue-600 text-white p-4 rounded-xl font-bold mt-2 shadow-lg shadow-blue-500/20">
                        Guardar y Agregar
                    </button>
                </form>
            </div>
        </div>
    );
};

export default function ActiveWorkout({ dayData, onFinish }) {
    // Usamos un estado local para los ejercicios, así podemos agregar nuevos visualmente al instante
    const [exercises, setExercises] = useState([]);
    const [sessionData, setSessionData] = useState({});
    const [editingExerciseId, setEditingExerciseId] = useState(null);
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [modalOpen, setModalOpen] = useState(false); // Estado para el modal

    // ESTADO DEL TIMER
    const [seconds, setSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    const STORAGE_KEY = `workout_draft_${dayData.id}`;

    // 1. INICIALIZACIÓN
    useEffect(() => {
        if (dayData) {
            // Inicializar lista de ejercicios
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

            // Asegurar que todos tengan sets
            initialExercises.forEach(ex => {
                if (!workingData[ex.id]) {
                    workingData[ex.id] = Array.from({ length: ex.target_sets || 3 }).map((_, i) => ({
                        setNum: i + 1,
                        weight: ex.target_weight || '',
                        reps: '',
                        rpe: '',
                        completed: false
                    }));
                }
            });
            setSessionData(workingData);
        }
    }, [dayData]);

    // 2. AUTO-GUARDADO
    useEffect(() => {
        if (Object.keys(sessionData).length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
        }
    }, [sessionData]);

    // 3. TIMER
    useEffect(() => {
        let interval = null;
        if (isTimerRunning) {
            interval = setInterval(() => {
                setSeconds(s => s + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning]);

    const formatTime = (totalSeconds) => {
        const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // --- ACCIONES ---

    const handleAddNewExercise = async (formData) => {
        try {
            // 1. Guardar en Base de Datos (Persistencia Real)
            const res = await fetch('/api/exercises', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    day_id: dayData.id,
                    name: formData.name,
                    target_sets: formData.target_sets,
                    target_reps: formData.target_reps,
                    target_weight: 0,
                    target_rpe: 0,
                    exercise_order: 999
                })
            });
            const data = await res.json();

            // 2. Crear objeto de ejercicio nuevo
            const newExercise = {
                id: data.id,
                day_id: dayData.id,
                name: formData.name,
                target_sets: formData.target_sets,
                target_reps: formData.target_reps,
                target_weight: 0,
                target_rpe: 0
            };

            // 3. Actualizar estado local (Visual)
            setExercises(prev => [...prev, newExercise]);

            // 4. Inicializar sets para este nuevo ejercicio
            setSessionData(prev => ({
                ...prev,
                [newExercise.id]: Array.from({ length: newExercise.target_sets }).map((_, i) => ({
                    setNum: i + 1, weight: '', reps: '', rpe: '', completed: false
                }))
            }));

            setModalOpen(false);
        } catch (error) {
            console.error(error);
            alert("Error al crear ejercicio");
        }
    };

    const updateSet = (exerciseId, index, field, value) => {
        setSessionData(prev => {
            const sets = [...(prev[exerciseId] || [])];
            sets[index] = { ...sets[index], [field]: value };
            return { ...prev, [exerciseId]: sets };
        });
    };

    const toggleComplete = (exerciseId, index) => {
        setSessionData(prev => {
            const sets = [...(prev[exerciseId] || [])];
            sets[index] = { ...sets[index], completed: !sets[index].completed };
            return { ...prev, [exerciseId]: sets };
        });
    };

    const handleUpdateExerciseName = async (exerciseId, newName) => {
        await fetch(`/api/exercises/${exerciseId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
        });
        setEditingExerciseId(null);
    };

    const handleAddSet = async (exerciseId) => {
        setSessionData(prev => {
            const currentSets = prev[exerciseId] || [];
            const nextSetNum = currentSets.length + 1;
            const lastWeight = currentSets.length > 0 ? currentSets[currentSets.length - 1].weight : '';
            return {
                ...prev,
                [exerciseId]: [...currentSets, { setNum: nextSetNum, weight: lastWeight, reps: '', rpe: '', completed: false }]
            };
        });
        const currentCount = sessionData[exerciseId]?.length || 0;
        await fetch(`/api/exercises/${exerciseId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_sets: currentCount + 1 }) });
    };

    const handleDeleteSet = async (exerciseId, indexToDelete) => {
        setSessionData(prev => {
            const currentSets = [...(prev[exerciseId] || [])];
            currentSets.splice(indexToDelete, 1);
            const reorderedSets = currentSets.map((set, index) => ({ ...set, setNum: index + 1 }));
            return { ...prev, [exerciseId]: reorderedSets };
        });
        const currentCount = sessionData[exerciseId]?.length || 1;
        await fetch(`/api/exercises/${exerciseId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_sets: Math.max(0, currentCount - 1) }) });
    };

    const handleSaveWorkout = async () => {
        const setsToSave = [];
        const updatePromises = [];

        Object.keys(sessionData).forEach(exId => {
            // Buscamos en 'exercises' (estado local) en vez de dayData directo, para incluir los nuevos
            const exercise = exercises.find(e => e.id === parseInt(exId));
            const exerciseName = exercise ? exercise.name : 'Unknown';
            const sets = sessionData[exId];

            if (sets) {
                sets.forEach(set => {
                    if (set.completed || set.weight || set.reps) {
                        setsToSave.push({
                            exercise_name: exerciseName,
                            set_number: set.setNum,
                            weight: set.weight,
                            reps: set.reps,
                            rpe: set.rpe,
                            is_completed: set.completed
                        });
                    }
                });

                const validSets = sets.filter(s => s.weight && s.weight > 0);
                if (validSets.length > 0) {
                    const lastSet = validSets[validSets.length - 1];
                    updatePromises.push(
                        fetch(`/api/exercises/${exId}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ target_weight: lastSet.weight, target_rpe: lastSet.rpe || (exercise ? exercise.target_rpe : 0) })
                        })
                    );
                }
            }
        });

        try {
            await Promise.all([
                fetch('/api/workouts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ day_id: dayData.id, notes: 'Entrenamiento registrado', sets: setsToSave }) }),
                ...updatePromises
            ]);
            localStorage.removeItem(STORAGE_KEY);
            onFinish();
        } catch (error) {
            console.error(error);
            alert('Error al guardar.');
        }
    };

    // GRID OPTIMIZADO PARA MOBILE (Compacto)
    // Layout: Basura | # | RPE (Input) | Meta (Text) | KG (Input) | Reps (Input) | Check
    const gridLayout = "grid-cols-[20px_20px_0.7fr_0.6fr_1fr_1fr_30px]";

    return (
        <div className="min-h-screen bg-background pb-48 animate-fade-in relative">
            <header className="sticky top-0 z-20 bg-surface/95 backdrop-blur border-b border-gray-800 px-4 py-3 flex justify-between items-center shadow-md">
                <button onClick={onFinish} className="p-2 -ml-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div className="text-center">
                    <h1 className="font-bold text-white text-lg leading-tight truncate max-w-[200px]">{dayData.name}</h1>
                    <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                        {isReviewMode ? <span className="text-green-400 flex items-center gap-1"><History size={10} /> Revisión</span> : <span className="flex items-center gap-1"><Timer size={10} /> En progreso</span>}
                    </p>
                </div>
                <button className="p-2 -mr-2 text-primary font-bold text-sm" onClick={handleSaveWorkout}>
                    {isReviewMode ? 'ACTUALIZAR' : 'LISTO'}
                </button>
            </header>

            <div className="max-w-3xl mx-auto p-2 md:p-4 space-y-6">
                {/* Renderizamos desde el estado 'exercises' que incluye los nuevos agregados */}
                {exercises.map((ex, exIndex) => {
                    const sets = sessionData[ex.id] || [];
                    const isEditing = editingExerciseId === ex.id;

                    return (
                        <div key={ex.id} className="space-y-2">
                            <div className="flex justify-between items-end px-1">
                                <div className="flex items-center gap-2 flex-1">
                                    <span className="text-gray-500 font-bold">{exIndex + 1}.</span>
                                    {isEditing ? (
                                        <input
                                            autoFocus
                                            defaultValue={ex.name}
                                            onBlur={(e) => handleUpdateExerciseName(ex.id, e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateExerciseName(ex.id, e.currentTarget.value); }}
                                            className="bg-gray-800 text-white font-bold text-lg rounded px-2 py-1 w-full outline-none border border-primary"
                                        />
                                    ) : (
                                        <h3
                                            onClick={() => setEditingExerciseId(ex.id)}
                                            className="text-lg font-bold text-blue-100 cursor-text hover:bg-white/5 rounded px-1 transition-colors flex items-center gap-2 truncate"
                                        >
                                            {ex.name} <Edit2 size={12} className="text-gray-600 opacity-50" />
                                        </h3>
                                    )}
                                </div>
                            </div>

                            <div className="bg-surface rounded-xl overflow-hidden border border-gray-800 shadow-sm">
                                <div className={`grid ${gridLayout} gap-1 px-2 py-2 bg-gray-800/50 text-[9px] font-bold text-gray-400 text-center uppercase tracking-wider items-center`}>
                                    <div></div> {/* Basura */}
                                    <div>#</div>
                                    <div>RPE</div>
                                    <div>Meta</div>
                                    <div>KG</div>
                                    <div>Reps</div>
                                    <div><Check size={10} className="mx-auto" /></div>
                                </div>

                                <div className="divide-y divide-gray-800">
                                    {sets.map((set, i) => (
                                        <div key={i} className={`grid ${gridLayout} gap-1 px-2 py-2 items-center transition-colors ${set.completed ? 'bg-green-900/10' : ''}`}>

                                            {/* 1. Basura */}
                                            <button onClick={() => handleDeleteSet(ex.id, i)} className="flex items-center justify-center text-gray-600 hover:text-red-500 transition-colors p-1"><Trash2 size={12} /></button>

                                            {/* 2. Numero */}
                                            <div className="flex justify-center"><span className={`w-4 h-4 flex items-center justify-center rounded-full text-[10px] font-bold ${set.completed ? 'bg-green-500/20 text-green-500' : 'bg-gray-700 text-gray-400'}`}>{set.setNum}</span></div>

                                            {/* 3. RPE (Input) */}
                                            <input
                                                type="number"
                                                placeholder={ex.target_rpe || "-"}
                                                value={set.rpe}
                                                onChange={(e) => updateSet(ex.id, i, 'rpe', e.target.value)}
                                                className={`w-full bg-gray-900/50 border border-transparent rounded px-1 py-1.5 text-center text-white font-bold text-sm focus:border-primary focus:bg-gray-900 focus:outline-none transition-all ${set.completed ? 'text-green-300' : ''}`}
                                            />

                                            {/* 4. Meta (Texto) */}
                                            <div className="text-[10px] text-gray-500 font-mono text-center flex flex-col justify-center truncate">
                                                {ex.target_weight ? `${ex.target_weight}` : ex.target_reps}
                                            </div>

                                            {/* 5. KG (Input - Lo principal) */}
                                            <input
                                                type="number"
                                                placeholder={ex.target_weight || "-"}
                                                value={set.weight}
                                                onChange={(e) => updateSet(ex.id, i, 'weight', e.target.value)}
                                                className={`w-full bg-gray-900/50 border border-transparent rounded px-1 py-1.5 text-center text-white font-bold text-sm focus:border-primary focus:bg-gray-900 focus:outline-none transition-all ${set.completed ? 'text-green-300' : ''}`}
                                            />

                                            {/* 6. Reps (Input - Lo principal) */}
                                            <input
                                                type="number"
                                                placeholder={ex.target_reps.split('-')[0]}
                                                value={set.reps}
                                                onChange={(e) => updateSet(ex.id, i, 'reps', e.target.value)}
                                                className={`w-full bg-gray-900/50 border border-transparent rounded px-1 py-1.5 text-center text-white font-bold text-sm focus:border-primary focus:bg-gray-900 focus:outline-none transition-all ${set.completed ? 'text-green-300' : ''}`}
                                            />

                                            {/* 7. Check */}
                                            <button onClick={() => toggleComplete(ex.id, i)} className={`flex items-center justify-center h-7 w-full rounded transition-all ${set.completed ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-500'}`}><Check size={14} strokeWidth={3} /></button>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => handleAddSet(ex.id)} className="w-full py-3 bg-gray-800/30 hover:bg-gray-800 text-xs font-bold text-primary flex items-center justify-center gap-1 transition-colors border-t border-gray-800"><Plus size={14} /> AGREGAR SET</button>
                            </div>
                        </div>
                    );
                })}

                {/* --- BOTÓN AGREGAR EJERCICIO --- */}
                <button
                    onClick={() => setModalOpen(true)}
                    className="w-full py-4 border-2 border-dashed border-gray-700 text-gray-400 rounded-xl hover:text-white hover:border-gray-500 transition-colors flex items-center justify-center gap-2"
                >
                    <Plus size={20} /> Agregar Ejercicio
                </button>

            </div>

            {/* --- WIDGET TIMER FLOTANTE --- */}
            <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2">
                <div className="bg-surface/90 border border-gray-700 rounded-2xl shadow-2xl p-2 flex items-center gap-2 backdrop-blur-md">
                    <div className="font-mono text-xl font-bold text-white min-w-[60px] text-center tracking-wider">
                        {formatTime(seconds)}
                    </div>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setIsTimerRunning(!isTimerRunning)}
                            className={`p-2 rounded-full ${isTimerRunning ? 'bg-yellow-600 text-white' : 'bg-green-600 text-white'} hover:opacity-90 transition-colors`}
                        >
                            {isTimerRunning ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                        </button>
                        <button
                            onClick={() => { setIsTimerRunning(false); setSeconds(0); }}
                            className="p-2 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                        >
                            <RotateCcw size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="fixed bottom-4 left-4 right-4 z-40">
                <button onClick={handleSaveWorkout} className="w-full bg-primary hover:bg-blue-600 text-white py-3 rounded-xl font-bold shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all">
                    <Save size={20} /> {isReviewMode ? 'Actualizar Sesión' : 'Terminar Sesión'}
                </button>
            </div>

            {/* Renderizamos el Modal aquí */}
            <ExerciseModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleAddNewExercise} />
        </div>
    );
}