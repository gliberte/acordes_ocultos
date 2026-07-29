import React from 'react';
import {
  AbsoluteFill,
  Img,
  staticFile
} from 'remotion';

export interface YouTubeThumbnailProps {
  bgImage: string;
  category: string;
  badge: string;
  mainTitle: string;
  accentTitle: string;
  subtext: string;
  palette: {
    paper: string;
    accent: string;
    glow: string;
  };
}

export const YouTubeThumbnail: React.FC<YouTubeThumbnailProps> = ({
  bgImage,
  category,
  badge,
  mainTitle,
  accentTitle,
  subtext,
  palette
}) => {
  return (
    <AbsoluteFill style={{backgroundColor: '#0a0807'}}>
      {/* 1. Imagen de Fondo */}
      <Img
        src={staticFile(bgImage)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />

      {/* 2. Gradiente cinematográfico oscuro en el tercio izquierdo para legibilidad total del texto */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '65%',
          height: '100%',
          background:
            'linear-gradient(to right, rgba(5,4,3,0.92) 0%, rgba(5,4,3,0.78) 55%, rgba(5,4,3,0) 100%)'
        }}
      />

      {/* 3. Composición Tipográfica Impactante para YouTube */}
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 16,
          maxWidth: 950,
          zIndex: 50
        }}
      >
        {/* Badge Superior */}
        <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
          <span
            style={{
              backgroundColor: palette.accent,
              color: '#ffffff',
              fontSize: 22,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              padding: '6px 18px',
              borderRadius: 6,
              boxShadow: '0 4px 14px rgba(185,28,28,0.5)'
            }}
          >
            {badge}
          </span>
          <span
            style={{
              color: palette.glow,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              textShadow: '0 2px 8px rgba(0,0,0,0.8)'
            }}
          >
            {category}
          </span>
        </div>

        {/* Título Principal de la Miniatura */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            marginTop: 10
          }}
        >
          <span
            style={{
              fontSize: 84,
              fontWeight: 900,
              color: palette.paper,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              textTransform: 'uppercase',
              lineHeight: 1.02,
              letterSpacing: '-0.02em',
              textShadow: '0 8px 30px rgba(0,0,0,0.95)'
            }}
          >
            {mainTitle}
          </span>
          <span
            style={{
              fontSize: 84,
              fontWeight: 900,
              color: palette.glow,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              textTransform: 'uppercase',
              lineHeight: 1.02,
              letterSpacing: '-0.02em',
              textShadow: '0 8px 30px rgba(0,0,0,0.95)'
            }}
          >
            {accentTitle}
          </span>
        </div>

        {/* Subtexto complementario de intriga */}
        <div
          style={{
            marginTop: 16,
            borderLeft: `4px solid ${palette.accent}`,
            paddingLeft: 16
          }}
        >
          <span
            style={{
              color: '#d4cfc7',
              fontSize: 28,
              fontWeight: 600,
              fontFamily: 'serif',
              fontStyle: 'italic',
              textShadow: '0 3px 12px rgba(0,0,0,0.9)'
            }}
          >
            {subtext}
          </span>
        </div>
      </div>

      {/* Sello de autenticidad en esquina inferior izquierda */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: 100,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          opacity: 0.8
        }}
      >
        <span
          style={{
            color: palette.paper,
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: '0.12em',
            fontFamily: 'system-ui, sans-serif'
          }}
        >
          MINIDOCUMENTAL EXCLUSIVO
        </span>
      </div>
    </AbsoluteFill>
  );
};
