import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';

export const SubstackSocialCover: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0a0908',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Background Image: The authentic 1973 Luxembourg stage */}
      <Img
        src={staticFile('mocedades_stage_1973.png')}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center 42%',
          filter: 'brightness(0.82) contrast(1.1)',
        }}
      />

      {/* Cinematic Vignette and Bottom Gradient for Badge & Logo */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(10,9,8,0.7) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.1) 60%, rgba(8,8,7,0.85) 100%)',
        }}
      />

      {/* Top Header Badge */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 50,
          right: 50,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(217, 119, 6, 0.6)',
            padding: '8px 18px',
            borderRadius: 30,
            backdropFilter: 'blur(10px)',
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#f59e0b',
              boxShadow: '0 0 10px #f59e0b',
            }}
          />
          <span
            style={{
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: '#fef3c7',
            }}
          >
            Acordes Ocultos · Crónica Semanal
          </span>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            padding: '8px 16px',
            borderRadius: 30,
            color: '#e2e8f0',
            fontSize: 13,
            letterSpacing: 2,
            textTransform: 'uppercase',
            fontWeight: 600,
            backdropFilter: 'blur(10px)',
          }}
        >
          Archivo Histórico 1973
        </div>
      </div>
    </AbsoluteFill>
  );
};
