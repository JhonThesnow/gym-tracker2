import React, { useEffect, useState } from 'react';
import { Plus, Search, Trash2, X, Dumbbell } from 'lucide-react';

const AddExerciseModal = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [muscles, setMuscles] = useState([{ muscle_name: '', percentage: 100 }]);

    if (!isOpen) return null;

    const addMuscle = () => setMuscles([...muscles, { muscle_name: '', percentage: 0 }]);
    const updateMuscle = (index, field, value) => {
        const newMuscles = [...muscles];
        newMuscles[index][field] = value;
        setMuscles(newMuscles);
    };
    const removeMuscle = (index) => {
        setMuscles(muscles.filter((_, i) => i !== index));
    };

    const totalPercentage = muscles.reduce((sum, m) => sum + (parseInt(m.percentage) || 0), 0);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ name, muscles: muscles.filter(m => m.muscle_name.trim() !== '') });
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-surface border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Nuevo Ejercicio</h2>
                    <button onClick={onClose}><X className="text-gray-400 hover:text-white" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Nombre del Ejercicio</label>
                        <input
                            required
                            autoFocus
                            className="w-full bg-background border border-gray-700 rounded p-3 text-white focus:border-primary outline-none"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Ej: Press Banca"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm text-gray-400 mb-1 flex justify-between">
                            <span>Músculos Involucrados</span>
                            <span className={totalPercentage === 100 ? 'text-green-400' : 'text-yellow-400'}>
                                {totalPercentage}%
                            </span>
                        </label>
                        {muscles.map((muscle, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    placeholder="Músculo (ej: Pecho)"
                                    className="flex-1 bg-background border border-gray-700 rounded p-2 text-white text-sm"
                                    value={muscle.muscle_name}
                                    onChange={e => updateMuscle(index, 'muscle_name', e.target.value)}
                                    required
                                />
                                <input
                                    type="number"
                                    placeholder="%"
                                    className="w-16 bg-background border border-gray-700 rounded p-2 text-white text-center text-sm"
                                    value={muscle.percentage}
                                    onChange={e => updateMuscle(index, 'percentage', e.target.value)}
                                />
                                {muscles.length > 1 && (
                                    <button type="button" onClick={() => removeMuscle(index)} className="text-red-400 hover:text-red-300">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={addMuscle} className="text-xs text-primary hover:text-blue-400 font-bold flex items-center gap-1 mt-1">
                            <Plus size={14} /> Agregar otro músculo
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={!name}
                        className="w-full bg-primary hover:bg-blue-600 text-white p-3 rounded-xl font-bold mt-4 disabled:opacity-50"
                    >
                        Guardar Ejercicio
                    </button>
                </form>
            </div>
        </div>
    );
};

export default function ExercisesIndex() {
    const [exercises, setExercises] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchExercises = async () => {
        try {
            const res = await fetch('/api/library/exercises');
            const data = await res.json();
            setExercises(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExercises();
    }, []);

    const handleSave = async (data) => {
        try {
            await fetch('/api/library/exercises', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            setIsModalOpen(false);
            fetchExercises();
        } catch (error) {
            alert("Error al guardar");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Eliminar este ejercicio de la biblioteca?")) return;
        await fetch(`/api/library/exercises/${id}`, { method: 'DELETE' });
        fetchExercises();
    };

    const filtered = exercises.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="pb-20">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Índice de Ejercicios</h1>
                    <p className="text-gray-400 text-sm">Biblioteca global y porcentajes musculares</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-primary hover:bg-blue-600 text-white p-3 rounded-full shadow-lg shadow-blue-900/20">
                    <Plus size={24} />
                </button>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-3 top-3 text-gray-500" size={20} />
                <input
                    type="text"
                    placeholder="Buscar ejercicio..."
                    className="w-full bg-surface border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white focus:border-primary outline-none"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="text-center text-gray-500 mt-10">Cargando biblioteca...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(ex => (
                        <div key={ex.id} className="bg-surface border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-all group">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="font-bold text-white text-lg">{ex.name}</h3>
                                <button onClick={() => handleDelete(ex.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="space-y-2">
                                {ex.muscles && ex.muscles.length > 0 ? (
                                    ex.muscles.map((m, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-accent" style={{ width: `${m.percentage}%` }} />
                                            </div>
                                            <span className="text-xs text-gray-400 w-24 text-right truncate">
                                                {m.muscle_name} <span className="text-white font-bold">{m.percentage}%</span>
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <span className="text-xs text-gray-600 italic">Sin datos musculares</span>
                                )}
                            </div>
                        </div>
                    ))}

                    {filtered.length === 0 && !loading && (
                        <div className="col-span-full text-center py-10 text-gray-500">
                            <Dumbbell className="mx-auto mb-2 opacity-20" size={48} />
                            No se encontraron ejercicios
                        </div>
                    )}
                </div>
            )}

            <AddExerciseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} />
        </div>
    );
}