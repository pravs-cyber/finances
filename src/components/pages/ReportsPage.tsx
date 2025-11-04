import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { TransactionType } from '../../types';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { analyzeSpending, analyzeMonthlyComparison } from '../../services/geminiService';
import { SparklesIcon } from '../ui/Icons';
import { Spinner } from '../ui/Spinner';

export const ReportsPage: React.FC = () => {
    const { transactions, categories } = useAppContext();
    const [aiReport, setAiReport] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    const [comparisonReport, setComparisonReport] = useState<string | null>(null);
    const [isGeneratingComparison, setIsGeneratingComparison] = useState(false);


    const filteredTransactions = useMemo(() => {
        if (!startDate && !endDate) return transactions;
        return transactions.filter(t => {
            const date = new Date(t.date);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if (end) end.setHours(23, 59, 59, 999);
            if (start && date < start) return false;
            if (end && date > end) return false;
            return true;
        });
    }, [transactions, startDate, endDate]);

    const { totalIncome, totalExpense } = useMemo(() => {
        const income = filteredTransactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
        const expense = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
        return { totalIncome: income, totalExpense: expense };
    }, [filteredTransactions]);
    
    const expenseByCategory = useMemo(() => {
        const expenseMap = new Map<string, number>();
        filteredTransactions.filter(t => t.type === TransactionType.EXPENSE).forEach(t => {
            const categoryName = categories.find(c => c.id === t.categoryId)?.name || 'Uncategorized';
            expenseMap.set(categoryName, (expenseMap.get(categoryName) || 0) + t.amount);
        });
        return Array.from(expenseMap.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    }, [filteredTransactions, categories]);

     const { currentMonthStats, previousMonthStats } = useMemo(() => {
        const now = new Date();
        const firstDayCurrent = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayCurrent = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const firstDayPrevious = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayPrevious = new Date(now.getFullYear(), now.getMonth(), 0);

        const getStatsForPeriod = (start: Date, end: Date) => {
            const periodTransactions = transactions.filter(t => {
                const date = new Date(t.date);
                return date >= start && date <= end;
            });

            const income = periodTransactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
            const expenses = periodTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
            
            const categoryExpenses: { [key: string]: number } = {};
            periodTransactions.filter(t => t.type === TransactionType.EXPENSE).forEach(t => {
                const catName = categories.find(c => c.id === t.categoryId)?.name || 'Uncategorized';
                categoryExpenses[catName] = (categoryExpenses[catName] || 0) + t.amount;
            });
            return { income, expenses, categoryExpenses };
        };

        return {
            currentMonthStats: getStatsForPeriod(firstDayCurrent, lastDayCurrent),
            previousMonthStats: getStatsForPeriod(firstDayPrevious, lastDayPrevious),
        };
    }, [transactions, categories]);
    
    const handleGenerateReport = async () => {
        if(filteredTransactions.length === 0) {
            setError("No transactions in the selected date range to analyze.");
            return;
        }
        setIsGenerating(true);
        setError(null);
        setAiReport(null);
        try {
            const report = await analyzeSpending(filteredTransactions, categories);
            setAiReport(report);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateComparisonReport = async () => {
        setIsGeneratingComparison(true);
        try {
            const report = await analyzeMonthlyComparison(currentMonthStats, previousMonthStats);
            setComparisonReport(report);
        } catch (error) {
            console.error(error);
            setComparisonReport("Sorry, an error occurred while generating the comparison.");
        } finally {
            setIsGeneratingComparison(false);
        }
    }
    
    const COLORS = ['#7F56D9', '#12B76A', '#F79009', '#F04438', '#344054', '#98A2B3'];
    const formatRupees = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
    
    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold text-text-primary">Reports</h1>
            
            <div className="bg-surface p-6 rounded-xl border border-surface-accent">
                <h2 className="text-xl font-bold text-text-primary mb-4">Month-Over-Month Comparison</h2>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <h4 className="text-sm text-text-secondary">Previous Month</h4>
                        <p className="text-lg font-bold text-text-primary">{formatRupees(previousMonthStats.income - previousMonthStats.expenses)} saved</p>
                    </div>
                    <div>
                        <h4 className="text-sm text-text-secondary">Current Month</h4>
                        <p className="text-lg font-bold text-text-primary">{formatRupees(currentMonthStats.income - currentMonthStats.expenses)} saved</p>
                    </div>
                     <div>
                        <h4 className="text-sm text-text-secondary">Change</h4>
                        <p className={`text-lg font-bold ${((currentMonthStats.income - currentMonthStats.expenses) - (previousMonthStats.income - previousMonthStats.expenses)) >= 0 ? 'text-positive' : 'text-negative'}`}>
                            {formatRupees(Math.abs((currentMonthStats.income - currentMonthStats.expenses) - (previousMonthStats.income - previousMonthStats.expenses)))}
                        </p>
                    </div>
                </div>
                 {comparisonReport ? (
                    <div className="mt-4 p-3 bg-surface-accent/50 rounded-lg text-center text-text-secondary text-sm">{comparisonReport}</div>
                ) : (
                    <div className="mt-4 text-center">
                        <button onClick={handleGenerateComparisonReport} disabled={isGeneratingComparison} className="flex items-center mx-auto px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-md hover:bg-primary-hover disabled:opacity-50 transition-colors">
                            {isGeneratingComparison ? <Spinner size="sm" className="mr-2"/> : <SparklesIcon className="mr-2"/>}
                            {isGeneratingComparison ? 'Analyzing...' : 'Get AI Summary'}
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-surface p-4 rounded-xl border border-surface-accent flex items-center space-x-4">
                <h3 className="text-text-primary font-medium">Custom Timeline:</h3>
                <div>
                    <label htmlFor="start-date" className="text-sm text-text-secondary mr-2">From</label>
                    <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-background border border-surface-accent rounded-md py-1 px-2 text-text-primary" />
                </div>
                 <div>
                    <label htmlFor="end-date" className="text-sm text-text-secondary mr-2">To</label>
                    <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-background border border-surface-accent rounded-md py-1 px-2 text-text-primary" />
                </div>
                <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-sm text-primary hover:underline">Reset</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-surface p-6 rounded-xl border border-surface-accent h-96">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">Income vs Expense</h3>
                     <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={[{ name: 'Summary', income: totalIncome, expense: totalExpense }]} layout="vertical" margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                           <XAxis type="number" stroke="var(--chart-axis-stroke)" fontSize={12} />
                           <YAxis type="category" dataKey="name" stroke="var(--chart-axis-stroke)" fontSize={12} hide />
                           <Tooltip contentStyle={{ backgroundColor: 'var(--chart-tooltip-bg)', border: `1px solid var(--chart-tooltip-border)` }} cursor={{fill: 'rgba(127, 86, 217, 0.1)'}}/>
                           <Legend />
                           <Bar dataKey="income" fill="var(--color-positive)" name="Income" radius={[0, 4, 4, 0]} />
                           <Bar dataKey="expense" fill="var(--color-negative)" name="Expense" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-surface p-6 rounded-xl border border-surface-accent h-96">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">Expense by Category</h3>
                     <ResponsiveContainer width="100%" height="90%">
                        <PieChart>
                            <Pie data={expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8">
                                {expenseByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'var(--chart-tooltip-bg)', border: `1px solid var(--chart-tooltip-border)` }} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-surface p-6 rounded-xl border border-surface-accent">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-text-primary">AI-Powered Spending Analysis</h2>
                    <button onClick={handleGenerateReport} disabled={isGenerating} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover disabled:opacity-50">
                        {isGenerating ? <Spinner size="sm" className="mr-2" /> : <SparklesIcon className="mr-2" />}
                        {isGenerating ? 'Analyzing...' : 'Generate Analysis'}
                    </button>
                </div>
                {error && <div className="text-negative bg-negative/10 p-3 rounded-md text-sm">{error}</div>}
                {aiReport ? (
                    <div className="prose prose-invert prose-sm max-w-none text-text-secondary" dangerouslySetInnerHTML={{ __html: aiReport.replace(/\n/g, '<br />') }}></div>
                ) : (
                    <div className="text-center py-8 text-text-secondary">Click "Generate Analysis" to get personalized insights on your spending.</div>
                )}
            </div>

        </div>
    );
};
