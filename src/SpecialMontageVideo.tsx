import React from "react";
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
} from "remotion";

export interface SpecialMontageData {
  title: string;
  artist: string;
  durationSeconds: number;
  music: {
    title: string;
    artist: string;
    src: string;
    startSecond: number;
    volume: number;
  };
  palette: {
    ink: string;
    paper: string;
    accent: string;
    glow: string;
  };
  scenes: Array<{
    index: number;
    src: string;
    folder: string;
    start: number;
    end: number;
  }>;
}

const assetSrc = (src?: string) => {
  if (!src) return undefined;
  if (src.startsWith("http") || src.startsWith("data:")) {
    return src;
  }
  return staticFile(src);
};

const fitText = (text: string, max = 32) => {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}...`;
};

// Logo especial con perspectiva 3D, inclinación pendular y halo luminoso neón
const Logo3DLuminous: React.FC<{palette: SpecialMontageData["palette"]}> = ({palette}) => {
  const frame = useCurrentFrame();

  // Movimiento pendular 3D continuo
  const tiltX = Math.sin(frame / 18) * 8.5;
  const tiltY = Math.cos(frame / 22) * 11.0;
  const floatY = Math.sin(frame / 14) * 5.0;

  // Pulso rítmico sincronizado a 120 BPM (cada beat son 15 frames a 30fps)
  const beatProgress = (frame % 15) / 15;
  const beatPulse = Math.sin(beatProgress * Math.PI);
  const glowRadius = interpolate(beatPulse, [0, 1], [18, 46]);
  const glowIntensity = interpolate(beatPulse, [0, 1], [0.75, 1.25]);

  // Destello de luz especular cruzando cada 75 frames (~2.5s)
  const shimmerFrame = frame % 75;
  const shimmerX = interpolate(shimmerFrame, [0, 24], [-160, 160], {
    extrapolateRight: "clamp"
  });
  const shimmerOpacity = interpolate(shimmerFrame, [0, 6, 18, 24], [0, 0.85, 0.85, 0], {
    extrapolateRight: "clamp"
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 28,
        left: "50%",
        width: 220,
        height: 220,
        transform: `translateX(-50%) translateY(${floatY}px)`,
        perspective: 1000,
        pointerEvents: "none",
        zIndex: 50
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
          position: "relative"
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 8,
            borderRadius: 999,
            background: "radial-gradient(circle, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 70%)",
            transform: "translateZ(-20px) translateY(14px)",
            filter: "blur(10px)"
          }}
        />

        <Img
          src={staticFile("brand/acordes-ocultos-logo.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            transform: "translateZ(10px)",
            filter: `drop-shadow(0 8px 18px rgba(0,0,0,0.85)) drop-shadow(0 0 ${glowRadius * 0.35}px rgba(255, 225, 100, ${0.95 * glowIntensity})) drop-shadow(0 0 ${glowRadius * 0.85}px rgba(245, 158, 11, ${0.8 * glowIntensity})) drop-shadow(0 0 ${glowRadius * 1.6}px rgba(217, 119, 6, ${0.45 * glowIntensity}))`
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            right: 20,
            bottom: 20,
            borderRadius: 999,
            overflow: "hidden",
            pointerEvents: "none",
            transform: "translateZ(15px)"
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -40,
              bottom: -40,
              width: 45,
              transform: `translateX(${shimmerX}px) rotate(25deg)`,
              background:
                "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.75) 50%, rgba(255,255,255,0) 100%)",
              opacity: shimmerOpacity,
              filter: "blur(3px)",
              mixBlendMode: "overlay"
            }}
          />
        </div>
      </div>
    </div>
  );
};

const HeaderBadge: React.FC<{
  artist: string;
  title: string;
  palette: SpecialMontageData["palette"];
}> = ({artist, title, palette}) => {
  const frame = useCurrentFrame();
  const pulse = interpolate(Math.sin(frame / 6), [-1, 1], [0.68, 1]);

  return (
    <div
      style={{
        position: "absolute",
        top: 204,
        left: 58,
        right: 58,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        color: palette.paper,
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: 27,
        fontWeight: 800,
        textShadow: "0 4px 18px rgba(0,0,0,.75)",
        zIndex: 40,
        pointerEvents: "none"
      }}
    >
      <div>{artist}</div>
      <div style={{display: "flex", alignItems: "center", gap: 10}}>
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: 999,
            background: palette.glow,
            opacity: pulse,
            boxShadow: `0 0 24px ${palette.glow}`
          }}
        />
        {fitText(title, 28)}
      </div>
    </div>
  );
};

const KenBurnsScene: React.FC<{
  src: string;
  index: number;
  palette: SpecialMontageData["palette"];
}> = ({src, index, palette}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const progress = durationInFrames <= 1 ? 0 : frame / durationInFrames;

  const variant = index % 4;

  let cameraScale = 1.1;
  let x = 0;
  let y = 0;
  let rotate = 0;

  if (variant === 0) {
    cameraScale = interpolate(progress, [0, 1], [1.06, 1.22], {easing: Easing.out(Easing.cubic)});
    x = interpolate(progress, [0, 1], [-25, 25]);
    y = interpolate(progress, [0, 1], [-12, 12]);
    rotate = interpolate(progress, [0, 1], [-0.5, 0.3]);
  } else if (variant === 1) {
    cameraScale = interpolate(progress, [0, 1], [1.22, 1.06], {easing: Easing.out(Easing.cubic)});
    x = interpolate(progress, [0, 1], [25, -25]);
    y = interpolate(progress, [0, 1], [12, -12]);
    rotate = interpolate(progress, [0, 1], [0.5, -0.3]);
  } else if (variant === 2) {
    cameraScale = interpolate(progress, [0, 1], [1.08, 1.24], {easing: Easing.out(Easing.cubic)});
    x = interpolate(progress, [0, 1], [18, -18]);
    y = interpolate(progress, [0, 1], [30, -30]);
    rotate = interpolate(progress, [0, 1], [-0.4, 0.4]);
  } else {
    cameraScale = interpolate(progress, [0, 1], [1.24, 1.08], {easing: Easing.out(Easing.cubic)});
    x = interpolate(progress, [0, 1], [-18, 18]);
    y = interpolate(progress, [0, 1], [-30, 30]);
    rotate = interpolate(progress, [0, 1], [0.4, -0.4]);
  }

  const entryOpacity = interpolate(frame, [0, 3], [0.4, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  const beatFlash = interpolate(frame, [0, 2, 4], [0.25, 0.08, 0], {
    extrapolateRight: "clamp"
  });

  return (
    <AbsoluteFill style={{background: palette.ink, overflow: "hidden", opacity: entryOpacity}}>
      <Img
        src={assetSrc(src)!}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${cameraScale * 1.08})`,
          filter: "blur(20px) brightness(0.42) saturate(1.3)"
        }}
      />

      <Img
        src={assetSrc(src)!}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `translate(${x}px, ${y}px) scale(${cameraScale}) rotate(${rotate}deg)`,
          filter: "brightness(0.85) contrast(1.18) saturate(1.12)"
        }}
      />

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(6,7,11,0.32) 0%, rgba(6,7,11,0.02) 40%, rgba(6,7,11,0.48) 100%)",
          mixBlendMode: "multiply"
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.55) 100%)",
          pointerEvents: "none"
        }}
      />

      {beatFlash > 0 && (
        <AbsoluteFill
          style={{
            background: "#fff",
            opacity: beatFlash,
            mixBlendMode: "screen",
            pointerEvents: "none"
          }}
        />
      )}
    </AbsoluteFill>
  );
};

const GoldParticles: React.FC<{palette: SpecialMontageData["palette"]}> = ({palette}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{pointerEvents: "none", zIndex: 30}}>
      {Array.from({length: 22}).map((_, index) => {
        const left = (index * 39 + 17) % 100;
        const size = 3 + (index % 4);
        const baseTop = (index * 67 + 23) % 115;
        const drift = interpolate(frame % 200, [0, 200], [0, -180]);
        const opacity = 0.18 + (index % 5) * 0.05;

        return (
          <span
            key={`gold-${index}`}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: baseTop * 17 + drift,
              width: size,
              height: size,
              borderRadius: 999,
              background: index % 2 === 0 ? palette.accent : palette.glow,
              opacity,
              filter: "blur(.2px)",
              boxShadow: `0 0 ${size * 4}px ${palette.glow}`
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const SpecialMontageVideo: React.FC<SpecialMontageData> = (props) => {
  const {scenes, music, palette, artist} = props;
  const {fps} = useVideoConfig();

  return (
    <AbsoluteFill style={{background: palette.ink, overflow: "hidden"}}>
      {music?.src && (
        <Audio
          src={assetSrc(music.src)!}
          volume={music.volume ?? 0.85}
          startFrom={0}
        />
      )}

      {scenes.map((scene) => {
        const from = Math.round(scene.start * fps);
        const durationInFrames = Math.round((scene.end - scene.start) * fps);

        return (
          <Sequence
            key={`scene-${scene.index}`}
            from={from}
            durationInFrames={durationInFrames}
          >
            <KenBurnsScene
              src={scene.src}
              index={scene.index}
              palette={palette}
            />
          </Sequence>
        );
      })}

      <GoldParticles palette={palette} />

      <HeaderBadge
        artist={artist}
        title={music.title}
        palette={palette}
      />

      <Logo3DLuminous palette={palette} />
    </AbsoluteFill>
  );
};
