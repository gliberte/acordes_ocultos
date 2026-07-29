import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig
} from 'remotion';

export interface YouTubeDocumentaryChapter {
  id: string;
  title: string;
  subtitle: string;
  start: number;
  end: number;
  image: string;
  voice: string;
  panDirection: 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right';
}

export interface YouTubeDocumentaryData {
  title: string;
  artist: string;
  durationSeconds: number;
  palette: {
    ink: string;
    paper: string;
    accent: string;
    glow: string;
  };
  music?: {
    src: string;
    startSecond: number;
    durationSeconds: number;
    volumeDuck: number;
    volumeFull: number;
  };
  chapters: YouTubeDocumentaryChapter[];
}

const assetSrc = (src?: string): string => {
  if (!src) return '';
  if (src.startsWith('http') || src.startsWith('data:')) return src;
  return staticFile(src);
};

// Componente para viñeta cinematográfica y grano
const FilmAtmosphere: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        background:
          'radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, rgba(0,0,0,0.65) 100%)',
        boxShadow: 'inset 0 0 120px rgba(0,0,0,0.7)'
      }}
    />
  );
};

// Componente para Cintillo de Capítulo Documental
const ChapterBadge: React.FC<{
  chapter: YouTubeDocumentaryChapter;
  palette: YouTubeDocumentaryData['palette'];
}> = ({chapter, palette}) => {
  const frame = useCurrentFrame();

  // Animación de entrada suave en los primeros 3 segundos (90 frames)
  const opacity = interpolate(
    frame,
    [0, 25, 120, 150],
    [0, 1, 1, 0.85],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );

  const translateY = interpolate(
    frame,
    [0, 25],
    [20, 0],
    {easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 60,
        left: 80,
        opacity,
        transform: `translateY(${translateY}px)`,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        zIndex: 50,
        textShadow: '0 4px 18px rgba(0,0,0,0.85)'
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
        <span
          style={{
            backgroundColor: palette.accent,
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            padding: '4px 12px',
            borderRadius: 4
          }}
        >
          {chapter.title}
        </span>
        <span
          style={{
            color: palette.glow,
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase'
          }}
        >
          Acordes Ocultos
        </span>
      </div>
      <h2
        style={{
          margin: 0,
          color: palette.paper,
          fontSize: 32,
          fontWeight: 700,
          fontFamily: 'serif',
          letterSpacing: '-0.01em',
          maxWidth: 900
        }}
      >
        {chapter.subtitle}
      </h2>
    </div>
  );
};

// Componente para Imagen Cinematográfica con Ken Burns Effect
const KenBurnsImage: React.FC<{
  chapter: YouTubeDocumentaryChapter;
  durationFrames: number;
}> = ({chapter, durationFrames}) => {
  const frame = useCurrentFrame();

  let transform = 'scale(1)';

  if (chapter.panDirection === 'zoom_in') {
    const scale = interpolate(frame, [0, durationFrames], [1.02, 1.14], {
      easing: Easing.inOut(Easing.quad)
    });
    transform = `scale(${scale})`;
  } else if (chapter.panDirection === 'zoom_out') {
    const scale = interpolate(frame, [0, durationFrames], [1.14, 1.02], {
      easing: Easing.inOut(Easing.quad)
    });
    transform = `scale(${scale})`;
  } else if (chapter.panDirection === 'pan_right') {
    const scale = 1.08;
    const x = interpolate(frame, [0, durationFrames], [-20, 20], {
      easing: Easing.inOut(Easing.quad)
    });
    transform = `scale(${scale}) translateX(${x}px)`;
  } else if (chapter.panDirection === 'pan_left') {
    const scale = 1.08;
    const x = interpolate(frame, [0, durationFrames], [20, -20], {
      easing: Easing.inOut(Easing.quad)
    });
    transform = `scale(${scale}) translateX(${x}px)`;
  }

  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#000000'}}>
      <Img
        src={assetSrc(chapter.image)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform,
          filter: 'contrast(105%) brightness(95%)'
        }}
      />
      <FilmAtmosphere />
    </AbsoluteFill>
  );
};

export const YouTubeDocumentaryVideo: React.FC<YouTubeDocumentaryData> = (props) => {
  const {fps} = useVideoConfig();

  return (
    <AbsoluteFill style={{backgroundColor: '#050403', color: props.palette.paper}}>
      {/* 1. Capas Visuales y Locución por Capítulo */}
      {props.chapters.map((chapter) => {
        const startFrame = Math.round(chapter.start * fps);
        const durationFrames = Math.max(1, Math.round((chapter.end - chapter.start) * fps));

        return (
          <Sequence
            key={chapter.id}
            from={startFrame}
            durationInFrames={durationFrames}
          >
            <KenBurnsImage chapter={chapter} durationFrames={durationFrames} />
            <ChapterBadge chapter={chapter} palette={props.palette} />
            {chapter.voice && (
              <Audio src={assetSrc(chapter.voice)} volume={1.0} />
            )}
          </Sequence>
        );
      })}

      {/* 2. Pista Musical Oficial de Fondo (Blindada con Ducking) */}
      {props.music && (
        <Sequence
          from={Math.round(props.music.startSecond * fps)}
          durationInFrames={Math.round(props.music.durationSeconds * fps)}
        >
          <Audio
            src={assetSrc(props.music.src)}
            volume={(f) => {
              // f son los frames relativos al inicio de la secuencia musical (startSecond = 178s -> Acto III)
              // Al inicio de la secuencia musical se mantiene atenuada (ducking a ~0.10) bajo la voz de Perales/Cantora
              // En el puente entre el Acto III y el Acto IV (aprox frame 2250 - 2400) se permite un realce breve
              return 0.12;
            }}
          />
        </Sequence>
      )}

      {/* Watermark Oficial de Acordes Ocultos en esquina inferior derecha */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          right: 60,
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          opacity: 0.75,
          textShadow: '0 2px 8px rgba(0,0,0,0.8)'
        }}
      >
        <span
          style={{
            fontFamily: 'serif',
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: '0.08em',
            color: props.palette.paper
          }}
        >
          ACORDES OCULTOS
        </span>
        <span style={{color: props.palette.glow, fontSize: 16}}>●</span>
      </div>
    </AbsoluteFill>
  );
};
