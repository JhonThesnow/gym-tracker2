import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ChevronRight, Trash2, AlertTriangle } from 'lucide-react';

export default function Programs() {
    const [programs, setPrograms] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newProgramName, setNewProgramName] = useState('');
    const [error, setError] = useState(null);

    const fetchPrograms = async () => {
        try {
            const res = await fetch('/api/programs');
            if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);

            const data = await res.json();
            // Verificamos que sea un array para evitar pantallas blancas
            if (Array.isArray(data)) {
                setPrograms(data);
                setError(null);
            } else {
                console.error("Respuesta inválida:", data);
                setError("Error: El servidor no devolvió una lista válida.");
            }
        } catch (err) {
            console.error(err);
            setError("No se pudo conectar con el servidor. Revisa que 'npm run dev' esté corriendo.");
        }
    };

    useEffect(() => {
        fetchPrograms();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newProgramName) return;

        try {
            const res = await fetch('/api/programs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newProgramName, description: 'Nueva rutina personalizada' })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Error al crear");
            }

            setNewProgramName('');
            setIsCreating(false);
            fetchPrograms();
        } catch (err) {
            alert(`Error al crear programa: ${err.message}`);
        }
    };

    const handleDelete = async (id, e) => {
        e.preventDefault();
        if (!window.confirm('¿Seguro que quieres borrar este programa?')) return;

        await fetch(`/api/programs/${id}`, { method: 'DELETE' });
        fetchPrograms();
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white">Mis Programas</h2>
                    <p className="text-gray-400 mt-1">Gestiona tus rutinas y ciclos</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-lg shadow-blue-500/20"
                >
                    <Plus size={20} /> Nuevo
                </button>
            </div>

            {error && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-xl mb-6 flex items-center gap-3">
                    <AlertTriangle />
                    {error}
                </div>
            )}

            {isCreating && (
                <form onSubmit={handleCreate} className="bg-surface p-4 rounded-xl border border-gray-700 mb-6 animate-fade-in">
                    <label className="block text-sm text-gray-400 mb-2">Nombre del Programa</label>
                    <div className="flex gap-2">
                        <input
                            autoFocus
                            type="text"
                            value={newProgramName}
                            onChange={(e) => setNewProgramName(e.target.value)}
                            placeholder="Ej: Candito 6 Week"
                            className="flex-1 bg-background border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                        />
                        <button type="submit" className="bg-green-600 hover:bg-green-500 px-4 rounded-lg">Guardar</button>
                        <button type="button" onClick={() => setIsCreating(false)} className="bg-gray-700 hover:bg-gray-600 px-4 rounded-lg">Cancelar</button>
                    </div>
                </form>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {programs.length === 0 && !error && (
                    <p className="text-gray-500 col-span-full text-center py-10">No hay programas. ¡Crea el primero!</p>
                )}

                {programs.map(program => (
                    <Link
                        key={program.id}
                        to={`/programs/${program.id}`}
                        className="group bg-surface hover:bg-gray-800 border border-gray-800 hover:border-primary/50 p-6 rounded-2xl transition-all relative"
                    >
                        <div className="flex justify-between items-start">
                            <h3 className="text-xl font-semibold text-gray-100 group-hover:text-primary transition-colors">{program.name}</h3>
                            <button
                                onClick={(e) => handleDelete(program.id, e)}
                                className="text-gray-500 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                        <p className="text-gray-500 text-sm mt-2">{program.description || "Sin descripción"}</p>
                        <div className="mt-4 flex items-center text-sm text-primary font-medium">
                            Ver detalles <ChevronRight size={16} className="ml-1" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}