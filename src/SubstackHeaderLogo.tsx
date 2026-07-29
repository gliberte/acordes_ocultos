import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';

export const SubstackHeaderLogo: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'transparent',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingLeft: 30,
        gap: 35,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Full Logo Icon */}
      <div
        style={{
          width: 250,
          height: 250,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: 'drop-shadow(0 4px 18px rgba(0,0,0,0.15))',
        }}
      >
        <Img
          src={staticFile('brand/acordes-ocultos-logo.png')}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      </div>

      {/* Elegant Typography Branding */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 66,
            fontWeight: 900,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: '#111827',
            lineHeight: 1.05,
          }}
        >
          Acordes Ocultos
        </div>
        <div
          style={{
            fontFamily: 'system-ui, sans-serif',
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 6,
            textTransform: 'uppercase',
            color: '#d97706',
            marginTop: 8,
          }}
        >
          Crónicas &amp; Historias Secretas
        </div>
      </div>
    </AbsoluteFill>
  );
};
