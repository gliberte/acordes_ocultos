import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {StoryData, StorySchema} from './types';

const resolveAsset = (src: string) => {
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }
  return staticFile(src.replace(/^\/+/, ''));
};

const fitText = (text: string, maxLen = 28) => {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 3)}...`;
};

export const StoryTeaser: React.FC<StoryData> = (props) => {
  const story = StorySchema.parse(props);
  const palette = story.palette;
  const logoFile =
    story.brand === 'secret-chords'
      ? 'brand/secret-chords-logo.png'
      : 'brand/acordes-ocultos-logo.png';

  // Seleccionar 4 imágenes representativas de la historia
  const imageSources =
    story.assets.length >= 4
      ? [
          story.assets[0].src,
          story.assets[Math.min(2, story.assets.length - 1)].src,
          story.assets[Math.min(4, story.assets.length - 1)].src,
          story.assets[story.assets.length - 1].src
        ]
      : story.assets.map((a) => a.src);

  while (imageSources.length < 4 && imageSources.length > 0) {
    imageSources.push(imageSources[imageSources.length - 1]);
  }

  // Parámetros de disposición, rotación y sobreposición de las 4 imágenes
  const panels = [
    // Panel 1: Arriba a la izquierda
    {
      src: imageSources[0],
      top: 250,
      left: -40,
      width: 590,
      height: 700,
      rotate: -4.2,
      zIndex: 2
    },
    // Panel 2: Arriba a la derecha
    {
      src: imageSources[1],
      top: 230,
      right: -40,
      width: 590,
      height: 710,
      rotate: 3.8,
      zIndex: 3
    },
    // Panel 3: Abajo a la izquierda
    {
      src: imageSources[2],
      bottom: 60,
      left: -30,
      width: 590,
      height: 720,
      rotate: 3.2,
      zIndex: 4
    },
    // Panel 4: Abajo a la derecha
    {
      src: imageSources[3],
      bottom: 40,
      right: -30,
      width: 600,
      height: 730,
      rotate: -3.6,
      zIndex: 5
    }
  ];

  return (
    <AbsoluteFill
      style={{
        background: palette.ink,
        overflow: 'hidden',
        fontFamily: 'Inter, Arial, sans-serif'
      }}
    >
      {/* FONDO BASE CON TEXTURA PROFUNDA */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, ${palette.glow}20 0%, ${palette.ink} 100%)`
        }}
      />

      {/* CONTENEDOR DE LAS 4 IMÁGENES CONVERGENTES Y ROTADAS */}
      <AbsoluteFill style={{overflow: 'hidden'}}>
        {panels.map((panel, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: panel.top,
              bottom: panel.bottom,
              left: panel.left,
              right: panel.right,
              width: panel.width,
              height: panel.height,
              transform: `rotate(${panel.rotate}deg)`,
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.85), 0 0 0 2px rgba(255,255,255,0.06)',
              zIndex: panel.zIndex,
              background: '#0a0808'
            }}
          >
            <Img
              src={resolveAsset(panel.src)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'brightness(0.9) contrast(1.18) saturate(1.15)'
              }}
            />
            {/* Sombra interna cinematográfica por panel */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                boxShadow: 'inset 0 0 60px rgba(0,0,0,0.6)',
                pointerEvents: 'none'
              }}
            />
          </div>
        ))}
      </AbsoluteFill>

      {/* NEBLINA CINEMATOGRÁFICA Y DEGRADADO OSCURO HACIA EL CENTRO */}
      <AbsoluteFill
        style={{
          zIndex: 8,
          background:
            'radial-gradient(circle at 50% 50%, rgba(6,7,11,0.92) 0%, rgba(6,7,11,0.68) 22%, rgba(6,7,11,0.2) 55%, rgba(6,7,11,0.75) 100%)',
          pointerEvents: 'none',
          mixBlendMode: 'multiply'
        }}
      />

      {/* CAPA DE LUZ Y RESPLANDOR CENTRAL (NEBLINA ETÉREA) */}
      <AbsoluteFill
        style={{
          zIndex: 9,
          background: `radial-gradient(circle at 50% 50%, ${palette.glow}44 0%, ${palette.accent}18 35%, rgba(0,0,0,0) 70%)`,
          pointerEvents: 'none',
          mixBlendMode: 'screen'
        }}
      />

      {/* VIÑETA EXTERIOR ADICIONAL PARA ENFOCAR EL CENTRO */}
      <AbsoluteFill
        style={{
          zIndex: 10,
          background:
            'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0.88) 100%)',
          pointerEvents: 'none'
        }}
      />

      {/* EJE CENTRAL: LOGO DEL CANAL COMO CENTRO DE CONVERGENCIA */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 20,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: 320,
          height: 320
        }}
      >
        {/* Halo de resplandor dorado / acento */}
        <div
          style={{
            position: 'absolute',
            width: 280,
            height: 280,
            borderRadius: 999,
            background: `radial-gradient(circle, ${palette.glow}66 0%, ${palette.accent}33 50%, rgba(0,0,0,0) 75%)`,
            filter: 'blur(20px)'
          }}
        />

        {/* Disco oscuro de fondo biselado */}
        <div
          style={{
            position: 'absolute',
            width: 240,
            height: 240,
            borderRadius: 999,
            background: `radial-gradient(circle at 40% 40%, rgba(26,20,20,0.95), rgba(6,7,11,0.98))`,
            boxShadow: `0 20px 60px rgba(0,0,0,0.95), 0 0 0 3px ${palette.accent}88`,
            border: `1px solid ${palette.glow}66`
          }}
        />

        {/* Logo central */}
        <Img
          src={staticFile(logoFile)}
          style={{
            position: 'relative',
            width: 210,
            height: 210,
            objectFit: 'contain',
            filter: 'drop-shadow(0 10px 24px rgba(0,0,0,0.9))'
          }}
        />
      </div>

      {/* ENCABEZADO IDÉNTICO A CUALQUIER ESCENA DEL VIDEO */}
      <div style={{position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30}}>
        {/* Logo del Canal en la parte superior */}
        <Img
          src={staticFile(logoFile)}
          style={{
            position: 'absolute',
            top: 32,
            left: '50%',
            width: 214,
            height: 214,
            objectFit: 'contain',
            opacity: 0.88,
            transform: 'translateX(-50%)',
            filter: 'drop-shadow(0 8px 28px rgba(0,0,0,.62))'
          }}
        />

        {/* Music Badge idéntico */}
        <div
          style={{
            position: 'absolute',
            top: 204,
            left: 58,
            right: 58,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: palette.paper,
            fontFamily: 'Inter, Arial, sans-serif',
            fontSize: 27,
            fontWeight: 800,
            letterSpacing: 0,
            textShadow: '0 4px 18px rgba(0,0,0,.65)'
          }}
        >
          <div>{story.artist}</div>
          <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: 999,
                background: palette.glow,
                boxShadow: `0 0 24px ${palette.glow}`
              }}
            />
            {fitText(story.music.title, 28)}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
