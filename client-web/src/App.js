// client-web/src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Link, useNavigate } from 'react-router-dom';
import './App.css'; // Import App.css

import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import PrivateRoute from './components/PrivateRoute';
import DashboardPage from './pages/DashboardPage';
import ProductInputPage from './pages/ProductInputPage';
import { useAuth } from './contexts/AuthContext';

// Navbar Component
function Navbar() {
    const { isAuthenticated, currentUser, logout } = useAuth();
    const navigate = useNavigate();

    // UPDATED CONSOLE.LOG
    console.log('[Navbar] Auth State:', { 
        isAuthenticated: isAuthenticated, 
        currentUser: currentUser ? { email: currentUser.email, uid: currentUser.uid } : null 
    });

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    return (
        <nav className="bg-slate-800 text-white shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <Link to="/" className="font-bold text-xl hover:text-indigo-300">Arbitrage Scorer</Link>
                    </div>
                    <div className="flex items-center">
                        {isAuthenticated && (
                            <>
                                <Link to="/dashboard" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-700">Dashboard</Link>
                                <Link to="/analyze" className="ml-4 px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-700">Analyze</Link>
                                <button onClick={handleLogout} className="ml-4 px-3 py-2 rounded-md text-sm font-medium bg-indigo-600 hover:bg-indigo-700">Logout</button>
                            </>
                        )}
                        {!isAuthenticated && (
                            <>
                                <Link to="/login" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-700">Login</Link>
                                <Link to="/signup" className="ml-4 px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-700">Sign Up</Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}

function AppContent() {
  const { isAuthenticated, currentUser, loading } = useAuth();

  // UPDATED CONSOLE.LOG
  console.log('[AppContent] Auth State:', { 
      isAuthenticated: isAuthenticated, 
      currentUser: currentUser ? { email: currentUser.email, uid: currentUser.uid } : null, 
      loading: loading 
  });

  if (loading) {
      return <div className="flex justify-center items-center h-screen"><p className="text-lg">Loading Application...</p></div>;
  }

  return (
      <Router>
          <div className="App min-h-screen flex flex-col">
              <Navbar />
              <main className="flex-grow container mx-auto px-4 py-8">
                  <Routes>
                      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" replace />} />
                      <Route path="/signup" element={!isAuthenticated ? <SignUpPage /> : <Navigate to="/dashboard" replace />} />
                      
                      <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                      <Route path="/analyze" element={<PrivateRoute><ProductInputPage /></PrivateRoute>} />
                      {/* Add other protected routes here */}

                      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
                      <Route path="*" element={
                          <div className="text-center mt-10">
                              <h2 className="text-2xl font-semibold">404 - Page Not Found</h2>
                              <p className="mt-2">Sorry, the page you are looking for does not exist.</p>
                              <Link to="/" className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Go Home</Link>
                          </div>
                      } />
                  </Routes>
              </main>
              <footer className="bg-slate-800 text-white text-center p-4 text-sm">
                  © 2025 Arbitrage Scorer
              </footer>
          </div>
      </Router>
  );
}

export default AppContent;