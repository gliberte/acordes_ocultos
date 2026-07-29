import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  Video,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig
} from 'remotion';

export interface PresentationData {
  title: string;
  durationSeconds: number;
  palette: {
    ink: string;
    paper: string;
    accent: string;
    glow: string;
  };
  clips: Array<{
    src: string;
    text: string;
    subtext: string;
    start: number;
    end: number;
  }>;
  outro: {
    text: string;
    subtext: string;
    start: number;
    end: number;
  };
}

const assetSrc = (src: string) => {
  if (src.startsWith('http') || src.startsWith('data:')) {
    return src;
  }
  return staticFile(src);
};

// Componente para partículas doradas y retro
const GoldParticles: React.FC<{palette: PresentationData['palette']}> = ({palette}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {Array.from({length: 40}).map((_, index) => {
        const seed = index * 17;
        const left = (index * 43 + 23) % 100;
        const size = 4 + (seed % 6);
        const baseTop = (index * 79 + 47) % 115;
        const drift = interpolate(frame % 240, [0, 240], [0, -220]);
        const opacity = 0.2 + (seed % 5) * 0.08;

        return (
          <span
            key={`gold-particle-${index}`}
            style={{
              position: 'absolute',
              left: `${left}%`,
              top: baseTop * 18 + drift,
              width: size,
              height: size,
              borderRadius: 999,
              background: index % 2 === 0 ? palette.accent : palette.glow,
              opacity,
              filter: 'blur(.4px)',
              boxShadow: `0 0 ${size * 5}px ${palette.glow}`
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// Filtro de época continuo (Vignette + Scanlines + Sepia-ish Warmth)
const VintageOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const flicker = interpolate(Math.sin(frame / 2), [-1, 1], [0.96, 1]);

  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity: flicker}}>
      {/* Vignette oscura retro */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 20%, rgba(12, 10, 8, 0.32) 70%, rgba(6, 4, 3, 0.88) 100%)',
          mixBlendMode: 'multiply'
        }}
      />
      {/* Líneas de escaneo retro de televisión */}
      <AbsoluteFill
        style={{
          backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.28) 50%)',
          backgroundSize: '100% 6px',
          opacity: 0.28
        }}
      />
      {/* Tono sepia/analógico cálido */}
      <AbsoluteFill
        style={{
          background: 'rgba(230, 160, 80, 0.06)',
          mixBlendMode: 'color-burn'
        }}
      />
    </AbsoluteFill>
  );
};

// Subtítulos Dinámicos y Grandes (sin recuadros de fondo, con text-shadow gigante y visible)
const DynamicSubtitle: React.FC<{
  text: string;
  subtext: string;
  palette: PresentationData['palette'];
}> = ({text, subtext, palette}) => {
  const frame = useCurrentFrame();

  // Animaciones de entrada (deslizar y escalar)
  const y = interpolate(frame, [0, 15], [60, 0], {
    easing: Easing.out(Easing.back(1.1)),
    extrapolateRight: 'clamp'
  });
  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: 'clamp'
  });
  const scale = interpolate(frame, [0, 15], [0.93, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: 'clamp'
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: 64,
        right: 64,
        bottom: 240,
        transform: `translateY(${y}px) scale(${scale})`,
        opacity,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        textAlign: 'center'
      }}
    >
      {/* Título Principal de la Sección (Negrita, Grande, sin fondo y con sombra) */}
      <div
        style={{
          color: palette.glow,
          fontFamily: 'Inter, Arial, sans-serif',
          fontSize: 64,
          fontWeight: 900,
          letterSpacing: 2,
          textTransform: 'uppercase',
          lineHeight: 1.1,
          textShadow: '-4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000, 4px 4px 0 #000, 0 10px 20px rgba(0,0,0,0.85)'
        }}
      >
        {text}
      </div>
      {/* Subtexto descriptivo */}
      <div
        style={{
          color: palette.paper,
          fontFamily: 'Georgia, Times New Roman, serif',
          fontSize: 38,
          fontWeight: 700,
          lineHeight: 1.25,
          textShadow: '-3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 3px 3px 0 #000, 0 8px 16px rgba(0,0,0,0.85)'
        }}
      >
        {subtext}
      </div>
    </div>
  );
};

export const PresentationVideo: React.FC<PresentationData> = ({
  palette,
  clips,
  outro
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <AbsoluteFill style={{background: palette.ink, overflow: 'hidden'}}>
      {/* Secuencias de Clips de Video en Muestra */}
      {clips.map((clip, index) => {
        const from = Math.round(clip.start * fps);
        const durationInFrames = Math.round((clip.end - clip.start) * fps);

        // Control de volumen dinámico (atenuación al inicio y al final del clip de 6s)
        const localFrame = frame - from;
        const volume = interpolate(
          localFrame,
          [0, 8, durationInFrames - 8, durationInFrames],
          [0, 0.95, 0.95, 0],
          {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
        );

        // Efecto de Glitch en las transiciones
        const glitchBoundary = 8;
        const isGlitchTime =
          localFrame < glitchBoundary || localFrame > durationInFrames - glitchBoundary;

        const glitchTransform = isGlitchTime
          ? `skewX(${(Math.sin(frame) * 14).toFixed(1)}deg) scale(${1 + Math.abs(Math.sin(frame) * 0.06)}) translate(${(Math.cos(frame) * 18).toFixed(1)}px, 0)`
          : 'scale(1.02)';

        const glitchFilter = isGlitchTime
          ? `hue-rotate(${(frame * 40) % 360}deg) brightness(1.3) contrast(1.4) saturate(1.5)`
          : 'brightness(.82) contrast(1.15) saturate(1.1)';

        return (
          <Sequence
            key={`clip-${index}`}
            from={from}
            durationInFrames={durationInFrames}
          >
            <AbsoluteFill style={{background: palette.ink}}>
              <Video
                src={assetSrc(clip.src)}
                volume={volume}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: glitchTransform,
                  filter: glitchFilter
                }}
              />
            </AbsoluteFill>

            {/* Subtítulos correspondientes a este fragmento */}
            <DynamicSubtitle
              text={clip.text}
              subtext={clip.subtext}
              palette={palette}
            />
          </Sequence>
        );
      })}

      {/* Escena Outro Final Superpuesta (Último Clip 15 - segundos 84 a 90) */}
      {frame >= Math.round(outro.start * fps) && (
        <AbsoluteFill style={{pointerEvents: 'none'}}>
          {/* Capa de atenuación oscura sobre el video de fondo para destacar el logo */}
          <AbsoluteFill
            style={{
              background: 'rgba(10, 10, 15, 0.42)',
              backdropFilter: 'blur(3px)',
              transition: 'opacity 0.5s ease'
            }}
          />

          {/* Logo del Canal en el Centro */}
          <div
            style={{
              position: 'absolute',
              top: '32%',
              left: '50%',
              transform: 'translateX(-50%) translateY(-50%)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 30,
              opacity: interpolate(
                frame - Math.round(outro.start * fps),
                [0, 15],
                [0, 1],
                {extrapolateRight: 'clamp'}
              )
            }}
          >
            <Img
              src={staticFile('brand/acordes-ocultos-logo.png')}
              style={{
                width: 320,
                height: 320,
                objectFit: 'contain',
                filter: 'drop-shadow(0 16px 42px rgba(0,0,0,.85))',
                animation: 'pulse 3s infinite ease-in-out'
              }}
            />
          </div>
        </AbsoluteFill>
      )}

      {/* Superposiciones generales (Partículas y Filtro de Época) */}
      <GoldParticles palette={palette} />
      <VintageOverlay />
    </AbsoluteFill>
  );
};
