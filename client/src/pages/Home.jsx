import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <h1 className="text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                Bienvenido a IronTracker
            </h1>
            <p className="text-gray-400 mb-8 max-w-md">
                Tu compañero de entrenamiento minimalista. Selecciona un programa o inicia un entrenamiento rápido.
            </p>
            <Link
                to="/programs"
                className="bg-primary hover:bg-blue-600 text-white px-8 py-3 rounded-full font-bold text-lg shadow-xl shadow-blue-500/20 transition-all hover:scale-105"
            >
                Ver Programas
            </Link>
        </div>
    );
}