import React, { useState } from 'react';
import { User } from '../../types';
import { EyeIcon, EyeOffIcon } from '../ui/Icons';

interface LoginPageProps {
  onLogin: (user: User) => void;
  onSwitchToRegister: () => void;
  users: User[];
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onSwitchToRegister, users }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      onLogin(user);
    } else {
      setError('Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-surface rounded-2xl shadow-lg border border-surface-accent">
        <div className="flex flex-col items-center">
          <h2 className="mt-4 text-3xl font-extrabold text-center text-text-primary">Welcome Back!</h2>
          <p className="mt-2 text-center text-sm text-text-secondary">Sign in to continue to Finan-AI</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <p className="text-sm text-center text-negative bg-negative/10 p-3 rounded-md">{error}</p>}
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-3 py-3 border border-surface-accent bg-background text-text-primary placeholder-text-secondary focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm rounded-lg"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
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
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background"
            >
              Sign in
            </button>
          </div>
        </form>
        <p className="text-sm text-center text-text-secondary">
          Don't have an account?{' '}
          <button onClick={onSwitchToRegister} className="font-medium text-primary hover:underline">
            Register here
          </button>
        </p>
      </div>
    </div>
  );
};
