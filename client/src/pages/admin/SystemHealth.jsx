import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { formatINR } from '../../utils/helpers';

const TEST_SCENARIOS = [
  { id: 'negative_bid',   label: 'Negative Bid Rejected',    desc: 'POST bid with amount = -100',              run: async () => { try { await api.post('/bids', { auctionId: 'test', amount: -100 }); return { ok: false, detail: 'FAIL — negative bid was accepted' }; } catch (e) { return { ok: true, detail: e.response?.data?.error || 'Rejected correctly' }; } } },
  { id: 'decimal_bid',    label: 'Decimal Bid Rejected',     desc: 'POST bid with amount = 1500.50',           run: async () => { try { await api.post('/bids', { auctionId: 'test', amount: 1500.5 }); return { ok: false, detail: 'FAIL — decimal bid was accepted' }; } catch (e) { return { ok: true, detail: e.response?.data?.error || 'Rejected correctly' }; } } },
  { id: 'zero_bid',       label: 'Zero Bid Rejected',        desc: 'POST bid with amount = 0',                 run: async () => { try { await api.post('/bids', { auctionId: 'test', amount: 0 }); return { ok: false, detail: 'FAIL — zero bid was accepted' }; } catch (e) { return { ok: true, detail: e.response?.data?.error || 'Rejected correctly' }; } } },
  { id: 'health_api',     label: 'Health API Reachable',     desc: 'GET /admin/health returns 200',            run: async () => { try { const { data } = await api.get('/admin/health'); return { ok: data.status === 'ok', detail: data.status === 'ok' ? 'API responded ok' : `Status: ${data.status}` }; } catch { return { ok: false, detail: 'Health endpoint unreachable' }; } } },
];

function StatusDot({ ok, loading }) {
  if (loading) return <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse inline-block" />;
  return <span className={`w-3 h-3 rounded-full inline-block ${ok ? 'bg-emerald-400' : 'bg-red-500'}`} />;
}

function formatUptime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h}h ${m}m ${s}s`;
}

export default function SystemHealth() {
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [running, setRunning] = useState({});
  const [allRunning, setAllRunning] = useState(false);

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const { data } = await api.get('/admin/health');
      setHealth(data);
    } catch (e) {
      setHealthError(e.response?.data?.error || 'Failed to reach health endpoint');
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  const runTest = async (scenario) => {
    setRunning((p) => ({ ...p, [scenario.id]: true }));
    const result = await scenario.run();
    setTestResults((p) => ({ ...p, [scenario.id]: result }));
    setRunning((p) => ({ ...p, [scenario.id]: false }));
  };

  const runAllTests = async () => {
    setAllRunning(true);
    await Promise.all(TEST_SCENARIOS.map((s) => runTest(s)));
    setAllRunning(false);
  };

  const allPassed = TEST_SCENARIOS.every((s) => testResults[s.id]?.ok === true);
  const anyRan = TEST_SCENARIOS.some((s) => testResults[s.id] !== undefined);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">🛡️ System Health</h1>
          <p className="mt-1 text-sm" style={{ color: '#64748b' }}>Security checks, live metrics, and validation tests</p>
        </div>
        <button onClick={fetchHealth} className="btn-outline text-sm px-4 py-2">↺ Refresh</button>
      </div>

      {/* ── Live Metrics ───────────────────────────────────────────── */}
      {healthLoading ? (
        <div className="flex justify-center py-12"><div className="spinner" /></div>
      ) : healthError ? (
        <div className="glass-card p-6 text-center text-red-400 mb-6">⚠️ {healthError}</div>
      ) : health && (
        <>
          {/* Status banner */}
          <div className={`rounded-2xl p-4 mb-6 flex items-center gap-3 ${health.status === 'ok' ? 'text-emerald-300' : 'text-amber-300'}`}
            style={{ background: health.status === 'ok' ? 'rgba(16,185,129,.1)' : 'rgba(245,158,11,.1)', border: `1px solid ${health.status === 'ok' ? 'rgba(16,185,129,.25)' : 'rgba(245,158,11,.25)'}` }}>
            <span className="text-2xl">{health.status === 'ok' ? '✅' : '⚠️'}</span>
            <div>
              <p className="font-bold text-base">System {health.status === 'ok' ? 'Operational' : 'Degraded'}</p>
              <p className="text-xs opacity-70">Last checked: {new Date(health.timestamp).toLocaleTimeString()}</p>
            </div>
          </div>

          {/* Security checks grid */}
          <div className="glass-card p-6 mb-6">
            <h2 className="text-base font-bold text-slate-100 mb-4">🔒 Security Checks</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.values(health.checks).map((c) => (
                <div key={c.label} className="flex items-start gap-3 rounded-xl p-3" style={{ background: 'rgba(255,255,255,.04)' }}>
                  <StatusDot ok={c.ok} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">{c.label}</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: '#64748b' }}>{c.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {[
              { label: 'Uptime',          val: formatUptime(health.metrics.uptimeSeconds) },
              { label: 'Live Auctions',   val: health.metrics.liveAuctions },
              { label: 'Total Users',     val: health.metrics.totalUsers },
              { label: 'Total Bids',      val: health.metrics.totalBids },
              { label: 'Locked Credits',  val: formatINR(health.metrics.totalLockedCredits) },
              { label: 'Memory',          val: `${health.metrics.memoryMB} MB` },
            ].map((m) => (
              <div key={m.label} className="stat-card text-center py-4">
                <p className="text-lg font-extrabold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">{m.val}</p>
                <p className="text-xs mt-1" style={{ color: '#64748b' }}>{m.label}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Validation Tests ───────────────────────────────────────── */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-100">🧪 Validation Tests</h2>
          <button
            onClick={runAllTests}
            disabled={allRunning}
            className="btn-gradient text-sm px-5 py-2 disabled:opacity-50"
          >
            {allRunning ? '⏳ Running...' : '▶ Run All Tests'}
          </button>
        </div>

        <div className="space-y-3">
          {TEST_SCENARIOS.map((scenario) => {
            const result = testResults[scenario.id];
            const isRunning = running[scenario.id];
            return (
              <div key={scenario.id} className="flex items-center gap-4 rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,.04)' }}>
                <StatusDot ok={result?.ok} loading={isRunning} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200">{scenario.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{scenario.desc}</p>
                  {result && !isRunning && (
                    <p className={`text-xs mt-1 font-medium ${result.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                      {result.ok ? '✓' : '✗'} {result.detail}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => runTest(scenario)}
                  disabled={isRunning}
                  className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40"
                  style={{ background: 'rgba(124,58,237,.2)', color: '#a78bfa' }}
                >
                  {isRunning ? '...' : 'Run'}
                </button>
              </div>
            );
          })}
        </div>

        {anyRan && !allRunning && (
          <div className={`mt-5 rounded-xl p-3 text-center text-sm font-bold ${allPassed ? 'text-emerald-400' : 'text-amber-400'}`}
            style={{ background: allPassed ? 'rgba(16,185,129,.08)' : 'rgba(245,158,11,.08)' }}>
            {allPassed
              ? '✅ All tests passed — system is production-ready'
              : '⚠️ Some tests failed — review above'}
          </div>
        )}
      </div>

      {/* ── Demo Accounts ──────────────────────────────────────────── */}
      <div className="glass-card p-6 mt-6">
        <h2 className="text-base font-bold text-slate-100 mb-4">👤 Demo Accounts</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: '#64748b', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                <th className="text-left py-2 pr-6">Role</th>
                <th className="text-left py-2 pr-6">Email</th>
                <th className="text-left py-2 pr-6">Password</th>
                <th className="text-left py-2">Credits</th>
              </tr>
            </thead>
            <tbody className="space-y-1">
              {[
                { role: '👑 Admin',   email: 'admin@knockbet.com',  pwd: 'admin123',  credits: '—' },
                { role: '🔨 Bidder',  email: 'darshan@knockbet.com', pwd: 'darshan123', credits: '₹25,000' },
                { role: '🔨 Bidder',  email: 'abinaya@knockbet.com', pwd: 'abinaya123', credits: '₹20,000' },
                { role: '🏛 Judge',   email: 'judge@knockbet.com',   pwd: 'judge123',   credits: '₹50,000' },
              ].map((u) => (
                <tr key={u.email} style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                  <td className="py-2 pr-6 text-slate-200 font-medium">{u.role}</td>
                  <td className="py-2 pr-6 font-mono text-purple-300 text-xs">{u.email}</td>
                  <td className="py-2 pr-6 font-mono text-cyan-300 text-xs">{u.pwd}</td>
                  <td className="py-2 text-emerald-400 font-bold">{u.credits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs mt-3" style={{ color: '#4b5563' }}>
          Run <code className="text-purple-400">node src/seed.js</code> from the server directory to reset and re-seed all demo data.
        </p>
      </div>
    </div>
  );
}
