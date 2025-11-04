import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { TransactionType, Budget } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getPersonalizedInsights } from '../../services/geminiService';
import { SparklesIcon, IncomeIcon, ExpenseIcon, BalanceIcon } from '../ui/Icons';
import { Spinner } from '../ui/Spinner';

const StatCard: React.FC<{ title: string; amount: number; icon: React.ReactElement<{ className?: string }>; colorClass: string }> = ({ title, amount, icon, colorClass }) => (
    <div className="bg-surface p-6 rounded-xl border border-surface-accent flex items-center space-x-4">
        <div className={`p-3 rounded-full bg-opacity-10 ${colorClass.replace('text-', 'bg-')}`}>
           {React.cloneElement(icon, { className: `w-6 h-6 ${colorClass}` })}
        </div>
        <div>
            <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
            <p className={`text-3xl font-bold text-text-primary`}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)}</p>
        </div>
    </div>
);

const ProgressBar: React.FC<{ value: number; color: string }> = ({ value, color }) => (
    <div className="w-full bg-surface-accent rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full`} style={{ width: `${Math.min(value, 100)}%` }}></div>
    </div>
);

const BudgetSummary: React.FC = () => {
    const { budgets, categories, transactions } = useAppContext();
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

    if (budgets.length === 0) {
        return <div className="text-center py-4 text-text-secondary">No budgets set.</div>;
    }

    return (
        <div className="space-y-4">
            {budgets.slice(0, 4).map(budget => {
                const category = categories.find(c => c.id === budget.categoryId);
                const spent = monthlyExpenses.get(budget.categoryId) || 0;
                const progress = (spent / budget.limit) * 100;
                const progressColor = progress > 100 ? 'bg-negative' : progress > 80 ? 'bg-warning' : 'bg-positive';

                return (
                    <div key={budget.id}>
                        <div className="flex justify-between mb-1 text-sm">
                            <span className="font-medium text-text-primary">{category?.name}</span>
                            <span className="text-text-secondary">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(spent)} / {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(budget.limit)}</span>
                        </div>
                        <ProgressBar value={progress} color={progressColor} />
                    </div>
                );
            })}
        </div>
    );
};

const GoalSummary: React.FC = () => {
    const { goals } = useAppContext();
    if (goals.length === 0) {
        return <div className="text-center py-4 text-text-secondary">No goals defined.</div>;
    }
    return (
        <div className="space-y-4">
            {goals.slice(0, 3).map(goal => {
                const progress = (goal.savedAmount / goal.targetAmount) * 100;
                return (
                     <div key={goal.id}>
                        <div className="flex justify-between mb-1 text-sm">
                            <span className="font-medium text-text-primary">{goal.name}</span>
                            <span className="text-text-secondary">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(goal.savedAmount)} / {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(goal.targetAmount)}</span>
                        </div>
                        <ProgressBar value={progress} color="bg-primary" />
                    </div>
                )
            })}
        </div>
    )
};

const AIInsights: React.FC = () => {
    const { transactions, investments, budgets, goals, categories } = useAppContext();
    const [insights, setInsights] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await getPersonalizedInsights(transactions, investments, budgets, goals, categories);
            setInsights(result);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="bg-surface p-6 rounded-xl border border-surface-accent">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-text-primary">Personalized Insights</h3>
                <button onClick={handleGenerate} disabled={isLoading} className="flex items-center px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-md hover:bg-primary-hover disabled:opacity-50 transition-colors">
                    {isLoading ? <Spinner size="sm" className="mr-2"/> : <SparklesIcon className="mr-2"/>}
                    {isLoading ? 'Generating...' : 'Generate'}
                </button>
            </div>
            {error && <div className="text-negative bg-negative/10 p-3 rounded-md text-sm">{error}</div>}
            {insights ? (
                 <div className="prose prose-sm max-w-none text-text-secondary leading-relaxed" dangerouslySetInnerHTML={{ __html: insights.replace(/\n/g, '<br />') }}></div>
            ) : (
                <div className="text-center py-4 text-text-secondary text-sm">Click "Generate" to get AI-powered tips based on your data.</div>
            )}
        </div>
    );
};


export const DashboardPage: React.FC = () => {
    const { transactions, categories } = useAppContext();
    
    const { totalIncome, totalExpense, netBalance } = useMemo(() => {
        const income = transactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
        const expense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
        return { totalIncome: income, totalExpense: expense, netBalance: income - expense };
    }, [transactions]);

    const incomeVsExpenseData = useMemo(() => {
        const dataMap: { [key: string]: { name: string, income: number, expense: number } } = {};
        transactions.forEach(t => {
            const date = new Date(t.date);
            const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
             if (!dataMap[month]) {
                dataMap[month] = { name: month, income: 0, expense: 0 };
            }
            if (t.type === TransactionType.INCOME) dataMap[month].income += t.amount;
            else dataMap[month].expense += t.amount;
        });
        const sortedData = Object.values(dataMap).sort((a,b) => new Date(a.name).getTime() - new Date(b.name).getTime());
        return sortedData;
    }, [transactions]);

    const expenseByCategory = useMemo(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const expenseMap = new Map<string, number>();
        transactions
            .filter(t => t.type === TransactionType.EXPENSE && new Date(t.date) >= firstDay && new Date(t.date) <= lastDay)
            .forEach(t => {
                const categoryName = categories.find(c => c.id === t.categoryId)?.name || 'Uncategorized';
                expenseMap.set(categoryName, (expenseMap.get(categoryName) || 0) + t.amount);
            });
        return Array.from(expenseMap.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    }, [transactions, categories]);

    const COLORS = ['#7F56D9', '#12B76A', '#F79009', '#F04438', '#344054', '#98A2B3'];

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Income" amount={totalIncome} icon={<IncomeIcon/>} colorClass="text-positive" />
                <StatCard title="Total Expense" amount={totalExpense} icon={<ExpenseIcon/>} colorClass="text-negative" />
                <StatCard title="Net Balance" amount={netBalance} icon={<BalanceIcon/>} colorClass={netBalance >= 0 ? "text-primary" : "text-warning"} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-surface p-6 rounded-xl border border-surface-accent">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">Monthly Budget Progress</h3>
                    <BudgetSummary />
                </div>
                 <div className="bg-surface p-6 rounded-xl border border-surface-accent">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">Financial Goals</h3>
                    <GoalSummary />
                </div>
            </div>

            <AIInsights />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 bg-surface p-6 rounded-xl border border-surface-accent h-96">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">Income vs Expense History</h3>
                    {incomeVsExpenseData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="90%">
                            <BarChart data={incomeVsExpenseData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <XAxis dataKey="name" stroke="var(--chart-axis-stroke)" fontSize={12} />
                                <YAxis stroke="var(--chart-axis-stroke)" fontSize={12} tickFormatter={(value) => new Intl.NumberFormat('en-IN', { notation: 'compact', compactDisplay: 'short' }).format(value as number)} />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'var(--chart-tooltip-bg)', 
                                        border: `1px solid var(--chart-tooltip-border)`,
                                    }} 
                                    cursor={{fill: 'rgba(127, 86, 217, 0.1)'}} 
                                />
                                <Legend wrapperStyle={{fontSize: "14px"}}/>
                                <Bar dataKey="income" fill="var(--color-positive)" name="Income" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="expense" fill="var(--color-negative)" name="Expense" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-text-secondary">Add transactions to see your income vs expense trends.</div>
                    )}
                </div>
                <div className="lg:col-span-2 bg-surface p-6 rounded-xl border border-surface-accent h-96">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">Spending by Category (This Month)</h3>
                     {expenseByCategory.length > 0 ? (
                        <ResponsiveContainer width="100%" height="90%">
                            <PieChart>
                                <Pie 
                                    data={expenseByCategory} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    cx="50%" 
                                    cy="50%" 
                                    outerRadius={'80%'}
                                    labelLine={false}
                                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
                                        const RADIAN = Math.PI / 180;
                                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                        return (
                                          <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
                                            {`${(percent * 100).toFixed(0)}%`}
                                          </text>
                                        );
                                    }}
                                >
                                    {expenseByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value)} contentStyle={{ backgroundColor: 'var(--chart-tooltip-bg)', border: `1px solid var(--chart-tooltip-border)`}} />
                                <Legend wrapperStyle={{fontSize: "12px"}}/>
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-text-secondary">No expenses this month to display.</div>
                    )}
                </div>
            </div>

        </div>
    );
};
