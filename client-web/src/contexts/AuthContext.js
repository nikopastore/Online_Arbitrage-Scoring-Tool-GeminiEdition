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
        console.log("Auth Provider: Checking initial auth state (V4).");
        const storedUserString = localStorage.getItem("currentUser");
        if (storedUserString) {
            try {
                let userFromStorage = JSON.parse(storedUserString);
                if (userFromStorage && typeof userFromStorage === 'object') {
                    // Ensure the 'email' property is a string.
                    // This handles cases where an old format might have stored an object in userFromStorage.email
                    // or if userFromStorage itself was the {id, email} object.
                    if (userFromStorage.email && typeof userFromStorage.email === 'object' && userFromStorage.email.hasOwnProperty('email')) {
                        // Case: userFromStorage = { email: { id: '...', email: 'actual_email_string' }, uid: '...' }
                        console.warn("Auth Provider: Normalizing nested user.email object from localStorage.");
                        userFromStorage.email = userFromStorage.email.email;
                    } else if (userFromStorage.email && typeof userFromStorage.email !== 'string') {
                        // If email exists but isn't a string and isn't the recognized nested object, treat as invalid for safety
                        console.warn("Auth Provider: User.email from localStorage is an unrecognized object type. Setting email to null.", userFromStorage.email);
                        userFromStorage.email = null; // Or attempt to stringify, or log an error and clear
                    }
                    // At this point, userFromStorage.email should be a string or null.
                    
                    if (userFromStorage.email) { // Only set user if email is a valid string
                        setCurrentUser(userFromStorage);
                        console.log("Auth Provider: User loaded from localStorage:", userFromStorage);
                    } else {
                        console.warn("Auth Provider: User from localStorage has invalid/missing email after normalization. Clearing.");
                        localStorage.removeItem("currentUser");
                        setCurrentUser(null);
                    }
                } else {
                    // parsedUser is null or not an object, treat as no user
                    console.log("Auth Provider: No valid user object found after parsing localStorage.");
                    localStorage.removeItem("currentUser"); // Clean up potentially corrupted item
                    setCurrentUser(null);
                }
            } catch (e) {
                console.error("Auth Provider: Error parsing stored user from localStorage. Clearing.", e);
                localStorage.removeItem("currentUser");
                setCurrentUser(null);
            }
        } else {
            console.log("Auth Provider: No 'currentUser' item found in localStorage.");
            setCurrentUser(null);
        }
        setLoading(false);
    }, []);

    async function signup(emailInput, password) {
        console.log("Auth Provider: Attempting signup for:", emailInput);
        const emailString = typeof emailInput === 'string' ? emailInput : emailInput?.email; // Should be string from form
        if (!emailString || typeof emailString !== 'string') {
            console.error("Auth Provider: Signup failed, email string is invalid from input:", emailInput);
            throw new Error("Invalid email provided for signup.");
        }
        
        // In a real app, call backend for signup, backend returns user object {id, email}
        // For this placeholder, we simulate creating the structure our context expects for currentUser
        const newUser = { 
            email: emailString, 
            uid: `fake-signup-${Date.now()}` // uid can be the backend's user.id
        };
        setCurrentUser(newUser);
        localStorage.setItem("currentUser", JSON.stringify(newUser)); // Save with flat email string
        console.log("Auth Provider: Signup successful, currentUser set:", newUser);
        return newUser; 
    }

    async function login(userDataFromBackend, password) { 
        console.log("Auth Provider: Attempting login with userDataFromBackend:", userDataFromBackend);
        // userDataFromBackend is expected to be like { id: '...', email: '...' }
        
        const emailString = userDataFromBackend?.email; 
        const userIdFromBackend = userDataFromBackend?.id || userDataFromBackend?._id; // Handle _id if from MongoDB directly

        if (!emailString || typeof emailString !== 'string') {
            console.error("Auth Provider: Login failed, email string is invalid from userDataFromBackend:", userDataFromBackend);
            throw new Error("Invalid user data received for login. Expected 'email' property as string.");
        }

        const userToSetInContext = { 
            email: emailString, 
            uid: userIdFromBackend || `fake-login-${Date.now()}`,
        };
        
        setCurrentUser(userToSetInContext);
        localStorage.setItem("currentUser", JSON.stringify(userToSetInContext)); // Save with flat email string
        console.log("Auth Provider: Login successful, currentUser set:", userToSetInContext);
        return userToSetInContext;
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