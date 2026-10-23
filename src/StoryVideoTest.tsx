import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  Video,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig
} from 'remotion';
import {StoryData, StorySchema} from './types';

const assetSrc = (src?: string) => {
  if (!src) {
    return undefined;
  }

  if (src.startsWith('http') || src.startsWith('data:')) {
    return src;
  }

  return staticFile(src);
};

const fitText = (text: string, max = 92) => {
  if (text.length <= max) {
    return text;
  }

  return `${text.slice(0, max - 1).trim()}...`;
};

const legacySegments = (story: StoryData) => {
  if (story.segments?.length) {
    return story.segments;
  }

  const lines = [story.hook, ...story.beats.slice(0, 4), story.outro];
  const segmentDuration = story.durationSeconds / lines.length;
  return lines.map((text, index) => ({
    start: index * segmentDuration,
    end:
      index === lines.length - 1
        ? story.durationSeconds
        : (index + 1) * segmentDuration,
    text,
    assetIndex: index % story.assets.length
  }));
};

const timelineVisuals = (story: StoryData) => {
  if (story.visuals?.length) {
    return story.visuals;
  }

  if (story.clip?.src) {
    const clipStart = story.clip.startSecond;
    const clipEnd = story.clip.startSecond + story.clip.durationSeconds;
    const fromIndex = story.clip.transitionFromAssetIndex ?? Math.floor(story.assets.length / 2) - 1;
    const toIndex = story.clip.transitionToAssetIndex ?? fromIndex + 1;
    const beforeAssets = story.assets.slice(0, Math.max(fromIndex + 1, 1));
    const afterAssets = story.assets.slice(Math.min(toIndex, story.assets.length - 1));
    const beforeDuration = clipStart / beforeAssets.length;
    const afterDuration = (story.durationSeconds - clipEnd) / Math.max(afterAssets.length, 1);
    const beforeVisuals = beforeAssets.map((asset, index) => ({
      start: index * beforeDuration,
      end: index === beforeAssets.length - 1 ? clipStart : (index + 1) * beforeDuration,
      src: asset.src,
      type: 'image' as const,
      role: 'scene' as const
    }));
    const afterVisuals = afterAssets.map((asset, index) => ({
      start: clipEnd + index * afterDuration,
      end:
        index === afterAssets.length - 1
          ? story.durationSeconds
          : clipEnd + (index + 1) * afterDuration,
      src: asset.src,
      type: 'image' as const,
      role: 'scene' as const
    }));

    return [
      ...beforeVisuals,
      {
        start: clipStart,
        end: clipEnd,
        src: story.clip.src,
        type: 'video' as const,
        role: 'transition' as const
      },
      ...afterVisuals
    ];
  }

  return legacySegments(story).map((segment, index) => ({
    start: segment.start,
    end: segment.end,
    src: story.assets[(segment.assetIndex ?? index) % story.assets.length].src,
    type: 'image' as const
  }));
};

const visualOpacity = (
  frame: number,
  durationInFrames: number,
  fadeIn: boolean,
  fadeOut: boolean
) => {
  const inOpacity = fadeIn
    ? interpolate(frame, [0, 12], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp'
      })
    : 1;
  const outOpacity = fadeOut
    ? interpolate(
        frame,
        [Math.max(durationInFrames - 12, 13), durationInFrames],
        [1, 0],
        {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
      )
    : 1;

  return Math.min(inOpacity, outOpacity);
};

/**
 * Header animado: Nueva versión 3D Cyan-Neon
 * Preserva las letras "ACORDES OCULTOS", el disco girando a 33⅓ rpm,
 * el centro AO fijo, el movimiento pendular 3D (tilt/float) y el shimmer especular.
 */
const CyanNeonHeaderLogo: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Movimiento pendular 3D sutil y elegante original de producción
  const tiltX = Math.sin(frame / 20) * 6.5;
  const tiltY = Math.cos(frame / 25) * 8.5;
  const floatY = Math.sin(frame / 16) * 4.0;

  // Destello de luz especular sutil pasando cada 90 frames (3 segundos)
  const shimmerFrame = frame % 90;
  const shimmerX = interpolate(shimmerFrame, [0, 24], [-600, 600], {
    extrapolateRight: 'clamp'
  });
  const shimmerOpacity = interpolate(shimmerFrame, [0, 6, 18, 24], [0, 0.75, 0.75, 0], {
    extrapolateRight: 'clamp'
  });

  const width = 216;
  const height = 240;
  const scale = width / 1080;

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        left: '50%',
        width,
        height,
        transform: `translateX(-50%) translateY(${floatY}px)`,
        perspective: 1000,
        pointerEvents: 'none',
        zIndex: 50
      }}
    >
      <div
        style={{
          width: 1080,
          height: 1200,
          transformOrigin: 'top left',
          transform: `scale(${scale}) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
          transformStyle: 'preserve-3d',
          position: 'relative'
        }}
      >
        {/* Sombra de profundidad analógica bajo el vinilo */}
        <div
          style={{
            position: 'absolute',
            left: 145,
            top: 335,
            width: 790,
            height: 790,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 72%)',
            transform: 'translateZ(-20px) translateY(24px)',
            filter: 'blur(20px)'
          }}
        />

        {/* Título superior: ACORDES (fucsia) OCULTOS (cian) en 3D biselado */}
        <Img
          src={staticFile('brand/3d/title.png')}
          style={{
            position: 'absolute',
            left: 110,
            top: 45,
            width: 860,
            transform: 'translateZ(15px)',
            filter: 'drop-shadow(0 10px 24px rgba(0,0,0,0.85)) drop-shadow(0 2px 6px rgba(0,0,0,0.9))'
          }}
        />

        {/* Disco de vinilo 3D con rotación a 33⅓ rpm */}
        <div
          style={{
            position: 'absolute',
            left: 145,
            top: 335,
            width: 790,
            height: 790,
            transform: 'scaleY(0.88) translateZ(10px)',
            transformStyle: 'preserve-3d'
          }}
        >
          {/* Base y sombras del disco */}
          <div
            style={{
              position: 'absolute',
              inset: 24,
              borderRadius: '50%',
              background: 'linear-gradient(155deg,#29303b,#080811 55%,#350a30)',
              boxShadow: '0 15px 0 #090912, 0 17px 0 #4a1643'
            }}
          />

          {/* Disco giratorio con surcos y arcos neón */}
          <Img
            src={staticFile('brand/3d/vinyl.png')}
            style={{
              position: 'absolute',
              inset: 0,
              width: 790,
              height: 790,
              rotate: `${(frame / fps) * 200}deg`,
              filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.8))'
            }}
          />

          {/* Reflejos especulares cónicos sobre los surcos */}
          <div
            style={{
              position: 'absolute',
              inset: 78,
              borderRadius: '50%',
              background:
                'conic-gradient(from 28deg,transparent 0deg,rgba(255,255,255,0.14) 24deg,transparent 48deg,transparent 180deg,rgba(30,226,255,0.10) 205deg,transparent 240deg)',
              pointerEvents: 'none'
            }}
          />

          {/* Monograma central AO fijo (no gira para preservar lectura) */}
          <div
            style={{
              position: 'absolute',
              left: 265,
              top: 265,
              width: 260,
              height: 260,
              borderRadius: '50%',
              overflow: 'hidden',
              boxShadow: '0 0 12px rgba(0,0,0,0.7)',
              transform: 'translateZ(8px)'
            }}
          >
            <Img
              src={staticFile('brand/3d/vinyl.png')}
              style={{
                position: 'absolute',
                left: -265,
                top: -265,
                width: 790,
                height: 790
              }}
            />
          </div>
        </div>

        {/* Destello de brillo especular elegante cruzando todo el logo cada 3 segundos */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
            transform: 'translateZ(25px)'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -150,
              bottom: -150,
              width: 140,
              transform: `translateX(${shimmerX}px) rotate(25deg)`,
              background:
                'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.75) 50%, rgba(255,255,255,0) 100%)',
              opacity: shimmerOpacity,
              filter: 'blur(8px)',
              mixBlendMode: 'overlay'
            }}
          />
        </div>
      </div>
    </div>
  );
};

const MusicBadge: React.FC<{story: StoryData}> = ({story}) => {
  const frame = useCurrentFrame();
  const pulse = interpolate(Math.sin(frame / 6), [-1, 1], [0.68, 1]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 204,
        left: 58,
        right: 58,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: story.palette.paper,
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
            background: story.palette.glow,
            opacity: pulse,
            boxShadow: `0 0 24px ${story.palette.glow}`
          }}
        />
        {fitText(story.music.title, 28)}
      </div>
    </div>
  );
};

const Particles: React.FC<{palette: StoryData['palette']; seed: number}> = ({
  palette,
  seed
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {Array.from({length: 26}).map((_, index) => {
        const left = (index * 37 + seed * 13) % 100;
        const size = 3 + ((index + seed) % 5);
        const baseTop = (index * 71 + seed * 17) % 118;
        const drift = interpolate(frame % 180, [0, 180], [0, -170]);
        const opacity = 0.16 + ((index + seed) % 6) * 0.045;

        return (
          <span
            key={`${seed}-${index}`}
            style={{
              position: 'absolute',
              left: `${left}%`,
              top: baseTop * 16 + drift,
              width: size,
              height: size,
              borderRadius: 999,
              background: index % 3 === 0 ? palette.accent : palette.paper,
              opacity,
              filter: 'blur(.2px)',
              boxShadow: `0 0 ${size * 4}px ${
                index % 3 === 0 ? palette.accent : palette.glow
              }`
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const TransitionVignette: React.FC<{palette: StoryData['palette']}> = ({
  palette
}) => (
  <AbsoluteFill
    style={{
      background:
        'radial-gradient(circle at 50% 42%, rgba(0,0,0,0) 0%, rgba(0,0,0,.10) 50%, rgba(0,0,0,.45) 100%)',
      boxShadow: `inset 0 0 140px ${palette.ink}`,
      pointerEvents: 'none'
    }}
  />
);

const CinematicImage: React.FC<{
  src: string;
  index: number;
  palette: StoryData['palette'];
}> = ({src, index, palette}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const progress = durationInFrames <= 1 ? 0 : frame / durationInFrames;
  const cameraScale = interpolate(progress, [0, 1], [1.09, 1.25]);
  const parallaxScale = interpolate(progress, [0, 1], [1.22, 1.34]);
  const x = interpolate(progress, [0, 1], [index % 2 === 0 ? -46 : 42, index % 2 === 0 ? 24 : -28]);
  const y = interpolate(progress, [0, 1], [index % 3 === 0 ? -34 : 18, index % 3 === 0 ? 22 : -24]);
  const rotate = interpolate(progress, [0, 1], [index % 2 === 0 ? -0.8 : 0.8, 0]);

  return (
    <AbsoluteFill style={{background: palette.ink, overflow: 'hidden'}}>
      <Img
        src={assetSrc(src)!}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `translate(${x * -0.32}px, ${y * -0.32}px) scale(${parallaxScale})`,
          filter: 'blur(18px) brightness(.48) saturate(1.35) contrast(1.1)'
        }}
      />
      <Img
        src={assetSrc(src)!}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `translate(${x}px, ${y}px) scale(${cameraScale}) rotate(${rotate}deg)`,
          filter:
            'brightness(.78) contrast(1.22) saturate(1.18) hue-rotate(-4deg)'
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(6,7,11,.15) 0%, rgba(6,7,11,.02) 38%, rgba(6,7,11,.42) 100%)',
          mixBlendMode: 'multiply'
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(135deg, rgba(226,61,40,.24) 0%, rgba(0,0,0,0) 35%, rgba(0,220,255,.14) 100%)',
          mixBlendMode: 'screen'
        }}
      />
    </AbsoluteFill>
  );
};

const Subtitle: React.FC<{
  text: string;
  palette: StoryData['palette'];
  variant: 'hook' | 'beat' | 'outro';
  topic?: string;
}> = ({text, palette, variant, topic}) => {
  const frame = useCurrentFrame();
  const y = interpolate(frame, [0, 16], [44, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: 'clamp'
  });
  const opacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: 'clamp'
  });

  const categoryLabel =
    topic === 'historia-en-los-acordes'
      ? 'Historia en los Acordes'
      : topic === 'destellos-de-gloria'
      ? 'Destellos de Gloria'
      : topic === 'catedrales-de-leyenda'
      ? 'Catedrales de Leyenda'
      : topic === 'forjados-en-el-barro'
      ? 'Forjados en el Barro'
      : 'Acordes Ocultos';

  return (
    <div
      style={{
        position: 'absolute',
        left: 62,
        right: 62,
        bottom: 390,
        transform: `translateY(${y}px)`,
        opacity
      }}
    >
      <div
        style={{
          marginBottom: 10,
          paddingLeft: 12,
          borderLeft: `5px solid ${palette.accent}`,
          color: palette.accent,
          fontFamily: 'Georgia, Times New Roman, serif',
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          textShadow: '0 2px 12px rgba(0,0,0,.9), 0 0 30px rgba(0,0,0,.8)'
        }}
      >
        {categoryLabel}
      </div>
      <div
        style={{
          paddingLeft: 12,
          borderLeft: `8px solid ${palette.accent}`,
          color: palette.paper,
          fontFamily: 'Georgia, Times New Roman, serif',
          fontSize: variant === 'hook' ? 57 : 51,
          fontWeight: 800,
          lineHeight: 1.06,
          textShadow:
            '0 2px 6px rgba(0,0,0,1), 0 6px 24px rgba(0,0,0,.95), 0 12px 40px rgba(0,0,0,.85)'
        }}
      >
        {text}
      </div>
    </div>
  );
};

const VisualImage: React.FC<{
  story: StoryData;
  asset: string;
  index: number;
  fadeIn: boolean;
  fadeOut: boolean;
}> = ({story, asset, index, fadeIn, fadeOut}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const opacity = visualOpacity(frame, durationInFrames, fadeIn, fadeOut);

  return (
    <AbsoluteFill style={{opacity}}>
      <CinematicImage src={asset} index={index} palette={story.palette} />
      <Particles palette={story.palette} seed={index + 1} />
      <TransitionVignette palette={story.palette} />
    </AbsoluteFill>
  );
};

const VisualClip: React.FC<{
  story: StoryData;
  src: string;
  fadeIn: boolean;
  fadeOut: boolean;
}> = ({story, src, fadeIn, fadeOut}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const opacity = visualOpacity(frame, durationInFrames, fadeIn, fadeOut);

  return (
    <AbsoluteFill style={{opacity, background: story.palette.ink}}>
      <Video
        src={assetSrc(src)!}
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'brightness(.82) contrast(1.15) saturate(1.1)'
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(6,7,11,.15) 0%, rgba(6,7,11,.02) 38%, rgba(6,7,11,.42) 100%)',
          mixBlendMode: 'multiply'
        }}
      />
      <Particles palette={story.palette} seed={11} />
      <TransitionVignette palette={story.palette} />
    </AbsoluteFill>
  );
};

export const StoryVideoTest: React.FC<StoryData> = (props) => {
  const story = StorySchema.parse(props);
  const {fps, durationInFrames} = useVideoConfig();
  const frame = useCurrentFrame();
  const segments = legacySegments(story);
  const visuals = timelineVisuals(story);

  // Atenuación gradual del volumen en los últimos 2 segundos (60 frames)
  const musicVolume = interpolate(
    frame,
    [durationInFrames - 60, durationInFrames],
    [story.music.volume, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );

  // Fundido a negro en el último segundo (30 frames)
  const fadeToBlackOpacity = interpolate(
    frame,
    [durationInFrames - 30, durationInFrames],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );

  const musicSource = story.music.src || story.music.file;

  return (
    <AbsoluteFill style={{background: story.palette.ink}}>
      {musicSource ? (
        <Audio
          src={assetSrc(musicSource)!}
          volume={musicVolume}
          startFrom={Math.round((story.music.startSecond ?? 0) * fps)}
        />
      ) : null}

      {visuals.map((visual, index) => {
        const from = Math.round(visual.start * fps);
        const durationInFrames = Math.max(
          Math.round((visual.end - visual.start) * fps),
          1
        );
        const isVideo = visual.type === 'video';
        const fadeIn = index > 0;
        const fadeOut = index < visuals.length - 1;

        return (
          <Sequence
            key={`${visual.start}-${visual.end}-${visual.src}`}
            from={from}
            durationInFrames={durationInFrames}
          >
            {isVideo ? (
              <VisualClip
                story={story}
                src={visual.src}
                fadeIn={fadeIn}
                fadeOut={fadeOut}
              />
            ) : (
              <VisualImage
                story={story}
                asset={visual.src}
                index={index}
                fadeIn={fadeIn}
                fadeOut={fadeOut}
              />
            )}
          </Sequence>
        );
      })}

      {/* Header experimental con el logo 3D Cyan-Neon animado */}
      <CyanNeonHeaderLogo />
      <MusicBadge story={story} />

      {segments.map((segment, index) => {
        const from = Math.round(segment.start * fps);
        const durationInFrames = Math.round((segment.end - segment.start) * fps);
        const variant = index === 0 ? 'hook' : index >= segments.length - 1 ? 'outro' : 'beat';

        return (
          <Sequence
            key={`subtitle-${segment.start}-${segment.end}`}
            from={from}
            durationInFrames={durationInFrames}
          >
            <Subtitle
              text={segment.text}
              palette={story.palette}
              variant={variant}
              topic={story.topic}
            />
          </Sequence>
        );
      })}

      {fadeToBlackOpacity > 0 ? (
        <AbsoluteFill
          style={{
            background: 'black',
            opacity: fadeToBlackOpacity,
            pointerEvents: 'none'
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
