import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogoBolt } from '../components/Icons';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const cardRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    cardRef.current.style.transform = `perspective(600px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
  };
  const handleMouseLeave = () => {
    if (cardRef.current) cardRef.current.style.transform = 'perspective(600px) rotateY(0) rotateX(0)';
  };

  const demoUsers = [
    { name: 'Admin', email: 'admin@knockbet.com', pass: 'admin123' },
    { name: 'Darshan', email: 'darshan@knockbet.com', pass: 'darshan123' },
    { name: 'Abinaya', email: 'abinaya@knockbet.com', pass: 'abinaya123' },
  ];

  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 fu1">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-cyan-500 rounded-xl flex items-center justify-center">
              <LogoBolt />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">KnockBet</span>
          </div>
          <p style={{ color: '#64748b', fontSize: 14 }}>Sign in to start bidding</p>
        </div>

        {/* Glass Card with 3D tilt */}
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="fu2 glass p-8"
          style={{ transition: 'transform .15s ease' }}
        >
          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="dark-input"
                  placeholder="darshan@knockbet.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="dark-input"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-white disabled:opacity-50 transition-all"
                style={{
                  background: 'linear-gradient(135deg,#7c3aed,#06b6d4,#a855f7,#7c3aed)',
                  backgroundSize: '300% 300%',
                  animation: 'holoBtnGrad 4s ease infinite',
                }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm" style={{ color: '#64748b' }}>
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-purple-400 hover:text-purple-300">Register</Link>
          </div>

          {/* Quick Demo Login */}
          <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
            <p className="text-xs text-center mb-3" style={{ color: '#4b5563' }}>Quick Demo Login</p>
            <div className="grid grid-cols-3 gap-2">
              {demoUsers.map((u) => (
                <button
                  key={u.name}
                  type="button"
                  onClick={() => { setEmail(u.email); setPassword(u.pass); }}
                  className="px-3 py-2 text-xs rounded-lg transition-all duration-300"
                  style={{
                    background: 'rgba(255,255,255,.05)',
                    color: '#94a3b8',
                    border: '1px solid rgba(255,255,255,.08)',
                  }}
                  onMouseEnter={(e) => { e.target.style.borderColor = '#7c3aed'; e.target.style.color = '#c084fc'; }}
                  onMouseLeave={(e) => { e.target.style.borderColor = 'rgba(255,255,255,.08)'; e.target.style.color = '#94a3b8'; }}
                >
                  {u.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
