// Simple currency utility functions

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AUD', symbol: '$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: '$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
];

// Fixed exchange rates (relative to USD)
// In a real app, these would be fetched from an API like exchangerate-api.com
export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.50,
  CNY: 7.24,
  INR: 83.12,
  AUD: 1.52,
  CAD: 1.36,
  CHF: 0.88,
  MXN: 17.05,
};

export const formatCurrency = (amount: number, currencyCode: string = 'USD'): string => {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  if (!currency) return `${amount.toFixed(2)} ${currencyCode}`;
  
  return `${currency.symbol}${amount.toFixed(2)} ${currencyCode}`;
};

export const convertCurrency = (
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number => {
  if (fromCurrency === toCurrency) return amount;
  
  // Convert to USD first
  const amountInUSD = amount / (EXCHANGE_RATES[fromCurrency] || 1);
  
  // Then convert to target currency
  return amountInUSD * (EXCHANGE_RATES[toCurrency] || 1);
};

export const getCurrencySymbol = (currencyCode: string): string => {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  return currency?.symbol || currencyCode;
};
