import React, { useState, useRef, useEffect, useMemo } from 'react';
import { generateChatResponse, addTransactionTool, parseTransactionsFromImage } from '../../services/geminiService';
import { ChatMessage, GeminiModel, Transaction, TransactionType, ChatMode } from '../../types';
import { SendIcon, UserIcon, BotIcon, ZapIcon, GlobeIcon, BrainCircuitIcon, Wand2Icon, PaperclipIcon, CloseIcon } from '../ui/Icons';
import { Spinner } from '../ui/Spinner';
import { useAppContext } from '../../contexts/AppContext';

type PendingTransaction = Omit<Transaction, 'id' | 'type'> & { type: TransactionType | string };

const ChatModeSelector: React.FC<{ selected: ChatMode, onSelect: (mode: ChatMode) => void }> = ({ selected, onSelect }) => {
    const modes: { id: ChatMode; label: string; icon: React.ReactNode; description: string; model: string; }[] = [
        { id: 'quick', label: 'Quick', icon: <ZapIcon />, description: 'Fast answers for simple questions.', model: 'Flash-Lite' },
        { id: 'search', label: 'Up-to-Date', icon: <GlobeIcon />, description: 'Accesses Google for current info.', model: 'Flash' },
        { id: 'thinking', label: 'Deep Analysis', icon: <BrainCircuitIcon />, description: 'For complex problems & reasoning.', model: 'Pro' },
        { id: 'actions', label: 'Actions', icon: <Wand2Icon />, description: 'Perform tasks like adding transactions.', model: 'Flash' }
    ];

    return (
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 p-2 bg-surface rounded-lg border border-surface-accent">
            {modes.map(mode => (
                <button
                    key={mode.id}
                    onClick={() => onSelect(mode.id)}
                    className={`flex-1 p-3 rounded-md text-left transition-all duration-200 ${selected === mode.id ? 'bg-primary text-white' : 'bg-surface-accent hover:bg-surface-accent/80 text-text-secondary'}`}
                >
                    <div className="flex items-center">
                        {mode.icon}
                        <span className="font-bold ml-2 text-sm">{mode.label}</span>
                    </div>
                    <p className={`text-xs mt-1 ${selected === mode.id ? 'text-primary-200': 'text-text-secondary'}`}>{mode.description}</p>
                </button>
            ))}
        </div>
    );
};

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const ChatPage: React.FC = () => {
    const { chatHistories, setChatHistories, addTransaction, addMultipleTransactions, categories } = useAppContext();
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState<ChatMode>('quick');
    const [stagedImage, setStagedImage] = useState<{ file: File; previewUrl: string } | null>(null);
    const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[] | null>(null);

    const messages = useMemo(() => chatHistories[mode] || [], [chatHistories, mode]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);
    
    const handleImageFile = (file: File) => {
        if (!file || isLoading || mode !== 'actions') return;
        if (stagedImage) URL.revokeObjectURL(stagedImage.previewUrl);
        const previewUrl = URL.createObjectURL(file);
        setStagedImage({ file, previewUrl });
    };

    const handlePaste = (event: React.ClipboardEvent) => {
        if (mode !== 'actions' || stagedImage) return;
        const file = Array.from(event.clipboardData.items).find(item => item.type.startsWith('image/'))?.getAsFile();
        if (file) {
            event.preventDefault();
            handleImageFile(file);
        }
    };

    const updateCurrentModeHistory = (newMessages: ChatMessage[]) => {
        setChatHistories(prev => {
            const currentHistory = prev[mode] || [];
            return {
                ...prev,
                [mode]: [...currentHistory, ...newMessages]
            }
        });
    };

    const handleSend = async () => {
        if ((!input.trim() && !stagedImage) || isLoading) return;
        
        setIsLoading(true);
        setPendingTransactions(null);

        const currentInput = input;
        const currentStagedImage = stagedImage;
        setInput('');
        setStagedImage(null);

        try {
            if (currentStagedImage) {
                const userMessageText = currentInput.trim() ? `[Image Attached] ${currentInput}` : '[Image Attached]';
                updateCurrentModeHistory([{ role: 'user', parts: [{ text: userMessageText }] }]);
                
                const base64Image = await blobToBase64(currentStagedImage.file);
                const transactions = await parseTransactionsFromImage(base64Image, currentStagedImage.file.type, categories, currentInput);
                
                if (transactions.length > 0) {
                    setPendingTransactions(transactions);
                    const transactionList = transactions.map(t => `- ${t.description} (${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(t.amount)})`).join('\n');
                    const confirmationMessage: ChatMessage = { role: 'model', parts: [{ text: `I found ${transactions.length} transaction(s):\n\n${transactionList}\n\nShould I add them?` }] };
                    updateCurrentModeHistory([confirmationMessage]);
                } else {
                    updateCurrentModeHistory([{ role: 'model', parts: [{ text: "I couldn't find any valid transactions based on your image and instructions." }] }]);
                }
            } else {
                const userMessage: ChatMessage = { role: 'user', parts: [{ text: currentInput }] };
                updateCurrentModeHistory([userMessage]);
                
                const { model, config } = {
                    quick: { model: GeminiModel.FLASH_LITE, config: {} },
                    search: { model: GeminiModel.FLASH, config: { useSearch: true } },
                    thinking: { model: GeminiModel.PRO, config: { useThinking: true } },
                    actions: { model: GeminiModel.FLASH, config: { useActions: true, categories } }
                }[mode];
    
                const response = await generateChatResponse(currentInput, messages, model, config);
                
                if (response.functionCalls && response.functionCalls.length > 0) {
                    const call = response.functionCalls[0];
                    if (call.name === 'addTransaction') {
                        const args = call.args as any;
                        addTransaction({ description: args.description, amount: args.amount, type: args.type as TransactionType, categoryId: args.categoryId, date: args.date || new Date().toISOString().split('T')[0] });
                        const formattedAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(args.amount);
                        const confirmationText = `✅ Transaction added: "${args.description}" for ${formattedAmount}.`;
                        updateCurrentModeHistory([{ role: 'model', parts: [{ text: confirmationText }] }]);
                    }
                } else {
                     const modelMessage: ChatMessage = { role: 'model', parts: [{ text: response.text }], groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks };
                    updateCurrentModeHistory([modelMessage]);
                }
            }
        } catch (error) {
            console.error("Chat error:", error);
            const errorMessage: ChatMessage = { role: 'model', parts: [{ text: (error as Error).message || "Sorry, I encountered an error. Please try again." }] };
            updateCurrentModeHistory([errorMessage]);
        } finally {
            setIsLoading(false);
            if (currentStagedImage) URL.revokeObjectURL(currentStagedImage.previewUrl);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSend();
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) handleImageFile(file);
    };

    const handleConfirmation = (confirm: boolean) => {
        if (confirm && pendingTransactions) {
            const validTransactions = pendingTransactions.map(t => ({...t, type: t.type as TransactionType}));
            addMultipleTransactions(validTransactions);
            updateCurrentModeHistory([{ role: 'model', parts: [{ text: `✅ Done! I've added ${pendingTransactions.length} transaction(s).` }] }]);
        } else {
            updateCurrentModeHistory([{ role: 'model', parts: [{ text: "Okay, I won't add them." }] }]);
        }
        setPendingTransactions(null);
    };

    const handleNewChat = () => {
        setChatHistories(prev => ({
            ...prev,
            [mode]: []
        }));
    };

    const placeholderText = useMemo(() => {
        if (mode === 'actions') {
            if (stagedImage) return "Add instructions for the image...";
            return 'Type command or paste an image...';
        }
        return 'Ask about budgeting, investments, or financial tips...';
    }, [mode, stagedImage]);

    return (
        <div className="h-full flex flex-col animate-fade-in" onPaste={handlePaste}>
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-text-primary mb-4">AI Chat Assistant</h1>
                <button onClick={handleNewChat} className="mb-4 text-sm text-primary hover:underline">New Chat</button>
            </div>
            <ChatModeSelector selected={mode} onSelect={setMode} />
            
            <div className="flex-1 overflow-y-auto my-4 pr-4 space-y-6">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'model' && <div className="flex-shrink-0 p-2 bg-primary rounded-full"><BotIcon className="w-6 h-6 text-white"/></div>}
                        <div className={`max-w-xl p-4 rounded-xl shadow-md ${msg.role === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-surface text-text-primary rounded-bl-none'}`}>
                            <p className="whitespace-pre-wrap">{msg.parts[0].text}</p>
                            {msg.groundingChunks?.length > 0 && (
                                <div className="mt-4 border-t border-surface-accent pt-2">
                                    <h4 className="text-xs font-semibold text-text-secondary mb-1">Sources:</h4>
                                    <ul className="text-xs space-y-1">{msg.groundingChunks.map((chunk: any, i: number) => chunk.web && <li key={i}><a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{chunk.web.title}</a></li>)}</ul>
                                </div>
                            )}
                        </div>
                        {msg.role === 'user' && <div className="flex-shrink-0 p-2 bg-surface-accent rounded-full"><UserIcon className="w-6 h-6 text-text-primary"/></div>}
                    </div>
                ))}
                {pendingTransactions && (
                    <div className="flex justify-center space-x-2">
                        <button onClick={() => handleConfirmation(true)} className="px-4 py-2 text-sm font-medium text-white bg-positive rounded-md hover:bg-positive/90">Yes, Add Them</button>
                        <button onClick={() => handleConfirmation(false)} className="px-4 py-2 text-sm font-medium text-white bg-negative rounded-md hover:bg-negative/90">No, Cancel</button>
                    </div>
                )}
                {isLoading && !pendingTransactions && (
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 p-2 bg-primary rounded-full"><BotIcon className="w-6 h-6 text-white"/></div>
                        <div className="max-w-xl p-4 rounded-xl bg-surface text-text-primary rounded-bl-none"><Spinner size="sm"/></div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="mt-auto">
                {stagedImage && (
                    <div className="p-2 bg-surface rounded-t-lg border border-b-0 border-surface-accent">
                        <div className="relative w-20 h-20">
                            <img src={stagedImage.previewUrl} alt="Image preview" className="w-full h-full object-cover rounded-md" />
                            <button onClick={() => setStagedImage(null)} className="absolute -top-2 -right-2 bg-negative text-white rounded-full p-0.5"><CloseIcon className="w-4 h-4" /></button>
                        </div>
                    </div>
                )}
                <form onSubmit={handleFormSubmit} className={`flex items-center p-2 bg-surface border border-surface-accent focus-within:border-primary transition-colors ${stagedImage ? 'rounded-b-lg' : 'rounded-lg'}`}>
                    {mode === 'actions' && (
                        <>
                            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading || !!stagedImage} className="p-2 text-text-secondary hover:text-primary disabled:opacity-50"><PaperclipIcon /></button>
                        </>
                    )}
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={placeholderText}
                        className="flex-1 bg-transparent text-text-primary placeholder-text-secondary focus:outline-none px-2"
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading || (!input.trim() && !stagedImage)} className="p-2 rounded-md bg-primary text-white hover:bg-primary-hover disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors"><SendIcon/></button>
                </form>
            </div>
        </div>
    );
};
