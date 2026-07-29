import React, { useState, useRef } from 'react';

interface Props {
  videoUrl?: string;
  tiktokVideoUrl?: string;
  coverUrl?: string;
  title: string;
}

export default function DualVideoPlayer({ videoUrl, tiktokVideoUrl, coverUrl, title }: Props) {
  const hasBoth = Boolean(videoUrl && tiktokVideoUrl);
  const [activeVersion, setActiveVersion] = useState<'reels' | 'tiktok'>(videoUrl ? 'reels' : 'tiktok');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentSrc = activeVersion === 'tiktok' && tiktokVideoUrl ? tiktokVideoUrl : videoUrl;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  if (!currentSrc) {
    return (
      <div className="relative aspect-[9/16] w-full max-w-[360px] mx-auto rounded-2xl overflow-hidden bg-neutral-900 border border-[#2a2620] shadow-2xl flex flex-col items-center justify-center p-6 text-center">
        {coverUrl && (
          <img
            src={coverUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover opacity-30 filter blur-sm"
          />
        )}
        <div className="relative z-10 space-y-3">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 mx-auto flex items-center justify-center text-amber-400">
            <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          <h4 className="font-serif text-amber-300 text-lg font-bold">{title}</h4>
          <p className="text-xs text-neutral-400">Audio oficial y crónica completa disponibles abajo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-[380px] mx-auto">
      {/* Version Selector Pill */}
      {hasBoth && (
        <div className="mb-4 inline-flex p-1 rounded-full bg-[#161412] border border-[#2a2620] shadow-inner text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setActiveVersion('reels');
              setIsPlaying(false);
            }}
            className={`px-4 py-1.5 rounded-full transition-all ${
              activeVersion === 'reels'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Instagram Reels (90s)
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveVersion('tiktok');
              setIsPlaying(false);
            }}
            className={`px-4 py-1.5 rounded-full transition-all ${
              activeVersion === 'tiktok'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            TikTok Cut (60s)
          </button>
        </div>
      )}

      {/* 9:16 Video Container */}
      <div className="relative aspect-[9/16] w-full rounded-2xl overflow-hidden bg-black border-2 border-[#2b2721] shadow-2xl shadow-black/80 group">
        <video
          ref={videoRef}
          src={currentSrc}
          poster={coverUrl}
          playsInline
          loop
          className="w-full h-full object-cover cursor-pointer"
          onClick={togglePlay}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Play / Pause Big Center Icon */}
        {!isPlaying && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label="Reproducir video"
            className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-opacity duration-300"
          >
            <div className="w-18 h-18 rounded-full bg-amber-500/90 text-black flex items-center justify-center shadow-xl transform scale-90 hover:scale-100 transition-transform">
              <svg className="w-8 h-8 fill-current translate-x-0.5" viewBox="0 0 24 24">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </div>
          </button>
        )}

        {/* Floating Quick Controls at Bottom */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            type="button"
            onClick={togglePlay}
            className="p-1.5 text-neutral-200 hover:text-amber-400"
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isPlaying ? (
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>

          <span className="text-[11px] font-mono text-neutral-300 tracking-wider">
            {activeVersion === 'reels' ? '90s Versión Extendida' : '60s TikTok Cut'}
          </span>

          <button
            type="button"
            onClick={toggleMute}
            className="p-1.5 text-neutral-200 hover:text-amber-400"
            aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
          >
            {isMuted ? (
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
