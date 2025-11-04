import React, { useState, useMemo, useRef } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Transaction, TransactionType } from '../../types';
import { Modal } from '../ui/Modal';
import { Toggle } from '../ui/Toggle';
import { PlusCircleIcon, TrashIcon, EditIcon, UploadIcon, DownloadIcon, CopyIcon, SparklesIcon } from '../ui/Icons';
import { parseDataFromTextFile, suggestCategoryForTransaction, parseDataFromXlsxFile } from '../../services/geminiService';
import { Spinner } from '../ui/Spinner';

const TransactionForm: React.FC<{
  onClose: () => void;
  transaction?: Transaction | null;
}> = ({ onClose, transaction }) => {
  const { categories, addTransaction, updateTransaction } = useAppContext();
  const [description, setDescription] = useState(transaction?.description || '');
  const [amount, setAmount] = useState(transaction?.amount || 0);
  const [date, setDate] = useState(transaction?.date || new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState(transaction?.categoryId || '');
  const [type, setType] = useState(transaction?.type || TransactionType.EXPENSE);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTransaction = {
      description,
      amount: +amount,
      date,
      categoryId,
      type,
    };
    if (transaction?.id) {
      updateTransaction({ ...newTransaction, id: transaction.id });
    } else {
      addTransaction(newTransaction);
    }
    onClose();
  };

  const handleSuggestCategory = async () => {
    if (!description) return;
    setIsSuggesting(true);
    try {
        const suggestion = await suggestCategoryForTransaction(description, categories);
        if (suggestion) {
            setCategoryId(suggestion.categoryId);
            setType(suggestion.type);
        } else {
            // Maybe show a small alert that no suggestion could be made
        }
    } catch (error) {
        console.error("Suggestion failed", error);
    } finally {
        setIsSuggesting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-text-secondary">Description</label>
        <input type="text" id="description" value={description} onChange={e => setDescription(e.target.value)} required className="mt-1 block w-full bg-background dark:bg-surface-accent border border-surface-accent dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
      </div>
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-text-secondary">Amount</label>
        <input type="number" id="amount" value={amount} onChange={e => setAmount(+e.target.value)} required min="0.01" step="0.01" className="mt-1 block w-full bg-background dark:bg-surface-accent border border-surface-accent dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
      </div>
       <Toggle 
          enabled={type === TransactionType.EXPENSE}
          onChange={(isExpense) => setType(isExpense ? TransactionType.EXPENSE : TransactionType.INCOME)}
          enabledLabel="Expense"
          disabledLabel="Income"
       />
      <div>
        <div className="flex justify-between items-center mb-1">
          <label htmlFor="category" className="block text-sm font-medium text-text-secondary">Category</label>
          <button type="button" onClick={handleSuggestCategory} disabled={!description || isSuggesting} className="flex items-center text-xs text-primary hover:underline disabled:opacity-50 disabled:no-underline">
              {isSuggesting ? <Spinner size="sm" className="mr-1" /> : <SparklesIcon className="mr-1 h-4 w-4" />}
              {isSuggesting ? 'Suggesting...' : 'Suggest'}
          </button>
        </div>
        <select id="category" value={categoryId} onChange={e => setCategoryId(e.target.value)} required className="block w-full bg-background dark:bg-surface-accent border border-surface-accent dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
          <option value="">Select a category</option>
          {categories.filter(c => c.type === type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-text-secondary">Date</label>
        <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} required className="mt-1 block w-full bg-background dark:bg-surface-accent border border-surface-accent dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
      </div>
      <div className="flex justify-end pt-4 space-x-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-primary bg-surface-accent rounded-md hover:bg-surface-accent/80">Cancel</button>
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover">{transaction?.id ? 'Update' : 'Add'} Transaction</button>
      </div>
    </form>
  );
};

export const TransactionsPage: React.FC = () => {
  const { transactions, deleteTransaction, categories, addTransaction } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'description' | 'category' | 'amount'; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });

  const sortedTransactions = useMemo(() => {
    const sortableItems = [...transactions];
    sortableItems.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortConfig.key) {
            case 'category':
                aValue = categories.find(c => c.id === a.categoryId)?.name.toLowerCase() || 'zzzz';
                bValue = categories.find(c => c.id === b.categoryId)?.name.toLowerCase() || 'zzzz';
                break;
            case 'date':
                aValue = new Date(a.date).getTime();
                bValue = new Date(b.date).getTime();
                break;
            case 'description':
                aValue = a.description.toLowerCase();
                bValue = b.description.toLowerCase();
                break;
            case 'amount':
                aValue = a.type === TransactionType.EXPENSE ? -a.amount : a.amount;
                bValue = b.type === TransactionType.EXPENSE ? -b.amount : b.amount;
                break;
            default:
                return 0;
        }

        if (aValue < bValue) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
    });
    return sortableItems;
  }, [transactions, categories, sortConfig]);

  const requestSort = (key: 'date' | 'description' | 'category' | 'amount') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleDuplicate = (transaction: Transaction) => {
    const { id, ...rest } = transaction;
    const duplicatedTransaction = {
      ...rest,
      date: new Date().toISOString().split('T')[0],
      description: `${transaction.description} (Copy)`,
    };
    setEditingTransaction(duplicatedTransaction as Transaction);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const processParsedTransactions = (parsedTransactions: Partial<Transaction>[]) => {
        if (parsedTransactions.length > 0 && window.confirm(`Found ${parsedTransactions.length} transactions. Do you want to add them?`)) {
            parsedTransactions.forEach(t => {
                if (t.amount && t.description && t.date && t.type) {
                    addTransaction({
                        description: t.description,
                        amount: t.amount,
                        date: new Date(t.date).toISOString().split('T')[0],
                        type: t.type as TransactionType,
                        categoryId: '', // User needs to categorize manually
                    });
                }
            });
        } else if (parsedTransactions.length === 0) {
            alert("No valid transactions found in the file.");
        }
    };

    try {
        if (file.type === 'text/csv' || file.type === 'text/plain') {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const text = e.target?.result as string;
                try {
                    const parsed = await parseDataFromTextFile(text);
                    processParsedTransactions(parsed);
                } catch (error) {
                    alert((error as Error).message);
                } finally {
                    setIsImporting(false);
                }
            };
            reader.readAsText(file);
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const dataUrl = e.target?.result as string;
                const base64Content = dataUrl.split(',')[1];
                try {
                    const parsed = await parseDataFromXlsxFile(base64Content);
                    processParsedTransactions(parsed);
                } catch (error) {
                    alert((error as Error).message);
                } finally {
                    setIsImporting(false);
                }
            };
            reader.readAsDataURL(file);
        } else {
            alert("Unsupported file type. Please upload a CSV, TXT, or XLSX file.");
            setIsImporting(false);
        }
    } catch (err) {
        console.error("Error reading file:", err);
        alert("Failed to read file.");
        setIsImporting(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Date,Description,Amount,Type,Category\n" 
      + transactions.map(t => {
          const categoryName = categories.find(c => c.id === t.categoryId)?.name || 'Uncategorized';
          return `${t.date},"${t.description}",${t.amount},${t.type},"${categoryName}"`;
        }).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "transactions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const SortableHeader: React.FC<{
    title: string;
    sortKey: 'date' | 'description' | 'category' | 'amount';
    className?: string;
  }> = ({ title, sortKey, className }) => (
    <th scope="col" className={`px-6 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider ${className}`}>
        <button onClick={() => requestSort(sortKey)} className="flex items-center gap-1 hover:text-text-primary transition-colors w-full">
            <span>{title}</span>
            {sortConfig.key === sortKey && (
                <span>{sortConfig.direction === 'ascending' ? '▲' : '▼'}</span>
            )}
        </button>
    </th>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-text-primary">Transactions</h1>
        <div className="flex items-center space-x-2">
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleImport} accept=".csv,.txt,.xlsx" />
            <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="flex items-center px-4 py-2 text-sm font-medium text-text-primary bg-surface-accent rounded-md hover:bg-surface-accent/80 disabled:opacity-50">
               {isImporting ? <Spinner size="sm" className="mr-2" /> : <UploadIcon className="mr-2" />}
               Import
            </button>
             <button onClick={handleExport} className="flex items-center px-4 py-2 text-sm font-medium text-text-primary bg-surface-accent rounded-md hover:bg-surface-accent/80">
                <DownloadIcon className="mr-2"/> Export
            </button>
            <button onClick={handleAddNew} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover">
                <PlusCircleIcon className="mr-2" /> Add New
            </button>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTransaction?.id ? 'Edit Transaction' : (editingTransaction ? 'Duplicate Transaction' : 'Add New Transaction')}>
        <TransactionForm onClose={() => setIsModalOpen(false)} transaction={editingTransaction} />
      </Modal>

      <div className="bg-surface rounded-xl border border-surface-accent shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-surface-accent">
            <thead className="bg-surface-accent/50">
              <tr>
                <SortableHeader title="Date" sortKey="date" className="text-left" />
                <SortableHeader title="Description" sortKey="description" className="text-left" />
                <SortableHeader title="Category" sortKey="category" className="text-left" />
                <SortableHeader title="Amount" sortKey="amount" className="text-right" />
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-surface-accent">
              {sortedTransactions.length > 0 ? sortedTransactions.map((t) => {
                const category = categories.find(c => c.id === t.categoryId);
                const isExpense = t.type === TransactionType.EXPENSE;
                return (
                  <tr key={t.id} className="hover:bg-surface-accent/40">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{t.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">{t.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{category?.name || 'Uncategorized'}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${isExpense ? 'text-negative' : 'text-positive'}`}>
                      {isExpense ? '-' : '+'}{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(t.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end items-center space-x-4">
                        <button onClick={() => handleDuplicate(t)} className="text-text-secondary hover:text-text-primary" title="Duplicate"><CopyIcon /></button>
                        <button onClick={() => handleEdit(t)} className="text-primary hover:text-primary-hover" title="Edit"><EditIcon /></button>
                        <button onClick={() => window.confirm("Are you sure?") && deleteTransaction(t.id)} className="text-negative hover:text-negative/80" title="Delete"><TrashIcon /></button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                    <td colSpan={5} className="text-center py-10 text-text-secondary">No transactions yet. Add one to get started!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};