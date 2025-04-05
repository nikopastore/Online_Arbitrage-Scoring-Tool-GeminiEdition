// client-web/src/App.js
import React from 'react';
// Import useNavigate here <<< FIX
import { BrowserRouter as Router, Route, Routes, Navigate, Link, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import PrivateRoute from './components/PrivateRoute';
import DashboardPage from './pages/DashboardPage';
import ProductInputPage from './pages/ProductInputPage';
// Import other pages later:
// import HistoryPage from './pages/HistoryPage';
// import AnalyticsPage from './pages/AnalyticsPage';
// import SettingsPage from './pages/SettingsPage';
import { useAuth } from './contexts/AuthContext';

// Simple Navbar Component (Example)
function Navbar() {
    const { isAuthenticated, logout } = useAuth();
    const navigate = useNavigate(); // Now this hook is imported and available

    const handleLogout = () => {
        logout();
        navigate('/login'); // Redirect to login after logout
    };

    return (
        <nav style={{ padding: '1rem', background: '#eee', marginBottom: '1rem' }}>
            {/* Added a Brand/Home link */}
            <Link to="/" style={{ marginRight: '1rem', fontWeight: 'bold' }}>Arbitrage Scorer</Link>

            {/* Links visible when logged in */}
            {isAuthenticated && (
                <>
                    <Link to="/dashboard" style={{ marginRight: '1rem' }}>Dashboard</Link>
                    <Link to="/analyze" style={{ marginRight: '1rem' }}>Analyze Product</Link>
                    {/* Add other links: History, Analytics, Settings */}
                    {/* Consider moving logout button to a dropdown or user menu later */}
                    <button onClick={handleLogout} style={{ float: 'right' }}>Logout</button>
                </>
            )}

            {/* Links visible when logged out */}
            {!isAuthenticated && (
                <>
                    {/* Use styling or float right for auth links if desired */}
                    <div style={{ float: 'right' }}>
                        <Link to="/login" style={{ marginRight: '1rem' }}>Login</Link>
                        <Link to="/signup" style={{ marginRight: '1rem' }}>Sign Up</Link>
                    </div>
                </>
            )}
        </nav>
    );
}


function App() {
  const { isAuthenticated, loading } = useAuth();

  // Optional: Improve initial loading state display
  if (loading) {
     // Consider a more visually appealing loader/spinner component
     return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Application...</div>;
  }

  return (
    <Router>
      <div className="App">
        <Navbar /> {/* Render the Navbar */}
        <main style={{ padding: '0 1rem' }}> {/* Add padding around main content */}
            <Routes>
                {/* Public Routes */}
                {/* Redirect logged-in users away from login/signup */}
                <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" replace />} />
                <Route path="/signup" element={!isAuthenticated ? <SignUpPage /> : <Navigate to="/dashboard" replace />} />

                {/* Protected Routes */}
                <Route
                    path="/dashboard"
                    element={
                    <PrivateRoute>
                        <DashboardPage />
                    </PrivateRoute>
                    }
                />
                 <Route
                    path="/analyze" // Or choose a path like "/add-product"
                    element={
                        <PrivateRoute>
                            <ProductInputPage />
                        </PrivateRoute>
                    }
                />
                {/* Add other protected routes similarly: */}
                {/* <Route path="/history" element={<PrivateRoute><HistoryPage /></PrivateRoute>} /> */}
                {/* <Route path="/analytics" element={<PrivateRoute><AnalyticsPage /></PrivateRoute>} /> */}
                {/* <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} /> */}


                {/* Default route */}
                {/* Navigate to dashboard if logged in, otherwise to login */}
                <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />

                {/* Add a 404 Not Found route */}
                <Route path="*" element={<div style={{textAlign: 'center', marginTop: '2rem'}}><h2>404 Not Found</h2><p>Sorry, the page you are looking for does not exist.</p></div>} />

            </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;