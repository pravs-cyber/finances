import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { Transaction, Category, Investment, RecurringTransaction, Budget, Goal, TransactionType, ChatMessage, ChatHistories } from '../types';

interface AppContextType {
    transactions: Transaction[];
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
    categories: Category[];
    setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
    investments: Investment[];
    setInvestments: React.Dispatch<React.SetStateAction<Investment[]>>;
    recurringTransactions: RecurringTransaction[];
    setRecurringTransactions: React.Dispatch<React.SetStateAction<RecurringTransaction[]>>;
    budgets: Budget[];
    setBudgets: React.Dispatch<React.SetStateAction<Budget[]>>;
    goals: Goal[];
    setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
    chatHistories: ChatHistories;
    setChatHistories: React.Dispatch<React.SetStateAction<ChatHistories>>;
    userEmail: string;

    addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
    addMultipleTransactions: (transactions: Omit<Transaction, 'id'>[]) => void;
    updateTransaction: (transaction: Transaction) => void;
    deleteTransaction: (id: string) => void;
    
    addCategory: (category: Omit<Category, 'id'>) => void;
    deleteCategory: (id: string) => void;
    
    addInvestment: (investment: Omit<Investment, 'id'>) => void;
    updateInvestment: (investment: Investment) => void;
    deleteInvestment: (id: string) => void;

    addRecurringTransaction: (rt: Omit<RecurringTransaction, 'id'>) => void;
    updateRecurringTransaction: (rt: RecurringTransaction) => void;
    deleteRecurringTransaction: (id: string) => void;

    addBudget: (budget: Omit<Budget, 'id'>) => void;
    updateBudget: (budget: Budget) => void;
    deleteBudget: (id: string) => void;

    addGoal: (goal: Omit<Goal, 'id'>) => void;
    updateGoal: (goal: Goal) => void;
    deleteGoal: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_CATEGORIES: Category[] = [
    { id: '1', name: 'Food & Drinks', type: TransactionType.EXPENSE },
    { id: '2', name: 'Shopping', type: TransactionType.EXPENSE },
    { id: '3', name: 'Housing', type: TransactionType.EXPENSE },
    { id: '4', name: 'Transportation', type: TransactionType.EXPENSE },
    { id: '5', name: 'Education', type: TransactionType.EXPENSE },
    { id: '6', name: 'Entertainment', type: TransactionType.EXPENSE },
    { id: '7', name: 'Income', type: TransactionType.INCOME },
];

export const AppContextProvider: React.FC<{ children: ReactNode; userEmail: string }> = ({ children, userEmail }) => {
    const [transactions, setTransactions] = useLocalStorage<Transaction[]>(`transactions_${userEmail}`, []);
    const [categories, setCategories] = useLocalStorage<Category[]>(`categories_${userEmail}`, DEFAULT_CATEGORIES);
    const [investments, setInvestments] = useLocalStorage<Investment[]>(`investments_${userEmail}`, []);
    const [recurringTransactions, setRecurringTransactions] = useLocalStorage<RecurringTransaction[]>(`recurring_${userEmail}`, []);
    const [budgets, setBudgets] = useLocalStorage<Budget[]>(`budgets_${userEmail}`, []);
    const [goals, setGoals] = useLocalStorage<Goal[]>(`goals_${userEmail}`, []);
    const [chatHistories, setChatHistories] = useLocalStorage<ChatHistories>(`chatHistories_${userEmail}`, {});


    useEffect(() => {
        const processRecurringTransactions = () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Normalize to start of day
            
            let updatedRecurringList = [...recurringTransactions];
            const newTransactions: Omit<Transaction, 'id'>[] = [];
            let needsStateUpdate = false;
    
            updatedRecurringList.forEach((rt, index) => {
                let nextDueDate = new Date(rt.nextDueDate);
                nextDueDate.setHours(0,0,0,0);
                
                if (rt.endDate && new Date(rt.endDate) < nextDueDate) return;

                while (nextDueDate <= today) {
                    newTransactions.push({
                        description: rt.description,
                        amount: rt.amount,
                        type: rt.type,
                        categoryId: rt.categoryId,
                        date: nextDueDate.toISOString().split('T')[0],
                    });
    
                    switch (rt.frequency) {
                        case 'daily': nextDueDate.setDate(nextDueDate.getDate() + 1); break;
                        case 'weekly': nextDueDate.setDate(nextDueDate.getDate() + 7); break;
                        case 'monthly': nextDueDate.setMonth(nextDueDate.getMonth() + 1); break;
                        case 'yearly': nextDueDate.setFullYear(nextDueDate.getFullYear() + 1); break;
                    }

                     if (rt.endDate && nextDueDate > new Date(rt.endDate)) {
                        break; 
                    }
                }
    
                const newNextDueDateStr = nextDueDate.toISOString().split('T')[0];
                if (updatedRecurringList[index].nextDueDate !== newNextDueDateStr) {
                    updatedRecurringList[index] = { ...rt, nextDueDate: newNextDueDateStr };
                    needsStateUpdate = true;
                }
            });
    
            if (newTransactions.length > 0) {
                setTransactions(prev => [...prev, ...newTransactions.map(t => ({...t, id: crypto.randomUUID()}))]);
            }
            if (needsStateUpdate) {
                setRecurringTransactions(updatedRecurringList);
            }
        };
    
        processRecurringTransactions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    // Transactions
    const addTransaction = (transaction: Omit<Transaction, 'id'>) => setTransactions(prev => [...prev, { ...transaction, id: crypto.randomUUID() }]);
    const addMultipleTransactions = (newTransactions: Omit<Transaction, 'id'>[]) => {
        const transactionsToAdd = newTransactions.map(t => ({ ...t, id: crypto.randomUUID() }));
        setTransactions(prev => [...prev, ...transactionsToAdd]);
    };
    const updateTransaction = (updatedTransaction: Transaction) => setTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t));
    const deleteTransaction = (id: string) => setTransactions(prev => prev.filter(t => t.id !== id));

    // Categories
    const addCategory = (category: Omit<Category, 'id'>) => setCategories(prev => [...prev, { ...category, id: crypto.randomUUID() }]);
    const deleteCategory = (id: string) => {
        setCategories(prev => prev.filter(c => c.id !== id));
        setTransactions(prev => prev.map(t => t.categoryId === id ? { ...t, categoryId: '' } : t));
    };

    // Investments
    const addInvestment = (investment: Omit<Investment, 'id'>) => setInvestments(prev => [...prev, { ...investment, id: crypto.randomUUID() }]);
    const updateInvestment = (updatedInvestment: Investment) => setInvestments(prev => prev.map(i => i.id === updatedInvestment.id ? updatedInvestment : i));
    const deleteInvestment = (id: string) => setInvestments(prev => prev.filter(i => i.id !== id));

    // Recurring Transactions
    const addRecurringTransaction = (rt: Omit<RecurringTransaction, 'id'>) => setRecurringTransactions(prev => [...prev, { ...rt, id: crypto.randomUUID() }]);
    const updateRecurringTransaction = (updatedRt: RecurringTransaction) => setRecurringTransactions(prev => prev.map(rt => rt.id === updatedRt.id ? updatedRt : rt));
    const deleteRecurringTransaction = (id: string) => setRecurringTransactions(prev => prev.filter(rt => rt.id !== id));

    // Budgets
    const addBudget = (budget: Omit<Budget, 'id'>) => setBudgets(prev => [...prev, { ...budget, id: crypto.randomUUID() }]);
    const updateBudget = (updatedBudget: Budget) => setBudgets(prev => prev.map(b => b.id === updatedBudget.id ? updatedBudget : b));
    const deleteBudget = (id: string) => setBudgets(prev => prev.filter(b => b.id !== id));
    
    // Goals
    const addGoal = (goal: Omit<Goal, 'id'>) => setGoals(prev => [...prev, { ...goal, id: crypto.randomUUID() }]);
    const updateGoal = (updatedGoal: Goal) => setGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g));
    const deleteGoal = (id: string) => setGoals(prev => prev.filter(g => g.id !== id));

    const value = {
        transactions, setTransactions,
        categories, setCategories,
        investments, setInvestments,
        recurringTransactions, setRecurringTransactions,
        budgets, setBudgets,
        goals, setGoals,
        chatHistories, setChatHistories,
        userEmail,
        addTransaction, addMultipleTransactions, updateTransaction, deleteTransaction,
        addCategory, deleteCategory,
        addInvestment, updateInvestment, deleteInvestment,
        addRecurringTransaction, updateRecurringTransaction, deleteRecurringTransaction,
        addBudget, updateBudget, deleteBudget,
        addGoal, updateGoal, deleteGoal,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppContextProvider');
    }
    return context;
};
