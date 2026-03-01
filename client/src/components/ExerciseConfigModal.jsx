import React, { useState, useEffect, useMemo } from 'react';
import { X, Calculator, Dumbbell, Percent } from 'lucide-react';

const ExerciseConfigModal = ({ isOpen, onClose, onSave, initialData, library }) => {
    const [formData, setFormData] = useState({
        name: '', target_sets: 3, target_reps: '8-12', load_type: 'kg', target_value: '', target_rpe: '', notes: ''
    });

    const [current1RM, setCurrent1RM] = useState(0);
    const [showCalculator, setShowCalculator] = useState(false);
    const [calcWeight, setCalcWeight] = useState('');
    const [calcReps, setCalcReps] = useState('');

    useEffect(() => {
        if (isOpen) {
            setFormData(initialData || {
                name: '', target_sets: 3, target_reps: '8-12', load_type: 'kg', target_value: '', target_rpe: '', notes: ''
            });
            setShowCalculator(false);
            setCalcWeight('');
            setCalcReps('');

            if (initialData?.name && library) {
                const libEx = library.find(l => l.name.toLowerCase() === initialData.name.toLowerCase());
                setCurrent1RM(libEx?.one_rep_max || 0);
            } else {
                setCurrent1RM(0);
            }
        }
    }, [isOpen, initialData, library]);

    useEffect(() => {
        if (formData.name && library) {
            const libEx = library.find(l => l.name.toLowerCase() === formData.name.toLowerCase());
            setCurrent1RM(libEx?.one_rep_max || 0);
        }
    }, [formData.name, library]);

    const calculate1RM = () => {
        const w = parseFloat(calcWeight);
        const r = parseInt(calcReps);
        if (!w || !r) return;
        const estimated = Math.round(w * (1 + r / 30));
        setCurrent1RM(estimated);
        setShowCalculator(false);
    };

    const calculatedWeightFromPercent = useMemo(() => {
        if (formData.load_type === 'percent' && formData.target_value && current1RM) {
            return Math.round(current1RM * (parseFloat(formData.target_value) / 100));
        }
        return null;
    }, [formData.load_type, formData.target_value, current1RM]);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (current1RM > 0 && formData.name) {
            fetch('/api/library/exercises/1rm', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: formData.name, one_rep_max: current1RM })
            }).catch(err => console.error(err));
        }

        // CORRECCIÓN CRÍTICA: Asegurar que sets sean números reales (parseInt) para no romper ActiveWorkout
        const payload = {
            ...formData,
            target_sets: parseInt(formData.target_sets, 10) || 1,
            target_value: formData.target_value === '' ? null : parseFloat(formData.target_value),
            target_rpe: formData.target_rpe === '' ? null : parseFloat(formData.target_rpe)
        };

        onSave(payload);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[100] backdrop-blur-sm animate-fade-in">
            <div className="bg-surface border border-gray-700 p-6 rounded-3xl w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-white">{initialData ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}</h3>
                    <button onClick={onClose} className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs text-gray-500 mb-2 uppercase font-bold tracking-wider">Ejercicio</label>
                        <input required list="library-suggestions" className="w-full bg-background border border-gray-700 rounded-xl p-4 text-white focus:border-primary outline-none font-bold text-lg"
                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} autoFocus placeholder="Buscar..." autoComplete="off" />
                        <datalist id="library-suggestions">{library && library.map(ex => <option key={ex.id} value={ex.name} />)}</datalist>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 mb-2 uppercase font-bold">Sets</label>
                            <input type="number" className="w-full bg-background border border-gray-700 rounded-xl p-3 text-white text-center font-bold text-lg outline-none focus:border-primary"
                                value={formData.target_sets} onChange={e => setFormData({ ...formData, target_sets: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-2 uppercase font-bold">Reps Meta</label>
                            <input className="w-full bg-background border border-gray-700 rounded-xl p-3 text-white text-center font-bold text-lg outline-none focus:border-primary"
                                value={formData.target_reps} onChange={e => setFormData({ ...formData, target_reps: e.target.value })} />
                        </div>
                    </div>

                    <div className="bg-gray-800/40 p-4 rounded-2xl border border-gray-700/50">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-gray-400 text-xs font-bold uppercase flex items-center gap-2"><Dumbbell size={14} /> Tu 1RM Actual</span>
                            <div className="flex items-center gap-3">
                                <span className="text-white font-bold text-xl font-mono">{current1RM > 0 ? `${current1RM} kg` : '?'}</span>
                                <button type="button" onClick={() => setShowCalculator(!showCalculator)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors" title="Calculadora">
                                    <Calculator size={18} />
                                </button>
                            </div>
                        </div>

                        {showCalculator && (
                            <div className="mt-3 pt-3 border-t border-gray-700/50 animate-fade-in">
                                <p className="text-[10px] text-gray-500 mb-2">Ingresa un récord reciente para estimar:</p>
                                <div className="flex gap-2">
                                    <input type="number" placeholder="Kg" className="flex-1 bg-background border border-gray-700 rounded-xl p-3 text-white text-center font-bold outline-none focus:border-primary"
                                        value={calcWeight} onChange={e => setCalcWeight(e.target.value)} />
                                    <input type="number" placeholder="Reps" className="flex-1 bg-background border border-gray-700 rounded-xl p-3 text-white text-center font-bold outline-none focus:border-primary"
                                        value={calcReps} onChange={e => setCalcReps(e.target.value)} />
                                    <button type="button" onClick={calculate1RM} className="bg-accent hover:bg-blue-500 text-white px-4 rounded-xl font-bold">Calc</button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs text-gray-500 mb-2 uppercase font-bold tracking-wider">Definir Carga / Esfuerzo</label>
                        <div className="flex gap-3">
                            <select
                                className="bg-background border border-gray-700 rounded-xl p-3 text-white font-bold outline-none focus:border-primary appearance-none text-center pl-5 pr-8"
                                value={formData.load_type}
                                onChange={e => setFormData({ ...formData, load_type: e.target.value })}
                                style={{ backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%236b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px' }}
                            >
                                <option value="kg">Carga Fija (Kg)</option>
                                <option value="percent">% Porcentaje</option>
                                <option value="rpe">RPE</option>
                            </select>

                            <div className="flex-1 relative">
                                <input
                                    type="number" step="0.5"
                                    className={`w-full bg-background border border-gray-700 rounded-xl p-3 text-white text-center font-bold text-lg outline-none focus:border-primary ${formData.load_type === 'percent' && current1RM ? 'border-accent/50' : ''}`}
                                    placeholder={formData.load_type === 'rpe' ? 'Ej: 8' : 'Valor...'}
                                    value={formData.target_value}
                                    onChange={e => setFormData({ ...formData, target_value: e.target.value })}
                                />
                                {formData.load_type === 'percent' && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                                        <Percent size={16} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {calculatedWeightFromPercent !== null && (
                            <p className="text-center text-sm text-accent mt-2 font-bold animate-fade-in">
                                Equivale a: {calculatedWeightFromPercent} kg
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs text-gray-500 mb-2 uppercase font-bold">Notas o RPE Adicional (Opcional)</label>
                        <input className="w-full bg-background border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-primary"
                            placeholder="Ej: Pausa abajo, tempo lento..."
                            value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                    </div>

                    <button type="submit" className="w-full bg-primary hover:bg-blue-600 text-white p-4 rounded-2xl font-bold mt-4 shadow-lg shadow-blue-500/20 active:scale-95 transition-transform">
                        Guardar Ejercicio
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ExerciseConfigModal;