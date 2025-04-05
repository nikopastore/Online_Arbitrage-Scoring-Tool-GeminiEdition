// client-web/src/pages/LoginPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // You'll need context or state management later to handle the logged-in state
    // const { login } = useAuth(); // Example context usage

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post('http://localhost:5000/api/auth/login', {
                email,
                password,
            });

            console.log('Login successful:', response.data);

            // **IMPORTANT**: Store the token securely (localStorage is common but has risks)
            localStorage.setItem('authToken', response.data.token);

            // Update auth state using context/state management
            // login(response.data.user, response.data.token); // Example

            // Redirect to dashboard after successful login
            navigate('/dashboard'); // Or wherever your main app page is

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