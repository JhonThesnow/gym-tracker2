const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// --- PROGRAMAS ---
app.get('/api/programs', (req, res) => {
    try { res.json(db.prepare('SELECT * FROM programs ORDER BY created_at DESC').all()); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/programs', (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) return res.status(400).json({ error: "El nombre es obligatorio" });
        const info = db.prepare('INSERT INTO programs (name, description) VALUES (?, ?)').run(name, description);
        res.json({ id: info.lastInsertRowid });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/programs/:id/full', (req, res) => {
    try {
        const { id } = req.params;
        const program = db.prepare('SELECT * FROM programs WHERE id = ?').get(id);
        if (!program) return res.status(404).json({ error: 'Program not found' });

        const weeks = db.prepare('SELECT * FROM program_weeks WHERE program_id = ? ORDER BY week_number').all(id);
        const fullData = weeks.map(week => {
            const days = db.prepare('SELECT * FROM program_days WHERE week_id = ? ORDER BY day_order').all(week.id);
            const daysWithExercises = days.map(day => {
                const exercises = db.prepare(`
                    SELECT e.*, l.one_rep_max as library_1rm 
                    FROM exercises e 
                    LEFT JOIN exercise_library l ON lower(e.name) = lower(l.name)
                    WHERE e.day_id = ? 
                    ORDER BY e.exercise_order
                `).all(day.id);
                return { ...day, exercises };
            });
            return { ...week, days: daysWithExercises };
        });

        res.json({ ...program, weeks: fullData });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/programs/:id', (req, res) => {
    try { db.prepare('DELETE FROM programs WHERE id = ?').run(req.params.id); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ESTRUCTURA ---
app.post('/api/weeks', (req, res) => {
    try {
        const info = db.prepare('INSERT INTO program_weeks (program_id, week_number) VALUES (?, ?)').run(req.body.program_id, req.body.week_number);
        res.json({ id: info.lastInsertRowid });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/weeks/:id', (req, res) => {
    try { db.prepare('DELETE FROM program_weeks WHERE id = ?').run(req.params.id); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/days', (req, res) => {
    try {
        const info = db.prepare('INSERT INTO program_days (week_id, name, day_order) VALUES (?, ?, ?)').run(req.body.week_id, req.body.name, req.body.day_order);
        res.json({ id: info.lastInsertRowid });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/days/:id/full', (req, res) => {
    try {
        const day = db.prepare('SELECT * FROM program_days WHERE id = ?').get(req.params.id);
        if (!day) return res.status(404).json({ error: 'Day not found' });

        const exercises = db.prepare(`
            SELECT e.*, l.one_rep_max as library_1rm 
            FROM exercises e 
            LEFT JOIN exercise_library l ON lower(e.name) = lower(l.name)
            WHERE e.day_id = ? 
            ORDER BY e.exercise_order
        `).all(day.id);

        const lastWorkout = db.prepare('SELECT * FROM workout_logs WHERE day_id = ? ORDER BY date DESC LIMIT 1').get(day.id);

        let logs = [];
        if (lastWorkout) {
            const sets = db.prepare('SELECT * FROM set_logs WHERE workout_log_id = ? ORDER BY id').all(lastWorkout.id);
            logs = [{ ...lastWorkout, sets }];
        }

        res.json({ ...day, exercises, logs });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/days/:id/reorder', (req, res) => {
    try {
        const stmt = db.prepare('UPDATE exercises SET exercise_order = ? WHERE id = ?');
        const transaction = db.transaction((ids) => { ids.forEach((id, index) => stmt.run(index, id)); });
        transaction(req.body.exerciseIds);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/weeks/:id/reorder-days', (req, res) => {
    try {
        const stmt = db.prepare('UPDATE program_days SET day_order = ? WHERE id = ?');
        const transaction = db.transaction((ids) => { ids.forEach((id, index) => stmt.run(index, id)); });
        transaction(req.body.dayIds);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- EJERCICIOS ---
app.post('/api/exercises', (req, res) => {
    try {
        const { day_id, name, target_sets, target_reps, target_value, load_type, target_rpe, notes, exercise_order } = req.body;
        // Validación de nulls segura para SQLite
        const safeTargetValue = target_value !== '' && target_value !== null ? parseFloat(target_value) : null;
        const safeTargetRPE = target_rpe !== '' && target_rpe !== null ? parseFloat(target_rpe) : null;

        const info = db.prepare(`
            INSERT INTO exercises (day_id, name, target_sets, target_reps, target_value, load_type, target_rpe, notes, exercise_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(day_id, name, target_sets, target_reps, safeTargetValue, load_type || 'kg', safeTargetRPE, notes || '', exercise_order || 999);

        res.json({ id: info.lastInsertRowid });
    } catch (err) {
        console.error("Error POST exercise:", err);
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/exercises/:id', (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Limpiamos los valores vacíos antes de hacer el update
        if (updates.target_value === '') updates.target_value = null;
        if (updates.target_rpe === '') updates.target_rpe = null;

        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);

        if (fields.length > 0) {
            db.prepare(`UPDATE exercises SET ${fields} WHERE id = ?`).run(...values, id);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/exercises/:id', (req, res) => {
    try { db.prepare('DELETE FROM exercises WHERE id = ?').run(req.params.id); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// --- LOGS ---
app.post('/api/workouts', (req, res) => {
    try {
        const { day_id, notes, sets } = req.body;
        const insertLog = db.prepare('INSERT INTO workout_logs (day_id, notes) VALUES (?, ?)');
        const insertSet = db.prepare(`
      INSERT INTO set_logs (workout_log_id, exercise_name, set_number, weight, reps, rpe, is_completed)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

        const transaction = db.transaction(() => {
            const info = insertLog.run(day_id, notes);
            const logId = info.lastInsertRowid;
            for (const set of sets) {
                insertSet.run(logId, set.exercise_name, set.set_number, set.weight, set.reps, set.rpe, set.is_completed ? 1 : 0);
            }
            return logId;
        });

        const logId = transaction();
        res.json({ success: true, logId });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- LIBRERÍA ---
app.get('/api/library/exercises', (req, res) => {
    try {
        const exercises = db.prepare('SELECT * FROM exercise_library ORDER BY name').all();
        const exercisesWithMuscles = exercises.map(ex => {
            const muscles = db.prepare('SELECT * FROM exercise_muscles WHERE exercise_id = ?').all(ex.id);
            return { ...ex, muscles };
        });
        res.json(exercisesWithMuscles);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/library/exercises/1rm', (req, res) => {
    try {
        const { name, one_rep_max } = req.body;
        const existing = db.prepare('SELECT id FROM exercise_library WHERE lower(name) = lower(?)').get(name);
        if (existing) {
            db.prepare('UPDATE exercise_library SET one_rep_max = ? WHERE id = ?').run(one_rep_max, existing.id);
        } else {
            db.prepare('INSERT INTO exercise_library (name, one_rep_max) VALUES (?, ?)').run(name, one_rep_max);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/library/exercises', (req, res) => {
    try {
        const { name, muscles } = req.body;
        if (!name) return res.status(400).json({ error: "Nombre requerido" });
        const transaction = db.transaction(() => {
            const info = db.prepare('INSERT INTO exercise_library (name) VALUES (?)').run(name);
            const exerciseId = info.lastInsertRowid;
            if (muscles && muscles.length > 0) {
                const insertMuscle = db.prepare('INSERT INTO exercise_muscles (exercise_id, muscle_name, percentage) VALUES (?, ?, ?)');
                for (const m of muscles) insertMuscle.run(exerciseId, m.muscle_name, parseInt(m.percentage));
            }
            return exerciseId;
        });
        res.json({ id: transaction() });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/library/exercises/:id', (req, res) => {
    try { db.prepare('DELETE FROM exercise_library WHERE id = ?').run(req.params.id); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://localhost:${PORT}`));