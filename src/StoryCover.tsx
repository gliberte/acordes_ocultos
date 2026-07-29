import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {StoryData, StorySchema} from './types';

const resolveAsset = (src: string) => {
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }
  return staticFile(src.replace(/^\/+/, ''));
};

export const StoryCover: React.FC<StoryData> = (props) => {
  const story = StorySchema.parse(props);
  const bgImage = story.coverBg || story.assets[0]?.src || 'videos/jim-morrison-homenaje-destellos-de-gloria/scene-01.png';
  const rawTitle = story.music?.title || story.title;
  const songTitle = rawTitle.replace(/\s*\([^)]*\)/g, '').trim();
  const artistName = story.music?.artist || story.artist;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0a0908',
        overflow: 'hidden',
        fontFamily: "'Georgia', 'Times New Roman', serif"
      }}
    >
      {/* Imagen de fondo */}
      <Img
        src={resolveAsset(bgImage)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />

      {/* Viñeta cinematográfica y gradiente central para legibilidad */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(10, 9, 8, 0.45) 0%, rgba(10, 9, 8, 0.75) 60%, rgba(10, 9, 8, 0.92) 100%)'
        }}
      />

      {/* Recuadro central seguro (1080 x 1080) centrado verticalmente para recorte 1:1 de Instagram */}
      <div
        style={{
          position: 'absolute',
          top: 420,
          left: 0,
          width: 1080,
          height: 1080,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '0 60px',
          boxSizing: 'border-box'
        }}
      >
        {/* Título de la canción en tipografía retro impactante */}
        <h1
          style={{
            margin: 0,
            padding: 0,
            fontSize: '96px',
            fontWeight: 900,
            fontFamily: "'Playfair Display', 'Georgia', serif",
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#fdfbf7',
            lineHeight: 1.05,
            textShadow:
              '0 4px 12px rgba(0,0,0,0.9), 0 0 24px rgba(0,0,0,0.8), 0 0 50px rgba(0,0,0,0.6)'
          }}
        >
          {songTitle}
        </h1>

        {/* Separador sutil o barra retro */}
        <div
          style={{
            width: '120px',
            height: '4px',
            backgroundColor: '#eab308',
            margin: '28px 0',
            borderRadius: '2px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.8)'
          }}
        />

        {/* Subtítulo: Nombre del artista o banda */}
        <h2
          style={{
            margin: 0,
            padding: 0,
            fontSize: '44px',
            fontWeight: 700,
            fontFamily: "'Cinzel', 'Trajan Pro', 'Georgia', serif",
            textTransform: 'uppercase',
            letterSpacing: '0.22em',
            color: '#fef08a',
            lineHeight: 1.2,
            textShadow:
              '0 3px 10px rgba(0,0,0,0.95), 0 0 20px rgba(0,0,0,0.85)'
          }}
        >
          {artistName}
        </h2>
      </div>
    </AbsoluteFill>
  );
};
