import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';

export const SubstackBanner: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0a0908',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
      }}
    >
      {/* Background Image */}
      <Img
        src={staticFile('substack_header_raw.jpg')}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center 35%',
          filter: 'brightness(0.52) contrast(1.15)',
        }}
      />

      {/* Atmospheric Gradients */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(90deg, rgba(8,8,7,0.95) 0%, rgba(10,9,8,0.88) 40%, rgba(10,9,8,0.52) 75%, rgba(10,9,8,0.78) 100%)',
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at 22% 50%, rgba(217, 119, 6, 0.24) 0%, rgba(0,0,0,0) 65%)',
        }}
      />

      {/* Main Content Container */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          height: '100%',
          paddingLeft: 110,
          gap: 65,
        }}
      >
        {/* Logo Container with Glow */}
        <div
          style={{
            position: 'relative',
            width: 320,
            height: 320,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            filter:
              'drop-shadow(0 0 35px rgba(245, 158, 11, 0.45)) drop-shadow(0 15px 35px rgba(0,0,0,0.95))',
          }}
        >
          {/* Neon Halo behind logo */}
          <div
            style={{
              position: 'absolute',
              width: 270,
              height: 270,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(236, 72, 153, 0.4) 0%, rgba(6, 182, 212, 0.3) 50%, rgba(0,0,0,0) 75%)',
              filter: 'blur(30px)',
            }}
          />
          <Img
            src={staticFile('brand/acordes-ocultos-logo.png')}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              position: 'relative',
            }}
          />
        </div>

        {/* Elegant Gold Divider */}
        <div
          style={{
            width: 3,
            height: 230,
            background:
              'linear-gradient(180deg, rgba(217,119,6,0) 0%, rgba(245,158,11,0.9) 50%, rgba(217,119,6,0) 100%)',
            boxShadow: '0 0 16px rgba(245, 158, 11, 0.6)',
            borderRadius: 2,
          }}
        />

        {/* Text Container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            maxWidth: 1050,
          }}
        >
          {/* Eyebrow / Tagline */}
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: 8,
              textTransform: 'uppercase',
              color: '#f59e0b',
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 36,
                height: 2,
                backgroundColor: '#f59e0b',
              }}
            />
            Crónicas &amp; Archivo Secreto
          </div>

          {/* Main Publication Name */}
          <h1
            style={{
              margin: 0,
              padding: 0,
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: 78,
              fontWeight: 900,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: '#ffffff',
              lineHeight: 1.05,
              textShadow:
                '0 4px 30px rgba(0,0,0,0.95), 0 0 50px rgba(217, 119, 6, 0.35)',
            }}
          >
            Acordes Ocultos
          </h1>

          {/* Editorial Subtitle */}
          <p
            style={{
              margin: 0,
              marginTop: 14,
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontStyle: 'italic',
              fontSize: 27,
              color: '#fef3c7',
              opacity: 0.95,
              lineHeight: 1.3,
              textShadow: '0 2px 15px rgba(0,0,0,0.9)',
            }}
          >
            La historia no contada detrás de las canciones que marcaron al mundo
          </p>

          {/* Badges */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: 16,
              marginTop: 24,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: '#fbbf24',
                padding: '7px 18px',
                border: '1px solid rgba(245, 158, 11, 0.6)',
                borderRadius: 4,
                backgroundColor: 'rgba(217, 119, 6, 0.15)',
              }}
            >
              Microhistorias con Tensión
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: '#e2e8f0',
                padding: '7px 18px',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: 4,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
              }}
            >
              Música &amp; Rigor Histórico
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: '#cbd5e1',
                padding: '7px 18px',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: 4,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
              }}
            >
              Edición Oficial
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
