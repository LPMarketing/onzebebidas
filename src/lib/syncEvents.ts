// Event dispatcher to keep Admin Dashboard, Client Details, and Movements in sync immediately without F5
export const notifyDataChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('onze:data-changed'));
    try {
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel('onze_events_channel');
        channel.postMessage({ type: 'DATA_CHANGED', timestamp: Date.now() });
        channel.close();
      }
    } catch {}
  }
};

export const subscribeDataChanged = (callback: () => void) => {
  if (typeof window === 'undefined') return () => {};

  const handler = () => {
    callback();
  };

  window.addEventListener('onze:data-changed', handler);
  window.addEventListener('focus', handler);

  let channel: BroadcastChannel | null = null;
  try {
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel('onze_events_channel');
      channel.onmessage = (e) => {
        if (e.data?.type === 'DATA_CHANGED') {
          callback();
        }
      };
    }
  } catch {}

  return () => {
    window.removeEventListener('onze:data-changed', handler);
    window.removeEventListener('focus', handler);
    if (channel) {
      try {
        channel.close();
      } catch {}
    }
  };
};
