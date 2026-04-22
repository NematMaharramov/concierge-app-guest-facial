'use client';
import { useEffect, useState } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const emptyForm = { email: '', password: '', name: '', role: 'CONCIERGE', isActive: true };

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => getUsers().then(setUsers).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyForm); setModal('create'); };
  const openEdit = (u: any) => {
    setSelected(u);
    setForm({ email: u.email, password: '', name: u.name, role: u.role, isActive: u.isActive });
    setModal('edit');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (modal === 'create') await createUser(form);
      else {
        const data: any = { name: form.name, role: form.role, isActive: form.isActive };
        if (form.password) data.password = form.password;
        await updateUser(selected.id, data);
      }
      toast.success(modal === 'create' ? 'User created' : 'User updated');
      setModal(null); load();
    } catch { toast.error('Failed to save user'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (id === me?.id) { toast.error('Cannot delete your own account'); return; }
    if (!confirm('Delete this user?')) return;
    try { await deleteUser(id); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-gold-100 text-gold-800',
    CONCIERGE: 'bg-blue-100 text-blue-800',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.4em] uppercase text-gold-500 mb-1">Admin</p>
          <h1 className="font-display text-3xl font-light text-charcoal-900">Staff Users</h1>
        </div>
        <button onClick={openCreate} className="btn-primary">+ New User</button>
      </div>

      <div className="bg-white border border-charcoal-100 overflow-hidden">
        {loading ? <div className="p-12 text-center text-charcoal-400">Loading...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-charcoal-50 border-b border-charcoal-100">
              <tr>
                {['Name', 'Email', 'Role', 'Status', 'Created', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs tracking-widest uppercase text-charcoal-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-charcoal-50/50 transition-colors">
                  <td className="px-5 py-4 font-medium text-charcoal-900">
                    {u.name} {u.id === me?.id && <span className="text-xs text-charcoal-400 ml-1">(you)</span>}
                  </td>
                  <td className="px-5 py-4 text-charcoal-600">{u.email}</td>
                  <td className="px-5 py-4">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${roleColors[u.role]}`}>{u.role}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-charcoal-500 text-xs">{format(new Date(u.createdAt), 'dd MMM yyyy')}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(u)} className="text-gold-500 hover:text-gold-600 text-xs tracking-widest uppercase">Edit</button>
                      {u.id !== me?.id && (
                        <button onClick={() => handleDelete(u.id)} className="text-red-400 hover:text-red-600 text-xs tracking-widest uppercase">Del</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="bg-white w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-charcoal-100 flex items-center justify-between">
              <h2 className="font-display text-2xl font-light text-charcoal-900">{modal === 'create' ? 'New User' : 'Edit User'}</h2>
              <button onClick={() => setModal(null)} className="text-charcoal-400 hover:text-charcoal-900">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input required value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} className="input-field" />
              </div>
              {modal === 'create' && (
                <div>
                  <label className="label">Email</label>
                  <input required type="email" value={form.email} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} className="input-field" />
                </div>
              )}
              <div>
                <label className="label">{modal === 'edit' ? 'New Password (leave blank to keep)' : 'Password'}</label>
                <input type="password" required={modal === 'create'} value={form.password} onChange={e => setForm((f: any) => ({ ...f, password: e.target.value }))} className="input-field" minLength={8} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Role</label>
                  <select value={form.role} onChange={e => setForm((f: any) => ({ ...f, role: e.target.value }))} className="input-field">
                    <option value="CONCIERGE">Concierge</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <input type="checkbox" id="active" checked={form.isActive} onChange={e => setForm((f: any) => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-gold-500" />
                  <label htmlFor="active" className="text-sm text-charcoal-700">Active</label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save User'}</button>
                <button type="button" onClick={() => setModal(null)} className="btn-ghost flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
