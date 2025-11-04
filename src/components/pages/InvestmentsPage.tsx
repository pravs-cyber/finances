import React, { useState } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Investment } from '../../types';
import { Modal } from '../ui/Modal';
import { PlusCircleIcon, TrashIcon, EditIcon, SparklesIcon } from '../ui/Icons';
import { fetchCurrentInvestmentPrice } from '../../services/geminiService';

const InvestmentForm: React.FC<{
  onClose: () => void;
  investment?: Investment | null;
}> = ({ onClose, investment }) => {
  const { addInvestment, updateInvestment } = useAppContext();
  const [name, setName] = useState(investment?.name || '');
  const [quantity, setQuantity] = useState(investment?.quantity || 0);
  const [purchasePrice, setPurchasePrice] = useState(investment?.purchasePrice || 0);
  const [purchaseDate, setPurchaseDate] = useState(investment?.purchaseDate || new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newInvestment = { name, quantity: +quantity, purchasePrice: +purchasePrice, purchaseDate };
    if (investment) {
      updateInvestment({ ...investment, ...newInvestment });
    } else {
      addInvestment(newInvestment);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <div>
            <label htmlFor="inv-name" className="block text-sm font-medium text-text-secondary">Name (e.g., Apple Inc., AAPL)</label>
            <input type="text" id="inv-name" placeholder="Investment Name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full bg-background border border-surface-accent rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
        </div>
         <div>
            <label htmlFor="inv-quantity" className="block text-sm font-medium text-text-secondary">Quantity</label>
            <input type="number" id="inv-quantity" placeholder="0.00" value={quantity} onChange={e => setQuantity(+e.target.value)} required min="0" step="any" className="mt-1 block w-full bg-background border border-surface-accent rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
        </div>
         <div>
            <label htmlFor="inv-price" className="block text-sm font-medium text-text-secondary">Purchase Price per Unit</label>
            <input type="number" id="inv-price" placeholder="0.00" value={purchasePrice} onChange={e => setPurchasePrice(+e.target.value)} required min="0" step="any" className="mt-1 block w-full bg-background border border-surface-accent rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
        </div>
         <div>
            <label htmlFor="inv-date" className="block text-sm font-medium text-text-secondary">Purchase Date</label>
            <input type="date" id="inv-date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} required className="mt-1 block w-full bg-background border border-surface-accent rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
        </div>
        <div className="flex justify-end pt-4 space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-primary bg-surface-accent rounded-md hover:bg-surface-accent/80">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover">{investment ? 'Update' : 'Add'}</button>
        </div>
    </form>
  );
};

export const InvestmentsPage: React.FC = () => {
  const { investments, deleteInvestment, setInvestments } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);

  const handleEdit = (inv: Investment) => {
    setEditingInvestment(inv);
    setIsModalOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingInvestment(null);
    setIsModalOpen(true);
  };

  const handleRefreshPrices = async () => {
    setInvestments(prev => prev.map(inv => ({ ...inv, isFetchingPrice: true })));
    const pricePromises = investments.map(async (inv) => {
        const price = await fetchCurrentInvestmentPrice(inv.name);
        return { ...inv, currentPrice: price ?? inv.currentPrice, isFetchingPrice: false };
    });
    const updatedInvestments = await Promise.all(pricePromises);
    setInvestments(updatedInvestments);
  };

  const formatRupees = (amount: number) => {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-text-primary">Investments</h1>
        <div className="flex items-center space-x-2">
             <button onClick={handleRefreshPrices} className="flex items-center px-4 py-2 text-sm font-medium text-text-primary bg-surface-accent rounded-md hover:bg-surface-accent/80">
                <SparklesIcon className="mr-2"/> Refresh Prices
            </button>
            <button onClick={handleAddNew} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover">
                <PlusCircleIcon className="mr-2 h-5 w-5" /> Add New
            </button>
        </div>
      </div>
       <p className="text-sm text-warning bg-warning/10 p-3 rounded-md">Disclaimer: Investment prices for Indian assets are retrieved by an AI and may not be 100% accurate. Do not use for real financial decisions.</p>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingInvestment ? 'Edit Investment' : 'Add New Investment'}>
        <InvestmentForm onClose={() => setIsModalOpen(false)} investment={editingInvestment} />
      </Modal>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {investments.length > 0 ? investments.map(inv => {
          const totalValue = inv.quantity * inv.purchasePrice;
          const currentValue = inv.currentPrice ? inv.quantity * inv.currentPrice : null;
          const profitLoss = currentValue !== null ? currentValue - totalValue : null;
          const profitLossPercent = profitLoss !== null && totalValue > 0 ? (profitLoss / totalValue) * 100 : 0;
          const profitColor = profitLoss === null ? 'text-text-secondary' : profitLoss >= 0 ? 'text-positive' : 'text-negative';

          return (
            <div key={inv.id} className="bg-surface p-5 rounded-xl border border-surface-accent shadow-lg space-y-3 transition-all hover:border-primary/50">
              <div className="flex justify-between items-start">
                  <div>
                      <h3 className="text-xl font-bold text-text-primary">{inv.name}</h3>
                      <p className="text-sm text-text-secondary">{inv.quantity} units @ {formatRupees(inv.purchasePrice)}</p>
                  </div>
                   <div className="flex items-center space-x-3">
                        <button onClick={() => handleEdit(inv)} className="text-primary hover:text-primary-hover"><EditIcon /></button>
                        <button onClick={() => window.confirm("Are you sure?") && deleteInvestment(inv.id)} className="text-negative hover:text-negative/80"><TrashIcon /></button>
                    </div>
              </div>
              <div className="border-t border-surface-accent pt-3 space-y-2">
                 <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Total Invested</span>
                    <span className="font-medium text-text-primary">{formatRupees(totalValue)}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Current Value</span>
                    {inv.isFetchingPrice ? <div className="w-16 h-4 bg-surface-accent rounded animate-pulse"></div> : <span className="font-medium text-text-primary">{currentValue !== null ? formatRupees(currentValue) : 'N/A'}</span>}
                 </div>
                 <div className="flex justify-between text-sm mt-2 pt-2 border-t border-surface-accent/50">
                    <span className="text-text-secondary">Profit/Loss</span>
                    {inv.isFetchingPrice ? <div className="w-20 h-4 bg-surface-accent rounded animate-pulse"></div> : (
                        profitLoss !== null ? (
                            <span className={`font-bold ${profitColor}`}>
                                {profitLoss >= 0 ? '+' : ''}{formatRupees(profitLoss)} ({profitLossPercent.toFixed(2)}%)
                            </span>
                        ) : <span className="text-text-primary">N/A</span>
                    )}
                 </div>
              </div>
            </div>
          );
        }) : (
            <div className="col-span-full text-center py-16 text-text-secondary bg-surface rounded-xl border-2 border-dashed border-surface-accent">
                <p>No investments tracked yet.</p>
                <p className="text-sm">Click "Add New" to start tracking your portfolio.</p>
            </div>
        )}
      </div>
    </div>
  );
};
