import React, { useState } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { RecurringTransaction, TransactionType } from '../../types';
import { Modal } from '../ui/Modal';
import { Toggle } from '../ui/Toggle';
import { PlusCircleIcon, TrashIcon, EditIcon } from '../ui/Icons';

const RecurringTransactionForm: React.FC<{
  onClose: () => void;
  recurringTransaction?: RecurringTransaction | null;
}> = ({ onClose, recurringTransaction }) => {
  const { categories, addRecurringTransaction, updateRecurringTransaction } = useAppContext();
  const [description, setDescription] = useState(recurringTransaction?.description || '');
  const [amount, setAmount] = useState(recurringTransaction?.amount || 0);
  const [type, setType] = useState(recurringTransaction?.type || TransactionType.EXPENSE);
  const [categoryId, setCategoryId] = useState(recurringTransaction?.categoryId || '');
  const [frequency, setFrequency] = useState(recurringTransaction?.frequency || 'monthly');
  const [startDate, setStartDate] = useState(recurringTransaction?.startDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(recurringTransaction?.endDate || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRt = {
      description,
      amount: +amount,
      type,
      categoryId,
      frequency: frequency as 'daily' | 'weekly' | 'monthly' | 'yearly',
      startDate,
      nextDueDate: startDate,
      endDate: endDate || undefined,
    };
    if (recurringTransaction) {
      updateRecurringTransaction({ ...recurringTransaction, ...newRt, nextDueDate: recurringTransaction.nextDueDate });
    } else {
      addRecurringTransaction(newRt);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="rt-description" className="block text-sm font-medium text-text-secondary">Description</label>
        <input type="text" id="rt-description" value={description} onChange={e => setDescription(e.target.value)} required className="mt-1 block w-full bg-background border border-surface-accent rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
      </div>
      <div>
        <label htmlFor="rt-amount" className="block text-sm font-medium text-text-secondary">Amount</label>
        <input type="number" id="rt-amount" value={amount} onChange={e => setAmount(+e.target.value)} required min="0.01" step="0.01" className="mt-1 block w-full bg-background border border-surface-accent rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
      </div>
      <Toggle enabled={type === TransactionType.EXPENSE} onChange={(isExpense) => setType(isExpense ? TransactionType.EXPENSE : TransactionType.INCOME)} enabledLabel="Expense" disabledLabel="Income"/>
      <div>
        <label htmlFor="rt-category" className="block text-sm font-medium text-text-secondary">Category</label>
        <select id="rt-category" value={categoryId} onChange={e => setCategoryId(e.target.value)} required className="mt-1 block w-full bg-background border border-surface-accent rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
          <option value="">Select a category</option>
          {categories.filter(c => c.type === type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="rt-frequency" className="block text-sm font-medium text-text-secondary">Frequency</label>
        <select id="rt-frequency" value={frequency} onChange={e => setFrequency(e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly')} required className="mt-1 block w-full bg-background border border-surface-accent rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
            <label htmlFor="rt-start-date" className="block text-sm font-medium text-text-secondary">Start Date</label>
            <input type="date" id="rt-start-date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="mt-1 block w-full bg-background border border-surface-accent rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
        </div>
        <div>
            <label htmlFor="rt-end-date" className="block text-sm font-medium text-text-secondary">End Date (Optional)</label>
            <input type="date" id="rt-end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full bg-background border border-surface-accent rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
        </div>
      </div>
      <div className="flex justify-end pt-4 space-x-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-primary bg-surface-accent rounded-md hover:bg-surface-accent/80">Cancel</button>
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover">{recurringTransaction ? 'Update' : 'Add'}</button>
      </div>
    </form>
  );
};

export const RecurringPage: React.FC = () => {
  const { recurringTransactions, deleteRecurringTransaction, categories } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRt, setEditingRt] = useState<RecurringTransaction | null>(null);

  const handleEdit = (rt: RecurringTransaction) => {
    setEditingRt(rt);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingRt(null);
    setIsModalOpen(true);
  };

  const formatRupees = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-text-primary">Recurring Transactions</h1>
        <button onClick={handleAddNew} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover">
            <PlusCircleIcon className="mr-2 h-5 w-5" /> Add New
        </button>
      </div>
      <p className="text-sm text-text-secondary">Schedule your regular income and expenses like salary, rent, or subscriptions to have them automatically added on their due dates.</p>


      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingRt ? 'Edit Recurring Transaction' : 'Add Recurring Transaction'}>
        <RecurringTransactionForm onClose={() => setIsModalOpen(false)} recurringTransaction={editingRt} />
      </Modal>

      <div className="bg-surface rounded-xl border border-surface-accent shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-surface-accent">
            <thead className="bg-surface-accent/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Description</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Amount</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Frequency</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Next Due Date</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-surface-accent">
              {recurringTransactions.length > 0 ? recurringTransactions.map((rt) => {
                const isExpense = rt.type === TransactionType.EXPENSE;
                const category = categories.find(c => c.id === rt.categoryId);
                return (
                  <tr key={rt.id} className="hover:bg-surface-accent/40">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">{rt.description} <span className="text-xs text-text-secondary">({category?.name})</span></td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${isExpense ? 'text-negative' : 'text-positive'}`}>
                      {isExpense ? '-' : '+'}{formatRupees(rt.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary capitalize">{rt.frequency}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{rt.nextDueDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end items-center space-x-4">
                        <button onClick={() => handleEdit(rt)} className="text-primary hover:text-primary-hover"><EditIcon /></button>
                        <button onClick={() => window.confirm("Are you sure?") && deleteRecurringTransaction(rt.id)} className="text-negative hover:text-negative/80"><TrashIcon /></button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={5} className="text-center py-10 text-text-secondary">No recurring transactions scheduled.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
