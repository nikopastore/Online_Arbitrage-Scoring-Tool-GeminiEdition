// client-web/src/pages/LoginPage.js
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom'; // Added useLocation
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation(); // Get location state
    const { login } = useAuth(); // Get login function from context

    // Determine where to redirect after login (intended destination or dashboard)
    const from = location.state?.from?.pathname || "/dashboard";

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Replace with your actual backend API endpoint if different
            const response = await axios.post('http://localhost:5000/api/auth/login', {
                email,
                password,
            });

            console.log('Login successful:', response.data);

            // Use context login function (this also handles setting token/user state)
            login(response.data.user, response.data.token);

            // Redirect to the intended destination or dashboard
            navigate(from, { replace: true }); // Use replace to avoid login page in history

        } catch (err) {
            console.error('Login failed:', err.response ? err.response.data : err.message);
            setError(err.response?.data?.message || 'Login failed. Invalid credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
         <div>
            <h2>Login</h2>
            <form onSubmit={handleSubmit}>
                 {error && <p style={{ color: 'red' }}>{error}</p>}
                <div>
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                    />
                </div>
                <div>
                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                    />
                </div>
                <button type="submit" disabled={loading}>
                    {loading ? 'Logging In...' : 'Login'}
                </button>
            </form>
            <p>
                Don't have an account? <Link to="/signup">Sign up here</Link>
            </p>
             {/* Add "Forgot Password?" link later */}
        </div>
    );
}

export default LoginPage;