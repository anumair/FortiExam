import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CreateExam from './pages/CreateExam.jsx';
import ExamDetail from './pages/ExamDetail.jsx';
import Navbar from './components/Navbar.jsx';

function PrivateRoute({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <PrivateRoute>
            <>
              <Navbar />
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/exams/new" element={<CreateExam />} />
                <Route path="/exams/:id" element={<ExamDetail />} />
              </Routes>
            </>
          </PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
