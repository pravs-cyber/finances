import React, { useState, useMemo } from 'react';
import { AppContextProvider } from './contexts/AppContext';
import { LoginPage } from './components/pages/LoginPage';
import { RegisterPage } from './components/pages/RegisterPage';
import { MainPage } from './components/pages/MainPage';
import useLocalStorage from './hooks/useLocalStorage';
import { User } from './types';
import { ThemeProvider } from './contexts/ThemeContext';

type AuthState = 'login' | 'register' | 'authenticated';

const App: React.FC = () => {
    const [users, setUsers] = useLocalStorage<User[]>('finan-ai-users', []);
    const [currentUser, setCurrentUser] = useLocalStorage<User | null>('finan-ai-currentUser', null);
    const [authView, setAuthView] = useState<AuthState>(currentUser ? 'authenticated' : 'login');

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
