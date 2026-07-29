import React from 'react';
import {useCurrentFrame, AbsoluteFill, staticFile} from 'remotion';
import {CarouselData} from '../types';

export const CarouselGrid: React.FC<CarouselData> = ({
  title,
  artist,
  topic,
  palette,
  slides
}) => {
  const frame = useCurrentFrame();
  const slideIndex = Math.min(Math.max(0, frame), slides.length - 1);
  const slide = slides[slideIndex];

  const totalSlides = slides.length;
  const isCover = slideIndex === 0;
  const isLast = slideIndex === totalSlides - 1;

  // Render Cover Slide (Slide 1)
  if (isCover) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: palette.ink,
          fontFamily: 'Georgia, serif',
          color: palette.paper,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          boxSizing: 'border-box'
        }}
      >
        {/* Background Image with Dark Vignette */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url(${staticFile(slide.imageSrc)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.45
          }}
        />

        {/* Top Header */}
        <div
          style={{
            zIndex: 2,
            fontFamily: 'Inter, sans-serif',
            fontSize: 24,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: 4,
            color: palette.accent
          }}
        >
          {topic}
        </div>

        {/* Center Title */}
        <div
          style={{
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 20
          }}
        >
          <h1
            style={{
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1.15,
              margin: 0,
              color: palette.paper,
              textShadow: '2px 4px 10px rgba(0, 0, 0, 0.6)'
            }}
          >
            {slide.title || title}
          </h1>
          <div
            style={{
              width: 120,
              height: 6,
              backgroundColor: palette.accent,
              borderRadius: 3
            }}
          />
        </div>

        {/* Bottom Metadata */}
        <div
          style={{
            zIndex: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontFamily: 'Inter, sans-serif'
          }}
        >
          <div>
            <div style={{fontSize: 20, color: palette.accent, fontWeight: 700}}>ARTISTA</div>
            <div style={{fontSize: 28, fontWeight: 800, textTransform: 'uppercase', marginTop: 4}}>{artist}</div>
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: 2,
              opacity: 0.8
            }}
          >
            DESLIZA ➔
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  // Render Outro Slide (Last Slide)
  if (isLast) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: palette.ink,
          fontFamily: 'Georgia, serif',
          color: palette.paper,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url(${staticFile(slide.imageSrc)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.35
          }}
        />

        {/* Top Header */}
        <div
          style={{
            zIndex: 2,
            fontFamily: 'Inter, sans-serif',
            fontSize: 24,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: 4,
            color: palette.accent
          }}
        >
          Acordes Ocultos
        </div>

        {/* Center Content Card */}
        <div
          style={{
            zIndex: 2,
            backgroundColor: palette.paper,
            color: palette.ink,
            padding: 60,
            borderRadius: 16,
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 30
          }}
        >
          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              lineHeight: 1.2,
              color: palette.accent
            }}
          >
            {slide.title || '¿Qué piensas tú?'}
          </div>
          <p
            style={{
              fontSize: 32,
              lineHeight: 1.5,
              margin: 0,
              fontWeight: 400
            }}
          >
            {slide.text}
          </p>
        </div>

        {/* Bottom Call to Action Details */}
        <div
          style={{
            zIndex: 2,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontFamily: 'Inter, sans-serif',
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: 2,
            color: palette.accent
          }}
        >
          ❤ GUSTA  |  💬 COMENTA  |  💾 GUARDA
        </div>
      </AbsoluteFill>
    );
  }

  // Render Content Slide (Slides 2 to N-1)
  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.ink,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}
    >
      {/* Upper 60%: Large Photo with elegant styling */}
      <div
        style={{
          height: '60%',
          width: '100%',
          overflow: 'hidden',
          position: 'relative',
          borderBottom: `8px solid ${palette.accent}`
        }}
      >
        <img
          src={staticFile(slide.imageSrc)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
          alt={slide.title || "carrusel slide"}
        />
        {/* Soft Vignette on top of image */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            boxShadow: 'inset 0 0 100px rgba(0, 0, 0, 0.4)'
          }}
        />
      </div>

      {/* Lower 40%: Textured Editorial Card */}
      <div
        style={{
          height: '40%',
          width: '100%',
          backgroundColor: palette.paper,
          color: palette.ink,
          padding: '60px 80px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative'
        }}
      >
        {/* Slide Title and Text */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >
          {slide.title && (
            <div
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 22,
                fontWeight: 800,
                color: palette.accent,
                textTransform: 'uppercase',
                letterSpacing: 3
              }}
            >
              {slide.title}
            </div>
          )}
          <p
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 34,
              lineHeight: 1.5,
              fontWeight: 400,
              margin: 0
            }}
          >
            {slide.text}
          </p>
        </div>

        {/* Page Footer (e.g. 02 / 07) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: 'Inter, sans-serif',
            fontSize: 20,
            fontWeight: 800,
            color: palette.ink,
            opacity: 0.6
          }}
        >
          <span style={{textTransform: 'uppercase', letterSpacing: 1}}>{artist} — {title}</span>
          <span>{String(slideIndex + 1).padStart(2, '0')} / {String(totalSlides).padStart(2, '0')}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
