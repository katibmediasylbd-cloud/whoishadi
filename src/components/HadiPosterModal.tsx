import React, { useState, useEffect, useRef } from 'react';
import { AudioQuote } from '../types.ts';

export const POSTER_PORTRAITS = [
  {
    id: 'hadi_35',
    title: 'প্রতিকৃতি ১',
    url: 'https://res.cloudinary.com/ghxx4dt3/image/upload/v1791639922/Hadi_35.jpg',
  },
  {
    id: 'hadi_05',
    title: 'প্রতিকৃতি ২',
    url: 'https://res.cloudinary.com/ghxx4dt3/image/upload/v1791644506/Hadi_05.jpg',
  },
  {
    id: 'hadi_46',
    title: 'প্রতিকৃতি ৩',
    url: 'https://res.cloudinary.com/ghxx4dt3/image/upload/v1791644506/Hadi_46.jpg',
  },
];

interface HadiPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotes: AudioQuote[];
  initialQuoteId: number | null;
  portraitUrl: string | null;
}

export const HadiPosterModal: React.FC<HadiPosterModalProps> = ({
  isOpen,
  onClose,
  quotes,
  initialQuoteId,
  portraitUrl,
}) => {
  const [selectedQuoteId, setSelectedQuoteId] = useState<number>(initialQuoteId || 1);
  const [selectedPortraitUrl, setSelectedPortraitUrl] = useState<string>(
    portraitUrl || POSTER_PORTRAITS[0].url
  );
  const [format, setFormat] = useState<'square' | 'story'>('square'); // 1:1 or 9:16
  const [typeStyle, setTypeStyle] = useState<'blood' | 'handwriting' | 'classic'>('blood'); // Blood effect, Handwriting, Classic Bold
  const [creatorName, setCreatorName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewImgRef = useRef<string | null>(null);

  // Sync selected quote when modal opens or initialQuoteId changes
  useEffect(() => {
    if (initialQuoteId && quotes.some((q) => q.id === initialQuoteId)) {
      setSelectedQuoteId(initialQuoteId);
    } else if (quotes.length > 0) {
      setSelectedQuoteId(quotes[0].id);
    }
  }, [initialQuoteId, quotes, isOpen]);

  const selectedQuote = quotes.find((q) => q.id === selectedQuoteId) || quotes[0];

  // Helper to draw artistic crimson blood splatter & revolutionary spray accents
  const drawBloodSplatter = (
    ctx: CanvasRenderingContext2D,
    width: number,
    barY: number,
    textY: number,
    textHeight: number
  ) => {
    ctx.save();
    // Deterministic organic crimson droplets around the quote area
    const splatters = [
      { x: width / 2 - 320, y: textY - 18, r: 3.2, alpha: 0.7 },
      { x: width / 2 - 336, y: textY - 10, r: 1.8, alpha: 0.5 },
      { x: width / 2 - 308, y: textY - 26, r: 1.2, alpha: 0.4 },
      { x: width / 2 + 330, y: textY + 20, r: 3.5, alpha: 0.75 },
      { x: width / 2 + 348, y: textY + 34, r: 2.0, alpha: 0.55 },
      { x: width / 2 + 360, y: textY + 46, r: 1.4, alpha: 0.35 },
      { x: width / 2 - 260, y: textY + textHeight + 14, r: 2.8, alpha: 0.7 },
      { x: width / 2 - 275, y: textY + textHeight + 22, r: 1.6, alpha: 0.45 },
      { x: width / 2 + 280, y: textY + textHeight + 18, r: 3.8, alpha: 0.8 },
      { x: width / 2 + 296, y: textY + textHeight + 32, r: 2.2, alpha: 0.5 },
      { x: width / 2 - 25, y: barY + 10, r: 2.4, alpha: 0.8 },
      { x: width / 2 + 22, y: barY + 12, r: 3.0, alpha: 0.85 },
      { x: width / 2 + 24, y: barY + 18, r: 1.6, alpha: 0.6 },
    ];

    for (const s of splatters) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(215, 25, 32, ${s.alpha})`;
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Distressed blood-red accent bar
    ctx.fillStyle = '#D71920';
    ctx.fillRect((width - 70) / 2, barY, 70, 4);

    ctx.restore();
  };

  // Render canvas poster whenever parameters change
  useEffect(() => {
    if (!isOpen || !selectedQuote) return;

    let isCancelled = false;

    const renderPoster = async () => {
      setIsGenerating(true);

      // Ensure fonts are ready before drawing
      try {
        if (typeof document !== 'undefined' && document.fonts) {
          await document.fonts.ready;
        }
      } catch {
        // continue if font API fails
      }

      const canvas = canvasRef.current || document.createElement('canvas');
      canvasRef.current = canvas;

      const isStory = format === 'story';
      const width = 1080;
      const height = isStory ? 1920 : 1080;

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Deep velvety memorial background
      ctx.fillStyle = '#060606';
      ctx.fillRect(0, 0, width, height);

      // 2. Subtle inset memorial border
      const inset = isStory ? 48 : 36;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);

      // Crimson corner brackets
      const cornerLen = 22;
      ctx.strokeStyle = '#D71920';
      ctx.lineWidth = 2.5;

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(inset, inset + cornerLen);
      ctx.lineTo(inset, inset);
      ctx.lineTo(inset + cornerLen, inset);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(width - inset - cornerLen, inset);
      ctx.lineTo(width - inset, inset);
      ctx.lineTo(width - inset, inset + cornerLen);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(inset, height - inset - cornerLen);
      ctx.lineTo(inset, height - inset);
      ctx.lineTo(inset + cornerLen, height - inset);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(width - inset - cornerLen, height - inset);
      ctx.lineTo(width - inset, height - inset);
      ctx.lineTo(width - inset, height - inset - cornerLen);
      ctx.stroke();

      // 3. Ambient Crimson Radial Glow behind portrait
      const glowY = isStory ? 520 : 310;
      const glowRadius = isStory ? 540 : 390;
      const glow = ctx.createRadialGradient(width / 2, glowY, 40, width / 2, glowY, glowRadius);
      glow.addColorStop(0, 'rgba(215, 25, 32, 0.35)');
      glow.addColorStop(0.45, 'rgba(215, 25, 32, 0.08)');
      glow.addColorStop(1, 'rgba(6, 6, 6, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // 4. Header Wordmark: WHO IS HADI?
      ctx.save();
      ctx.fillStyle = '#C8C8C8';
      ctx.font = '600 22px "Cinzel", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if ('letterSpacing' in ctx) {
        ctx.letterSpacing = '8px';
      }
      const headerY = isStory ? 135 : 75;
      ctx.fillText('WHO IS HADI?', width / 2, headerY);
      ctx.restore();

      // 5. Load and Draw Osman Hadi's Portrait with full frame fill (cover)
      const activePortrait = selectedPortraitUrl || portraitUrl || POSTER_PORTRAITS[0].url;
      let portraitBottomY = isStory ? 820 : 475;

      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = activePortrait;
        });

        if (!isCancelled && img.width > 0) {
          // Frame dimensions
          const frameW = isStory ? 530 : 375;
          const frameH = isStory ? 640 : 365;
          const frameX = (width - frameW) / 2;
          const frameY = isStory ? 200 : 105;
          const radius = 20;

          portraitBottomY = frameY + frameH;

          // Draw rounded arched container clipping path
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(frameX + radius, frameY);
          ctx.lineTo(frameX + frameW - radius, frameY);
          ctx.quadraticCurveTo(frameX + frameW, frameY, frameX + frameW, frameY + radius);
          ctx.lineTo(frameX + frameW, frameY + frameH - radius);
          ctx.quadraticCurveTo(frameX + frameW, frameY + frameH, frameX + frameW - radius, frameY + frameH);
          ctx.lineTo(frameX + radius, frameY + frameH);
          ctx.quadraticCurveTo(frameX, frameY + frameH, frameX, frameY + frameH - radius);
          ctx.lineTo(frameX, frameY + radius);
          ctx.quadraticCurveTo(frameX, frameY, frameX + radius, frameY);
          ctx.closePath();
          ctx.clip();

          // Grayscale & rich contrast
          ctx.filter = 'grayscale(100%) contrast(115%) brightness(95%)';

          // FULFILL / COVER frame completely without any side gaps (Math.max)
          const hRatio = frameH / img.height;
          const wRatio = frameW / img.width;
          const ratio = Math.max(hRatio, wRatio);
          const drawW = img.width * ratio;
          const drawH = img.height * ratio;
          const drawX = frameX + (frameW - drawW) / 2;
          // Position vertically with natural focus on upper face area
          const drawY = Math.min(frameY, frameY + (frameH - drawH) * 0.18);

          ctx.drawImage(img, drawX, drawY, drawW, drawH);

          // Smooth bottom gradient fade into card background
          const fadeHeight = 110;
          const fadeGrad = ctx.createLinearGradient(0, frameY + frameH - fadeHeight, 0, frameY + frameH);
          fadeGrad.addColorStop(0, 'rgba(6, 6, 6, 0)');
          fadeGrad.addColorStop(0.7, 'rgba(6, 6, 6, 0.7)');
          fadeGrad.addColorStop(1, 'rgba(6, 6, 6, 1)');
          ctx.fillStyle = fadeGrad;
          ctx.fillRect(frameX - 10, frameY + frameH - fadeHeight, frameW + 20, fadeHeight + 10);

          ctx.restore();

          // Soft frame stroke rim
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(frameX, frameY, frameW, frameH, radius);
          ctx.stroke();
          ctx.restore();
        }
      } catch (e) {
        console.warn('Poster portrait draw error:', e);
      }

      if (isCancelled) return;

      // 6. Crimson Accent Divider Bar
      const barY = isStory ? portraitBottomY + 55 : portraitBottomY + 35;
      if (typeStyle !== 'blood') {
        ctx.fillStyle = '#D71920';
        ctx.fillRect((width - 55) / 2, barY, 55, 3.5);
      }

      // 7. BANGLA QUOTE TYPOGRAPHY - BOLD, LARGE, IMPACTFUL & STYLE-DRIVEN
      const rawQuote = selectedQuote.quote.trim();
      const quoteText = `“${rawQuote}”`;
      const quoteLength = rawQuote.length;

      // Dynamically size quotes so they are significantly LARGER and majestic
      let baseFontSize = isStory ? 64 : 54;
      if (quoteLength <= 24) {
        baseFontSize = isStory ? 74 : 64; // Massive slogan impact
      } else if (quoteLength <= 44) {
        baseFontSize = isStory ? 64 : 54;
      } else {
        baseFontSize = isStory ? 56 : 48;
      }

      const lineHeight = Math.round(baseFontSize * 1.36);
      const maxTextWidth = isStory ? 870 : 850;

      // Select font family according to chosen type style
      let chosenFontFamily = '"Hind Siliguri", "Anek Bangla", sans-serif';
      let fontWeight = '700';

      if (typeStyle === 'handwriting') {
        chosenFontFamily = '"Atma", "Galada", cursive, sans-serif';
        fontWeight = '700';
      } else if (typeStyle === 'blood') {
        chosenFontFamily = '"Anek Bangla", "Hind Siliguri", sans-serif';
        fontWeight = '800';
      }

      ctx.save();
      // Reset letterSpacing and wordSpacing to 0 so Bengali letters never separate
      if ('letterSpacing' in ctx) {
        ctx.letterSpacing = '0px';
      }
      if ('wordSpacing' in ctx) {
        ctx.wordSpacing = '0px';
      }

      ctx.font = `${fontWeight} ${baseFontSize}px ${chosenFontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // Precise word-wrap algorithm for Bengali text
      const words = quoteText.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxTextWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }

      const totalTextHeight = lines.length * lineHeight;
      const startQuoteY = isStory ? barY + 60 : barY + 45;

      // Render Blood Effect if active
      if (typeStyle === 'blood') {
        // Draw organic blood splatter droplets around quote
        drawBloodSplatter(ctx, width, barY, startQuoteY, totalTextHeight);

        // Underlying crimson blood-bleed shadow layer
        ctx.save();
        ctx.shadowColor = '#D71920';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#D71920';
        lines.forEach((line, idx) => {
          ctx.fillText(line, width / 2, startQuoteY + idx * lineHeight);
        });
        ctx.restore();

        // Slight crimson offset bleed for raw revolutionary stencil edge
        ctx.save();
        ctx.fillStyle = 'rgba(215, 25, 32, 0.7)';
        lines.forEach((line, idx) => {
          ctx.fillText(line, width / 2 + 1, startQuoteY + idx * lineHeight + 1);
        });
        ctx.restore();
      } else if (typeStyle === 'handwriting') {
        // Subtle crimson warmth glow under handwriting
        ctx.save();
        ctx.shadowColor = 'rgba(215, 25, 32, 0.4)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#D71920';
        lines.forEach((line, idx) => {
          ctx.fillText(line, width / 2, startQuoteY + idx * lineHeight + 1);
        });
        ctx.restore();
      }

      // Draw Main Crisp Text
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = '#FFFFFF';
      lines.forEach((line, idx) => {
        ctx.fillText(line, width / 2, startQuoteY + idx * lineHeight);
      });
      ctx.restore();
      ctx.restore(); // end quote typography

      // 8. Optional Visitor Tribute Name (Enlarged by 20% with clean crimson tribute accent)
      const textEndY = startQuoteY + totalTextHeight;
      if (creatorName.trim()) {
        ctx.save();
        if ('letterSpacing' in ctx) {
          ctx.letterSpacing = '0px';
        }
        if ('wordSpacing' in ctx) {
          ctx.wordSpacing = '0px';
        }
        const tributeFontSize = isStory ? 32 : 29;
        ctx.font = `600 ${tributeFontSize}px "Hind Siliguri", "Noto Serif Bengali", sans-serif`;
        ctx.fillStyle = '#E2E2E2';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 1;
        ctx.fillText(`— শ্রদ্ধায়: ${creatorName.trim()}`, width / 2, textEndY + (isStory ? 42 : 32));
        ctx.restore();
      }

      // 9. Bottom Footer: Refined Memorial Credits
      ctx.save();
      const footerY = isStory ? height - 120 : height - 75;
      ctx.fillStyle = '#6E6E6E';
      ctx.font = '500 16px "Cinzel", -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if ('letterSpacing' in ctx) {
        ctx.letterSpacing = '5px';
      }
      ctx.fillText("HADI'S VOICE · HADI'S WORDS · HADI'S LEGACY", width / 2, footerY);

      // Website URL credit
      ctx.fillStyle = '#484848';
      ctx.font = '400 13px -apple-system, sans-serif';
      if ('letterSpacing' in ctx) {
        ctx.letterSpacing = '2px';
      }
      ctx.fillText('whoishadi.com', width / 2, footerY + 26);
      ctx.restore();

      previewImgRef.current = canvas.toDataURL('image/png');
      setIsGenerating(false);
    };

    renderPoster();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, selectedQuote, selectedPortraitUrl, format, typeStyle, creatorName, portraitUrl]);

  if (!isOpen) return null;

  // Download high-resolution PNG
  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `who-is-hadi-poster-${selectedQuote.id}-${format}-${typeStyle}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  // Native share poster image file or fallback
  const handleShare = async () => {
    if (!canvasRef.current) return;

    try {
      if (navigator.share) {
        canvasRef.current.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], `who-is-hadi-${selectedQuote.id}.png`, { type: 'image/png' });

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: 'WHO IS HADI?',
              text: `“${selectedQuote.quote}” — Shaheed Osman Hadi`,
              files: [file],
            });
            setShareFeedback('Shared successfully');
          } else {
            const shareUrl = `${window.location.origin}/?v=${selectedQuote.id}`;
            await navigator.share({
              title: 'WHO IS HADI?',
              text: `“${selectedQuote.quote}” — Shaheed Osman Hadi\n${shareUrl}`,
              url: shareUrl,
            });
            setShareFeedback('Link shared');
          }
        }, 'image/png');
      } else {
        handleDownload();
        const shareUrl = `${window.location.origin}/?v=${selectedQuote.id}`;
        await navigator.clipboard.writeText(shareUrl);
        setShareFeedback('Poster downloaded & link copied!');
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        handleDownload();
      }
    }

    setTimeout(() => setShareFeedback(null), 3000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hadi-poster-title"
    >
      <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl max-w-2xl w-full p-4 sm:p-6 my-auto shadow-2xl relative flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D71920]" />
            <h2 id="hadi-poster-title" className="font-cinzel text-sm sm:text-base font-bold text-white tracking-widest uppercase">
              HADI POSTER
            </h2>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="w-7 h-7 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-sm"
            aria-label="Close poster creator"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 py-4 space-y-4">
          {/* 1. Photo Selection: Choose from 3 authentic portraits */}
          <div>
            <label className="block text-[11px] font-sans uppercase tracking-wider text-neutral-400 mb-1.5">
              পোস্টারের ছবি নির্বাচন করুন
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {POSTER_PORTRAITS.map((p, idx) => {
                const isSelected = selectedPortraitUrl === p.url;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPortraitUrl(p.url)}
                    className={`relative p-1 rounded-lg border transition-all flex flex-col items-center gap-1 cursor-pointer overflow-hidden ${
                      isSelected
                        ? 'bg-neutral-900 border-[#D71920] shadow-sm ring-1 ring-[#D71920]'
                        : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700 opacity-65 hover:opacity-100'
                    }`}
                  >
                    <div className="w-full aspect-[4/5] rounded overflow-hidden bg-black relative">
                      <img
                        src={p.url}
                        alt={p.title}
                        className="w-full h-full object-cover filter grayscale contrast-110"
                      />
                      {isSelected && (
                        <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#D71920] text-white flex items-center justify-center text-[10px] font-bold shadow">
                          ✓
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-bangla text-neutral-300 truncate w-full text-center">
                      {p.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Controls: Quote selector, format */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Select Quote */}
            <div>
              <label className="block text-[11px] font-sans uppercase tracking-wider text-neutral-400 mb-1">
                উক্তি নির্বাচন করুন
              </label>
              <select
                value={selectedQuoteId}
                onChange={(e) => setSelectedQuoteId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-xs text-white font-bangla focus:outline-none focus:border-[#D71920]"
              >
                {quotes.map((q) => (
                  <option key={q.id} value={q.id}>
                    #{q.id} - {q.quote.slice(0, 36)}...
                  </option>
                ))}
              </select>
            </div>

            {/* Format toggle: 1:1 vs 9:16 */}
            <div>
              <label className="block text-[11px] font-sans uppercase tracking-wider text-neutral-400 mb-1">
                ফরম্যাট সাইজ
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-950 border border-neutral-800 rounded">
                <button
                  type="button"
                  onClick={() => setFormat('square')}
                  className={`py-1.5 text-xs rounded font-sans transition-colors cursor-pointer ${
                    format === 'square'
                      ? 'bg-neutral-800 text-white font-semibold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  1:1 Square
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('story')}
                  className={`py-1.5 text-xs rounded font-sans transition-colors cursor-pointer ${
                    format === 'story'
                      ? 'bg-neutral-800 text-white font-semibold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  9:16 Story
                </button>
              </div>
            </div>
          </div>

          {/* Typography Style Selector (Blood Effect vs Handwriting vs Classic) */}
          <div>
            <label className="block text-[11px] font-sans uppercase tracking-wider text-neutral-400 mb-1.5">
              টাইপ স্টাইল (Typography Style)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTypeStyle('blood')}
                className={`py-2 px-2 rounded text-xs font-sans transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                  typeStyle === 'blood'
                    ? 'bg-red-950/80 border-[#D71920] text-red-200 font-semibold shadow-sm'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#D71920]" />
                <span className="truncate">ব্লাড ইফেক্ট</span>
              </button>

              <button
                type="button"
                onClick={() => setTypeStyle('handwriting')}
                className={`py-2 px-2 rounded text-xs font-sans transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                  typeStyle === 'handwriting'
                    ? 'bg-neutral-850 border-neutral-600 text-white font-semibold shadow-sm'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                }`}
              >
                <span>✍️</span>
                <span className="truncate">হ্যান্ডরাইটিং</span>
              </button>

              <button
                type="button"
                onClick={() => setTypeStyle('classic')}
                className={`py-2 px-2 rounded text-xs font-sans transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                  typeStyle === 'classic'
                    ? 'bg-neutral-850 border-neutral-600 text-white font-semibold shadow-sm'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                }`}
              >
                <span>🏛</span>
                <span className="truncate">ক্লাসিক বোল্ড</span>
              </button>
            </div>
          </div>

          {/* Optional Name Input */}
          <div>
            <label className="block text-[11px] font-sans uppercase tracking-wider text-neutral-400 mb-1">
              আপনার নাম (ঐচ্ছিক শ্রদ্ধাঞ্জলি ক্রেডিট)
            </label>
            <input
              type="text"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              placeholder="e.g. আপনার নাম..."
              maxLength={40}
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-xs text-white font-bangla placeholder-neutral-600 focus:outline-none focus:border-[#D71920]"
            />
          </div>

          {/* Poster Live Canvas / Preview */}
          <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-neutral-950 border border-neutral-900 rounded-lg">
            <canvas ref={canvasRef} className="hidden" />

            {/* Responsive visual preview */}
            <div
              className={`relative bg-[#060606] border border-neutral-800 rounded-lg overflow-hidden shadow-2xl flex items-center justify-center transition-all ${
                format === 'square' ? 'w-64 sm:w-72 aspect-square' : 'w-48 sm:w-56 aspect-[9/16]'
              }`}
            >
              {previewImgRef.current ? (
                <img
                  src={previewImgRef.current}
                  alt="Poster Preview"
                  className="w-full h-full object-contain select-none pointer-events-none"
                />
              ) : (
                <div className="text-neutral-500 text-xs font-sans">Generating photo card...</div>
              )}
            </div>

            <p className="text-[11px] text-neutral-500 mt-2 font-sans tracking-wide">
              {format === 'square' ? '1080 × 1080 px PNG' : '1080 × 1920 px PNG'} · হাই-রেজ্যুলেশন প্রিমিয়াম কার্ড
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-neutral-400 font-sans">
            {shareFeedback && <span className="text-emerald-400 font-medium">{shareFeedback}</span>}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={isGenerating}
              type="button"
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-sans rounded border border-neutral-700 hover:border-neutral-600 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Download PNG</span>
            </button>

            <button
              onClick={handleShare}
              disabled={isGenerating}
              type="button"
              className="px-4 py-2 bg-[#D71920] hover:bg-[#b8141a] text-white text-xs font-sans font-semibold rounded transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              <span>Share Poster</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
