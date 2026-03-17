import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { formatINR } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function Credits() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('add');

  useEffect(() => {
    api.get('/admin/users').then(({ data }) => setUsers(data.users));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser || !amount) return;
    try {
      await api.post(`/admin/users/${selectedUser}/credits`, { amount: Number(amount), type });
      toast.success('Credits updated!');
      const { data } = await api.get('/admin/users');
      setUsers(data.users);
      setAmount('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-100 mb-8 fu1">💳 Credit Management</h1>

      {/* Assign Form */}
      <div className="glass p-6 mb-8 fu2">
        <h2 className="text-lg font-bold text-slate-100 mb-4">Assign / Deduct Credits</h2>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>User</label>
            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="dark-select w-full">
              <option value="">Select user</option>
              {users.map((u) => <option key={u._id} value={u._id}>{u.name} ({formatINR(u.credits)})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>Action</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="dark-select">
              <option value="add">+ Add</option>
              <option value="deduct">- Deduct</option>
              <option value="reset">Reset</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>Amount (₹)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="1"
              className="dark-input w-32" placeholder="2000" />
          </div>
          <button type="submit" className="btn-gradient">Apply</button>
        </form>
      </div>

      {/* User Credits Table */}
      <div className="glass overflow-hidden fu3">
        <table className="dark-table">
          <thead>
            <tr>
              <th className="text-left text-xs uppercase p-4" style={{ color: '#64748b' }}>User</th>
              <th className="text-left text-xs uppercase p-4" style={{ color: '#64748b' }}>Credits</th>
              <th className="text-left text-xs uppercase p-4" style={{ color: '#64748b' }}>Locked</th>
              <th className="text-left text-xs uppercase p-4" style={{ color: '#64748b' }}>Available</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                <td className="p-4 font-medium text-slate-200">{u.name}</td>
                <td className="p-4 font-bold text-slate-100">{formatINR(u.credits)}</td>
                <td className="p-4 text-orange-400">{formatINR(u.lockedCredits)}</td>
                <td className="p-4 text-green-400 font-medium">{formatINR(u.credits - u.lockedCredits)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
