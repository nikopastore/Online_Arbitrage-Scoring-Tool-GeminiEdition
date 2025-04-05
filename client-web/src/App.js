// client-web/src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
// Import other pages later:
// import DashboardPage from './pages/DashboardPage';
// import ScanPage from './pages/ScanPage';
// import HistoryPage from './pages/HistoryPage';

// Basic component to protect routes - build this out properly later
// function PrivateRoute({ children }) {
//   const token = localStorage.getItem('authToken');
//   return token ? children : <Navigate to="/login" />;
// }

function App() {
  return (
    <Router>
      <div className="App">
        {/* Add a Navbar component later */}
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />

          {/* Protected Routes (Example - refine later) */}
          {/* <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} /> */}
          {/* <Route path="/scan" element={<PrivateRoute><ScanPage /></PrivateRoute>} /> */}
          {/* <Route path="/history" element={<PrivateRoute><HistoryPage /></PrivateRoute>} /> */}

          {/* Default route - redirect to login or dashboard based on auth status */}
          <Route path="/" element={<Navigate to="/login" />} /> {/* Or to '/dashboard' if logged in */}

          {/* Add a 404 Not Found route later */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;