import React, { useState, useEffect } from 'react';
import { AudioQuote } from '../types.ts';

interface PassTheVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotes: AudioQuote[];
  selectedQuoteId: number | null;
  onSelectQuote: (id: number) => void;
}

export const PassTheVoiceModal: React.FC<PassTheVoiceModalProps> = ({
  isOpen,
  onClose,
  quotes,
  selectedQuoteId,
  onSelectQuote,
}) => {
  const [activeQuoteId, setActiveQuoteId] = useState<number>(selectedQuoteId || 1);
  const [copied, setCopied] = useState(false);
  const [nativeFeedback, setNativeFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (selectedQuoteId) {
      setActiveQuoteId(selectedQuoteId);
    } else if (quotes.length > 0) {
      setActiveQuoteId(quotes[0].id);
    }
  }, [selectedQuoteId, quotes, isOpen]);

  if (!isOpen) return null;

  const currentQuote = quotes.find((q) => q.id === activeQuoteId) || quotes[0];
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/?v=${currentQuote?.id || 1}`;
  const shareText = `“${currentQuote?.quote || ''}”\n— Shaheed Osman Hadi's voice recording:\n${shareUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const safeOpenLink = (url: string) => {
    try {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      try {
        window.open(url, '_blank', 'noopener,noreferrer');
      } catch {
        // Fallback
      }
    }
  };

  const handleWhatsApp = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    safeOpenLink(waUrl);
  };

  const handleFacebook = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    safeOpenLink(fbUrl);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'WHO IS HADI? - Shaheed Osman Hadi',
          text: `“${currentQuote?.quote}”`,
          url: shareUrl,
        });
        setNativeFeedback('Shared successfully');
        setTimeout(() => setNativeFeedback(null), 2500);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pass-voice-title"
    >
      <div className="bg-[#0D0D0D] border border-neutral-800 rounded-xl max-w-lg w-full p-4 sm:p-6 my-auto shadow-2xl relative flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D71920]" />
            <h2 id="pass-voice-title" className="font-cinzel text-sm sm:text-base font-bold text-white tracking-widest uppercase">
              PASS THE VOICE
            </h2>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="w-7 h-7 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-sm"
            aria-label="Close share dialog"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 py-4 space-y-4">
          {/* Select quote */}
          <div>
            <label className="block text-[11px] font-sans uppercase tracking-wider text-neutral-400 mb-1">
              Select Quote & Recording to Pass
            </label>
            <select
              value={activeQuoteId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setActiveQuoteId(id);
                onSelectQuote(id);
              }}
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-xs text-white font-bangla focus:outline-none focus:border-[#D71920]"
            >
              {quotes.map((q) => (
                <option key={q.id} value={q.id}>
                  #{q.id} - {q.quote.slice(0, 40)}...
                </option>
              ))}
            </select>
          </div>

          {/* Selected Quote Card Preview */}
          <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800/80 text-center relative overflow-hidden">
            <div className="w-8 h-[2px] bg-[#D71920] mx-auto mb-3" />
            <p className="font-bangla text-base sm:text-lg text-white font-medium leading-relaxed">
              “{currentQuote?.quote}”
            </p>
            <span className="text-[11px] text-neutral-500 font-sans tracking-wide block mt-2">
              Recording #{currentQuote?.id} · Authentic Voice
            </span>
          </div>

          {/* Shareable Link Box */}
          <div>
            <label className="block text-[11px] font-sans uppercase tracking-wider text-neutral-400 mb-1">
              Unique Shareable Link
            </label>
            <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded p-1.5 pl-3">
              <span className="text-xs text-neutral-300 font-mono truncate flex-1 select-all">
                {shareUrl}
              </span>
              <button
                onClick={handleCopy}
                type="button"
                className={`px-3 py-1.5 rounded text-xs font-sans transition-colors cursor-pointer shrink-0 ${
                  copied
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700'
                }`}
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>

          {/* Direct Share Channels: WhatsApp, Facebook, Native */}
          <div>
            <span className="block text-[11px] font-sans uppercase tracking-wider text-neutral-400 mb-2">
              Share Directly
            </span>

            <div className="grid grid-cols-3 gap-2">
              {/* WhatsApp */}
              <button
                onClick={handleWhatsApp}
                type="button"
                className="py-2.5 px-3 rounded bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-xs text-neutral-200 hover:text-white flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z" />
                </svg>
                <span className="text-[11px] font-sans">WhatsApp</span>
              </button>

              {/* Facebook */}
              <button
                onClick={handleFacebook}
                type="button"
                className="py-2.5 px-3 rounded bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-xs text-neutral-200 hover:text-white flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span className="text-[11px] font-sans">Facebook</span>
              </button>

              {/* Native device share */}
              <button
                onClick={handleNativeShare}
                type="button"
                className="py-2.5 px-3 rounded bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-xs text-neutral-200 hover:text-white flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 text-[#D71920]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <span className="text-[11px] font-sans">More...</span>
              </button>
            </div>

            {nativeFeedback && (
              <p className="text-xs text-emerald-400 mt-2 text-center font-sans">
                {nativeFeedback}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-neutral-800 text-center text-[11px] text-neutral-500 font-sans shrink-0">
          When opened, the recipient sees this authentic recording and can pass it forward.
        </div>
      </div>
    </div>
  );
};
