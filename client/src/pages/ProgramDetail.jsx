import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Calendar, Play, ChevronDown, ChevronRight, X, Edit2, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// --- MODAL ---
const ExerciseModal = ({ isOpen, onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState({
        name: '', target_sets: 3, target_reps: '8-12', target_weight: '', target_rpe: '', notes: ''
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData(initialData);
            } else {
                setFormData({ name: '', target_sets: 3, target_reps: '8-12', target_weight: '', target_rpe: '', notes: '' });
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-surface border border-gray-700 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">{initialData ? 'Editar' : 'Nuevo'} Ejercicio</h3>
                    <button onClick={onClose}><X className="text-gray-400 hover:text-white" /></button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Nombre</label>
                        <input required className="w-full bg-background border border-gray-700 rounded p-2 text-white" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} autoFocus />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm text-gray-400 mb-1">Sets</label><input type="number" className="w-full bg-background border border-gray-700 rounded p-2 text-white" value={formData.target_sets} onChange={e => setFormData({ ...formData, target_sets: e.target.value })} /></div>
                        <div><label className="block text-sm text-gray-400 mb-1">Reps</label><input className="w-full bg-background border border-gray-700 rounded p-2 text-white" value={formData.target_reps} onChange={e => setFormData({ ...formData, target_reps: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm text-gray-400 mb-1">Peso (kg)</label><input type="number" step="0.5" className="w-full bg-background border border-gray-700 rounded p-2 text-white" value={formData.target_weight || ''} onChange={e => setFormData({ ...formData, target_weight: e.target.value })} /></div>
                        <div><label className="block text-sm text-gray-400 mb-1">RPE</label><input type="number" step="0.5" className="w-full bg-background border border-gray-700 rounded p-2 text-white" value={formData.target_rpe || ''} onChange={e => setFormData({ ...formData, target_rpe: e.target.value })} /></div>
                    </div>
                    <button type="submit" className="w-full bg-primary hover:bg-blue-600 text-white p-3 rounded-lg font-bold mt-4">Guardar</button>
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
    const [modalOpen, setModalOpen] = useState(false);
    const [activeDayId, setActiveDayId] = useState(null);
    const [editingExercise, setEditingExercise] = useState(null);

    const fetchProgram = async () => {
        try {
            const res = await fetch(`/api/programs/${id}/full`);
            if (!res.ok) throw new Error('Error al cargar');
            const data = await res.json();
            setProgram(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchProgram(); }, [id]);

    const handleDragEnd = async (result) => {
        if (!result.destination) return;
        const { source, destination } = result;
        const dayId = parseInt(source.droppableId.replace('day-', ''));

        const newProgram = JSON.parse(JSON.stringify(program));
        let foundDay;
        for (const week of newProgram.weeks) {
            const d = week.days.find(d => d.id === dayId);
            if (d) { foundDay = d; break; }
        }
        if (!foundDay) return;

        const [moved] = foundDay.exercises.splice(source.index, 1);
        foundDay.exercises.splice(destination.index, 0, moved);
        setProgram(newProgram);

        await fetch(`/api/days/${dayId}/reorder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ exerciseIds: foundDay.exercises.map(e => e.id) })
        });
    };

    const toggleWeek = (weekId) => setExpandedWeeks(p => ({ ...p, [weekId]: !p[weekId] }));

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

    const handleSaveExercise = async (formData) => {
        const endpoint = editingExercise ? `/api/exercises/${editingExercise.id}` : '/api/exercises';
        const method = editingExercise ? 'PATCH' : 'POST';
        const body = editingExercise ? formData : { day_id: activeDayId, ...formData, exercise_order: 999 };

        await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        setModalOpen(false);
        fetchProgram();
    };

    const deleteExercise = async (exId) => {
        if (confirm("¿Borrar?")) { await fetch(`/api/exercises/${exId}`, { method: 'DELETE' }); fetchProgram(); }
    };

    if (loading) return <div className="p-10 text-center text-gray-400">Cargando programa...</div>;
    if (!program) return <div className="p-10 text-center text-red-400">Programa no encontrado</div>;

    const weeks = program.weeks || [];

    return (
        <div className="pb-20">
            <div className="flex items-center gap-4 mb-8">
                <Link to="/programs" className="p-2 bg-surface rounded-full hover:bg-gray-700"><ArrowLeft size={20} /></Link>
                <div><h1 className="text-3xl font-bold text-white">{program.name}</h1><p className="text-gray-400">{program.description}</p></div>
            </div>

            <div className="space-y-4">
                {weeks.length === 0 && (
                    <div className="text-center p-10 border-2 border-dashed border-gray-800 rounded-xl">
                        <p className="text-gray-500 mb-4">No hay semanas configuradas</p>
                    </div>
                )}

                <DragDropContext onDragEnd={handleDragEnd}>
                    {weeks.map((week) => (
                        <div key={week.id} className="bg-surface/50 border border-gray-800 rounded-xl overflow-hidden">
                            <div onClick={() => toggleWeek(week.id)} className="bg-surface p-4 flex justify-between items-center cursor-pointer hover:bg-gray-800 select-none">
                                <div className="flex items-center gap-3">
                                    {expandedWeeks[week.id] ? <ChevronDown size={20} className="text-primary" /> : <ChevronRight size={20} className="text-gray-500" />}
                                    <h2 className="font-bold text-lg text-gray-200">Semana {week.week_number}</h2>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={(e) => addDay(week.id, week.days.length, e)} className="text-xs bg-gray-800 border border-gray-700 px-3 py-1 rounded text-gray-300 flex gap-1 items-center"><Plus size={14} /> Día</button>
                                    <button onClick={(e) => deleteWeek(week.id, e)} className="text-gray-500 hover:text-red-500 p-1"><Trash2 size={16} /></button>
                                </div>
                            </div>

                            {expandedWeeks[week.id] && (
                                <div className="p-4 space-y-4 border-t border-gray-800 bg-black/20">
                                    {week.days.length === 0 && <p className="text-sm text-gray-500 italic">Sin días.</p>}
                                    {week.days.map((day) => (
                                        <div key={day.id} className="bg-background rounded-lg border border-gray-800 p-4">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="font-bold text-white flex items-center gap-2"><div className="w-1 h-5 bg-accent rounded-full" />{day.name}</h3>
                                                <div className="flex gap-2">
                                                    <button onClick={() => { setActiveDayId(day.id); setEditingExercise(null); setModalOpen(true); }} className="text-xs border border-gray-600 text-gray-400 px-2 py-1 rounded hover:text-white">+ Ejercicio</button>
                                                    <button onClick={() => navigate(`/workout/${day.id}`)} className="flex items-center gap-1 text-xs bg-primary hover:bg-blue-600 text-white px-3 py-1 rounded font-bold"><Play size={12} /> ENTRENAR</button>
                                                </div>
                                            </div>

                                            <Droppable droppableId={`day-${day.id}`}>
                                                {(provided) => (
                                                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 min-h-[10px]">
                                                        {day.exercises.map((ex, index) => (
                                                            <Draggable key={ex.id} draggableId={ex.id.toString()} index={index}>
                                                                {(provided, snapshot) => (
                                                                    <div ref={provided.innerRef} {...provided.draggableProps} className={`flex justify-between items-center bg-surface p-3 rounded border ${snapshot.isDragging ? 'border-primary z-50 shadow-xl' : 'border-transparent hover:bg-gray-800'}`}>
                                                                        <div className="flex items-center gap-3 flex-1">
                                                                            <div {...provided.dragHandleProps} className="cursor-grab text-gray-600 hover:text-gray-300"><GripVertical size={16} /></div>
                                                                            <span className="text-gray-500 font-mono font-bold w-5">{index + 1}.</span>
                                                                            <div>
                                                                                <p className="font-medium text-gray-200">{ex.name}</p>
                                                                                <div className="flex gap-2 text-xs text-gray-500">
                                                                                    <span>{ex.target_sets}x{ex.target_reps}</span>
                                                                                    {ex.target_weight && <span className="text-accent">• {ex.target_weight}kg</span>}
                                                                                    {ex.target_rpe && <span>• RPE {ex.target_rpe}</span>}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex gap-1">
                                                                            <button onClick={() => { setActiveDayId(day.id); setEditingExercise(ex); setModalOpen(true); }} className="p-2 text-gray-500 hover:text-white"><Edit2 size={16} /></button>
                                                                            <button onClick={() => deleteExercise(ex.id)} className="p-2 text-gray-500 hover:text-red-500"><Trash2 size={16} /></button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        ))}
                                                        {provided.placeholder}
                                                    </div>
                                                )}
                                            </Droppable>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </DragDropContext>
            </div>

            {/* BOTÓN SIEMPRE VISIBLE AL FINAL */}
            <button
                onClick={addWeek}
                className="mt-8 w-full py-4 border-2 border-dashed border-gray-700 text-gray-400 rounded-xl hover:text-primary hover:border-primary transition-colors flex justify-center items-center gap-2"
            >
                <Plus size={20} /> {weeks.length === 0 ? "Crear Semana 1" : "Agregar Siguiente Semana"}
            </button>

            <ExerciseModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSaveExercise} initialData={editingExercise} />
        </div>
    );
}