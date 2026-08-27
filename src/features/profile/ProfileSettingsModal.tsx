import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Avatar } from '../../components/Avatar';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';
import { Bell, User, Lock } from 'lucide-react';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, refetchUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications'>('profile');

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [notifInApp, setNotifInApp] = useState(true);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(false);

  useEffect(() => {
    if (user?.notificationSettings) {
      setNotifInApp(user.notificationSettings.inApp);
      setNotifEmail(user.notificationSettings.email);
      setNotifPush(user.notificationSettings.push);
    }
  }, [user]);

  const { register: registerProfile, handleSubmit: handleSubmitProfile } = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      locale: user?.locale || 'fr',
    },
  });

  const { register: registerPassword, handleSubmit: handleSubmitPassword, reset: resetPassword } = useForm();

  const onSaveProfile = async (data: any) => {
    setIsUpdatingProfile(true);
    try {
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        if (data.firstName) formData.append('firstName', data.firstName);
        if (data.lastName) formData.append('lastName', data.lastName);
        await apiService.updateMe(formData);
      } else {
        await apiService.updateMe(data);
      }
      toast.success('Profil mis à jour !');
      await refetchUser();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const onChangePassword = async (data: any) => {
    try {
      await apiService.updatePassword(data);
      toast.success('Mot de passe modifié avec succès !');
      resetPassword();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la modification du mot de passe');
    }
  };

  const onSaveNotifications = async () => {
    try {
      await apiService.updateNotificationSettings({ inApp: notifInApp, email: notifEmail, push: notifPush });
      toast.success('Préférences de notification enregistrées');
      await refetchUser();
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const tabBtn = (active: boolean) =>
    `pb-2 border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
      active
        ? 'border-violet-500 text-violet-500'
        : 'border-transparent text-[var(--sp-text-muted)] hover:text-[var(--sp-text)]'
    }`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Paramètres du compte" maxWidth="lg">
      {/* ── Tabs ── */}
      <div className="flex border-b border-[var(--sp-border)] gap-6 mb-4 font-semibold text-xs">
        <button onClick={() => setActiveTab('profile')} className={tabBtn(activeTab === 'profile')}>
          <User className="w-4 h-4" /> Profil
        </button>
        <button onClick={() => setActiveTab('notifications')} className={tabBtn(activeTab === 'notifications')}>
          <Bell className="w-4 h-4" /> Notifications
        </button>
      </div>

      {/* ── Profile ── */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <form onSubmit={handleSubmitProfile(onSaveProfile)} className="space-y-4">
            <div className="flex items-center gap-4 p-3 rounded-xl bg-[var(--sp-surface-2)] border border-[var(--sp-border)]">
              <Avatar src={user?.avatarUrl} firstName={user?.firstName} lastName={user?.lastName} email={user?.email} size="lg" />
              <div>
                <label className="block text-xs font-semibold text-[var(--sp-text)] mb-1">Changer l'avatar</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                  className="text-xs text-[var(--sp-text-muted)] file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Prénom" {...registerProfile('firstName')} />
              <Input label="Nom" {...registerProfile('lastName')} />
            </div>
            <div className="flex justify-end">
              <Button variant="primary" size="sm" type="submit" isLoading={isUpdatingProfile}>
                Enregistrer le profil
              </Button>
            </div>
          </form>

          <hr className="border-[var(--sp-border)]" />

          <form onSubmit={handleSubmitPassword(onChangePassword)} className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--sp-text-secondary)] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-rose-500" /> Sécurité & Mot de passe
            </h5>
            <Input type="password" label="Mot de passe actuel" {...registerPassword('currentPassword')} />
            <Input type="password" label="Nouveau mot de passe" {...registerPassword('newPassword')} />
            <div className="flex justify-end">
              <Button variant="danger" size="sm" type="submit">Changer le mot de passe</Button>
            </div>
          </form>
        </div>
      )}

      {/* ── Notifications ── */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[var(--sp-surface-2)] border border-[var(--sp-border)] space-y-3">
            {[
              { label: 'Notifications In-App (Centre de notification)', value: notifInApp, set: setNotifInApp },
              { label: 'Notifications Email (Assignations & Mentions)', value: notifEmail, set: setNotifEmail },
              { label: 'Notifications Push (Navigateur)', value: notifPush, set: setNotifPush },
            ].map(({ label, value, set }) => (
              <label key={label} className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-[var(--sp-text)]">{label}</span>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => set(e.target.checked)}
                  className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500"
                />
              </label>
            ))}
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={onSaveNotifications}>
              Enregistrer les préférences
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
