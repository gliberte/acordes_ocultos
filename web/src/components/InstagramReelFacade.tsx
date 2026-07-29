import React, { useState } from 'react';

interface Props {
  shortcode: string;
  reelUrl: string;
  coverUrl?: string;
  title: string;
  artist?: string;
}

export default function InstagramReelFacade({
  shortcode,
  reelUrl,
  coverUrl,
  title,
  artist
}: Props) {
  const [isActivated, setIsActivated] = useState<boolean>(false);

  return (
    <div className="flex flex-col items-center w-full max-w-[380px] mx-auto">
      
      {/* Top Header Label */}
      <div className="mb-3 flex items-center justify-between w-full px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-500 animate-pulse"></span>
          <span className="text-[11px] uppercase tracking-widest text-neutral-300 font-semibold font-mono">
            Reel Oficial de Instagram
          </span>
        </div>

        {isActivated && (
          <button
            type="button"
            onClick={() => setIsActivated(false)}
            className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium transition-colors"
          >
            <span>↺ Ver Portada</span>
          </button>
        )}
      </div>

      {/* Main Card Container */}
      {!isActivated ? (
        /* 1. CINEMATIC COVER FACADE */
        <div
          onClick={() => setIsActivated(true)}
          className="group relative w-full aspect-[9/16] rounded-2xl overflow-hidden bg-black border-2 border-[#383228] hover:border-amber-500/60 shadow-2xl shadow-black/90 cursor-pointer transition-all duration-300 transform hover:scale-[1.01]"
          title="Toca para reproducir el Reel oficial en Instagram"
        >
          {/* Cover Image */}
          <img
            src={coverUrl || '/brand/acordes-ocultos-logo.png'}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            onError={e => {
              (e.target as HTMLImageElement).src = '/brand/acordes-ocultos-logo.png';
            }}
          />

          {/* Film Grain & Dark Cinematic Vignettes */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/60 pointer-events-none" />
          
          {/* Top Badge Overlay */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider bg-black/75 text-amber-300 border border-amber-500/30 backdrop-blur-md shadow-lg flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
              <span>Reel Oficial</span>
            </span>

            <div className="w-7 h-7 rounded-full bg-black/75 border border-white/15 flex items-center justify-center text-white backdrop-blur-md shadow">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
          </div>

          {/* Center Play Button & Call to Action */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
            {/* Glowing Golden Ring and Play Icon */}
            <div className="relative mb-4">
              <div className="absolute -inset-2 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 rounded-full blur-md opacity-40 group-hover:opacity-75 animate-pulse transition-opacity"></div>
              <div className="relative w-18 h-18 rounded-full bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-400 text-black flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 fill-current translate-x-0.5" viewBox="0 0 24 24">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              </div>
            </div>

            <span className="px-3.5 py-1.5 rounded-full bg-black/80 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider backdrop-blur-md shadow-lg group-hover:bg-amber-500 group-hover:text-black transition-all">
              Reproducir en Instagram
            </span>
            <span className="text-[10px] text-neutral-400 mt-2 font-mono tracking-wide">
              Toca para activar el reproductor
            </span>
          </div>

          {/* Bottom Story Legend */}
          <div className="absolute bottom-4 left-4 right-4 z-10 space-y-0.5 pointer-events-none">
            {artist && (
              <p className="text-[10px] uppercase font-bold tracking-widest text-amber-400 drop-shadow">
                {artist}
              </p>
            )}
            <h4 className="font-serif text-sm font-bold text-neutral-100 line-clamp-1 drop-shadow">
              {title}
            </h4>
          </div>

        </div>
      ) : (
        /* 2. ACTIVATED INSTAGRAM EMBED */
        <div className="relative w-full rounded-2xl overflow-hidden bg-black border-2 border-amber-500/40 shadow-2xl shadow-black animate-in fade-in duration-300 flex flex-col">
          <div className="w-full h-[580px] sm:h-[620px] bg-black">
            <iframe
              src={`https://www.instagram.com/reel/${shortcode}/embed/`}
              className="w-full h-full border-0"
              scrolling="no"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
              loading="lazy"
            />
          </div>
        </div>
      )}

      {/* Bottom Direct App Link */}
      <a
        href={reelUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3.5 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-neutral-200 bg-[#161411] border border-[#2b2721] hover:border-amber-500/50 hover:text-amber-300 transition-all shadow-md group"
      >
        <span>Abrir en la app de Instagram</span>
        <svg className="w-3.5 h-3.5 fill-current text-rose-400 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      </a>

    </div>
  );
}
