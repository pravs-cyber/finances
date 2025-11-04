import { GoogleGenAI, GenerateContentResponse, Type, FunctionDeclaration } from "@google/genai";
import { ChatMessage, GeminiModel, Transaction, Investment, Budget, Goal, TransactionType, Category } from '../types';

// This is a placeholder check. In a real environment, the key would be set.
const apiKey = import.meta.env.VITE_API_KEY;
if (!apiKey) {
    console.warn("VITE_API_KEY environment variable not set. Gemini API calls may fail.");
}

const getAiClient = () => new GoogleGenAI({ apiKey: apiKey! });

export const addTransactionTool: FunctionDeclaration = {
    name: "addTransaction",
    description: "Adds a new income or expense transaction to the user's financial records.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            description: {
                type: Type.STRING,
                description: "The description of the transaction (e.g., 'Groceries', 'Monthly Salary')."
            },
            amount: {
                type: Type.NUMBER,
                description: "The numerical amount of the transaction. Must be a positive number."
            },
            type: {
                type: Type.STRING,
                description: "The type of transaction, must be either 'income' or 'expense'."
            },
            categoryId: {
                type: Type.STRING,
                description: "The ID of the category this transaction belongs to."
            },
            date: {
                type: Type.STRING,
                description: "The date of the transaction in YYYY-MM-DD format. If not provided, use today's date."
            }
        },
        required: ["description", "amount", "type", "categoryId"]
    }
};

interface GenerateChatResponseConfig {
    useSearch?: boolean;
    useThinking?: boolean;
    useActions?: boolean;
    categories?: {id: string; name: string}[];
}

export const generateChatResponse = async (
    prompt: string,
    history: ChatMessage[],
    model: GeminiModel,
    config: GenerateChatResponseConfig,
): Promise<GenerateContentResponse> => {
    try {
        const ai = getAiClient();
        const fullContents = [...history, { role: 'user', parts: [{ text: prompt }] }];
        
        let systemInstruction = "You are Fin, a helpful and friendly financial assistant for students in India. Your tone is conversational and encouraging, not robotic. The user's currency is Indian Rupees (₹). You only answer questions related to finance, budgeting, and investments. For other topics, politely state that you can only help with financial matters. Avoid using markdown formatting like bolding unless absolutely necessary for clarity.";
        if (config.useActions && config.categories) {
            systemInstruction = `You are an action-oriented financial assistant for a student in India. The user's currency is Indian Rupees (₹). Your only job is to execute actions using the provided tools. Do not engage in conversation.
            When adding a transaction, if the category is not provided, you MUST ask for it.
            Here is a list of available categories and their IDs: ${JSON.stringify(config.categories)}. Use the appropriate categoryId.
            If the user provides a category name that does not exist, ask them to choose from the available list.
            Today's date is ${new Date().toISOString().split('T')[0]}. Use this if the user doesn't specify a date.`;
        }


        const response = await ai.models.generateContent({
            model: model,
            contents: fullContents,
            config: {
                systemInstruction,
                ...(config.useSearch && { tools: [{ googleSearch: {} }] }),
                ...(config.useThinking && { thinkingConfig: { thinkingBudget: 32768 } }),
                ...(config.useActions && { tools: [{ functionDeclarations: [addTransactionTool] }] }),
            }
        });
        return response;
    } catch (error) {
        console.error("Error generating chat response:", error);
        throw error;
    }
};

export const parseDataFromTextFile = async (fileContent: string): Promise<Partial<Transaction>[]> => {
    const prompt = `
        You are a data parsing expert. Parse the following text, which contains financial transactions from a CSV or plain text file. The format might be messy.
        Your goal is to extract the date, description, and amount for each transaction.

        **Instructions:**
        1.  **Infer Columns:** Column headers might be missing or unclear. Infer them from the data itself (e.g., a column with dates is the 'date' column).
        2.  **Date:** Standardize all dates to YYYY-MM-DD format.
        3.  **Description:** Find the most likely description column.
        4.  **Amount & Type:**
            *   There might be separate 'debit' and 'credit' columns, or a single 'amount' column.
            *   If there's one amount column, negative values are 'expense', positive are 'income'.
            *   If there are debit/credit columns, use the appropriate value and set the type to 'expense' for debits and 'income' for credits.
            *   The final 'amount' in the JSON should ALWAYS be a positive number.
        
        Return a valid JSON array of objects. Each object must have 'date', 'description', 'amount', and 'type' keys. If you cannot determine a value for a required field in a row, skip that row.

        Content:
        ---
        ${fileContent}
        ---
    `;

    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: GeminiModel.FLASH,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            date: { type: Type.STRING, description: "Transaction date in YYYY-MM-DD format" },
                            description: { type: Type.STRING, description: "Transaction description" },
                            amount: { type: Type.NUMBER, description: "Transaction amount (always positive)" },
                            type: { type: Type.STRING, description: "Either 'income' or 'expense'" }
                        },
                        required: ["date", "description", "amount", "type"]
                    }
                }
            }
        });
        
        const parsedJson = JSON.parse(response.text);
        if (Array.isArray(parsedJson)) {
            return parsedJson.filter(item => item.amount && item.description && item.date && item.type);
        }
        return [];

    } catch (error) {
        console.error("Error parsing data from file:", error);
        throw new Error("AI failed to parse the file. The file might be in an unsupported format or too complex.");
    }
};

export const parseDataFromXlsxFile = async (base64Content: string): Promise<Partial<Transaction>[]> => {
    const prompt = `
        You are an expert data analyst. The following is a base64-encoded XLSX spreadsheet file containing financial transactions.
        Analyze the spreadsheet data and extract the date, description, and amount for each transaction. The data may be in any sheet and not perfectly formatted.

        **Instructions:**
        1.  **Find the Data:** Locate the block of cells that contains the transaction records.
        2.  **Infer Columns:** Identify columns for date, description, and amount. Debit/credit might be in separate columns.
        3.  **Date:** Standardize dates to YYYY-MM-DD format.
        4.  **Amount & Type:** Determine the transaction type ('income' or 'expense') and ensure the final 'amount' is a positive number.
        
        Return a valid JSON array of transaction objects. Each object must have 'date', 'description', 'amount', and 'type' keys. Skip any invalid rows.
    `;
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: GeminiModel.FLASH,
            contents: {
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                            data: base64Content
                        }
                    }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            date: { type: Type.STRING },
                            description: { type: Type.STRING },
                            amount: { type: Type.NUMBER },
                            type: { type: Type.STRING }
                        },
                        required: ["date", "description", "amount", "type"]
                    }
                }
            }
        });
        const parsedJson = JSON.parse(response.text);
        if (Array.isArray(parsedJson)) {
            return parsedJson.filter(item => item.amount && item.description && item.date && item.type);
        }
        return [];
    } catch (error) {
        console.error("Error parsing XLSX file:", error);
        throw new Error("AI failed to parse the XLSX file. Please ensure it contains valid transaction data and try again.");
    }
};

export const analyzeSpending = async (transactions: Transaction[], categories: {id: string, name: string}[]): Promise<string> => {
    const prompt = `
        As Fin, a friendly financial advisor for students in India, analyze the following spending data. The currency is Indian Rupees (₹).
        Provide a concise, conversational report. Avoid a robotic tone and excessive markdown.
        
        The report should include:
        1. A brief, friendly summary of total income vs. total expenses.
        2. An analysis of the top 3 spending categories.
        3. One or two actionable, student-friendly tips on how to save money.
        
        Keep the tone encouraging and easy to understand.
        
        Transactions:
        ---
        ${JSON.stringify(transactions.map(t => ({...t, categoryName: categories.find(c => c.id === t.categoryId)?.name || 'Uncategorized'})))}
        ---
    `;
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: GeminiModel.PRO,
            contents: prompt,
        });
        return response.text;
    } catch (error)
 {
        console.error("Error analyzing spending:", error);
        throw new Error("AI analysis failed. Please try again later.");
    }
};

export const analyzeMonthlyComparison = async (
    currentMonthStats: { income: number; expenses: number; categoryExpenses: any; },
    previousMonthStats: { income: number; expenses: number; categoryExpenses: any; }
): Promise<string> => {
    const prompt = `
        As Fin, a friendly financial advisor for a student in India, analyze the following month-over-month financial summary. The currency is Indian Rupees (₹).
        
        Provide a short, conversational summary (2-3 sentences) of their progress.
        - Highlight the change in savings (income - expenses).
        - Point out one category where they improved (spent less).
        - Gently mention one category where they spent more.
        
        Keep the tone encouraging. For example: "Great job this month! You saved ₹X more than last month. I see you cut back on [Category], which is awesome. Just keep an eye on your [Category] spending."

        **Data:**
        ---
        **Current Month:**
        ${JSON.stringify(currentMonthStats)}

        **Previous Month:**
        ${JSON.stringify(previousMonthStats)}
        ---
    `;

    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({ model: GeminiModel.FLASH, contents: prompt });
        return response.text;
    } catch (error) {
        console.error("Error analyzing monthly comparison:", error);
        throw new Error("AI analysis of monthly data failed.");
    }
};

export const fetchCurrentInvestmentPrice = async (investmentName: string): Promise<number | null> => {
    const prompt = `What is the latest stock price or NAV for "${investmentName}" in INR? Provide only the numerical value, nothing else.`;
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: GeminiModel.FLASH,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });
        const numericMatch = response.text.match(/[\d,.]+/);
        if (numericMatch) {
            return parseFloat(numericMatch[0].replace(/,/g, ''));
        }
        return null;
    } catch (error) {
        console.error(`Error fetching price for ${investmentName}:`, error);
        return null;
    }
};

export const getPersonalizedInsights = async (
    transactions: Transaction[],
    investments: Investment[],
    budgets: Budget[],
    goals: Goal[],
    categories: {id: string, name: string}[]
): Promise<string> => {
    const prompt = `
        You are Fin, a helpful and encouraging financial advisor for a student in India. Their currency is Indian Rupees (₹). Analyze their complete financial situation based on the data below and provide personalized insights.

        **Your analysis should be:**
        - **Conversational and Friendly:** Talk to the user like a helpful friend, not a robot.
        - **Concise:** Use short paragraphs or bullet points.
        - **Actionable:** Give specific, simple tips.
        - **No Markdown:** Do not use bolding or other markdown formatting.

        **Cover these points:**
        1.  **Spending Habits:** Review their spending against their budgets. Mention one category where they're doing well and one where they could improve, offering a simple tip for the latter.
        2.  **Investment Performance:** Briefly comment on their investments. Offer encouragement regardless of performance.
        3.  **Goal Progress:** Provide a motivational tip to help them reach their most important goal.
        4.  **Overall Tip:** Give one general, student-focused financial tip.

        **User's Financial Data:**
        ---
        **Transactions (last 30 days):**
        ${JSON.stringify(transactions.map(t => ({...t, categoryName: categories.find(c => c.id === t.categoryId)?.name || 'Uncategorized'})).slice(-50))}
        
        **Investments:**
        ${JSON.stringify(investments)}

        **Budgets:**
        ${JSON.stringify(budgets.map(b => ({...b, categoryName: categories.find(c => c.id === b.categoryId)?.name || 'Uncategorized'})))}

        **Goals:**
        ${JSON.stringify(goals)}
        ---
    `;

    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: GeminiModel.PRO,
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error generating personalized insights:", error);
        throw new Error("AI analysis failed. Please try again later.");
    }
};

export const suggestCategoryForTransaction = async (description: string, categories: Category[]): Promise<{ categoryId: string; type: TransactionType } | null> => {
    const expenseCategories = categories.filter(c => c.type === TransactionType.EXPENSE).map(c => ({ id: c.id, name: c.name }));
    const incomeCategories = categories.filter(c => c.type === TransactionType.INCOME).map(c => ({ id: c.id, name: c.name }));

    const prompt = `
        Given the transaction description "${description}", which of the following categories is the most appropriate?
        First, determine if it is an income or expense. Then, choose the best fit from the corresponding list.

        Available Expense Categories:
        ${JSON.stringify(expenseCategories)}

        Available Income Categories:
        ${JSON.stringify(incomeCategories)}

        Respond with only the JSON object containing the ID of the most suitable category. For example: {"categoryId": "some-id"}
    `;

    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: GeminiModel.FLASH,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        categoryId: { type: Type.STRING }
                    },
                    required: ["categoryId"]
                }
            }
        });
        const result = JSON.parse(response.text);
        const foundCategory = categories.find(c => c.id === result.categoryId);

        if (foundCategory) {
            return { categoryId: foundCategory.id, type: foundCategory.type };
        }
        return null;
    } catch (error) {
        console.error("Error suggesting category:", error);
        return null;
    }
};

export const parseTransactionsFromImage = async (
    base64Image: string,
    mimeType: string,
    categories: Category[],
    userPrompt: string
): Promise<(Omit<Transaction, 'id' | 'type'> & { type: TransactionType | string })[]> => {
    const prompt = `
        You are an expert data extractor from images. Analyze the provided image of financial transactions (like a receipt or bank statement screenshot).

        **Primary Goal:** Extract EVERY distinct transaction from the image. It is critical that you return ALL transactions you can find, not just the first one.

        **User's Instructions:** The user may provide additional text instructions. You MUST follow them.
        User's text input: "${userPrompt}"
        (If the input is empty, there are no special instructions).
        Example instructions could be "ignore the Netflix charge" or "the coffee was for personal, not business". You must adjust your output based on these instructions.

        For each transaction, determine:
        1. 'description': A concise description of the item or service.
        2. 'amount': The total cost, as a positive number.
        3. 'date': The date of the transaction in YYYY-MM-DD format. If no date is found, use today's date: ${new Date().toISOString().split('T')[0]}.
        4. 'categoryId': Based on the description, find the MOST appropriate category ID from the list provided below.
        
        User's Categories:
        ---
        ${JSON.stringify(categories.map(c => ({ id: c.id, name: c.name, type: c.type })))}
        ---

        Return a valid JSON array of transaction objects. Each object must have 'description', 'amount', 'date', and 'categoryId'.
        If you cannot confidently extract a transaction, or if the user instructed you to ignore it, omit it from the final array.
    `;

    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: GeminiModel.FLASH,
            contents: {
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType, data: base64Image } }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            description: { type: Type.STRING },
                            amount: { type: Type.NUMBER },
                            date: { type: Type.STRING },
                            categoryId: { type: Type.STRING }
                        },
                        required: ["description", "amount", "date", "categoryId"]
                    }
                }
            }
        });
        
        const parsedJson = JSON.parse(response.text);
        if (Array.isArray(parsedJson)) {
            return parsedJson.map(t => {
                const category = categories.find(c => c.id === t.categoryId);
                return { ...t, type: category?.type || TransactionType.EXPENSE };
            });
        }
        return [];
    } catch (error) {
        console.error("Error parsing transactions from image:", error);
        throw new Error("AI failed to read the transactions from the image. Please try a clearer image.");
    }
};
