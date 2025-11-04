import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Budget, Goal, TransactionType } from '../../types';
import { Modal } from '../ui/Modal';
import { PlusCircleIcon, TrashIcon, EditIcon } from '../ui/Icons';

const BudgetForm: React.FC<{
  onClose: () => void;
  budget?: Budget | null;
}> = ({ onClose, budget }) => {
    const { categories, addBudget, updateBudget } = useAppContext();
    const [categoryId, setCategoryId] = useState(budget?.categoryId || '');
    const [limit, setLimit] = useState(budget?.limit || 1000);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (budget) {
            updateBudget({ ...budget, categoryId, limit });
        } else {
            addBudget({ categoryId, limit, period: 'monthly' });
        }
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="b-category" className="block text-sm font-medium text-text-secondary">Category</label>
                <select id="b-category" value={categoryId} onChange={e => setCategoryId(e.target.value)} required className="mt-1 block w-full bg-background border border-surface-accent rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                    <option value="">Select an expense category</option>
                    {categories.filter(c => c.type === TransactionType.EXPENSE).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            <div>
                 <label htmlFor="b-limit" className="block text-sm font-medium text-text-secondary">Monthly Limit</label>
                <input id="b-limit" type="number" placeholder="Monthly Limit" value={limit} onChange={e => setLimit(+e.target.value)} required min="1" step="any" className="mt-1 block w-full bg-background border border-surface-accent rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
            </div>
            <div className="flex justify-end pt-4 space-x-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-primary bg-surface-accent rounded-md hover:bg-surface-accent/80">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover">{budget ? 'Update' : 'Set Budget'}</button>
            </div>
        </form>
    )
};

const GoalForm: React.FC<{
  onClose: () => void;
  goal?: Goal | null;
}> = ({ onClose, goal }) => {
    const { addGoal, updateGoal } = useAppContext();
    const [name, setName] = useState(goal?.name || '');
    const [targetAmount, setTargetAmount] = useState(goal?.targetAmount || 1000);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (goal) {
            updateGoal({ ...goal, name, targetAmount });
        } else {
            addGoal({ name, targetAmount, savedAmount: goal?.savedAmount || 0 });
        }
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="g-name" className="block text-sm font-medium text-text-secondary">Goal Name</label>
                <input id="g-name" type="text" placeholder="e.g., New Laptop" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full bg-background border border-surface-accent rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
            </div>
            <div>
                <label htmlFor="g-target" className="block text-sm font-medium text-text-secondary">Target Amount</label>
                <input id="g-target" type="number" placeholder="Target Amount" value={targetAmount} onChange={e => setTargetAmount(+e.target.value)} required min="1" step="any" className="mt-1 block w-full bg-background border border-surface-accent rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
            </div>
            <div className="flex justify-end pt-4 space-x-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-primary bg-surface-accent rounded-md hover:bg-surface-accent/80">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover">{goal ? 'Update' : 'Set Goal'}</button>
            </div>
        </form>
    )
};

const AddFundsForm: React.FC<{ goal: Goal; onClose: () => void }> = ({ goal, onClose }) => {
    const { updateGoal } = useAppContext();
    const [amount, setAmount] = useState(0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateGoal({ ...goal, savedAmount: goal.savedAmount + amount });
        onClose();
    }
    return (
         <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="f-amount" className="block text-sm font-medium text-text-secondary">Amount to add</label>
                <input id="f-amount" type="number" placeholder="0.00" value={amount} onChange={e => setAmount(+e.target.value)} required min="0.01" step="any" className="mt-1 block w-full bg-background border border-surface-accent rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
            </div>
             <div className="flex justify-end pt-4 space-x-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-primary bg-surface-accent rounded-md hover:bg-surface-accent/80">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover">Add Funds</button>
            </div>
        </form>
    );
}

const ProgressBar: React.FC<{ value: number; color: string }> = ({ value, color }) => (
    <div className="w-full bg-surface-accent rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${Math.min(value, 100)}%` }}></div>
    </div>
);

export const BudgetsPage: React.FC = () => {
    const { budgets, deleteBudget, categories, transactions, goals, deleteGoal } = useAppContext();
    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
    const [fundingGoal, setFundingGoal] = useState<Goal | null>(null);

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const monthlyExpenses = useMemo(() => {
        const expenseMap = new Map<string, number>();
        transactions
            .filter(t => t.type === TransactionType.EXPENSE && new Date(t.date) >= firstDay && new Date(t.date) <= lastDay)
            .forEach(t => {
                expenseMap.set(t.categoryId, (expenseMap.get(t.categoryId) || 0) + t.amount);
            });
        return expenseMap;
    }, [transactions, firstDay.getTime(), lastDay.getTime()]);
    
    const formatRupees = (amount: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-surface p-6 rounded-xl border border-surface-accent">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-text-primary">Monthly Budgets</h2>
                        <button onClick={() => { setEditingBudget(null); setIsBudgetModalOpen(true); }} className="flex items-center px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-md hover:bg-primary-hover">
                            <PlusCircleIcon className="mr-2 h-4 w-4" /> New Budget
                        </button>
                    </div>
                    <div className="space-y-4">
                        {budgets.length > 0 ? budgets.map(b => {
                            const category = categories.find(c => c.id === b.categoryId);
                            const spent = monthlyExpenses.get(b.categoryId) || 0;
                            const progress = b.limit > 0 ? (spent / b.limit) * 100 : 0;
                            const progressColor = progress > 100 ? 'bg-negative' : progress > 80 ? 'bg-warning' : 'bg-positive';
                            return (
                                <div key={b.id} className="bg-background/50 p-3 rounded-lg">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex items-center space-x-3">
                                            <span className="font-bold text-text-primary">{category?.name || 'Uncategorized'}</span>
                                            <div className="flex items-center space-x-2">
                                                <button onClick={() => { setEditingBudget(b); setIsBudgetModalOpen(true); }} className="text-text-secondary hover:text-primary"><EditIcon className="w-4 h-4"/></button>
                                                <button onClick={() => deleteBudget(b.id)} className="text-text-secondary hover:text-negative"><TrashIcon className="w-4 h-4"/></button>
                                            </div>
                                        </div>
                                        <span className="text-sm font-mono text-text-secondary">{formatRupees(spent)} / {formatRupees(b.limit)}</span>
                                    </div>
                                    <ProgressBar value={progress} color={progressColor} />
                                </div>
                            )
                        }) : <p className="text-text-secondary text-center py-4 text-sm">No budgets set for this month.</p>}
                    </div>
                </div>

                <div className="bg-surface p-6 rounded-xl border border-surface-accent">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-text-primary">Financial Goals</h2>
                        <button onClick={() => { setEditingGoal(null); setIsGoalModalOpen(true); }} className="flex items-center px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-md hover:bg-primary-hover">
                            <PlusCircleIcon className="mr-2 h-4 w-4" /> New Goal
                        </button>
                    </div>
                    <div className="space-y-4">
                        {goals.length > 0 ? goals.map(g => {
                            const progress = g.targetAmount > 0 ? (g.savedAmount / g.targetAmount) * 100 : 0;
                            return (
                                <div key={g.id} className="bg-background/50 p-3 rounded-lg">
                                    <div className="flex justify-between items-center mb-1">
                                       <div className="flex items-center space-x-3">
                                            <span className="font-bold text-text-primary">{g.name}</span>
                                            <div className="flex items-center space-x-2">
                                                <button onClick={() => { setEditingGoal(g); setIsGoalModalOpen(true); }} className="text-text-secondary hover:text-primary"><EditIcon className="w-4 h-4"/></button>
                                                <button onClick={() => deleteGoal(g.id)} className="text-text-secondary hover:text-negative"><TrashIcon className="w-4 h-4"/></button>
                                            </div>
                                        </div>
                                        <span className="text-sm font-mono text-text-secondary">{formatRupees(g.savedAmount)} / {formatRupees(g.targetAmount)}</span>
                                    </div>
                                    <ProgressBar value={progress} color="bg-primary" />
                                     <div className="text-right mt-2">
                                        <button onClick={() => setFundingGoal(g)} className="text-primary hover:underline text-xs font-bold uppercase">Add Funds</button>
                                    </div>
                                </div>
                            )
                        }) : <p className="text-text-secondary text-center py-4 text-sm">No financial goals set yet.</p>}
                    </div>
                </div>
            </div>

            <Modal isOpen={isBudgetModalOpen} onClose={() => setIsBudgetModalOpen(false)} title={editingBudget ? 'Edit Budget' : 'Set New Budget'}>
                <BudgetForm onClose={() => setIsBudgetModalOpen(false)} budget={editingBudget} />
            </Modal>
             <Modal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} title={editingGoal ? 'Edit Goal' : 'Set New Goal'}>
                <GoalForm onClose={() => setIsGoalModalOpen(false)} goal={editingGoal} />
            </Modal>
             <Modal isOpen={!!fundingGoal} onClose={() => setFundingGoal(null)} title={`Add Funds to "${fundingGoal?.name}"`}>
                {fundingGoal && <AddFundsForm goal={fundingGoal} onClose={() => setFundingGoal(null)} />}
            </Modal>
        </div>
    );
};
