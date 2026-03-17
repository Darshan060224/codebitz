import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getSocket } from '../utils/socket';
import { useAuth } from '../context/AuthContext';
import { formatINR, getTimeLeft, getTimeTo, getHeatEmoji, getHeatColor, getStatusColor } from '../utils/helpers';
import toast from 'react-hot-toast';

const API_HOST = 'http://localhost:5000';

function getImageUrl(img) {
  if (!img) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600';
  return img.startsWith('/') ? `${API_HOST}${img}` : img;
}

export default function AuctionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activity, setActivity] = useState([]);
  const [bidAmount, setBidAmount] = useState('');
  const [chatText, setChatText] = useState('');
  const [timeDisplay, setTimeDisplay] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isCritical, setIsCritical] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bidBattle, setBidBattle] = useState(null);
  const [bidFlash, setBidFlash] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [interested, setInterested] = useState(false);
  const [interestedCount, setInterestedCount] = useState(0);
  const [inBattleRoom, setInBattleRoom] = useState(false);
  const [showExitAnim, setShowExitAnim] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [showBidConfirm, setShowBidConfirm] = useState(false);
  const [pendingBidAmount, setPendingBidAmount] = useState(0);
  const [auctionPhase, setAuctionPhase] = useState('');
  const [watcherCount, setWatcherCount] = useState(0);
  const [knockActive, setKnockActive] = useState(null);
  const [knockCountdown, setKnockCountdown] = useState(0);
  const [wasWinning, setWasWinning] = useState(false);
  const [showRevenge, setShowRevenge] = useState(false);
  const [bidValidation, setBidValidation] = useState('');
  const [knockShake, setKnockShake] = useState(false);
  const [effectiveIncrement, setEffectiveIncrement] = useState(0);
  const [bidSuccess, setBidSuccess] = useState(null);
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [maxBidAmount, setMaxBidAmount] = useState('');
  const [replayActive, setReplayActive] = useState(false);
  const [replayStep, setReplayStep] = useState(0);
  const [replayItems, setReplayItems] = useState([]);
  const bidSoundRef = useRef(null);

  const chatRef = useRef(null);
  const socketRef = useRef(null);
  const replayTimerRef = useRef(null);
  const replayScrollRef = useRef(null);

  // Create bid sound (Web Audio API — no external file needed)
  useEffect(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      bidSoundRef.current = new AudioContext();
    } catch (e) {}
  }, []);

  // Play bid ding sound
  const playBidSound = () => {
    try {
      const ctx = bidSoundRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  };

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await api.get(`/auctions/${id}`);
        setAuction(data.auction);
        setBids(data.bids);
        setMessages(data.messages);
        setBidAmount(String(data.auction.currentBid + data.auction.minIncrement));
        setInterestedCount(data.auction.interestedUsers?.length || 0);
        if (user && data.auction.interestedUsers?.includes(user._id)) {
          setInterested(true);
        }
        setLoading(false);
      } catch (err) {
        toast.error('Failed to load auction');
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Socket connection
  useEffect(() => {
    if (!auction) return;
    const socket = getSocket();
    if (!socket) return;
    socketRef.current = socket;

    socket.emit('joinAuction', id);

    socket.on('bidUpdated', (data) => {
      setAuction((prev) => ({
        ...prev,
        currentBid: data.currentBid,
        highestBidder: data.highestBidder,
        totalBids: data.totalBids,
        endTime: data.endTime,
        heatLevel: data.heatLevel,
      }));
      setBids((prev) => [
        { _id: Date.now(), user: { name: data.bid.userName }, amount: data.bid.amount, createdAt: data.bid.createdAt },
        ...prev,
      ]);
      setBidAmount(String(data.currentBid + (auction?.minIncrement || 200)));
      setBidFlash(true);
      playBidSound();
      setTimeout(() => setBidFlash(false), 600);

      // Show bid success popup for the bidder
      if (data.bid.userId === user?._id) {
        setBidSuccess({
          amount: data.bid.amount,
          isHighest: data.highestBidder?._id === user?._id,
        });
        setTimeout(() => setBidSuccess(null), 4000);
      }

      // Update effective increment from server
      if (data.effectiveIncrement) setEffectiveIncrement(data.effectiveIncrement);

      // Revenge bid detection — user was winning but got outbid
      if (wasWinning && data.highestBidder?._id !== user?._id) {
        setShowRevenge(true);
        setTimeout(() => setShowRevenge(false), 10000);
      }
      // Track if user is currently winning
      setWasWinning(data.highestBidder?._id === user?._id);

      if (data.timerExtended) {
        toast('⏱️ Timer extended by 30 seconds!', { icon: '⚡' });
      }
    });

    socket.on('chatMessage', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('activityEvent', (event) => {
      setActivity((prev) => [...prev.slice(-20), event]);
    });

    socket.on('bidBattle', (data) => {
      setBidBattle(data);
      setTimeout(() => setBidBattle(null), 5000);
    });

    socket.on('watcherCount', (data) => {
      setWatcherCount(data.count);
    });

    socket.on('knockStarted', (data) => {
      setKnockActive(data);
      setKnockCountdown(15);
      setKnockShake(true);
      // Play gavel sound
      try {
        const ctx = bidSoundRef.current;
        if (ctx) {
          if (ctx.state === 'suspended') ctx.resume();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'square';
          osc.frequency.setValueAtTime(220, ctx.currentTime);
          osc.frequency.setValueAtTime(110, ctx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.4);
        }
      } catch (e) {}
      setTimeout(() => setKnockShake(false), 600);
    });

    socket.on('knockCancelled', () => {
      setKnockActive(null);
      setKnockCountdown(0);
      setKnockShake(false);
    });

    socket.on('auctionEnded', (data) => {
      setAuction((prev) => ({ ...prev, status: 'ended', winner: data.winner, winningBid: data.winningBid }));
      if (data.winner === user?._id) {
        setShowWinModal(true);
        setShowConfetti(true);
        setInBattleRoom(false);
        toast.success('🎉 Congratulations! You won the auction!');
      } else {
        setInBattleRoom(false);
      }
    });

    socket.on('auctionExtended', (data) => {
      setAuction((prev) => ({ ...prev, endTime: data.endTime }));
    });

    socket.on('notification', (data) => {
      if (data.userId === user?._id) {
        toast(data.message, { icon: '⚠️' });
      }
    });

    socket.on('bidError', (data) => {
      toast.error(data.error);
    });

    return () => {
      socket.emit('leaveAuction', id);
      socket.off('bidUpdated');
      socket.off('chatMessage');
      socket.off('activityEvent');
      socket.off('bidBattle');
      socket.off('watcherCount');
      socket.off('knockStarted');
      socket.off('knockCancelled');
      socket.off('auctionEnded');
      socket.off('auctionExtended');
      socket.off('notification');
      socket.off('bidError');
    };
  }, [auction?._id]);

  // Timer + Going Once / Going Twice / Final Call
  useEffect(() => {
    if (!auction) return;
    const update = () => {
      if (auction.status === 'upcoming') {
        const t = getTimeTo(auction.startTime);
        setTimeDisplay(t.started ? 'Starting...' : t.text);
        setIsUrgent(false);
        setIsCritical(false);
        setAuctionPhase('');
      } else if (auction.status === 'live') {
        const t = getTimeLeft(auction.endTime);
        setTimeDisplay(t.seconds <= 0 ? 'Ending...' : t.text);
        setIsUrgent(t.urgent);
        setIsCritical(t.critical);

        // Auction drama phases
        if (t.seconds <= 5 && t.seconds > 0) {
          setAuctionPhase('final');
        } else if (t.seconds <= 15) {
          setAuctionPhase('twice');
        } else if (t.seconds <= 30) {
          setAuctionPhase('once');
        } else {
          setAuctionPhase('');
        }
      } else {
        setTimeDisplay('Ended');
        setAuctionPhase('');
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [auction?.status, auction?.startTime, auction?.endTime]);

  // Knock countdown timer
  useEffect(() => {
    if (!knockActive) return;
    const interval = setInterval(() => {
      setKnockCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [knockActive]);

  // Auto scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // Battle room: prevent tab close when in live bidding
  useEffect(() => {
    if (!inBattleRoom) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = 'Auction in progress! Are you sure you want to leave?';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [inBattleRoom]);

  const enterBattleRoom = () => {
    setInBattleRoom(true);
    toast('⚔️ You entered the Battle Room!', { icon: '🏟️' });
  };

  const exitBattleRoom = () => {
    setShowExitAnim(true);
    setTimeout(() => {
      setInBattleRoom(false);
      setShowExitAnim(false);
      navigate('/marketplace');
    }, 800);
  };

  const toggleInterest = async () => {
    try {
      const { data } = await api.post(`/auctions/${id}/interested`);
      setInterested(data.interested);
      setInterestedCount(data.count);
      toast(data.interested ? '❤️ Added to your interests!' : '💔 Removed from interests');
    } catch {
      toast.error('Login required to show interest');
    }
  };

  const placeBid = () => {
    const amount = Number(bidAmount);
    const minIncr = effectiveIncrement || auction.minIncrement;
    const minRequired = auction.currentBid + minIncr;
    if (!amount || amount < minRequired) {
      setBidValidation(`Minimum bid: ${formatINR(minRequired)}`);
      return;
    }
    setBidValidation('');
    // Show confirmation modal before placing bid
    setPendingBidAmount(amount);
    setShowBidConfirm(true);
  };

  const revengeBid = () => {
    const minIncr = effectiveIncrement || auction.minIncrement;
    const revengeAmount = auction.currentBid + minIncr;
    setBidAmount(String(revengeAmount));
    setBidValidation('');
    setPendingBidAmount(revengeAmount);
    setShowBidConfirm(true);
    setShowRevenge(false);
  };

  const confirmBid = () => {
    setShowBidConfirm(false);
    const payload = { auctionId: id, amount: pendingBidAmount };
    if (proxyEnabled && Number(maxBidAmount) > pendingBidAmount) {
      payload.isProxy = true;
      payload.maxBid = Number(maxBidAmount);
    }
    socketRef.current?.emit('placeBid', payload);
  };

  const cancelBid = () => {
    setShowBidConfirm(false);
    setPendingBidAmount(0);
  };

  const handleKnock = () => {
    socketRef.current?.emit('knock', { auctionId: id });
  };

  // --- Bid Replay ---
  const buildTimelineItems = (bidList) => {
    const sorted = [...bidList].reverse(); // oldest first
    const items = [];
    for (let i = 0; i < sorted.length; i++) {
      const b = sorted[i];
      items.push({ type: 'bid', bid: b });
      if (i < sorted.length - 1) {
        const next = sorted[i + 1];
        if (new Date(next.createdAt) - new Date(b.createdAt) < 60000) {
          items.push({ type: 'battle' });
        }
      } else {
        items.push({ type: 'winner', bid: b });
      }
    }
    return items;
  };

  const startReplay = () => {
    const items = buildTimelineItems(bids);
    setReplayItems(items);
    setReplayStep(0);
    setReplayActive(true);
    let step = 0;
    replayTimerRef.current = setInterval(() => {
      step += 1;
      setReplayStep(step);
      if (step >= items.length) {
        clearInterval(replayTimerRef.current);
        setReplayActive(false);
      }
    }, 800);
  };

  const stopReplay = () => {
    clearInterval(replayTimerRef.current);
    setReplayActive(false);
  };

  const resetReplay = () => {
    clearInterval(replayTimerRef.current);
    setReplayActive(false);
    setReplayStep(0);
    setReplayItems([]);
  };

  // Auto-scroll replay container as items appear
  useEffect(() => {
    if (replayScrollRef.current && replayStep > 0) {
      replayScrollRef.current.scrollTop = replayScrollRef.current.scrollHeight;
    }
  }, [replayStep]);

  // Cleanup replay timer on unmount
  useEffect(() => {
    return () => clearInterval(replayTimerRef.current);
  }, []);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    socketRef.current?.emit('sendMessage', { auctionId: id, text: chatText });
    setChatText('');
  };

  const sendReaction = (emoji) => {
    socketRef.current?.emit('sendReaction', { auctionId: id, emoji });
  };

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;
  if (!auction) return <div className="text-center py-20" style={{ color: '#4b5563' }}>Auction not found</div>;

  const formatBidTime = (dt) => new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const aiPrediction = (() => {
    if (bids.length < 2 || auction.status !== 'live') return null;
    const sorted = [...bids].reverse();
    const firstAmt = sorted[0].amount;
    const lastAmt = sorted[sorted.length - 1].amount;
    const avgIncr = (lastAmt - firstAmt) / Math.max(sorted.length - 1, 1);
    if (avgIncr <= 0) return null;
    const predicted = Math.round((auction.currentBid + avgIncr * 5) / 100) * 100;
    const confidence = Math.min(85, 40 + bids.length * 3 + (auction.heatLevel === 'hot' ? 10 : auction.heatLevel === 'warm' ? 5 : 0));
    return { predicted, avgIncr: Math.round(avgIncr), confidence };
  })();

  const isWinning = auction.highestBidder?._id === user?._id || auction.highestBidder === user?._id;

  const allImages = auction.images?.length > 0
    ? auction.images.map(getImageUrl)
    : [getImageUrl(auction.image)];

  return (
    <div className={`max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-6 ${showExitAnim ? 'animate-exit-room' : ''} ${knockShake ? 'animate-screen-shake' : ''}`}>

      {/* Bid Success Popup */}
      {bidSuccess && (
        <div className="fixed top-6 right-6 z-50 animate-bid-success" style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,.95), rgba(5,150,105,.95))',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,.2)',
          borderRadius: 18,
          padding: '20px 28px',
          minWidth: 280,
          boxShadow: '0 8px 40px rgba(16,185,129,.4), 0 0 80px rgba(16,185,129,.15)',
        }}>
          <div className="flex items-start gap-3">
            <span className="text-3xl">{bidSuccess.isHighest ? '👑' : '⚡'}</span>
            <div>
              <p className="text-lg font-extrabold text-white">
                {bidSuccess.isHighest ? 'YOU ARE THE HIGHEST BIDDER' : 'BID PLACED!'}
              </p>
              <p className="text-2xl font-extrabold text-white/95 mt-1">
                {formatINR(bidSuccess.amount)}
              </p>
              <p className="text-xs text-white/70 mt-1">{auction?.title}</p>
              {bidSuccess.isHighest && (
                <p className="text-xs font-bold text-yellow-200 mt-1.5">🎯 Hold your position to win!</p>
              )}
            </div>
          </div>
          {/* Progress bar auto-dismiss */}
          <div className="mt-3 w-full rounded-full h-1" style={{ background: 'rgba(255,255,255,.2)' }}>
            <div className="h-1 rounded-full bg-white/60 animate-bid-success-bar" />
          </div>
        </div>
      )}

      {/* Exit Animation Overlay */}
      {showExitAnim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(6,5,26,.95)' }}>
          <div className="text-center animate-fade-in">
            <p className="text-4xl mb-4">🚪</p>
            <p className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Leaving Auction Arena...
            </p>
          </div>
        </div>
      )}

      {/* Win Modal */}
      {showWinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(6,5,26,.9)' }}>
          <div className="glass p-10 rounded-3xl text-center max-w-md mx-4 animate-win-glow">
            <p className="text-6xl mb-4">🏆</p>
            <h2 className="text-3xl font-extrabold text-transparent bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 bg-clip-text mb-2">
              CONGRATULATIONS!
            </h2>
            <p className="text-xl text-slate-200 mb-2">You won the auction!</p>
            <p className="text-lg font-bold text-purple-300 mb-1">{auction.title}</p>
            <p className="text-2xl font-extrabold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent mb-6">
              {formatINR(auction.winningBid || auction.currentBid)}
            </p>
            <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>This item has been added to your profile!</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => { setShowWinModal(false); navigate('/bidder/profile'); }} className="btn-gradient px-6">
                View Profile
              </button>
              <button onClick={() => setShowWinModal(false)} className="btn-outline px-6">
                Stay Here
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bid Confirmation Modal */}
      {showBidConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(6,5,26,.9)' }}>
          <div className="glass p-8 rounded-3xl text-center max-w-sm mx-4 animate-fade-in">
            <p className="text-4xl mb-3">🔨</p>
            <h3 className="text-xl font-bold text-slate-100 mb-2">Confirm Your Bid</h3>
            <p className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-1">
              {formatINR(pendingBidAmount)}
            </p>
            <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>on "{auction.title}"</p>
            <div className="flex gap-3 justify-center">
              <button onClick={confirmBid} className="btn-gradient px-8 py-3 text-lg">
                ✓ Confirm Bid
              </button>
              <button onClick={cancelBid} className="btn-outline px-6 py-3">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bid Battle Banner */}
      {bidBattle && (
        <div className="mb-4 rounded-2xl p-4 text-center animate-fade-in" style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)', boxShadow: '0 0 30px rgba(239,68,68,.4)' }}>
          <p className="text-2xl font-extrabold text-white mb-1">⚔️ BID BATTLE!</p>
          <p className="text-lg font-bold text-white/90">{bidBattle.users?.join(' vs ')}</p>
        </div>
      )}

      {/* Knock Countdown Banner — Enhanced */}
      {knockActive && (
        <div className={`mb-4 rounded-2xl p-4 text-center animate-knock-pulse ${knockShake ? 'animate-screen-shake' : ''}`} style={{
          background: 'linear-gradient(135deg, #7c3aed, #dc2626, #06b6d4)',
          boxShadow: '0 0 60px rgba(220,38,38,.5), 0 0 100px rgba(124,58,237,.3)',
          border: '2px solid rgba(220,38,38,.6)',
        }}>
          <p className="text-3xl font-extrabold text-white mb-1">⚡🔨 KNOCK!</p>
          <p className="text-lg text-white/90">{knockActive.userName} demands the win!</p>
          <p className="text-5xl font-extrabold text-white mt-2 animate-pulse-fast">{knockCountdown}s</p>
          <p className="text-sm text-white/70 mt-1">Outbid now or they win!</p>
          <div className="mt-2 w-full rounded-full h-2" style={{ background: 'rgba(255,255,255,.2)' }}>
            <div className="h-2 rounded-full bg-red-400 transition-all duration-1000" style={{ width: `${(knockCountdown / 15) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Going Once / Going Twice / Final Call */}
      {auctionPhase && auction.status === 'live' && (
        <div className={`mb-4 rounded-2xl p-4 text-center animate-fade-in ${
          auctionPhase === 'final' ? 'animate-pulse-fast' : ''
        }`} style={{
          background: auctionPhase === 'final' ? 'linear-gradient(135deg, #dc2626, #991b1b)' :
                      auctionPhase === 'twice' ? 'linear-gradient(135deg, #ea580c, #c2410c)' :
                      'linear-gradient(135deg, #d97706, #b45309)',
          boxShadow: auctionPhase === 'final' ? '0 0 40px rgba(220,38,38,.5)' : '0 0 20px rgba(217,119,6,.3)',
        }}>
          <p className="text-2xl font-extrabold text-white">
            {auctionPhase === 'final' ? '🔨 FINAL CALL!' :
             auctionPhase === 'twice' ? '🔨 Going Twice!' :
             '🔨 Going Once!'}
          </p>
          <p className="text-sm text-white/80 mt-1">
            {auctionPhase === 'final' ? 'Last chance to bid!' :
             auctionPhase === 'twice' ? 'Almost sold! Bid now!' :
             'Place your bid before it\'s too late!'}
          </p>
        </div>
      )}

      {/* Winner Confetti */}
      {showConfetti && auction.status === 'ended' && !showWinModal && (
        <div className="mb-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-2xl p-8 text-center animate-confetti">
          <p className="text-3xl font-bold mb-2">🎉 Congratulations!</p>
          <p className="text-lg">You won with {formatINR(auction.winningBid || auction.currentBid)}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* LEFT — Auction Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image Gallery + Details */}
          <div className="glass overflow-hidden fu1">
            <div className="relative">
              <img src={allImages[galleryIdx]} alt={auction.title} className="w-full h-64 md:h-80 object-cover transition-all duration-300" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* Gallery navigation arrows */}
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={() => setGalleryIdx((p) => (p - 1 + allImages.length) % allImages.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold transition-all hover:scale-110"
                    style={{ background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(8px)' }}
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setGalleryIdx((p) => (p + 1) % allImages.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold transition-all hover:scale-110"
                    style={{ background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(8px)' }}
                  >
                    ›
                  </button>
                </>
              )}

              {/* Gallery dots */}
              {allImages.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                  {allImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setGalleryIdx(i)}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${i === galleryIdx ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60'}`}
                    />
                  ))}
                </div>
              )}

              <div className="absolute top-4 left-4">
                <span className={`${getStatusColor(auction.status)} text-white text-sm font-bold px-4 py-1.5 rounded-full uppercase`}>
                  {auction.status}
                </span>
              </div>
              {auction.heatLevel !== 'calm' && (
                <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1.5 rounded-full text-sm font-bold">
                  {getHeatEmoji(auction.heatLevel)} {auction.heatLevel.toUpperCase()}
                </div>
              )}
              {/* Watcher Count */}
              {watcherCount > 0 && (
                <div className="absolute bottom-14 right-4 bg-black/70 text-white px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5">
                  <span>👁</span> <span>{watcherCount} watching</span>
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {allImages.length > 1 && (
              <div className="flex gap-2 px-6 pt-4">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setGalleryIdx(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden transition-all flex-shrink-0 ${i === galleryIdx ? 'ring-2 ring-purple-500 scale-105' : 'opacity-60 hover:opacity-100'}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-100">{auction.title}</h1>
                  <p className="mt-2" style={{ color: '#94a3b8' }}>{auction.description}</p>
                  <p className="text-xs mt-2" style={{ color: '#4b5563' }}>Category: {auction.category}</p>
                  {/* Retail Price Anchor */}
                  {auction.retailPrice > 0 && (
                    <div className="mt-3 flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.15)' }}>
                      <span className="text-sm line-through" style={{ color: '#64748b' }}>Retail: {formatINR(auction.retailPrice)}</span>
                      <span className="text-sm font-bold text-emerald-400">
                        Save {Math.round((1 - auction.currentBid / auction.retailPrice) * 100)}%
                      </span>
                    </div>
                  )}
                </div>
                {/* Interested Button */}
                {user?.role === 'bidder' && (
                  <button
                    onClick={toggleInterest}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      interested
                        ? 'text-pink-400 hover:scale-105'
                        : 'text-slate-400 hover:text-pink-400'
                    }`}
                    style={{ background: interested ? 'rgba(236,72,153,.12)' : 'rgba(255,255,255,.06)' }}
                  >
                    <span className="text-lg">{interested ? '❤️' : '🤍'}</span>
                    <span>{interestedCount}</span>
                  </button>
                )}
                {!user && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ color: '#64748b', background: 'rgba(255,255,255,.04)' }}>
                    <span>❤️</span> <span>{interestedCount} interested</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Battle Room Enter / Exit */}
          {auction.status === 'live' && user?.role === 'bidder' && !inBattleRoom && (
            <div className="glass p-6 text-center fu2">
              <p className="text-lg font-bold text-slate-100 mb-2">⚔️ Ready to Bid?</p>
              <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>Enter the Battle Room to place bids. You won't be able to leave unless you press Exit or win the auction.</p>
              <button onClick={enterBattleRoom} className="btn-gradient text-lg px-10 py-3">
                Enter Battle Room
              </button>
            </div>
          )}

          {/* Bid + Timer Section (visible in battle room or for non-bidder/ended/upcoming) */}
          {(inBattleRoom || auction.status !== 'live' || user?.role !== 'bidder') && (
          <div className="glass p-6 fu2">
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Current Bid */}
              <div>
                <p className="text-xs uppercase tracking-wider" style={{ color: '#64748b' }}>Current Bid</p>
                <p className={`text-4xl font-extrabold mt-1 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent ${bidFlash ? 'animate-bid-flash' : ''}`}>
                  {formatINR(auction.currentBid)}
                </p>
                {auction.highestBidder && (
                  <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
                    by <span className="font-medium text-slate-200">
                      👑 {auction.highestBidder.name || 'Unknown'}
                    </span>
                    {isWinning && <span className="ml-2 text-green-400 font-bold">That's You!</span>}
                  </p>
                )}
                <p className="text-xs mt-2" style={{ color: '#4b5563' }}>Min increment: {formatINR(effectiveIncrement || auction.minIncrement)}</p>
                {/* Reserve Price Status */}
                {auction.reservePrice > 0 && (
                  <div className={`mt-2 flex items-center gap-2 text-xs font-bold px-2 py-1 rounded-lg ${
                    auction.currentBid >= auction.reservePrice
                      ? 'text-emerald-400'
                      : 'text-red-400'
                  }`} style={{
                    background: auction.currentBid >= auction.reservePrice
                      ? 'rgba(16,185,129,.1)'
                      : 'rgba(239,68,68,.1)',
                  }}>
                    <span>{auction.currentBid >= auction.reservePrice ? '✓' : '✗'}</span>
                    <span>{auction.currentBid >= auction.reservePrice ? 'Reserve Met' : 'Reserve Not Met'}</span>
                  </div>
                )}
              </div>

              {/* Timer */}
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider" style={{ color: '#64748b' }}>
                  {auction.status === 'upcoming' ? 'Starts In' : auction.status === 'live' ? 'Time Left' : 'Status'}
                </p>
                <p className={`text-4xl font-extrabold mt-1 ${
                  isCritical ? 'text-red-500 animate-pulse-fast' :
                  isUrgent ? 'text-orange-500 animate-pulse' :
                  auction.status === 'ended' ? 'text-slate-500' :
                  'text-slate-100'
                }`}>
                  {timeDisplay}
                </p>
                <div className="mt-2 text-sm" style={{ color: '#4b5563' }}>
                  <p>{auction.totalBids} bids · {auction.bidders?.length || 0} bidders</p>
                </div>
              </div>
            </div>

            {/* Heat Meter */}
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm" style={{ color: '#64748b' }}>Auction Heat:</span>
              <div className="flex-1 rounded-full h-3" style={{ background: 'rgba(255,255,255,.08)' }}>
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    auction.heatLevel === 'hot' ? 'bg-red-500 w-full' :
                    auction.heatLevel === 'warm' ? 'bg-orange-400 w-2/3' :
                    'bg-green-400 w-1/3'
                  }`}
                />
              </div>
              <span className={`text-sm font-bold ${getHeatColor(auction.heatLevel)}`}>
                {getHeatEmoji(auction.heatLevel)}
              </span>
            </div>

            {/* Place Bid — only in battle room */}
            {auction.status === 'live' && user?.role === 'bidder' && inBattleRoom && (
              <div className="mt-6">
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => {
                      setBidAmount(e.target.value);
                      const val = Number(e.target.value);
                      const minIncr = effectiveIncrement || auction.minIncrement;
                      const minRequired = auction.currentBid + minIncr;
                      if (val && val < minRequired) {
                        setBidValidation(`Minimum bid: ${formatINR(minRequired)}`);
                      } else {
                        setBidValidation('');
                      }
                    }}
                    min={auction.currentBid + (effectiveIncrement || auction.minIncrement)}
                    className={`dark-input flex-1 text-lg font-bold ${bidValidation ? 'border-red-500' : ''}`}
                    placeholder={`Min ${formatINR(auction.currentBid + (effectiveIncrement || auction.minIncrement))}`}
                  />
                  <button onClick={placeBid} className="btn-gradient text-lg px-8">
                    {isWinning ? '🛡️ Defend Bid' : 'Place Bid'} {formatINR(Number(bidAmount) || 0)}
                  </button>
                </div>

                {/* Inline Bid Validation */}
                {bidValidation && (
                  <p className="mt-1.5 text-sm text-red-400 animate-fade-in">⚠️ {bidValidation}</p>
                )}

                {/* Proxy Bid Panel */}
                <div className="mt-3 rounded-xl p-3" style={{ background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.2)' }}>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={proxyEnabled}
                      onChange={(e) => setProxyEnabled(e.target.checked)}
                      className="w-4 h-4 accent-purple-500"
                    />
                    <span className="text-sm font-semibold text-slate-200">🤖 Auto-Bid (Proxy)</span>
                    <span className="text-xs ml-1" style={{ color: '#64748b' }}>— set max &amp; let the system bid for you</span>
                  </label>
                  {proxyEnabled && (
                    <div className="mt-2">
                      <input
                        type="number"
                        value={maxBidAmount}
                        onChange={(e) => setMaxBidAmount(e.target.value)}
                        placeholder={`Max bid limit (min: ${formatINR(auction.currentBid + (effectiveIncrement || auction.minIncrement) + 1)})`}
                        className="dark-input w-full text-sm"
                        min={auction.currentBid + (effectiveIncrement || auction.minIncrement) + 1}
                      />
                      <p className="mt-1 text-xs" style={{ color: '#64748b' }}>
                        System will auto-bid in increments up to your limit when someone outbids you.
                      </p>
                    </div>
                  )}
                </div>

                {/* Revenge Bid Button — when outbid */}
                {showRevenge && !isWinning && (
                  <button
                    onClick={revengeBid}
                    className="mt-3 w-full py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.01] animate-fade-in"
                    style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)', color: 'white', boxShadow: '0 0 25px rgba(239,68,68,.4)' }}
                  >
                    ⚡ Outbid them back! — {formatINR(auction.currentBid + (effectiveIncrement || auction.minIncrement))}
                  </button>
                )}

                {/* Knock Button — only for highest bidder — pulses to draw attention */}
                {isWinning && !knockActive && (
                  <button
                    onClick={handleKnock}
                    className="mt-3 w-full py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.01] animate-pulse-fast"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', color: 'white', boxShadow: '0 0 30px rgba(124,58,237,.6), 0 0 60px rgba(124,58,237,.2)' }}
                    title="You're winning! KNOCK to force a 15-second final countdown."
                  >
                    ⚡ KNOCK — You're Winning! Force 15s Countdown
                  </button>
                )}

                {/* Credit protection trust message */}
                <p className="mt-3 text-xs text-center" style={{ color: '#475569' }}>
                  🔒 Credits are locked only when bidding and released instantly if you're outbid.
                </p>

                {/* Exit Battle Room button */}
                <button
                  onClick={exitBattleRoom}
                  className="mt-4 w-full py-3 rounded-xl text-sm font-medium transition-all hover:scale-[1.01]"
                  style={{ background: 'rgba(239,68,68,.12)', color: '#f87171', border: '1px solid rgba(239,68,68,.2)' }}
                >
                  🚪 Exit Auction Arena
                </button>
              </div>
            )}
            {auction.status === 'upcoming' && (
              <div className="mt-6 py-3 text-center rounded-xl font-medium text-blue-300" style={{ background: 'rgba(59,130,246,.12)' }}>
                🔵 Auction Not Started — Bidding Locked
              </div>
            )}
            {auction.status === 'ended' && (
              <div className="mt-6 py-3 text-center rounded-xl font-medium" style={{ background: 'rgba(255,255,255,.04)', color: '#64748b' }}>
                Auction Ended {auction.winner ? `· Winner: ${auction.winner.name || 'Declared'}` : ''}
              </div>
            )}
          </div>
          )}

          {/* Bid History */}
          <div className="glass-card p-6 fu3">
            <h3 className="text-lg font-bold text-slate-100 mb-4">📜 Bid History</h3>
            {bids.length === 0 ? (
              <p className="text-sm" style={{ color: '#4b5563' }}>No bids yet</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {bids.map((b, i) => (
                  <div key={b._id} className={`flex items-center justify-between py-2 px-3 rounded-lg animate-fade-in ${i === 0 ? 'font-bold text-purple-300' : 'text-slate-300'}`} style={i === 0 ? { background: 'rgba(124,58,237,.12)' } : {}}>
                    <div className="flex items-center gap-3">
                      {i === 0 && <span className="text-lg">🏆</span>}
                      <span className="text-sm font-medium">{b.user?.name || 'Unknown'}</span>
                    </div>
                    <span className="font-bold">{formatINR(b.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bid Replay — post-auction timeline */}
          {auction.status === 'ended' && bids.length > 0 && (
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-100">🎬 Bid Replay</h3>
                <div className="flex items-center gap-2">
                  {replayActive && <span className="text-xs text-purple-400 animate-pulse">Playing...</span>}
                  {!replayActive && replayStep === 0 && (
                    <button onClick={startReplay} className="btn-gradient text-sm px-4 py-2">▶ Watch Replay</button>
                  )}
                  {replayActive && (
                    <button onClick={stopReplay} className="text-sm px-4 py-2 rounded-xl font-medium" style={{ background: 'rgba(239,68,68,.15)', color: '#f87171', border: '1px solid rgba(239,68,68,.2)' }}>⏹ Stop</button>
                  )}
                  {!replayActive && replayStep > 0 && replayStep < replayItems.length && (
                    <button onClick={startReplay} className="btn-gradient text-sm px-4 py-2">▶ Resume</button>
                  )}
                  {!replayActive && replayStep > 0 && (
                    <button onClick={resetReplay} className="text-sm px-3 py-2 rounded-xl font-medium" style={{ background: 'rgba(255,255,255,.06)', color: '#94a3b8' }}>↺ Reset</button>
                  )}
                </div>
              </div>

              {replayStep === 0 && !replayActive && (
                <p className="text-center text-sm py-6" style={{ color: '#4b5563' }}>Relive the auction — watch every bid play out in real time.</p>
              )}

              <div className="relative max-h-80 overflow-y-auto space-y-1" ref={replayScrollRef}>
                {replayStep > 0 && (
                  <div className="absolute left-[9px] top-2 bottom-2 w-px" style={{ background: 'rgba(124,58,237,.25)' }} />
                )}
                {replayItems.slice(0, replayStep).map((item, i) => {
                  const isLatest = i === replayStep - 1;
                  if (item.type === 'bid') return (
                    <div key={i} className={`flex items-center gap-3 pl-1 pr-2 py-1.5 rounded-xl transition-all ${isLatest ? 'animate-fade-in' : ''}`} style={isLatest ? { background: 'rgba(124,58,237,.1)' } : {}}>
                      <div className="flex-shrink-0 w-5 flex justify-center">
                        <div className={`w-2.5 h-2.5 rounded-full ${isLatest ? 'bg-purple-400 ring-2 ring-purple-400/40' : 'bg-slate-600'}`} />
                      </div>
                      <span className="text-xs font-mono w-20 flex-shrink-0" style={{ color: '#64748b' }}>{formatBidTime(item.bid.createdAt)}</span>
                      <span className="flex-1 text-sm text-slate-300 truncate">{item.bid.user?.name || 'Bidder'}</span>
                      <span className={`text-sm font-bold flex-shrink-0 ${isLatest ? 'text-purple-300' : 'text-slate-200'}`}>{formatINR(item.bid.amount)}</span>
                      {item.bid.isProxy && <span className="text-xs text-purple-400 flex-shrink-0">🤖</span>}
                    </div>
                  );
                  if (item.type === 'battle') return (
                    <div key={i} className={`flex justify-center py-1 ${isLatest ? 'animate-fade-in' : ''}`}>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(239,68,68,.15)', color: '#f87171' }}>⚔️ Bid Battle — Rapid Fire!</span>
                    </div>
                  );
                  if (item.type === 'winner') return (
                    <div key={i} className={`flex justify-center py-3 ${isLatest ? 'animate-fade-in' : ''}`}>
                      <div className="flex flex-col items-center gap-1 px-6 py-3 rounded-2xl" style={{ background: 'linear-gradient(135deg,rgba(245,158,11,.15),rgba(234,179,8,.08))', border: '1px solid rgba(245,158,11,.3)' }}>
                        <span className="text-2xl">👑</span>
                        <span className="text-sm font-extrabold text-amber-400">WINNER</span>
                        <span className="text-xs font-medium text-amber-300">{item.bid.user?.name || 'Winner'} · {formatINR(item.bid.amount)}</span>
                      </div>
                    </div>
                  );
                  return null;
                })}
              </div>

              {!replayActive && replayStep > 0 && replayStep >= replayItems.length && (
                <p className="text-center text-xs mt-4" style={{ color: '#4b5563' }}>Replay complete · {bids.length} bid{bids.length !== 1 ? 's' : ''} in this auction</p>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — Chat + Activity Feed */}
        <div className="space-y-6">
          {/* Live Chat */}
          <div className="glass flex flex-col h-[500px] fu4">
            <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,.08)' }}>
              <h3 className="text-lg font-bold text-slate-100">💬 Live Chat</h3>
              <p className="text-xs" style={{ color: '#4b5563' }}>{auction.bidders?.length || 0} participants</p>
            </div>

            {/* Messages */}
            <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={msg._id || i} className={`animate-slide-in ${
                  msg.type === 'system' ? 'text-center' :
                  msg.type === 'bid' ? '' :
                  msg.type === 'battle' ? 'text-center' :
                  msg.type === 'reaction' ? 'text-center' : ''
                }`}>
                  {msg.type === 'system' ? (
                    <p className="text-xs inline-block px-3 py-1 rounded-full" style={{ color: '#4b5563', background: 'rgba(255,255,255,.04)' }}>{msg.text}</p>
                  ) : msg.type === 'bid' ? (
                    <p className="text-sm font-medium px-3 py-2 rounded-xl text-green-400" style={{ background: 'rgba(34,197,94,.1)' }}>{msg.text}</p>
                  ) : msg.type === 'battle' ? (
                    <p className="text-sm font-bold px-3 py-2 rounded-xl text-red-400" style={{ background: 'rgba(239,68,68,.1)' }}>{msg.text}</p>
                  ) : msg.type === 'reaction' ? (
                    <p className="text-sm" style={{ color: '#94a3b8' }}>{msg.text}</p>
                  ) : (
                    <div className={`flex ${msg.user === user?._id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-xl ${
                        msg.user === user?._id
                          ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white'
                          : ''
                      }`} style={msg.user !== user?._id ? { background: 'rgba(255,255,255,.06)', color: '#e2e8f0' } : {}}>
                        <p className="text-xs font-bold opacity-70 mb-0.5">{msg.userName}</p>
                        <p className="text-sm">{msg.text}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Emoji Reactions */}
            <div className="px-4 py-2 flex gap-2" style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
              {['🔥', '💰', '👏', '⚡', '😮', '🎉'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="text-xl hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={sendMessage} className="p-3 flex gap-2" style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
              <input
                type="text"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                maxLength={500}
                className="dark-input flex-1 text-sm"
                placeholder="Type a message..."
              />
              <button type="submit" className="px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: 'rgba(124,58,237,.7)' }}>
                Send
              </button>
            </form>
          </div>

          {/* Live Activity Feed */}
          <div className="glass-card p-4 fu5">
            <h3 className="text-lg font-bold text-slate-100 mb-3">📡 Live Activity</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {activity.length === 0 ? (
                <p className="text-xs" style={{ color: '#4b5563' }}>Waiting for activity...</p>
              ) : (
                activity.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm animate-slide-in">
                    <span className={`w-2 h-2 rounded-full ${
                      e.type === 'bid' ? 'bg-green-500' :
                      e.type === 'join' ? 'bg-blue-500' :
                      'bg-gray-500'
                    }`} />
                    <span style={{ color: '#94a3b8' }}>{e.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Smart Bid Suggestion */}
          {auction.status === 'live' && user?.role === 'bidder' && (
            <div className="glass-card p-4 fu6">
              <h3 className="text-sm font-bold text-slate-100 mb-2">🤖 Smart Bid Assistant</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#64748b' }}>Suggested Bid</span>
                  <span className="font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                    {formatINR(Math.ceil((auction.currentBid + auction.minIncrement * 1.5) / 100) * 100)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#64748b' }}>Confidence</span>
                  <span className={`font-bold ${
                    auction.heatLevel === 'hot' ? 'text-red-500' :
                    auction.heatLevel === 'warm' ? 'text-orange-500' :
                    'text-green-500'
                  }`}>
                    {auction.heatLevel === 'hot' ? 'Low — High Competition' :
                     auction.heatLevel === 'warm' ? 'Medium' : 'High — Low Competition'}
                  </span>
                </div>
                <button
                  onClick={() => setBidAmount(String(Math.ceil((auction.currentBid + auction.minIncrement * 1.5) / 100) * 100))}
                  className="w-full py-2 text-sm font-medium rounded-xl transition-colors text-purple-300" style={{ background: 'rgba(124,58,237,.15)' }}
                >
                  Use Suggestion
                </button>
              </div>
            </div>
          )}

          {/* AI Price Prediction */}
          {aiPrediction && (
            <div className="glass-card p-4">
              <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-1.5">
                🔮 AI Price Prediction
                <span className="ml-auto text-xs font-normal" style={{ color: '#4b5563' }}>live model</span>
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs mb-1" style={{ color: '#64748b' }}>Predicted Final Price</p>
                  <p className="text-2xl font-extrabold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                    {formatINR(aiPrediction.predicted)}
                  </p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: '#64748b' }}>Confidence</span>
                  <span className="font-bold" style={{ color: aiPrediction.confidence >= 70 ? '#10b981' : aiPrediction.confidence >= 55 ? '#f59e0b' : '#ef4444' }}>
                    {aiPrediction.confidence}%
                  </span>
                </div>
                <div className="w-full rounded-full h-2" style={{ background: 'rgba(255,255,255,.08)' }}>
                  <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${aiPrediction.confidence}%`, background: 'linear-gradient(90deg,#7c3aed,#22d3ee)' }} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg text-center px-2 py-2" style={{ background: 'rgba(255,255,255,.04)' }}>
                    <p className="text-xs" style={{ color: '#64748b' }}>Avg Increment</p>
                    <p className="text-sm font-bold text-slate-200 mt-0.5">{formatINR(aiPrediction.avgIncr)}</p>
                  </div>
                  <div className="rounded-lg text-center px-2 py-2" style={{ background: 'rgba(255,255,255,.04)' }}>
                    <p className="text-xs" style={{ color: '#64748b' }}>Projected Bids</p>
                    <p className="text-sm font-bold text-slate-200 mt-0.5">+5 more</p>
                  </div>
                </div>
                <p className="text-xs" style={{ color: '#4b5563' }}>Based on bid velocity &amp; increment patterns</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── STICKY MOBILE BID BAR ─── visible only on small screens, only in battle room */}
      {auction.status === 'live' && user?.role === 'bidder' && inBattleRoom && (
        <div
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 py-3 flex gap-2"
          style={{ background: 'rgba(6,5,26,.95)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(124,58,237,.3)' }}
        >
          <input
            type="number"
            value={bidAmount}
            onChange={(e) => {
              setBidAmount(e.target.value);
              const val = Number(e.target.value);
              const minRequired = auction.currentBid + (effectiveIncrement || auction.minIncrement);
              setBidValidation(val && val < minRequired ? `Min: ${formatINR(minRequired)}` : '');
            }}
            min={auction.currentBid + (effectiveIncrement || auction.minIncrement)}
            className="dark-input flex-1 text-base font-bold"
            placeholder={`Min ${formatINR(auction.currentBid + (effectiveIncrement || auction.minIncrement))}`}
          />
          <button
            onClick={placeBid}
            className="btn-gradient px-5 text-sm font-bold whitespace-nowrap"
            style={isWinning ? { background: 'linear-gradient(135deg,#10b981,#06b6d4)' } : {}}
          >
            {isWinning ? '🛡️ Defend' : '⚡ Bid'} {formatINR(Number(bidAmount) || 0)}
          </button>
        </div>
      )}
    </div>
  );
}
