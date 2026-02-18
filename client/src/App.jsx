import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Programs from './pages/Programs';
import ProgramDetail from './pages/ProgramDetail';
import WorkoutSession from './pages/WorkoutSession'; // <--- Importamos

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/programs/:id" element={<ProgramDetail />} />
          <Route path="/workout/:id" element={<WorkoutSession />} /> {/* <--- Ruta Nueva */}
          <Route path="/history" element={<div className="text-center mt-20 text-gray-500">Próximamente: Historial</div>} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;