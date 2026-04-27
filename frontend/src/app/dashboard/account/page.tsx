'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { updateMe, uploadProfilePhoto } from '@/lib/api';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { CROP_PRESETS } from '@/lib/imageUtils';
import toast from 'react-hot-toast';

export default function AccountPage() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);

  if (!user) return null;

  const handlePhotoSelected = (file: File) => {
    setPendingPhotoFile(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      // Upload photo first if one was selected
      if (pendingPhotoFile) {
        await uploadProfilePhoto(pendingPhotoFile);
        setPendingPhotoFile(null);
      }
      // Save name change
      if (name !== user.name) {
        await updateMe({ name });
      }
      await refreshUser();
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSavingPassword(true);
    try {
      await updateMe({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-xl">
      <div>
        <p className="text-xs tracking-[0.4em] uppercase text-gold-500 mb-1">Account</p>
        <h1 className="font-display text-3xl font-light text-charcoal-900">My Profile</h1>
      </div>

      {/* Profile section */}
      <div className="bg-white border border-charcoal-100">
        <div className="px-6 py-4 border-b border-charcoal-100">
          <h2 className="font-medium text-charcoal-900">Profile Information</h2>
        </div>
        <form onSubmit={handleSaveProfile} className="p-6 space-y-5">
          {/* Profile photo */}
          <div className="flex items-start gap-6">
            <ImageUploadButton
              label="Change Photo"
              currentUrl={user.profilePhoto}
              cropOptions={CROP_PRESETS.profilePhoto}
              onFile={handlePhotoSelected}
              avatar
            />
            <div className="flex-1 pt-2">
              <p className="text-sm font-medium text-charcoal-900">{user.name}</p>
              <p className="text-xs text-charcoal-500">{user.email}</p>
              <span className={`inline-block mt-1 text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                user.role === 'ADMIN' ? 'bg-gold-100 text-gold-800' : 'bg-blue-100 text-blue-800'
              }`}>{user.role}</span>
            </div>
          </div>

          <div>
            <label className="label">Display Name</label>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="input-field"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="label">Email Address</label>
            <input
              disabled
              value={user.email}
              className="input-field bg-charcoal-50 text-charcoal-400 cursor-not-allowed"
            />
            <p className="text-[10px] text-charcoal-400 mt-1">Email cannot be changed. Contact an admin.</p>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="btn-primary w-full"
          >
            {savingProfile ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* Password section */}
      <div className="bg-white border border-charcoal-100">
        <div className="px-6 py-4 border-b border-charcoal-100">
          <h2 className="font-medium text-charcoal-900">Change Password</h2>
        </div>
        <form onSubmit={handleSavePassword} className="p-6 space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="input-field"
              placeholder="Min. 8 characters"
              minLength={8}
            />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              minLength={8}
            />
          </div>
          <button
            type="submit"
            disabled={savingPassword}
            className="btn-primary w-full"
          >
            {savingPassword ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
