import React from 'react';
import { useAuth } from '../contexts/AuthContext'; // Check path
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out", error);
            // Handle logout error (e.g., display a message)
        }
    };

    return (
        <div className="p-4">
            <h2 className="text-xl font-semibold">Dashboard</h2>
            <p>Welcome, {currentUser?.email || 'User'}!</p>
            {/* Add a link to your ProductInputPage (e.g., /analyze) */}
            <button 
                onClick={() => navigate('/analyze')} // Assuming /analyze is your scoring tool page
                className="my-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
                Go to Analyzer
            </button>
            <br />
            <button 
                onClick={handleLogout} 
                className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
                Log Out
            </button>
        </div>
    );
}