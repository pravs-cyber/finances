import React, { useState } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { PlusCircleIcon, TrashIcon } from '../ui/Icons';
import { Toggle } from '../ui/Toggle';
import { TransactionType } from '../../types';

export const CategoriesPage: React.FC = () => {
    const { categories, addCategory, deleteCategory } = useAppContext();
    const [newCategoryName, setNewCategoryName] = useState('');
    // FIX: Added state and UI to handle category types (Income/Expense) to align with the data model change.
    const [newCategoryType, setNewCategoryType] = useState<TransactionType>(TransactionType.EXPENSE);

    const handleAddCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (newCategoryName.trim()) {
            addCategory({ name: newCategoryName.trim(), type: newCategoryType });
            setNewCategoryName('');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold text-text-primary">Manage Categories</h1>
            
            <div className="bg-surface rounded-xl border border-surface-accent shadow-md overflow-hidden">
                <div className="p-6 border-b border-surface-accent">
                    <h2 className="text-lg font-semibold text-text-primary mb-4">Add a New Category</h2>
                    <form onSubmit={handleAddCategory} className="space-y-4 max-w-md">
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="e.g., Health & Wellness"
                            className="w-full bg-background border border-surface-accent rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        />
                         <Toggle 
                            enabled={newCategoryType === TransactionType.EXPENSE}
                            onChange={(isExpense) => setNewCategoryType(isExpense ? TransactionType.EXPENSE : TransactionType.INCOME)}
                            enabledLabel="Expense"
                            disabledLabel="Income"
                         />
                        <button type="submit" className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover">
                           <PlusCircleIcon className="mr-2 h-5 w-5" /> Add
                        </button>
                    </form>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-surface-accent">
                         <thead className="bg-surface-accent/50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Category Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Type</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Delete</span></th>
                            </tr>
                        </thead>
                         <tbody className="bg-surface divide-y divide-surface-accent">
                            {categories.length > 0 ? categories.map((category, index) => (
                                <tr key={category.id} className={`${index % 2 === 0 ? 'bg-surface' : 'bg-surface-accent/20'} hover:bg-surface-accent/40`}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">{category.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary capitalize">{category.type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button 
                                            onClick={() => window.confirm("Are you sure? Deleting this will uncategorize related transactions.") && deleteCategory(category.id)}
                                            className="text-negative hover:text-negative/80"
                                            title="Delete Category"
                                        >
                                            <TrashIcon />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={3} className="px-6 py-10 text-center text-text-secondary">You haven't added any custom categories yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};