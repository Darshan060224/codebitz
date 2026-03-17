export function formatINR(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

export function getTimeLeft(endTime) {
  const diff = new Date(endTime) - new Date();
  if (diff <= 0) return { text: 'Ended', seconds: 0, urgent: false };

  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);

  let text = '';
  if (hours > 0) text += `${hours}h `;
  if (mins > 0) text += `${mins}m `;
  text += `${secs}s`;

  return {
    text: text.trim(),
    seconds: diff / 1000,
    urgent: diff < 60000,
    critical: diff < 10000,
  };
}

export function getTimeTo(startTime) {
  const diff = new Date(startTime) - new Date();
  if (diff <= 0) return { text: 'Started', started: true };

  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);

  let text = '';
  if (hours > 0) text += `${hours}h `;
  if (mins > 0) text += `${mins}m `;
  text += `${secs}s`;

  return { text: text.trim(), started: false };
}

export function getHeatColor(level) {
  switch (level) {
    case 'hot': return 'text-red-500';
    case 'warm': return 'text-orange-500';
    default: return 'text-green-500';
  }
}

export function getHeatEmoji(level) {
  switch (level) {
    case 'hot': return '🔥🔥🔥';
    case 'warm': return '🔥🔥';
    default: return '🟢';
  }
}

export function getStatusColor(status) {
  switch (status) {
    case 'live': return 'bg-green-500';
    case 'upcoming': return 'bg-blue-500';
    case 'ended': return 'bg-gray-500';
    case 'paused': return 'bg-yellow-500';
    default: return 'bg-gray-400';
  }
}
