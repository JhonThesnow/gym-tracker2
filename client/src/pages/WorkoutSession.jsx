import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ActiveWorkout from '../components/ActiveWorkout';

export default function WorkoutSession() {
    const { id } = useParams(); // dayId
    const navigate = useNavigate();
    const [dayData, setDayData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDay = async () => {
            try {
                const res = await fetch(`/api/days/${id}/full`);
                if (!res.ok) throw new Error("Error fetching day");
                const data = await res.json();
                setDayData(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchDay();
    }, [id]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background text-gray-400">
            Cargando rutina...
        </div>
    );

    if (!dayData) return (
        <div className="min-h-screen flex items-center justify-center bg-background text-red-400">
            Error al cargar datos.
        </div>
    );

    return (
        // Pasamos navigate(-1) para que el botón de volver funcione
        <ActiveWorkout
            dayData={dayData}
            onFinish={() => navigate(-1)}
        />
    );
}