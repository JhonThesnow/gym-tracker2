const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// --- PROGRAMAS ---

app.get('/api/programs', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM programs ORDER BY created_at DESC');
        res.json(stmt.all());
    } catch (err) {
        console.error("Error GET programs:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/programs', (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) return res.status(400).json({ error: "El nombre es obligatorio" });

        const info = db.prepare('INSERT INTO programs (name, description) VALUES (?, ?)').run(name, description);
        res.json({ id: info.lastInsertRowid });
    } catch (err) {
        console.error("Error POST programs:", err);
        res.status(500).json({ error: err.message });
    }
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
                const exercises = db.prepare('SELECT * FROM exercises WHERE day_id = ? ORDER BY exercise_order').all(day.id);
                return { ...day, exercises };
            });
            return { ...week, days: daysWithExercises };
        });

        res.json({ ...program, weeks: fullData });
    } catch (err) {
        console.error("Error GET full program:", err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/programs/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM programs WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ESTRUCTURA ---

app.post('/api/weeks', (req, res) => {
    try {
        const { program_id, week_number } = req.body;
        const info = db.prepare('INSERT INTO program_weeks (program_id, week_number) VALUES (?, ?)').run(program_id, week_number);
        res.json({ id: info.lastInsertRowid });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/weeks/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM program_weeks WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/days', (req, res) => {
    try {
        const { week_id, name, day_order } = req.body;
        const info = db.prepare('INSERT INTO program_days (week_id, name, day_order) VALUES (?, ?, ?)').run(week_id, name, day_order);
        res.json({ id: info.lastInsertRowid });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// [ACTUALIZADO] Ahora devuelve también el historial (logs) si existe
app.get('/api/days/:id/full', (req, res) => {
    try {
        const day = db.prepare('SELECT * FROM program_days WHERE id = ?').get(req.params.id);
        if (!day) return res.status(404).json({ error: 'Day not found' });

        const exercises = db.prepare('SELECT * FROM exercises WHERE day_id = ? ORDER BY exercise_order').all(day.id);

        // Buscar el último entrenamiento registrado para este día
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
        const { exerciseIds } = req.body;
        const stmt = db.prepare('UPDATE exercises SET exercise_order = ? WHERE id = ?');
        const transaction = db.transaction((ids) => {
            ids.forEach((id, index) => stmt.run(index, id));
        });
        transaction(exerciseIds);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- EJERCICIOS ---

app.post('/api/exercises', (req, res) => {
    try {
        const { day_id, name, target_sets, target_reps, target_weight, target_rpe, notes, exercise_order } = req.body;
        const info = db.prepare(`
      INSERT INTO exercises (day_id, name, target_sets, target_reps, target_weight, target_rpe, notes, exercise_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(day_id, name, target_sets, target_reps, target_weight, target_rpe, notes, exercise_order);
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
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);

        if (fields.length > 0) {
            db.prepare(`UPDATE exercises SET ${fields} WHERE id = ?`).run(...values, id);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/exercises/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM exercises WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
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
    } catch (err) {
        console.error("Error POST workout:", err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://localhost:${PORT}`));