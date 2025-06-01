// client-web/src/pages/DashboardPage.js
import React from 'react';
import { useAuth } from '../contexts/AuthContext'; // Adjust path if needed
import { useNavigate, Link } from 'react-router-dom';

export default function DashboardPage() {
    const { currentUser, isAuthenticated, logout } = useAuth(); // Added isAuthenticated for logging
    const navigate = useNavigate();

    // UPDATED CONSOLE.LOG
    console.log('[DashboardPage.js] Auth State & Rendering. currentUser:', 
        currentUser ? { email: currentUser.email, uid: currentUser.uid } : null, 
        'isAuthenticated:', isAuthenticated
    );

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8">
            {/* // <<< ADDED VISIBLE MARKER >>> */}
            <h1 style={{fontSize: "40px", color: "red", border: "2px solid red", padding: "10px"}}>!! DASHBOARD PAGE IS RENDERING !!</h1>
            
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <div className="flex justify-between items-center mb-6 pb-4 border-b">
                    <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
                    <button 
                        onClick={handleLogout} 
                        className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition duration-150 ease-in-out"
                    >
                        Log Out
                    </button>
                </div>
                
                <p className="text-gray-700 mb-4">
                    Welcome, <strong className="text-indigo-700">{currentUser?.email || 'User'}</strong>!
                </p>
                <p className="text-gray-600 mb-6">
                    This is your main dashboard. From here, you can navigate to different sections of the application.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Link 
                        to="/analyze" 
                        className="block p-6 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition duration-150 ease-in-out text-center"
                    >
                        <h3 className="font-semibold text-lg mb-2">Analyze New Product</h3>
                        <p className="text-sm opacity-90">Go to the product scoring tool.</p>
                    </Link>
                    
                    <div className="block p-6 bg-slate-500 text-white rounded-lg shadow text-center opacity-50 cursor-not-allowed">
                        <h3 className="font-semibold text-lg mb-2">View History (Coming Soon)</h3>
                        <p className="text-sm opacity-90">Review your previously scored products.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}