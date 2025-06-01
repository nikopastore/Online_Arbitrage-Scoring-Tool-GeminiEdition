// client-web/src/components/PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom'; // Outlet is not needed if used as a wrapper component
import { useAuth } from '../contexts/AuthContext'; // Adjust path if AuthContext is elsewhere

export default function PrivateRoute({ children }) { // <<< Accept 'children' as a prop
    const { isAuthenticated, currentUser, loading } = useAuth();

    console.log('[PrivateRoute.js] Auth State:', { 
        isAuthenticated: isAuthenticated, 
        currentUser: currentUser ? { email: currentUser.email, uid: currentUser.uid } : null, 
        loading: loading 
    });

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><p className="text-lg">Checking authentication...</p></div>;
    }

    // If authenticated, render the children components passed to PrivateRoute
    // Otherwise, navigate to the login page
    return isAuthenticated ? children : <Navigate to="/login" replace />; 
}