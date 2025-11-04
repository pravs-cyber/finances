import React, { useState, useMemo } from 'react';
import { AppContextProvider } from './contexts/AppContext';
import { LoginPage } from './components/pages/LoginPage';
import { RegisterPage } from './components/pages/RegisterPage';
import { MainPage } from './components/pages/MainPage';
import useLocalStorage from './hooks/useLocalStorage';
import { User } from './types';
import { ThemeProvider } from './contexts/ThemeContext';
import { KeyIcon } from './components/ui/Icons';

type AuthState = 'login' | 'register' | 'authenticated';

// Check for API Key at the top level using Vite's import.meta.env
const API_KEY = import.meta.env.VITE_API_KEY;

const App: React.FC = () => {
    const [users, setUsers] = useLocalStorage<User[]>('finan-ai-users', []);
    const [currentUser, setCurrentUser] = useLocalStorage<User | null>('finan-ai-currentUser', null);
    const [authView, setAuthView] = useState<AuthState>(currentUser ? 'authenticated' : 'login');

    if (!API_KEY) {
        return (
            <ThemeProvider>
                <div className="min-h-screen flex items-center justify-center bg-background p-4 text-text-primary">
                    <div className="w-full max-w-md p-8 text-center space-y-4 bg-surface rounded-2xl shadow-lg border border-surface-accent">
                        <KeyIcon className="w-12 h-12 mx-auto text-negative" />
                        <h2 className="text-2xl font-bold">API Key Missing</h2>
                        <p className="text-text-secondary">
                            The VITE_API_KEY environment variable is not set. Please add it to your Vercel project settings and redeploy.
                        </p>
                        <a 
                            href="https://vercel.com/docs/projects/environment-variables" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-block mt-2 text-primary hover:underline"
                        >
                            Learn how to add environment variables on Vercel
                        </a>
                    </div>
                </div>
            </ThemeProvider>
        );
    }

    const handleLogin = (user: User) => {
        setCurrentUser(user);
        setAuthView('authenticated');
    };

    const handleRegister = (newUser: User) => {
        setUsers(prevUsers => [...prevUsers, newUser]);
        setAuthView('login'); // Redirect to login after registration
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setAuthView('login');
    };

    const authContent = useMemo(() => {
        switch (authView) {
            case 'login':
                return <LoginPage onLogin={handleLogin} onSwitchToRegister={() => setAuthView('register')} users={users} />;
            case 'register':
                return <RegisterPage onRegister={handleRegister} onSwitchToLogin={() => setAuthView('login')} users={users} />;
            case 'authenticated':
                if (currentUser) {
                    return (
                        <AppContextProvider userEmail={currentUser.email}>
                            <MainPage user={currentUser} onLogout={handleLogout} />
                        </AppContextProvider>
                    );
                }
                // Fallback if currentUser is somehow null
                handleLogout();
                return null;
            default:
                return <LoginPage onLogin={handleLogin} onSwitchToRegister={() => setAuthView('register')} users={users} />;
        }
    }, [authView, users, currentUser]);

    return (
        <ThemeProvider>
            {authContent}
        </ThemeProvider>
    );
};

export default App;
