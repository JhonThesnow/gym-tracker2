import { create } from 'zustand';

export const useWorkoutStore = create((set) => ({
    activeWorkout: null, // { programDay, logs: {} }

    startWorkout: (dayData) => set({
        activeWorkout: {
            day: dayData,
            startTime: new Date(),
            completedSets: [] // Array de IDs únicos o compuestos
        }
    }),

    finishWorkout: () => set({ activeWorkout: null }),

    // Aquí podrías agregar lógica para el timer de descanso
    restTimer: 0,
    setRestTimer: (time) => set({ restTimer: time }),
}));