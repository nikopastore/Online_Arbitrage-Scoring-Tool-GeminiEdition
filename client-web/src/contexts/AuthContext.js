// client-web/src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log("Auth Provider: Checking initial auth state.");
        const storedUser = localStorage.getItem("currentUser");
        if (storedUser) {
            try {
                setCurrentUser(JSON.parse(storedUser));
                console.log("Auth Provider: User found in localStorage", JSON.parse(storedUser));
            } catch (e) {
                console.error("Auth Provider: Error parsing stored user", e);
                localStorage.removeItem("currentUser");
            }
        } else {
            console.log("Auth Provider: No user found in localStorage.");
        }
        setLoading(false);
    }, []);

    async function signup(email, password) {
        console.log("Auth Provider: Attempting signup for:", email);
        // Replace with your actual signup logic (e.g., Firebase, backend API call)
        const newUser = { email: email, uid: `fake-${Date.now()}` }; // Simulate success
        setCurrentUser(newUser);
        localStorage.setItem("currentUser", JSON.stringify(newUser));
        console.log("Auth Provider: Signup successful, currentUser set:", newUser);
        return newUser;
    }

    async function login(email, password) {
        console.log("Auth Provider: Attempting login for:", email);
        // Replace with your actual login logic
        const user = { email: email, uid: `fake-${Date.now()}` }; // Simulate success
        setCurrentUser(user);
        localStorage.setItem("currentUser", JSON.stringify(user));
        console.log("Auth Provider: Login successful, currentUser set:", user);
        return user;
    }

    async function logout() {
        console.log("Auth Provider: Attempting logout");
        setCurrentUser(null);
        localStorage.removeItem("currentUser");
        console.log("Auth Provider: Logout successful, currentUser is null.");
    }

    const isAuthenticated = !!currentUser;

    const value = {
        currentUser,
        isAuthenticated,
        loading,
        signup,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}