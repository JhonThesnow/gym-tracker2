import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Calendar, Play, ChevronDown, ChevronRight, ChevronUp, X, Edit2, GripVertical, Book, ChartPie, MoreVertical, Calculator, Settings } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// --- MODAL DE CONFIGURACIÓN DE CARGA Y 1RM ---
const LoadConfigModal = ({ isOpen, onClose, exercise, onSave }) => {
    const [mode, setMode] = useState('kg'); // 'kg' o 'percent'
    const [value, setValue] = useState(''); // Peso o Porcentaje

    // Estado para calculadora de 1RM
    const [calcWeight, setCalcWeight] = useState('');
    const [calcReps, setCalcReps] = useState('');
    const [current1RM, setCurrent1RM] = useState(0);

    useEffect(() => {
        if (isOpen && exercise) {
            setMode(exercise.load_type || 'kg');
            setValue(exercise.target_value || '');
            // Si el ejercicio trae el 1RM de la librería (lo pasaremos desde el padre)
            setCurrent1RM(exercise.library_1rm || 0);
        }
    }, [isOpen, exercise]);

    if (!isOpen) return null;

    const calculateAndSet1RM = async () => {
        if (!calcWeight || !calcReps) return;
        // Fórmula Epley: Peso * (1 + Reps/30)
        const estimated = Math.round(parseFloat(calcWeight) * (1 + parseInt(calcReps) / 30));
        setCurrent1RM(estimated);

        // Guardar en la librería automáticamente
        try {
            await fetch('/api/library/exercises/1rm', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: exercise.name, one_rep_max: estimated })
            });
            alert(`1RM actualizado a ${estimated}kg en la biblioteca.`);
        } catch (error) {
            console.error("Error updating 1RM", error);
        }
    };

    const handleSave = () => {
        onSave(exercise.id, { load_type: mode, target_value: value });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
            <div className="bg-surface border border-gray-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><Settings size={20} /> Configurar Carga</h3>
                    <button onClick={onClose}><X className="text-gray-400 hover:text-white" /></button>
                </div>

                {/* TABS MODO */}
                <div className="flex bg-gray-800 p-1 rounded-xl mb-6">
                    <button onClick={() => setMode('kg')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'kg' ? 'bg-primary text-white shadow' : 'text-gray-400 hover:text-white'}`}>
                        Peso Fijo (Kg)
                    </button>
                    <button onClick={() => setMode('percent')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'percent' ? 'bg-primary text-white shadow' : 'text-gray-400 hover:text-white'}`}>
                        Porcentaje (%)
                    </button>
                </div>

                {mode === 'kg' ? (
                    <div className="mb-6">
                        <label className="block text-xs text-gray-400 mb-2 uppercase font-bold">Peso Objetivo (Kg)</label>
                        <input type="number" autoFocus className="w-full bg-background border border-gray-700 rounded-xl p-4 text-white text-xl font-bold text-center focus:border-primary outline-none"
                            placeholder="Ej: 100" value={value} onChange={e => setValue(e.target.value)} />
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-400 text-xs font-bold uppercase">Tu 1RM Actual</span>
                                <span className="text-accent font-mono font-bold text-lg">{current1RM > 0 ? `${current1RM} kg` : '?'}</span>
                            </div>

                            {/* CALCULADORA INTEGRADA */}
                            <div className="space-y-2 mt-3 pt-3 border-t border-gray-700">
                                <p className="text-[10px] text-gray-500 mb-2 flex items-center gap-1"><Calculator size={10} /> ¿No sabes tu 1RM? Estímalo:</p>
                                <div className="flex gap-2">
                                    <input type="number" placeholder="Peso" className="w-full bg-background border border-gray-700 rounded-lg p-2 text-white text-sm text-center" value={calcWeight} onChange={e => setCalcWeight(e.target.value)} />
                                    <input type="number" placeholder="Reps" className="w-full bg-background border border-gray-700 rounded-lg p-2 text-white text-sm text-center" value={calcReps} onChange={e => setCalcReps(e.target.value)} />
                                    <button onClick={calculateAndSet1RM} className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg font-bold text-xs">Calc</button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-gray-400 mb-2 uppercase font-bold">Porcentaje Objetivo (%)</label>
                            <input type="number" className="w-full bg-background border border-gray-700 rounded-xl p-4 text-white text-xl font-bold text-center focus:border-primary outline-none"
                                placeholder="Ej: 80" value={value} onChange={e => setValue(e.target.value)} />
                            {current1RM > 0 && value && (
                                <p className="text-center text-sm text-green-400 mt-2 font-bold">
                                    = {Math.round(current1RM * (value / 100))} kg
                                </p>
                            )}
                        </div>
                    </div>
                )}

                <button onClick={handleSave} className="w-full bg-primary hover:bg-blue-600 text-white p-3 rounded-xl font-bold shadow-lg shadow-blue-500/20">
                    Guardar Configuración
                </button>
            </div>
        </div>
    );
};

// --- COMPONENTE DE ESTADÍSTICAS (Sin cambios) ---
const WeekStats = ({ week, library }) => {
    const [isOpen, setIsOpen] = useState(false);
    const stats = useMemo(() => {
        if (!week || !week.days || !library) return [];
        const muscleVolume = {};
        let totalSets = 0;
        week.days.forEach(day => {
            if (!day.exercises) return;
            day.exercises.forEach(ex => {
                const libEx = library.find(l => l.name.toLowerCase() === ex.name.toLowerCase());
                const sets = parseInt(ex.target_sets) || 0;
                if (libEx && libEx.muscles && libEx.muscles.length > 0 && sets > 0) {
                    libEx.muscles.forEach(m => {
                        const contribution = sets * (m.percentage / 100);
                        muscleVolume[m.muscle_name] = (muscleVolume[m.muscle_name] || 0) + contribution;
                        totalSets += contribution;
                    });
                } else if (sets > 0) {
                    muscleVolume['Otros'] = (muscleVolume['Otros'] || 0) + sets;
                    totalSets += sets;
                }
            });
        });
        return Object.entries(muscleVolume)
            .map(([name, value]) => ({ name, value, percent: totalSets > 0 ? (value / totalSets) * 100 : 0 }))
            .sort((a, b) => b.value - a.value);
    }, [week, library]);

    if (stats.length === 0) return null;

    return (
        <div className="bg-gray-900/50 rounded-xl mb-4 border border-gray-800 animate-fade-in overflow-hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full p-4 flex justify-between items-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2 text-xs font-bold uppercase"><ChartPie size={14} /> Resumen de Impacto Semanal</div>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {isOpen && (
                <div className="p-4 pt-0 space-y-3 border-t border-gray-800/50 mt-2">
                    {stats.map((stat) => (
                        <div key={stat.name} className="flex items-center gap-3">
                            <span className="text-xs font-bold text-gray-300 w-24 truncate" title={stat.name}>{stat.name}</span>
                            <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" style={{ width: `${stat.percent}%` }} />
                            </div>
                            <span className="text-xs text-gray-500 font-mono w-12 text-right">{Math.round(stat.percent)}%</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- MODAL AGREGAR/EDITAR EJERCICIO BÁSICO ---
const ExerciseModal = ({ isOpen, onClose, onSave, initialData, library }) => {
    const [formData, setFormData] = useState({ name: '', target_sets: 3, target_reps: '8-12', target_rpe: '', notes: '' });
    useEffect(() => {
        if (isOpen) setFormData(initialData || { name: '', target_sets: 3, target_reps: '8-12', target_rpe: '', notes: '' });
    }, [isOpen, initialData]);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-surface border border-gray-700 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">{initialData ? 'Editar' : 'Nuevo'} Ejercicio</h3>
                    <button onClick={onClose}><X className="text-gray-400 hover:text-white" /></button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Nombre</label>
                        <div className="relative">
                            <input required list="library-suggestions" className="w-full bg-background border border-gray-700 rounded-xl p-3 text-white focus:border-primary outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} autoFocus placeholder="Buscar en índice..." autoComplete="off" />
                            <datalist id="library-suggestions">{library && library.map(ex => <option key={ex.id} value={ex.name} />)}</datalist>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Sets</label><input type="number" className="w-full bg-background border border-gray-700 rounded-xl p-3 text-white" value={formData.target_sets} onChange={e => setFormData({ ...formData, target_sets: e.target.value })} /></div>
                        <div><label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Reps</label><input className="w-full bg-background border border-gray-700 rounded-xl p-3 text-white" value={formData.target_reps} onChange={e => setFormData({ ...formData, target_reps: e.target.value })} /></div>
                    </div>
                    <div><label className="block text-xs text-gray-400 mb-1 uppercase font-bold">RPE / Notas</label><input className="w-full bg-background border border-gray-700 rounded-xl p-3 text-white" placeholder="Ej: RPE 8" value={formData.target_rpe} onChange={e => setFormData({ ...formData, target_rpe: e.target.value })} /></div>
                    <button type="submit" className="w-full bg-primary hover:bg-blue-600 text-white p-3 rounded-xl font-bold mt-4 shadow-lg shadow-blue-500/20">Guardar</button>
                </form>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---
export default function ProgramDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [program, setProgram] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedWeeks, setExpandedWeeks] = useState({});
    const [expandedDays, setExpandedDays] = useState({});

    // Modales
    const [modalOpen, setModalOpen] = useState(false);
    const [loadModalOpen, setLoadModalOpen] = useState(false);

    const [activeDayId, setActiveDayId] = useState(null);
    const [editingExercise, setEditingExercise] = useState(null);
    const [configExercise, setConfigExercise] = useState(null); // Ejercicio a configurar carga
    const [library, setLibrary] = useState([]);

    const fetchProgram = async () => {
        try {
            const res = await fetch(`/api/programs/${id}/full`);
            if (!res.ok) throw new Error('Error al cargar');
            const data = await res.json();
            setProgram(data);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    const fetchLibrary = async () => {
        try {
            const res = await fetch('/api/library/exercises');
            if (res.ok) setLibrary(await res.json());
        } catch (error) { console.error(error); }
    };

    useEffect(() => { fetchProgram(); fetchLibrary(); }, [id]);

    const handleDragEnd = async (result) => {
        if (!result.destination) return;
        const { source, destination, type } = result;

        if (type === 'DAY') {
            const weekId = parseInt(source.droppableId.replace('week-', ''));
            const newProgram = JSON.parse(JSON.stringify(program));
            const week = newProgram.weeks.find(w => w.id === weekId);
            if (!week) return;
            const [movedDay] = week.days.splice(source.index, 1);
            week.days.splice(destination.index, 0, movedDay);
            setProgram(newProgram);
            await fetch(`/api/weeks/${weekId}/reorder-days`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dayIds: week.days.map(d => d.id) }) });
        } else {
            const dayId = parseInt(source.droppableId.replace('day-', ''));
            const newProgram = JSON.parse(JSON.stringify(program));
            let foundDay;
            for (const week of newProgram.weeks) {
                const d = week.days.find(d => d.id === dayId);
                if (d) { foundDay = d; break; }
            }
            if (!foundDay) return;
            const [movedEx] = foundDay.exercises.splice(source.index, 1);
            foundDay.exercises.splice(destination.index, 0, movedEx);
            setProgram(newProgram);
            await fetch(`/api/days/${dayId}/reorder`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exerciseIds: foundDay.exercises.map(e => e.id) }) });
        }
    };

    const toggleWeek = (weekId) => setExpandedWeeks(p => ({ ...p, [weekId]: !p[weekId] }));
    const toggleDay = (dayId) => setExpandedDays(p => ({ ...p, [dayId]: !p[dayId] }));
    const addWeek = async () => {
        const nextWeekNum = (program.weeks?.length || 0) + 1;
        await fetch('/api/weeks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ program_id: id, week_number: nextWeekNum }) });
        fetchProgram();
    };
    const deleteWeek = async (weekId, e) => {
        e.stopPropagation();
        if (confirm("¿Eliminar semana?")) { await fetch(`/api/weeks/${weekId}`, { method: 'DELETE' }); fetchProgram(); }
    };
    const addDay = async (weekId, count, e) => {
        e.stopPropagation();
        const name = prompt("Nombre del día:");
        if (name) { await fetch('/api/days', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ week_id: weekId, name, day_order: count + 1 }) }); fetchProgram(); }
    };

    // Guardar Ejercicio Básico
    const handleSaveExercise = async (formData) => {
        const endpoint = editingExercise ? `/api/exercises/${editingExercise.id}` : '/api/exercises';
        const method = editingExercise ? 'PATCH' : 'POST';
        const body = editingExercise ? formData : { day_id: activeDayId, ...formData, exercise_order: 999 };
        await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        setModalOpen(false);
        fetchProgram();
    };

    // Guardar Configuración de Carga
    const handleSaveLoadConfig = async (exerciseId, configData) => {
        await fetch(`/api/exercises/${exerciseId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(configData)
        });
        fetchProgram(); // Recargamos para ver los cambios y el cálculo actualizado
    };

    const deleteExercise = async (exId) => {
        if (confirm("¿Borrar?")) { await fetch(`/api/exercises/${exId}`, { method: 'DELETE' }); fetchProgram(); }
    };

    if (loading) return <div className="p-10 text-center text-gray-400">Cargando programa...</div>;
    if (!program) return <div className="p-10 text-center text-red-400">Programa no encontrado</div>;
    const weeks = program.weeks || [];

    return (
        <div className="pb-32">
            <div className="flex items-center gap-4 mb-8">
                <Link to="/programs" className="p-3 bg-surface rounded-xl hover:bg-gray-700 transition-colors"><ArrowLeft size={20} /></Link>
                <div><h1 className="text-3xl font-bold text-white">{program.name}</h1><p className="text-gray-400">{program.description}</p></div>
            </div>

            <div className="space-y-6">
                {weeks.length === 0 && (
                    <div className="text-center p-12 border-2 border-dashed border-gray-800 rounded-2xl bg-surface/30">
                        <Calendar className="mx-auto text-gray-600 mb-4" size={48} />
                        <p className="text-gray-500 font-medium">No hay semanas configuradas</p>
                    </div>
                )}

                <DragDropContext onDragEnd={handleDragEnd}>
                    {weeks.map((week) => (
                        <div key={week.id} className="bg-surface border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
                            <div onClick={() => toggleWeek(week.id)} className="p-5 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors select-none">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg ${expandedWeeks[week.id] ? 'bg-primary text-white' : 'bg-gray-800 text-gray-400'}`}>
                                        {expandedWeeks[week.id] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                    </div>
                                    <h2 className="font-bold text-xl text-white">Semana {week.week_number}</h2>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={(e) => addDay(week.id, week.days.length, e)} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs font-bold text-blue-400 flex items-center gap-1 transition-colors"><Plus size={14} /> DÍA</button>
                                    <button onClick={(e) => deleteWeek(week.id, e)} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                </div>
                            </div>

                            {expandedWeeks[week.id] && (
                                <div className="p-4 border-t border-gray-800 bg-black/20">
                                    <WeekStats week={week} library={library} />
                                    <Droppable droppableId={`week-${week.id}`} type="DAY">
                                        {(providedWeek) => (
                                            <div ref={providedWeek.innerRef} {...providedWeek.droppableProps} className="space-y-4">
                                                {week.days.length === 0 && <p className="text-center text-gray-500 py-4 italic">No hay días asignados.</p>}
                                                {week.days.map((day, dayIndex) => (
                                                    <Draggable key={day.id} draggableId={`day-card-${day.id}`} index={dayIndex}>
                                                        {(providedDay, snapshotDay) => (
                                                            <div ref={providedDay.innerRef} {...providedDay.draggableProps} className={`bg-background rounded-xl border ${snapshotDay.isDragging ? 'border-primary z-50 shadow-2xl' : 'border-gray-800'} overflow-hidden transition-all`}>
                                                                <div onClick={() => toggleDay(day.id)} className="p-4 bg-gray-800/30 flex justify-between items-center border-b border-gray-800 cursor-pointer hover:bg-gray-800/50">
                                                                    <div className="flex items-center gap-3">
                                                                        <div {...providedDay.dragHandleProps} className="cursor-grab text-gray-600 hover:text-white p-1 hover:bg-gray-700 rounded" onClick={e => e.stopPropagation()}><GripVertical size={20} /></div>
                                                                        <div className="flex items-center gap-2">
                                                                            <div className={`transition-transform duration-200 ${expandedDays[day.id] ? 'rotate-180' : ''}`}><ChevronDown size={16} className="text-gray-400" /></div>
                                                                            <h3 className="font-bold text-white flex items-center gap-2"><div className="w-1.5 h-1.5 bg-accent rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />{day.name}</h3>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <button onClick={(e) => { e.stopPropagation(); setActiveDayId(day.id); setEditingExercise(null); setModalOpen(true); }} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs font-medium text-gray-300 flex items-center gap-1 transition-colors"><Book size={14} /> + Ejercicio</button>
                                                                        <button onClick={(e) => { e.stopPropagation(); navigate(`/workout/${day.id}`); }} className="px-4 py-1.5 bg-primary hover:bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"><Play size={12} fill="currentColor" /> ENTRENAR</button>
                                                                    </div>
                                                                </div>
                                                                {expandedDays[day.id] && (
                                                                    <Droppable droppableId={`day-${day.id}`} type="EXERCISE">
                                                                        {(providedEx) => (
                                                                            <div ref={providedEx.innerRef} {...providedEx.droppableProps} className="p-2 space-y-2 min-h-[50px]">
                                                                                {day.exercises.map((ex, index) => (
                                                                                    <Draggable key={ex.id} draggableId={ex.id.toString()} index={index}>
                                                                                        {(provided, snapshot) => (
                                                                                            <div ref={provided.innerRef} {...provided.draggableProps} className={`group flex justify-between items-center bg-surface p-3 rounded-lg border ${snapshot.isDragging ? 'border-primary shadow-xl bg-gray-800' : 'border-transparent hover:border-gray-700 hover:bg-gray-800'} transition-colors`}>
                                                                                                <div className="flex items-center gap-3 flex-1">
                                                                                                    <div {...provided.dragHandleProps} className="cursor-grab text-gray-600 hover:text-gray-300 p-1"><GripVertical size={16} /></div>
                                                                                                    <span className="text-gray-600 font-mono font-bold text-xs w-4">{index + 1}</span>
                                                                                                    <div>
                                                                                                        <p className="font-bold text-gray-200 text-sm">{ex.name}</p>
                                                                                                        <div className="flex gap-3 text-[10px] font-bold text-gray-500 mt-0.5 uppercase tracking-wide">
                                                                                                            <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">{ex.target_sets} Sets</span>
                                                                                                            <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">{ex.target_reps} Reps</span>

                                                                                                            {/* DISPLAY INTELIGENTE DE CARGA */}
                                                                                                            {ex.load_type === 'percent' && ex.target_value ? (
                                                                                                                <span className="text-accent flex items-center gap-1">
                                                                                                                    {ex.target_value}%
                                                                                                                    {ex.library_1rm ? <span className="text-gray-500">({Math.round(ex.library_1rm * (ex.target_value / 100))}kg)</span> : <span className="text-red-500" title="Configura tu 1RM">⚠</span>}
                                                                                                                </span>
                                                                                                            ) : (
                                                                                                                ex.target_value > 0 && <span className="text-accent">{ex.target_value}kg</span>
                                                                                                            )}
                                                                                                            {ex.target_rpe && <span className="text-orange-400">RPE {ex.target_rpe}</span>}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>

                                                                                                {/* BOTÓN 3 PUNTITOS Y MENÚ CONTEXTUAL */}
                                                                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                                    <button onClick={() => { setConfigExercise(ex); setLoadModalOpen(true); }} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors" title="Configurar Carga"><MoreVertical size={16} /></button>
                                                                                                    <button onClick={() => { setActiveDayId(day.id); setEditingExercise(ex); setModalOpen(true); }} className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"><Edit2 size={16} /></button>
                                                                                                    <button onClick={() => deleteExercise(ex.id)} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"><Trash2 size={16} /></button>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </Draggable>
                                                                                ))}
                                                                                {providedEx.placeholder}
                                                                            </div>
                                                                        )}
                                                                    </Droppable>
                                                                )}
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {providedWeek.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            )}
                        </div>
                    ))}
                </DragDropContext>
            </div>

            <button onClick={addWeek} className="mt-8 w-full py-4 border-2 border-dashed border-gray-700 text-gray-400 rounded-2xl hover:text-white hover:border-gray-500 hover:bg-gray-800/30 transition-all flex justify-center items-center gap-2 group">
                <div className="p-2 bg-gray-800 rounded-full group-hover:bg-primary group-hover:text-white transition-colors"><Plus size={20} /></div>
                <span className="font-medium">Agregar Nueva Semana</span>
            </button>

            {/* MODALES */}
            <ExerciseModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSaveExercise} initialData={editingExercise} library={library} />
            <LoadConfigModal isOpen={loadModalOpen} onClose={() => setLoadModalOpen(false)} exercise={configExercise} onSave={handleSaveLoadConfig} />
        </div>
    );
}