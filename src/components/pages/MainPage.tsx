import React, { useState, ReactNode } from 'react';
import { DashboardIcon, TransactionsIcon, CategoriesIcon, ReportsIcon, InvestmentsIcon, ChatIcon, LogoutIcon, RepeatIcon, TargetIcon, LogoIcon, LandmarkIcon, SunIcon, MoonIcon, ChevronLeftIcon, ChevronRightIcon } from '../ui/Icons';
import { DashboardPage } from './DashboardPage';
import { TransactionsPage } from './TransactionsPage';
import { CategoriesPage } from './CategoriesPage';
import { ReportsPage } from './ReportsPage';
import { InvestmentsPage } from './InvestmentsPage';
import { ChatPage } from './ChatPage';
import { RecurringPage } from './RecurringPage';
import { BudgetsPage } from './BudgetsPage';
import { NetWorthPage } from './NetWorthPage';
import { User } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import useLocalStorage from '../../hooks/useLocalStorage';


type View = 'dashboard' | 'transactions' | 'recurring' | 'categories' | 'budgets' | 'net-worth' | 'reports' | 'investments' | 'chat';

interface MainPageProps {
    user: User | null;
    onLogout: () => void;
}

const NavItem: React.FC<{
    icon: ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
    isCollapsed: boolean;
}> = ({ icon, label, isActive, onClick, isCollapsed }) => (
    <div className="relative group">
        <button
            onClick={onClick}
            className={`flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                isActive
                    ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-white'
                    : 'text-text-secondary hover:bg-surface-accent hover:text-text-primary'
            } ${isCollapsed ? 'justify-center' : ''}`}
        >
            {isActive && !isCollapsed && <div className="absolute left-0 h-6 w-1 bg-primary rounded-r-full"></div>}
            {icon}
            {!isCollapsed && <span className="ml-3 whitespace-nowrap">{label}</span>}
        </button>
        {isCollapsed && (
            <div className="absolute left-full ml-4 px-2 py-1.5 text-xs font-medium text-white bg-gray-900/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-50">
                {label}
            </div>
        )}
    </div>
);

const ThemeToggle: React.FC<{ isCollapsed: boolean }> = ({ isCollapsed }) => {
    const { theme, toggleTheme } = useTheme();
    return (
        <NavItem
            icon={theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            label="Switch Theme"
            isActive={false}
            onClick={toggleTheme}
            isCollapsed={isCollapsed}
        />
    );
}

export const MainPage: React.FC<MainPageProps> = ({ user, onLogout }) => {
    const [activeView, setActiveView] = useState<View>('dashboard');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorage('sidebar-collapsed', false);

    const renderView = () => {
        switch (activeView) {
            case 'dashboard': return <DashboardPage />;
            case 'transactions': return <TransactionsPage />;
            case 'recurring': return <RecurringPage />;
            case 'categories': return <CategoriesPage />;
            case 'budgets': return <BudgetsPage />;
            case 'net-worth': return <NetWorthPage />;
            case 'reports': return <ReportsPage />;
            case 'investments': return <InvestmentsPage />;
            case 'chat': return <ChatPage />;
            default: return <DashboardPage />;
        }
    };

    const navItems: { view: View; label: string; icon: ReactNode }[] = [
        { view: 'dashboard', label: 'Dashboard', icon: <DashboardIcon className="w-5 h-5"/> },
        { view: 'transactions', label: 'Transactions', icon: <TransactionsIcon className="w-5 h-5"/> },
        { view: 'recurring', label: 'Recurring', icon: <RepeatIcon className="w-5 h-5"/> },
        { view: 'categories', label: 'Categories', icon: <CategoriesIcon className="w-5 h-5"/> },
        { view: 'budgets', label: 'Budgets & Goals', icon: <TargetIcon className="w-5 h-5"/> },
        { view: 'net-worth', label: 'Net Worth', icon: <LandmarkIcon className="w-5 h-5"/> },
        { view: 'reports', label: 'Reports', icon: <ReportsIcon className="w-5 h-5"/> },
        { view: 'investments', label: 'Investments', icon: <InvestmentsIcon className="w-5 h-5"/> },
        { view: 'chat', label: 'AI Chat', icon: <ChatIcon className="w-5 h-5"/> },
    ];
    
    return (
        <div className="flex h-screen bg-background text-text-primary">
            <aside className={`bg-surface border-r border-surface-accent flex flex-col p-4 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
                <div className={`flex items-center mb-8 px-2 transition-all duration-300 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                    <LogoIcon className="h-8 w-8 text-primary flex-shrink-0"/>
                    {!isSidebarCollapsed && <h1 className="text-xl font-bold ml-3 text-text-primary overflow-hidden whitespace-nowrap">Finan-AI</h1>}
                </div>
                <nav className="flex-1 space-y-1">
                   {navItems.map(item => (
                       <NavItem 
                           key={item.view}
                           icon={item.icon}
                           label={item.label}
                           isActive={activeView === item.view}
                           onClick={() => setActiveView(item.view)}
                           isCollapsed={isSidebarCollapsed}
                       />
                   ))}
                </nav>
                <div className="mt-auto space-y-1">
                    {!isSidebarCollapsed && (
                        <div className="p-3 mb-2 bg-surface-accent rounded-lg">
                            <p className="text-xs text-text-secondary">Signed in as</p>
                            <p className="font-bold text-text-primary truncate">{user?.email}</p>
                        </div>
                    )}
                    <ThemeToggle isCollapsed={isSidebarCollapsed}/>
                    <NavItem 
                        icon={<LogoutIcon className="w-5 h-5"/>}
                        label="Logout"
                        isActive={false}
                        onClick={onLogout}
                        isCollapsed={isSidebarCollapsed}
                    />
                    <div className="border-t border-surface-accent pt-2 mt-2">
                        <button onClick={() => setIsSidebarCollapsed(prev => !prev)} className="flex items-center justify-center w-full py-2 text-text-secondary hover:bg-surface-accent rounded-lg transition-colors">
                            {isSidebarCollapsed ? <ChevronRightIcon className="w-5 h-5" /> : <ChevronLeftIcon className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </aside>
            <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
                {renderView()}
            </main>
        </div>
    );
};
