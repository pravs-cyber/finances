import React, { useState, useMemo } from 'react';
import { User } from '../../types';
import { EyeIcon, EyeOffIcon } from '../ui/Icons';

// FIX: Add missing RegisterPageProps interface definition.
interface RegisterPageProps {
  onRegister: (user: User) => void;
  onSwitchToLogin: () => void;
  users: User[];
}

const PasswordRequirement: React.FC<{ isValid: boolean; text: string }> = ({ isValid, text }) => (
    <div className={`flex items-center text-xs transition-colors ${isValid ? 'text-positive' : 'text-text-secondary'}`}>
        <span className={`mr-1.5 font-mono`}>{isValid ? '✓' : '•'}</span>
        <span>{text}</span>
    </div>
);

export const RegisterPage: React.FC<RegisterPageProps> = ({ onRegister, onSwitchToLogin, users }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const passwordValidation = useMemo(() => {
    return {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        specialChar: /[^A-Za-z0-9]/.test(password),
    };
  }, [password]);

  const isPasswordValid = Object.values(passwordValidation).every(Boolean);
  const isFormValid = isPasswordValid && email.trim() !== '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isFormValid) {
        if (!isPasswordValid) setError("Please ensure your password meets all requirements.");
        else setError("Please fill out all fields correctly.");
        return;
    }

    if (users.some(u => u.email === email)) {
      setError("An account with this email already exists.");
      return;
    }
    
    onRegister({ email, password });
    setSuccess("Registration successful! Please log in.");
    
    setTimeout(() => {
        onSwitchToLogin();
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-surface rounded-2xl shadow-lg border border-surface-accent">
        <div className="flex flex-col items-center">
          <h2 className="mt-4 text-3xl font-extrabold text-center text-text-primary">Create your Account</h2>
          <p className="mt-2 text-center text-sm text-text-secondary">Join Finan-AI and take control of your finances</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <p className="text-sm text-center text-negative bg-negative/10 p-3 rounded-md">{error}</p>}
          {success && <p className="text-sm text-center text-positive bg-positive/10 p-3 rounded-md">{success}</p>}
          <div className="rounded-md shadow-sm space-y-4">
            <input
              id="email"
              name="email"
              type="email"
              required
              className="appearance-none relative block w-full px-3 py-3 border border-surface-accent bg-background text-text-primary placeholder-text-secondary focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm rounded-lg"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                className="appearance-none relative block w-full pl-3 pr-10 py-3 border border-surface-accent bg-background text-text-primary placeholder-text-secondary focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm rounded-lg"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-text-secondary">
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {password && (
              <div className="p-3 bg-surface-accent/30 rounded-lg grid grid-cols-2 gap-x-4 gap-y-1">
                <PasswordRequirement isValid={passwordValidation.length} text="At least 8 characters" />
                <PasswordRequirement isValid={passwordValidation.uppercase} text="One uppercase letter" />
                <PasswordRequirement isValid={passwordValidation.lowercase} text="One lowercase letter" />
                <PasswordRequirement isValid={passwordValidation.number} text="One number" />
                <PasswordRequirement isValid={passwordValidation.specialChar} text="One special character" />
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={!isFormValid || !!success}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Register
            </button>
          </div>
        </form>
        <p className="text-sm text-center text-text-secondary">
          Already have an account?{' '}
          <button onClick={onSwitchToLogin} className="font-medium text-primary hover:underline">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};