import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import Calendar from './pages/Calendar';
import Messaging from './pages/Messaging';
import Chat from './pages/Chat';
import Exams from './pages/Exams';
import FAQ from './pages/FAQ';
import ChatBot from './components/ChatBot/ChatBot';

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/courses" element={<PrivateRoute><Courses /></PrivateRoute>} />
          <Route path="/calendar" element={<PrivateRoute><Calendar /></PrivateRoute>} />
          <Route path="/messaging" element={<PrivateRoute><Messaging /></PrivateRoute>} />
          <Route path="/chat" element={<PrivateRoute><Chat /></PrivateRoute>} />
          <Route path="/exams" element={<PrivateRoute><Exams /></PrivateRoute>} />
          <Route path="/faq" element={<PrivateRoute><FAQ /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
        <ChatBot />
      </BrowserRouter>
    </AuthProvider>
  );
}