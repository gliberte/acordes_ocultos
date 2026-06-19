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
  return lines.map((text, index) => ({
    start: index * 10,
    end: index === lines.length - 1 ? 60 : (index + 1) * 10,
    text,
    assetIndex: index % story.assets.length
  }));
};

const timelineVisuals = (story: StoryData) => {
  if (story.visuals?.length) {
    return story.visuals;
  }

  return legacySegments(story).map((segment, index) => ({
    start: segment.start,
    end: segment.end,
    src: story.assets[(segment.assetIndex ?? index) % story.assets.length].src,
    type: 'image' as const
  }));
};

const sameSecond = (left: number, right: number) => Math.abs(left - right) < 0.001;

const hasSubtitleStartAt = (segments: ReturnType<typeof legacySegments>, second: number) =>
  segments.some((segment) => sameSecond(segment.start, second));

const hasSubtitleEndAt = (segments: ReturnType<typeof legacySegments>, second: number) =>
  segments.some((segment) => sameSecond(segment.end, second));

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

const ChannelLogo: React.FC = () => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 18], [0.96, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: 'clamp'
  });

  return (
    <Img
      src={staticFile('brand/acordes-ocultos-logo.png')}
      style={{
        position: 'absolute',
        top: 32,
        left: '50%',
        width: 214,
        height: 214,
        objectFit: 'contain',
        opacity: 0.88,
        transform: `translateX(-50%) scale(${scale})`,
        filter: 'drop-shadow(0 8px 28px rgba(0,0,0,.62))'
      }}
    />
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
        'radial-gradient(circle at 50% 42%, rgba(0,0,0,0) 0%, rgba(0,0,0,.14) 50%, rgba(0,0,0,.72) 100%)',
      boxShadow: `inset 0 0 190px ${palette.ink}`,
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
            'linear-gradient(180deg, rgba(6,7,11,.26) 0%, rgba(6,7,11,.05) 38%, rgba(6,7,11,.82) 100%)',
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
}> = ({text, palette, variant}) => {
  const frame = useCurrentFrame();
  const y = interpolate(frame, [0, 16], [44, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: 'clamp'
  });
  const opacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: 'clamp'
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: 62,
        right: 62,
        bottom: 118,
        transform: `translateY(${y}px)`,
        opacity
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          marginBottom: 20,
          padding: '10px 15px',
          background: variant === 'hook' ? palette.accent : palette.ink,
          border: `2px solid ${variant === 'beat' ? palette.accent : palette.glow}`,
          color: palette.paper,
          fontFamily: 'Inter, Arial, sans-serif',
          fontSize: 25,
          fontWeight: 900,
          lineHeight: 1,
          textTransform: 'uppercase',
          boxShadow: '0 10px 28px rgba(0,0,0,.42)'
        }}
      >
        {variant === 'hook' ? 'Acordes ocultos' : variant === 'outro' ? 'El mito' : 'Archivo rock'}
      </div>
      <div
        style={{
          padding: '28px 32px 32px',
          background: 'rgba(7,8,13,.66)',
          borderLeft: `8px solid ${palette.accent}`,
          color: palette.paper,
          fontFamily: 'Georgia, Times New Roman, serif',
          fontSize: variant === 'hook' ? 57 : 51,
          fontWeight: 800,
          lineHeight: 1.06,
          textShadow: '0 8px 28px rgba(0,0,0,.72)',
          boxShadow: '0 18px 54px rgba(0,0,0,.42)',
          backdropFilter: 'blur(5px)'
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
  const scale = interpolate(frame, [0, durationInFrames], [1.02, 1.12]);
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
          transform: `scale(${scale})`,
          filter: 'brightness(.74) contrast(1.22) saturate(1.2)'
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(6,7,11,.12), rgba(6,7,11,.78))'
        }}
      />
      <Particles palette={story.palette} seed={11} />
      <TransitionVignette palette={story.palette} />
    </AbsoluteFill>
  );
};

export const StoryVideo: React.FC<StoryData> = (props) => {
  const story = StorySchema.parse(props);
  const {fps} = useVideoConfig();
  const segments = legacySegments(story);
  const visuals = timelineVisuals(story);

  return (
    <AbsoluteFill style={{background: story.palette.ink}}>
      {story.music.src ? (
        <Audio
          src={assetSrc(story.music.src)}
          startFrom={Math.round(story.music.startSecond * fps)}
          volume={story.music.volume}
        />
      ) : null}

      {visuals.map((visual, index) => {
        const from = Math.round(visual.start * fps);
        const durationInFrames = Math.round((visual.end - visual.start) * fps);
        const fadeIn = visual.start === 0 || hasSubtitleStartAt(segments, visual.start);
        const fadeOut = hasSubtitleEndAt(segments, visual.end);
        const isVideo =
          visual.type === 'video' || /\.(mp4|mov|webm|m4v)$/i.test(visual.src);

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

      <ChannelLogo />
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
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
