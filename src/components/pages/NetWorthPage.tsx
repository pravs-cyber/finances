import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAppContext } from '../../contexts/AppContext';
import { TransactionType } from '../../types';
import useLocalStorage from '../../hooks/useLocalStorage';
import { BalanceIcon, EditIcon, PlusCircleIcon, TrashIcon } from '../ui/Icons';
import { Modal } from '../ui/Modal';

interface ManualEntry {
    id: string;
    name: string;
    value: number;
}

const formatRupees = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

const EntryForm: React.FC<{
    onClose: () => void;
    onSave: (entry: Omit<ManualEntry, 'id'>) => void;
    entry?: ManualEntry | null;
    type: 'Asset' | 'Liability';
}> = ({ onClose, onSave, entry, type }) => {
    const [name, setName] = useState(entry?.name || '');
    const [value, setValue] = useState(entry?.value || 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, value });
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="entry-name" className="block text-sm font-medium text-text-secondary">{type} Name</label>
                <input type="text" id="entry-name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full bg-background border border-surface-accent rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
            </div>
            <div>
                <label htmlFor="entry-value" className="block text-sm font-medium text-text-secondary">Value</label>
                <input type="number" id="entry-value" value={value} onChange={e => setValue(+e.target.value)} required min="0" step="any" className="mt-1 block w-full bg-background border border-surface-accent rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
            </div>
            <div className="flex justify-end pt-4 space-x-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-primary bg-surface-accent rounded-md hover:bg-surface-accent/80">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover">{entry ? 'Update' : 'Add'} {type}</button>
            </div>
        </form>
    );
};


export const NetWorthPage: React.FC = () => {
    const { transactions, investments, userEmail } = useAppContext();
    const [assets, setAssets] = useLocalStorage<ManualEntry[]>(`networth_assets_${userEmail}`, []);
    const [liabilities, setLiabilities] = useLocalStorage<ManualEntry[]>(`networth_liabilities_${userEmail}`, []);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'Asset' | 'Liability'>('Asset');
    const [editingEntry, setEditingEntry] = useState<ManualEntry | null>(null);

    const { bankBalance, investmentValue, totalAssets, totalLiabilities, netWorth } = useMemo(() => {
        const balance = transactions.reduce((acc, t) => acc + (t.type === TransactionType.INCOME ? t.amount : -t.amount), 0);
        const invValue = investments.reduce((acc, inv) => acc + (inv.currentPrice ? inv.quantity * inv.currentPrice : inv.quantity * inv.purchasePrice), 0);
        const manualAssetsValue = assets.reduce((acc, asset) => acc + asset.value, 0);
        const manualLiabilitiesValue = liabilities.reduce((acc, liability) => acc + liability.value, 0);

        const tAssets = balance + invValue + manualAssetsValue;
        const tLiabilities = manualLiabilitiesValue;
        
        return {
            bankBalance: balance,
            investmentValue: invValue,
            totalAssets: tAssets,
            totalLiabilities: tLiabilities,
            netWorth: tAssets - tLiabilities,
        };
    }, [transactions, investments, assets, liabilities]);

    const historicalData = useMemo(() => {
        if (transactions.length === 0) return [];
        const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const dataMap = new Map<string, number>();
        let currentBalance = 0;

        for (const t of sortedTransactions) {
            currentBalance += t.type === TransactionType.INCOME ? t.amount : -t.amount;
            dataMap.set(t.date, currentBalance);
        }

        return Array.from(dataMap.entries()).map(([date, balance]) => ({
            date,
            'Bank Balance': balance,
            'Net Worth': balance + investmentValue + assets.reduce((a, b) => a + b.value, 0) - liabilities.reduce((a, b) => a + b.value, 0),
        }));
    }, [transactions, investmentValue, assets, liabilities]);

    const handleOpenModal = (type: 'Asset' | 'Liability', entry: ManualEntry | null = null) => {
        setModalType(type);
        setEditingEntry(entry);
        setIsModalOpen(true);
    };
    
    const handleSaveEntry = (entry: Omit<ManualEntry, 'id'>) => {
        const collection = modalType === 'Asset' ? assets : liabilities;
        const setCollection = modalType === 'Asset' ? setAssets : setLiabilities;

        if (editingEntry) {
            setCollection(collection.map(e => e.id === editingEntry.id ? { ...e, ...entry } : e));
        } else {
            setCollection([...collection, { ...entry, id: crypto.randomUUID() }]);
        }
    };
    
    const handleDeleteEntry = (type: 'Asset' | 'Liability', id: string) => {
        if(type === 'Asset') setAssets(assets.filter(a => a.id !== id));
        else setLiabilities(liabilities.filter(l => l.id !== id));
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-text-primary">Net Worth</h1>
                <div className="bg-surface p-3 rounded-xl border border-surface-accent flex items-center space-x-3">
                    <BalanceIcon className="w-8 h-8 text-primary" />
                    <div>
                        <h3 className="text-sm font-medium text-text-secondary">Total Net Worth</h3>
                        <p className={`text-3xl font-bold ${netWorth >= 0 ? 'text-text-primary' : 'text-negative'}`}>{formatRupees(netWorth)}</p>
                    </div>
                </div>
            </div>

            <div className="bg-surface p-6 rounded-xl border border-surface-accent h-96">
                 <h3 className="text-lg font-semibold text-text-primary mb-4">Historical Growth</h3>
                {historicalData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="90%">
                        <LineChart data={historicalData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <XAxis dataKey="date" stroke="var(--chart-axis-stroke)" fontSize={12} />
                            <YAxis stroke="var(--chart-axis-stroke)" fontSize={12} tickFormatter={(value) => new Intl.NumberFormat('en-IN', { notation: 'compact', compactDisplay: 'short' }).format(value as number)} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--chart-tooltip-bg)', border: `1px solid var(--chart-tooltip-border)`}} />
                            <Legend />
                            <Line type="monotone" dataKey="Net Worth" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="Bank Balance" stroke="var(--color-positive)" strokeWidth={1} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-full text-text-secondary">Add transactions to see your net worth history.</div>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-surface p-6 rounded-xl border border-surface-accent">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-text-primary">Assets ({formatRupees(totalAssets)})</h3>
                        <button onClick={() => handleOpenModal('Asset')} className="flex items-center text-sm font-medium text-primary hover:underline">
                            <PlusCircleIcon className="mr-1 h-5 w-5" /> Add Asset
                        </button>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between p-2 rounded-md bg-surface-accent/30"><span className="font-medium">Bank Balance</span><span>{formatRupees(bankBalance)}</span></div>
                        <div className="flex justify-between p-2 rounded-md bg-surface-accent/30"><span className="font-medium">Investment Value</span><span>{formatRupees(investmentValue)}</span></div>
                        {assets.map(asset => (
                            <div key={asset.id} className="flex justify-between p-2 rounded-md bg-surface-accent/30 items-center group">
                                <span className="font-medium">{asset.name}</span>
                                <div className="flex items-center space-x-3">
                                    <span>{formatRupees(asset.value)}</span>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-2">
                                        <button onClick={() => handleOpenModal('Asset', asset)} className="text-text-secondary hover:text-primary"><EditIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteEntry('Asset', asset.id)} className="text-text-secondary hover:text-negative"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-surface p-6 rounded-xl border border-surface-accent">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-text-primary">Liabilities ({formatRupees(totalLiabilities)})</h3>
                        <button onClick={() => handleOpenModal('Liability')} className="flex items-center text-sm font-medium text-primary hover:underline">
                             <PlusCircleIcon className="mr-1 h-5 w-5" /> Add Liability
                        </button>
                    </div>
                     <div className="space-y-2">
                        {liabilities.map(lia => (
                             <div key={lia.id} className="flex justify-between p-2 rounded-md bg-surface-accent/30 items-center group">
                                <span className="font-medium">{lia.name}</span>
                                <div className="flex items-center space-x-3">
                                    <span>{formatRupees(lia.value)}</span>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-2">
                                        <button onClick={() => handleOpenModal('Liability', lia)} className="text-text-secondary hover:text-primary"><EditIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteEntry('Liability', lia.id)} className="text-text-secondary hover:text-negative"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {liabilities.length === 0 && <p className="text-center text-sm text-text-secondary py-4">No liabilities added.</p>}
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={`${editingEntry ? 'Edit' : 'Add'} ${modalType}`}
            >
                <EntryForm 
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveEntry}
                    entry={editingEntry}
                    type={modalType}
                />
            </Modal>
        </div>
    );
};
