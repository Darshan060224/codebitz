import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { formatINR } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/users').then(({ data }) => { setUsers(data.users); setLoading(false); });
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-100 mb-8 fu1">👥 Users</h1>

      <div className="glass overflow-hidden fu2">
        <table className="dark-table">
          <thead>
            <tr>
              <th className="text-left text-xs uppercase p-4" style={{ color: '#64748b' }}>User</th>
              <th className="text-left text-xs uppercase p-4" style={{ color: '#64748b' }}>Email</th>
              <th className="text-left text-xs uppercase p-4" style={{ color: '#64748b' }}>Credits</th>
              <th className="text-left text-xs uppercase p-4" style={{ color: '#64748b' }}>Locked</th>
              <th className="text-left text-xs uppercase p-4" style={{ color: '#64748b' }}>Available</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-cyan-400 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{u.name[0]}</span>
                    </div>
                    <span className="font-medium text-slate-200">{u.name}</span>
                  </div>
                </td>
                <td className="p-4 text-sm" style={{ color: '#94a3b8' }}>{u.email}</td>
                <td className="p-4 font-bold text-slate-100">{formatINR(u.credits)}</td>
                <td className="p-4 text-sm text-orange-400">{formatINR(u.lockedCredits)}</td>
                <td className="p-4 text-sm text-green-400 font-medium">{formatINR(u.credits - u.lockedCredits)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
