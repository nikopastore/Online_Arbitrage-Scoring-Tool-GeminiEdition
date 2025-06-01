// client-web/src/components/PrivateRoute.js
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Adjust path if AuthContext is elsewhere

export default function PrivateRoute() {
    const { isAuthenticated, currentUser, loading } = useAuth(); // Added currentUser for more detailed logging

    // UPDATED CONSOLE.LOG
    console.log('[PrivateRoute.js] Auth State:', { 
        isAuthenticated: isAuthenticated, 
        currentUser: currentUser ? { email: currentUser.email, uid: currentUser.uid } : null, 
        loading: loading 
    });

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><p className="text-lg">Checking authentication...</p></div>;
    }

    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}