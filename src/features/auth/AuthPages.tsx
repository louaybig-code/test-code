import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Mail, Lock, User, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import logoWhite from '/studiopilot-white.png';
import logoDark from '/studiopilot-dark.png';
import { apiService } from '../../services/api';
import { OrganizationInvitation } from '../../types';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

/** Real StudioPilote logo for the auth card — white version (dark background) */
const AuthLogo: React.FC = () => (
  <div className="flex justify-center">
    <img
      src={logoWhite}
      alt="StudioPilote"
      className="h-20 w-auto object-contain"
      draggable={false}
    />
  </div>
);

export const AuthPages: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const { login, register: registerUser, loginAsDemo } = useAuth();

  // ── Invite token from URL (?invite=TOKEN) ──────────────────────────────────
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<OrganizationInvitation | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    if (!token) return;
    setInviteToken(token);
    // Look up the invitation so we can show the user what they're being invited to
    apiService.getInvitation(token)
      .then((inv) => setInviteInfo(inv))
      .catch(() => setInviteError('This invitation link is invalid or has expired.'));
  }, []);

  // After login/register, accept the invite then clean the URL
  const acceptPendingInvite = async (token: string) => {
    try {
      await apiService.acceptInvitationAuth(token);
      toast.success('Invitation accepted — welcome to the organisation!');
    } catch {
      // Non-fatal: user is already logged in, just show a soft warning
      toast.error('Could not accept invitation automatically. Please ask the admin to re-invite you.');
    }
    // Remove ?invite= from URL without a page reload
    const url = new URL(window.location.href);
    url.searchParams.delete('invite');
    window.history.replaceState({}, '', url.toString());
  };

  const {
    register: registerLogin,
    handleSubmit: handleSubmitLogin,
    formState: { errors: errorsLogin, isSubmitting: isSubmittingLogin },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const {
    register: registerReg,
    handleSubmit: handleSubmitReg,
    formState: { errors: errorsReg, isSubmitting: isSubmittingReg },
  } = useForm({ resolver: zodResolver(registerSchema) });

  const onLoginSubmit = async (data: any) => {
    try {
      await login(data.email, data.password);
      if (inviteToken) await acceptPendingInvite(inviteToken);
      toast.success('Bienvenue !');
    } catch (err: any) {
      const errorCode = err?.response?.data?.error?.code || err?.code;
      const errorMessage = err?.response?.data?.error?.message || err?.message;
      
      if (errorCode === 'UNAUTHORIZED' || errorMessage === 'Invalid credentials') {
        toast.error('Email ou mot de passe incorrect', {
          style: { background: '#DC2626', color: '#FFFFFF' },
          iconTheme: { primary: '#FFFFFF', secondary: '#DC2626' },
        });
      } else {
        toast.error(errorMessage || 'Erreur de connexion');
      }
    }
  };

  const onRegisterSubmit = async (data: any) => {
    try {
      await registerUser(data.email, data.password, data.firstName, data.lastName);
      if (inviteToken) await acceptPendingInvite(inviteToken);
      toast.success('Account created successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Error creating account');
    }
  };

  return (
    <div className="min-h-screen bg-[#131620] text-[#E8EAF0] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Brand glow effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#E8531A]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#1A8C8C]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#2C3147]/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md rounded-3xl
        bg-[#1C2033]/95
        border border-[#2E3450]
        p-8 shadow-2xl backdrop-blur-2xl space-y-6">

        {/* ── Brand ── */}
        <div className="text-cSenter space-y-3">
          <AuthLogo />
          <p className="text-xs text-[#8890A8]">
            {mode === 'login'
              ? 'Sign in to access your projects and workspaces.'
              : 'Create an account and launch your first project.'}
          </p>
        </div>

        {/* ── Invite banner ── */}
        {inviteError && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            <span className="mt-0.5">⚠</span>
            <span>{inviteError}</span>
          </div>
        )}
        {inviteInfo && !inviteError && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-[#1A8C8C]/10 border border-[#1A8C8C]/30">
            <CheckCircle className="w-4 h-4 text-[#1A8C8C] shrink-0 mt-0.5" />
            <div className="text-xs text-[#B0F0F0]">
              <p className="font-semibold text-[#E8EAF0]">You've been invited!</p>
              <p className="text-[#8890A8] mt-0.5">
                Sign in or create an account to join as <span className="font-semibold text-[#1A8C8C]">{inviteInfo.role}</span>.
                {inviteInfo.email && (
                  <> Use <span className="font-semibold text-[#E8EAF0]">{inviteInfo.email}</span> to accept.</>
                )}
              </p>
            </div>
          </div>
        )}

        {/* ── Tab switcher ── */}
        <div className="flex rounded-2xl bg-[#131620] p-1 border border-[#2E3450] text-xs font-semibold">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
              mode === 'login'
                ? 'bg-[#E8531A] text-white shadow-lg'
                : 'text-[#8890A8] hover:text-[#E8EAF0]'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
              mode === 'register'
                ? 'bg-[#E8531A] text-white shadow-lg'
                : 'text-[#8890A8] hover:text-[#E8EAF0]'
            }`}
          >
            Register
          </button>
        </div>

        {/* ── Login Form ── */}
        {mode === 'login' && (
          <form onSubmit={handleSubmitLogin(onLoginSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@company.com"
              icon={<Mail className="w-4 h-4 text-[#1A8C8C]" />}
              {...registerLogin('email')}
              error={errorsLogin.email?.message as string}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4 text-[#1A8C8C]" />}
              {...registerLogin('password')}
              error={errorsLogin.password?.message as string}
            />
            <Button variant="primary" size="lg" className="w-full mt-2" type="submit" isLoading={isSubmittingLogin}>
              Sign In
            </Button>
          </form>
        )}

        {/* ── Register Form ── */}
        {mode === 'register' && (
          <form onSubmit={handleSubmitReg(onRegisterSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="First Name"
                placeholder="Alex"
                icon={<User className="w-4 h-4 text-[#1A8C8C]" />}
                {...registerReg('firstName')}
              />
              <Input
                label="Last Name"
                placeholder="Dev"
                icon={<User className="w-4 h-4 text-[#1A8C8C]" />}
                {...registerReg('lastName')}
              />
            </div>
            <Input
              label="Email Address"
              type="email"
              placeholder="you@company.com"
              icon={<Mail className="w-4 h-4 text-[#1A8C8C]" />}
              {...registerReg('email')}
              error={errorsReg.email?.message as string}
            />
            <Input
              label="Password (min 8 chars)"
              type="password"
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4 text-[#1A8C8C]" />}
              {...registerReg('password')}
              error={errorsReg.password?.message as string}
            />
            <Button variant="primary" size="lg" className="w-full mt-2" type="submit" isLoading={isSubmittingReg}>
              Create Account
            </Button>
          </form>
        )}

        <div className="pt-1 text-center text-[11px] text-[#8890A8]">
          StudioPilote · Secure Auth (Bearer JWT + OAuth SSO)
        </div>
      </div>
    </div>
  );
};
