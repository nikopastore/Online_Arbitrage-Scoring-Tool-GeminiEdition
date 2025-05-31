// client-web/src/components/PrivateRoute.js
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Adjust path if AuthContext is elsewhere

export default function PrivateRoute() {
    const { isAuthenticated, loading } = useAuth();

    // <<< ADDED CONSOLE.LOG HERE >>>
    console.log('[PrivateRoute.js] Auth State:', { isAuthenticated, loading });

    if (loading) {
        // You can return a loading spinner/message here if AuthContext's loading is true
        return <div className="flex justify-center items-center h-screen"><p className="text-lg">Checking authentication...</p></div>;
    }

    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
