import { Link } from 'react-router-dom';
import { LightningIcon, ChatBubbleIcon, FlameIcon, LogoBolt } from '../components/Icons';

const features = [
  { icon: <LightningIcon size={90} />, title: 'Real-Time Bidding', desc: 'Instant bid updates, live countdowns, and auto-extending timers keep you locked in the action.' },
  { icon: <ChatBubbleIcon size={100} />, title: 'Live Chat', desc: 'Chat with other bidders in real-time, see system announcements, and react with emoji.' },
  { icon: <FlameIcon size={90} />, title: 'Bid Battles', desc: 'Automatic bid battle detection when competition gets intense—watch the heat meter rise!' },
];

const stats = [
  { value: '₹10L+', label: 'Total Bids' },
  { value: '500+', label: 'Auctions' },
  { value: '2K+', label: 'Bidders' },
];

export default function Landing() {
  return (
    <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-20">
      {/* Badge */}
      <div className="fu1 mb-6">
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '7px 18px', borderRadius: 40,
          background: 'rgba(255,255,255,.07)',
          border: '1px solid rgba(255,255,255,.10)',
          fontSize: 13, fontWeight: 500, color: '#94a3b8',
          letterSpacing: '.03em',
        }}>
          <LogoBolt /> Real-Time Auction Platform
        </span>
      </div>

      {/* Title */}
      <h1 className="fu2 text-center" style={{
        fontSize: 'clamp(2.6rem,6vw,4.5rem)',
        fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.03em',
        background: 'linear-gradient(95deg,#e2e8f0 0%,#c084fc 30%,#38bdf8 55%,#a855f7 80%,#e2e8f0 100%)',
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        animation: 'shimTitle 6s ease infinite',
      }}>
        Bid. Win. Repeat.
      </h1>

      <p className="fu3 mt-5 text-center max-w-xl" style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1.7 }}>
        Experience real-time auctions with live bidding, instant updates, and competitive bid battles.
        Join Darshan, Abinaya, and thousands of bidders worldwide.
      </p>

      {/* CTA Buttons */}
      <div className="fu4 mt-10 flex flex-col sm:flex-row gap-4">
        <Link to="/register" className="btn-gradient text-lg px-8 py-4 text-center">
          Start Bidding →
        </Link>
        <Link to="/login" className="btn-outline text-lg px-8 py-4 text-center">
          Sign In
        </Link>
      </div>

      {/* Feature Cards */}
      <div className="fu5 mt-24 grid md:grid-cols-3 gap-6 max-w-5xl w-full">
        {features.map((f) => (
          <div key={f.title} className="glass-card p-8 text-center">
            <div className="flex justify-center mb-4">{f.icon}</div>
            <h3 className="text-lg font-bold text-slate-100 mb-2">{f.title}</h3>
            <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.65 }}>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* How It Works */}
      <div className="fu5 mt-20 max-w-4xl w-full">
        <h2 className="text-3xl font-bold text-center text-slate-100 mb-12">
          How It Works
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { step: '1', icon: '💰', title: 'Get Credits', desc: 'Sign up and receive credits to start bidding.' },
            { step: '2', icon: '🔍', title: 'Join Auction', desc: 'Browse live auctions and enter a battle room.' },
            { step: '3', icon: '⚡', title: 'Place Bids', desc: 'Bid in real-time against other bidders.' },
            { step: '4', icon: '🏆', title: 'Win Item', desc: 'Highest bidder wins when the timer ends!' },
          ].map((s) => (
            <div key={s.step} className="glass-card p-6 text-center relative">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white mx-auto mb-3" style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}>
                {s.step}
              </div>
              <p className="text-3xl mb-2">{s.icon}</p>
              <h4 className="text-sm font-bold text-slate-100 mb-1">{s.title}</h4>
              <p style={{ color: '#64748b', fontSize: 12, lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="fu6 mt-16 flex flex-wrap justify-center gap-12">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-4xl font-extrabold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">{s.value}</p>
            <p style={{ color: '#4b5563', fontSize: 13, marginTop: 4 }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
