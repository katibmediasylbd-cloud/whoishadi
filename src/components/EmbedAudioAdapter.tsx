import React from 'react';
import { AudioQuote } from '../types.ts';

interface EmbedAudioAdapterProps {
  clip: AudioQuote;
}

export const EmbedAudioAdapter: React.FC<EmbedAudioAdapterProps> = ({ clip }) => {
  const url = clip.audioUrl;

  // Determine provider
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
  const isSoundCloud = url.includes('soundcloud.com');
  const isArchiveOrg = url.includes('archive.org');

  // Extract YouTube ID
  let youtubeEmbedUrl = '';
  if (isYouTube) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      youtubeEmbedUrl = `https://www.youtube.com/embed/${match[2]}?autoplay=1&enablejsapi=1`;
    }
  }

  return (
    <div className="w-full max-w-md mx-auto my-3 p-3 bg-neutral-900/80 border border-neutral-800 rounded-lg text-center backdrop-blur-sm">
      <div className="text-[11px] text-neutral-400 font-sans uppercase tracking-wider mb-2">
        External Stream Player
      </div>

      {isYouTube && youtubeEmbedUrl ? (
        <div className="relative aspect-video rounded overflow-hidden">
          <iframe
            src={youtubeEmbedUrl}
            title="Shaheed Osman Hadi Archival Audio"
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : isSoundCloud ? (
        <div className="rounded overflow-hidden">
          <iframe
            width="100%"
            height="120"
            scrolling="no"
            frameBorder="no"
            allow="autoplay"
            src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23D71920&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false`}
          />
        </div>
      ) : isArchiveOrg ? (
        <div className="rounded overflow-hidden p-2">
          <audio controls autoPlay className="w-full">
            <source src={url} />
            Your browser does not support the audio element.
          </audio>
        </div>
      ) : (
        /* Fallback manual player for custom embed links */
        <div className="space-y-2 py-2">
          <audio controls autoPlay className="w-full mx-auto max-w-sm">
            <source src={url} />
            Your browser does not support audio playback.
          </audio>
          <p className="text-[11px] text-neutral-500">
            If playback does not start automatically, press play on the controller above.
          </p>
        </div>
      )}
    </div>
  );
};
