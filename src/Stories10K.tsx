import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';

// Estilos globales de fuentes y animaciones
const FONT_IMPORTS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;0,800;0,900;1,400;1,600;1,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');

* {
  box-sizing: border-box;
}
`;

// Marco cinematográfico 35mm con perforaciones y datos de cámara
const CinematicFrame: React.FC<{
  frameNumber: string;
  badgeText: string;
  children: React.ReactNode;
}> = ({frameNumber, badgeText, children}) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#070605',
        color: '#fdfbf7',
        overflow: 'hidden',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}
    >
      <style>{FONT_IMPORTS}</style>

      {/* Borde exterior 35mm */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: 24,
          right: 24,
          bottom: 24,
          border: '1px solid rgba(234, 179, 8, 0.28)',
          pointerEvents: 'none',
          zIndex: 40
        }}
      />

      {/* Borde interior con esquinas clásicas */}
      <div
        style={{
          position: 'absolute',
          top: 36,
          left: 36,
          right: 36,
          bottom: 36,
          border: '1px solid rgba(234, 179, 8, 0.14)',
          pointerEvents: 'none',
          zIndex: 40
        }}
      />

      {/* Esquinas ornamentales art-deco */}
      <div
        style={{
          position: 'absolute',
          top: 32,
          left: 32,
          width: 24,
          height: 24,
          borderTop: '2px solid #eab308',
          borderLeft: '2px solid #eab308',
          pointerEvents: 'none',
          zIndex: 42
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 32,
          right: 32,
          width: 24,
          height: 24,
          borderTop: '2px solid #eab308',
          borderRight: '2px solid #eab308',
          pointerEvents: 'none',
          zIndex: 42
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 32,
          left: 32,
          width: 24,
          height: 24,
          borderBottom: '2px solid #eab308',
          borderLeft: '2px solid #eab308',
          pointerEvents: 'none',
          zIndex: 42
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 32,
          right: 32,
          width: 24,
          height: 24,
          borderBottom: '2px solid #eab308',
          borderRight: '2px solid #eab308',
          pointerEvents: 'none',
          zIndex: 42
        }}
      />

      {/* Marcas de película analógica */}
      <div
        style={{
          position: 'absolute',
          top: 50,
          left: 52,
          fontSize: '13px',
          fontFamily: "'Space Mono', monospace",
          color: 'rgba(234, 179, 8, 0.7)',
          letterSpacing: '0.16em',
          zIndex: 45
        }}
      >
        AO // 35MM FILM • {frameNumber}
      </div>

      <div
        style={{
          position: 'absolute',
          top: 50,
          right: 52,
          fontSize: '13px',
          fontFamily: "'Space Mono', monospace",
          color: 'rgba(234, 179, 8, 0.7)',
          letterSpacing: '0.16em',
          zIndex: 45
        }}
      >
        ISO 400 • 33⅓ RPM
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 50,
          left: 52,
          fontSize: '13px',
          fontFamily: "'Space Mono', monospace",
          color: 'rgba(234, 179, 8, 0.6)',
          letterSpacing: '0.16em',
          zIndex: 45
        }}
      >
        EDICIÓN CONMEMORATIVA 10K
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 50,
          right: 52,
          fontSize: '13px',
          fontFamily: "'Space Mono', monospace",
          color: 'rgba(234, 179, 8, 0.6)',
          letterSpacing: '0.16em',
          zIndex: 45
        }}
      >
        {badgeText}
      </div>

      {children}

      {/* Viñeta analógica y textura de grano */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(7, 6, 5, 0) 40%, rgba(7, 6, 5, 0.55) 75%, rgba(7, 6, 5, 0.92) 100%)',
          pointerEvents: 'none',
          zIndex: 35
        }}
      />
    </AbsoluteFill>
  );
};

// =========================================================================
// HISTORIA 1: GRATITUD & MÍSTICA (10.000 ALMAS)
// =========================================================================
export const Story10KGratitud: React.FC = () => {
  return (
    <CinematicFrame frameNumber="FRAME 01/04" badgeText="ACORDES OCULTOS">
      {/* Fondo: Freddie Mercury en Wembley (Live Aid) */}
      <Img
        src={staticFile('videos/rock-day-2026/scene-11-queen-live-aid.png')}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '1080px',
          height: '1920px',
          objectFit: 'cover',
          objectPosition: 'center 60%',
          filter: 'brightness(0.32) contrast(1.18) sepia(0.22)',
          zIndex: 1
        }}
      />

      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(7,6,5,0.94) 0%, rgba(18,14,10,0.55) 45%, rgba(7,6,5,0.96) 100%)',
          zIndex: 2
        }}
      />

      {/* Destello dorado central */}
      <div
        style={{
          position: 'absolute',
          top: '380px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '780px',
          height: '780px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(234, 179, 8, 0.22) 0%, rgba(217, 119, 6, 0.08) 50%, transparent 70%)',
          filter: 'blur(55px)',
          zIndex: 3
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 175,
          left: 65,
          right: 65,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          zIndex: 10
        }}
      >
        {/* Logo de Acordes Ocultos */}
        <div
          style={{
            width: 110,
            height: 110,
            borderRadius: '50%',
            padding: '5px',
            border: '2px solid rgba(234, 179, 8, 0.7)',
            boxShadow: '0 0 40px rgba(234, 179, 8, 0.4)',
            marginBottom: 20,
            background: 'rgba(10, 9, 8, 0.8)'
          }}
        >
          <Img
            src={staticFile('brand/acordes-ocultos-logo.png')}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover'
            }}
          />
        </div>

        {/* Badge superior */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 24px',
            borderRadius: '30px',
            background: 'rgba(234, 179, 8, 0.14)',
            border: '1px solid rgba(234, 179, 8, 0.45)',
            marginBottom: 30
          }}
        >
          <span style={{color: '#eab308', fontSize: '14px'}}>✦</span>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#fef08a',
              fontFamily: "'Space Mono', monospace"
            }}
          >
            HITO DE COMUNIDAD
          </span>
          <span style={{color: '#eab308', fontSize: '14px'}}>✦</span>
        </div>

        {/* 10.000 */}
        <div
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '144px',
            fontWeight: 900,
            lineHeight: 0.95,
            letterSpacing: '0.04em',
            background:
              'linear-gradient(180deg, #ffffff 0%, #fef08a 35%, #eab308 70%, #b45309 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 10px 45px rgba(234, 179, 8, 0.35)',
            marginBottom: 12
          }}
        >
          10.000
        </div>

        {/* Subtítulo */}
        <div
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '23px',
            fontWeight: 700,
            letterSpacing: '0.26em',
            textTransform: 'uppercase',
            color: '#fef3c7',
            marginBottom: 28,
            textShadow: '0 2px 12px rgba(0,0,0,0.9)'
          }}
        >
          ALMAS EN SINTONÍA
        </div>

        {/* Separador */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            width: '320px',
            marginBottom: 38
          }}
        >
          <div
            style={{
              flex: 1,
              height: '1px',
              background:
                'linear-gradient(90deg, transparent, rgba(234, 179, 8, 0.6))'
            }}
          />
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#eab308',
              boxShadow: '0 0 12px #eab308'
            }}
          />
          <div
            style={{
              flex: 1,
              height: '1px',
              background:
                'linear-gradient(90deg, rgba(234, 179, 8, 0.6), transparent)'
            }}
          />
        </div>

        {/* Carta poética */}
        <div
          style={{
            background: 'rgba(15, 12, 10, 0.78)',
            borderRadius: '18px',
            border: '1px solid rgba(234, 179, 8, 0.28)',
            boxShadow:
              '0 24px 60px rgba(0, 0, 0, 0.75), 0 0 35px rgba(234, 179, 8, 0.1)',
            padding: '42px 38px',
            maxWidth: '870px',
            backdropFilter: 'blur(16px)'
          }}
        >
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontStyle: 'italic',
              fontSize: '30px',
              lineHeight: 1.5,
              color: '#fdfbf7',
              margin: '0 0 24px 0',
              fontWeight: 400,
              textShadow: '0 2px 10px rgba(0,0,0,0.8)'
            }}
          >
            "Empezó como un susurro en la penumbra: desempolvar las historias que
            los acordes callaban, las tragedias que se volvieron himnos y los
            milagros que desafiaron al olvido."
          </p>

          <div
            style={{
              width: '80px',
              height: '2px',
              backgroundColor: '#eab308',
              margin: '0 auto 24px auto',
              opacity: 0.8
            }}
          />

          <p
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '23px',
              lineHeight: 1.6,
              color: '#e2e8f0',
              margin: '0 0 24px 0',
              fontWeight: 400
            }}
          >
            Hoy somos <strong style={{color: '#fef08a'}}>10.000 custodios</strong>{' '}
            unidos por la reverencia al arte puro, del otro lado de la aguja.
          </p>

          <p
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '21px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#eab308',
              margin: 0,
              fontWeight: 700
            }}
          >
            Gracias por escuchar con el alma.
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 48,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <div
            style={{
              fontSize: '17px',
              fontFamily: "'Space Mono', monospace",
              letterSpacing: '0.26em',
              color: 'rgba(254, 240, 138, 0.85)',
              textTransform: 'uppercase'
            }}
          >
            LA MÚSICA NUNCA OLVIDA
          </div>
          <div
            style={{
              fontSize: '13px',
              fontFamily: "'Space Mono', monospace",
              letterSpacing: '0.18em',
              color: 'rgba(234, 179, 8, 0.6)'
            }}
          >
            DESLIZA HACIA EL ARCHIVO ▸
          </div>
        </div>
      </div>
    </CinematicFrame>
  );
};

// =========================================================================
// HISTORIA 2: INTERACCIÓN & MEMORIA (¿CON QUÉ HISTORIA LLEGASTE?)
// =========================================================================
export const Story10KDescubrimiento: React.FC = () => {
  return (
    <CinematicFrame frameNumber="FRAME 02/04" badgeText="COMUNIDAD">
      <Img
        src={staticFile('videos/rock-day-2026/scene-08-pink-floyd.png')}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '1080px',
          height: '1920px',
          objectFit: 'cover',
          filter: 'brightness(0.24) contrast(1.22) sepia(0.25)',
          zIndex: 1
        }}
      />

      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(7,6,5,0.95) 0%, rgba(16,13,10,0.72) 40%, rgba(7,6,5,0.96) 100%)',
          zIndex: 2
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 175,
          left: 60,
          right: 60,
          bottom: 120,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'center',
          zIndex: 10
        }}
      >
        {/* Bloque Superior: Header + Titular */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%'
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 22px',
              borderRadius: '24px',
              background: 'rgba(234, 179, 8, 0.12)',
              border: '1px solid rgba(234, 179, 8, 0.4)',
              marginBottom: 20
            }}
          >
            <span style={{color: '#eab308', fontSize: '13px'}}>●</span>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#fef08a',
                fontFamily: "'Space Mono', monospace"
              }}
            >
              MEMORIA COMPARTIDA
            </span>
            <span style={{color: '#eab308', fontSize: '13px'}}>●</span>
          </div>

          <h1
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '48px',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '0.04em',
              color: '#fdfbf7',
              margin: '0 0 14px 0',
              textShadow: '0 4px 18px rgba(0,0,0,0.9)'
            }}
          >
            LA AGUJA QUE TOCÓ TU PUERTA
          </h1>

          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontStyle: 'italic',
              fontSize: '26px',
              lineHeight: 1.35,
              color: '#fef3c7',
              margin: '0 0 28px 0',
              maxWidth: '820px'
            }}
          >
            ¿Con qué historia o canción descubriste este rincón por primera vez?
          </p>

          {/* Tríptico de miniaturas */}
          <div
            style={{
              display: 'flex',
              gap: '18px',
              width: '100%',
              justifyContent: 'center'
            }}
          >
            <div
              style={{
                flex: 1,
                background: '#0d0b0a',
                borderRadius: '14px',
                overflow: 'hidden',
                border: '1px solid rgba(234, 179, 8, 0.35)',
                boxShadow: '0 14px 35px rgba(0,0,0,0.8)'
              }}
            >
              <div style={{height: '220px', overflow: 'hidden'}}>
                <Img
                  src={staticFile('videos/rock-day-2026/scene-08-pink-floyd.png')}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center center'
                  }}
                />
              </div>
              <div
                style={{
                  padding: '12px 10px',
                  fontSize: '13px',
                  fontFamily: "'Space Mono', monospace",
                  letterSpacing: '0.08em',
                  color: '#fef08a',
                  textTransform: 'uppercase'
                }}
              >
                Abbey Road, 1975
              </div>
            </div>

            <div
              style={{
                flex: 1,
                background: '#0d0b0a',
                borderRadius: '14px',
                overflow: 'hidden',
                border: '1.5px solid rgba(234, 179, 8, 0.55)',
                boxShadow: '0 16px 40px rgba(0,0,0,0.85)',
                transform: 'scale(1.04)'
              }}
            >
              <div style={{height: '220px', overflow: 'hidden'}}>
                <Img
                  src={staticFile(
                    'videos/jose-maria-napoleon-vive-acordes-ocultos/scene-01.png'
                  )}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center 12%'
                  }}
                />
              </div>
              <div
                style={{
                  padding: '12px 10px',
                  fontSize: '13px',
                  fontFamily: "'Space Mono', monospace",
                  letterSpacing: '0.08em',
                  color: '#fef08a',
                  textTransform: 'uppercase'
                }}
              >
                Napoleón "Vive", 1976
              </div>
            </div>

            <div
              style={{
                flex: 1,
                background: '#0d0b0a',
                borderRadius: '14px',
                overflow: 'hidden',
                border: '1px solid rgba(234, 179, 8, 0.35)',
                boxShadow: '0 14px 35px rgba(0,0,0,0.8)'
              }}
            >
              <div style={{height: '220px', overflow: 'hidden'}}>
                <Img
                  src={staticFile('videos/rock-day-2026/scene-09-david-bowie.png')}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center 15%'
                  }}
                />
              </div>
              <div
                style={{
                  padding: '12px 10px',
                  fontSize: '13px',
                  fontFamily: "'Space Mono', monospace",
                  letterSpacing: '0.08em',
                  color: '#fef08a',
                  textTransform: 'uppercase'
                }}
              >
                Bowie en Berlín, 1977
              </div>
            </div>
          </div>
        </div>

        {/* Bloque Central: STICKER DE PREGUNTAS */}
        <div
          style={{
            width: '860px',
            height: '420px',
            borderRadius: '26px',
            border: '2.5px dashed rgba(234, 179, 8, 0.65)',
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(35, 28, 20, 0.88) 0%, rgba(15, 12, 10, 0.98) 100%)',
            boxShadow:
              '0 0 50px rgba(234, 179, 8, 0.2), inset 0 0 35px rgba(0,0,0,0.7)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '36px 40px',
            position: 'relative'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -18,
              background: '#eab308',
              color: '#070605',
              padding: '7px 24px',
              borderRadius: '20px',
              fontFamily: "'Space Mono', monospace",
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              boxShadow: '0 4px 18px rgba(234, 179, 8, 0.6)'
            }}
          >
            ✦ COLOCA AQUÍ TU STICKER DE PREGUNTAS ✦
          </div>

          <div
            style={{
              fontSize: '48px',
              marginBottom: 12,
              filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.6))'
            }}
          >
            💬
          </div>

          <div
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '28px',
              fontWeight: 700,
              color: '#fef08a',
              letterSpacing: '0.08em',
              marginBottom: 8
            }}
          >
            ZONA DE INTERACCIÓN DIRECTA
          </div>

          <div
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '19px',
              color: '#94a3b8',
              maxWidth: '680px',
              lineHeight: 1.4
            }}
          >
            "¿Qué canción o historia te trajo a Acordes Ocultos?"
          </div>

          <div
            style={{
              marginTop: 26,
              width: '560px',
              height: '52px',
              borderRadius: '26px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.45)',
              fontSize: '16px',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
          >
            Escribe tu respuesta aquí...
          </div>
        </div>

        {/* Bloque Inferior */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            maxWidth: '820px'
          }}
        >
          <p
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '23px',
              lineHeight: 1.5,
              color: '#cbd5e1',
              margin: '0 0 18px 0'
            }}
          >
            Déjamelo en la cajita.{' '}
            <strong style={{color: '#fef08a'}}>
              Hoy estaré compartiendo y comentando
            </strong>{' '}
            los recuerdos más memorables que nos unieron a esta cuenta.
          </p>

          <div
            style={{
              fontSize: '15px',
              fontFamily: "'Space Mono', monospace",
              letterSpacing: '0.22em',
              color: 'rgba(234, 179, 8, 0.75)',
              textTransform: 'uppercase'
            }}
          >
            CADA MEMORIA ES PARTE DEL ARCHIVO
          </div>
        </div>
      </div>
    </CinematicFrame>
  );
};

// =========================================================================
// HISTORIA 3: HITO OFICIAL (LA BÓVEDA DIGITAL ABRE SUS PUERTAS)
// =========================================================================
export const Story10KWebOficial: React.FC = () => {
  return (
    <CinematicFrame frameNumber="FRAME 03/04" badgeText="ACORDESOCULTOS.COM">
      {/* Fondo de biblioteca / estudio */}
      <Img
        src={staticFile('videos/rock-day-2026/scene-03-simon-garfunkel.png')}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '1080px',
          height: '1920px',
          objectFit: 'cover',
          filter: 'brightness(0.24) contrast(1.22) sepia(0.25)',
          zIndex: 1
        }}
      />

      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(7,6,5,0.96) 0%, rgba(20,16,12,0.68) 45%, rgba(7,6,5,0.97) 100%)',
          zIndex: 2
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 175,
          left: 60,
          right: 60,
          bottom: 120,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'center',
          zIndex: 10
        }}
      >
        {/* Bloque Superior: Header + Titular */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%'
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 24px',
              borderRadius: '24px',
              background: 'rgba(234, 179, 8, 0.12)',
              border: '1px solid rgba(234, 179, 8, 0.45)',
              marginBottom: 16
            }}
          >
            <span style={{color: '#eab308', fontSize: '14px'}}>✦</span>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#fef08a',
                fontFamily: "'Space Mono', monospace"
              }}
            >
              NUEVA ETAPA OFICIAL
            </span>
            <span style={{color: '#eab308', fontSize: '14px'}}>✦</span>
          </div>

          <h1
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '48px',
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: '0.04em',
              color: '#fdfbf7',
              margin: '0 0 12px 0',
              textShadow: '0 4px 20px rgba(0,0,0,0.9)'
            }}
          >
            LA BÓVEDA DIGITAL ABRE SUS PUERTAS
          </h1>

          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontStyle: 'italic',
              fontSize: '25px',
              lineHeight: 1.4,
              color: '#fef3c7',
              margin: 0,
              maxWidth: '820px'
            }}
          >
            El archivo sonoro e histórico de Acordes Ocultos ahora tiene hogar
            propio en la red.
          </p>
        </div>

        {/* Bloque Central: Tarjeta Editorial de acordesocultos.com */}
        <div
          style={{
            width: '880px',
            background:
              'linear-gradient(135deg, rgba(35, 28, 20, 0.95) 0%, rgba(18, 14, 10, 0.98) 100%)',
            border: '2px solid rgba(234, 179, 8, 0.55)',
            borderRadius: '22px',
            padding: '32px 30px',
            boxShadow:
              '0 25px 65px rgba(0,0,0,0.85), 0 0 45px rgba(234, 179, 8, 0.2)',
            position: 'relative'
          }}
        >
          {/* Barra de navegador simulada */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 18px',
              background: 'rgba(0,0,0,0.4)',
              borderRadius: '12px',
              border: '1px solid rgba(234, 179, 8, 0.25)',
              marginBottom: 20
            }}
          >
            <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#ef4444'
                }}
              />
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#eab308'
                }}
              />
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#22c55e'
                }}
              />
            </div>
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: '14px',
                color: '#fef08a',
                letterSpacing: '0.08em',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>🔒</span>
              <span>https://acordesocultos.com</span>
            </div>
            <div
              style={{
                fontSize: '11px',
                fontFamily: "'Space Mono', monospace",
                color: 'rgba(234, 179, 8, 0.7)',
                letterSpacing: '0.1em'
              }}
            >
              ARCHIVO ACTIVO
            </div>
          </div>

          <div
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '46px',
              fontWeight: 900,
              letterSpacing: '0.06em',
              background:
                'linear-gradient(180deg, #ffffff 0%, #fef08a 40%, #eab308 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 4px 20px rgba(234, 179, 8, 0.4)',
              marginBottom: 20
            }}
          >
            ACORDESOCULTOS.COM
          </div>

          {/* Galería de crónicas destacadas de la web */}
          <div
            style={{
              display: 'flex',
              gap: '14px',
              marginBottom: 22
            }}
          >
            {[
              {
                src: 'videos/rock-day-2026/scene-11-queen-live-aid.png',
                title: 'El Milagro de Live Aid'
              },
              {
                src: 'videos/jose-maria-napoleon-vive-acordes-ocultos/scene-01.png',
                title: 'La Vergüenza del OTI'
              },
              {
                src: 'videos/rock-day-2026/scene-09-david-bowie.png',
                title: 'Héroes en Berlín'
              }
            ].map((card, idx) => (
              <div
                key={idx}
                style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.5)',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: '1px solid rgba(234, 179, 8, 0.3)'
                }}
              >
                <div style={{height: '110px', overflow: 'hidden'}}>
                  <Img
                    src={staticFile(card.src)}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center 20%'
                    }}
                  />
                </div>
                <div
                  style={{
                    padding: '8px 6px',
                    fontSize: '11px',
                    fontFamily: "'Space Mono', monospace",
                    color: '#fef3c7',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase'
                  }}
                >
                  {card.title}
                </div>
              </div>
            ))}
          </div>

          {/* Tres pilares de la web */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              textAlign: 'left'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 16px',
                background: 'rgba(255,255,255,0.035)',
                borderRadius: '10px',
                border: '1px solid rgba(234, 179, 8, 0.2)'
              }}
            >
              <span style={{color: '#eab308', fontSize: '18px'}}>✦</span>
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: '17px',
                  color: '#f1f5f9',
                  fontWeight: 500
                }}
              >
                <strong>Crónicas extendidas</strong> sin censura ni límites de
                tiempo.
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 16px',
                background: 'rgba(255,255,255,0.035)',
                borderRadius: '10px',
                border: '1px solid rgba(234, 179, 8, 0.2)'
              }}
            >
              <span style={{color: '#eab308', fontSize: '18px'}}>✦</span>
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: '17px',
                  color: '#f1f5f9',
                  fontWeight: 500
                }}
              >
                <strong>Fotografías históricas de archivo</strong> restauradas en
                alta resolución.
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 16px',
                background: 'rgba(255,255,255,0.035)',
                borderRadius: '10px',
                border: '1px solid rgba(234, 179, 8, 0.2)'
              }}
            >
              <span style={{color: '#eab308', fontSize: '18px'}}>✦</span>
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: '17px',
                  color: '#f1f5f9',
                  fontWeight: 500
                }}
              >
                <strong>Templo libre de algoritmos</strong> para los 10.000
                custodios.
              </span>
            </div>
          </div>
        </div>

        {/* Bloque Inferior: STICKER DE ENLACE */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%'
          }}
        >
          <div
            style={{
              width: '880px',
              height: '210px',
              borderRadius: '24px',
              border: '2.5px dashed rgba(234, 179, 8, 0.75)',
              background:
                'radial-gradient(ellipse at 50% 50%, rgba(45, 36, 25, 0.94) 0%, rgba(20, 16, 12, 0.98) 100%)',
              boxShadow:
                '0 0 45px rgba(234, 179, 8, 0.25), inset 0 0 25px rgba(0,0,0,0.7)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              marginBottom: 24,
              position: 'relative'
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: -16,
                background: '#eab308',
                color: '#070605',
                padding: '6px 22px',
                borderRadius: '18px',
                fontFamily: "'Space Mono', monospace",
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                boxShadow: '0 4px 16px rgba(234, 179, 8, 0.6)'
              }}
            >
              ✦ COLOCA AQUÍ EL STICKER DE ENLACE DE INSTAGRAM ✦
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                fontSize: '32px',
                color: '#fef08a',
                fontFamily: "'Cinzel', serif",
                fontWeight: 800,
                letterSpacing: '0.06em',
                marginBottom: 8
              }}
            >
              <span>🔗</span>
              <span>ACORDESOCULTOS.COM</span>
            </div>

            <div
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '16px',
                color: '#cbd5e1',
                lineHeight: 1.4
              }}
            >
              Configuración: URL = <code style={{color: '#fef08a'}}>https://acordesocultos.com</code>
              <br />
              Texto del sticker: <strong>"TOCA PARA VISITAR LA BÓVEDA"</strong>
            </div>
          </div>

          <div
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '20px',
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: '#eab308',
              fontWeight: 800
            }}
          >
            BIENVENIDOS A CASA • ACCESO LIBRE
          </div>
        </div>
      </div>
    </CinematicFrame>
  );
};

// =========================================================================
// HISTORIA 4: COMUNIDAD & FUTURO (TÚ ESCRIBES EL PRÓXIMO CAPÍTULO)
// =========================================================================
export const Story10KFuturo: React.FC = () => {
  return (
    <CinematicFrame frameNumber="FRAME 04/04" badgeText="CO-CREACIÓN">
      {/* Fondo: Jimmy Page / Led Zeppelin */}
      <Img
        src={staticFile('videos/rock-day-2026/scene-07-led-zeppelin.png')}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '1080px',
          height: '1920px',
          objectFit: 'cover',
          filter: 'brightness(0.26) contrast(1.22) sepia(0.26)',
          zIndex: 1
        }}
      />

      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(7,6,5,0.95) 0%, rgba(20,15,10,0.68) 45%, rgba(7,6,5,0.96) 100%)',
          zIndex: 2
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 175,
          left: 60,
          right: 60,
          bottom: 120,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'center',
          zIndex: 10
        }}
      >
        {/* Bloque Superior: Header + Titular */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%'
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 22px',
              borderRadius: '24px',
              background: 'rgba(234, 179, 8, 0.12)',
              border: '1px solid rgba(234, 179, 8, 0.4)',
              marginBottom: 16
            }}
          >
            <span style={{color: '#eab308', fontSize: '13px'}}>●</span>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#fef08a',
                fontFamily: "'Space Mono', monospace"
              }}
            >
              EL PRÓXIMO CAPÍTULO
            </span>
            <span style={{color: '#eab308', fontSize: '13px'}}>●</span>
          </div>

          <h1
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '48px',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '0.04em',
              color: '#fdfbf7',
              margin: '0 0 12px 0',
              textShadow: '0 4px 18px rgba(0,0,0,0.9)'
            }}
          >
            TÚ ESCRIBES EL PRÓXIMO EPISODIO
          </h1>

          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontStyle: 'italic',
              fontSize: '26px',
              lineHeight: 1.35,
              color: '#fef3c7',
              margin: '0 0 24px 0',
              maxWidth: '820px'
            }}
          >
            ¿Qué leyenda, tragedia o enigma musical debemos desenterrar a
            continuación?
          </p>

          {/* Tarjetas de temáticas en cuadrícula 3x2 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              width: '100%',
              maxWidth: '880px'
            }}
          >
            {[
              {tag: 'Rock Clásico 70s', icon: '⚡'},
              {tag: 'Baladas Inmortales', icon: '🎙️'},
              {tag: 'Guitarras Solitarias', icon: '🎸'},
              {tag: 'Canciones Malditas', icon: '🕯️'},
              {tag: 'Censura & Dictaduras', icon: '⚔️'},
              {tag: 'Joyas Olvidadas', icon: '✨'}
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: 'rgba(234, 179, 8, 0.08)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '15px',
                  fontFamily: "'Space Mono', monospace",
                  letterSpacing: '0.04em',
                  color: '#fef08a'
                }}
              >
                <span>{item.icon}</span>
                <span>{item.tag}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bloque Central: STICKER DE PREGUNTAS / ENCUESTA */}
        <div
          style={{
            width: '880px',
            height: '420px',
            borderRadius: '26px',
            border: '2.5px dashed rgba(234, 179, 8, 0.65)',
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(35, 28, 20, 0.88) 0%, rgba(15, 12, 10, 0.98) 100%)',
            boxShadow:
              '0 0 50px rgba(234, 179, 8, 0.2), inset 0 0 35px rgba(0,0,0,0.7)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '36px 40px',
            position: 'relative'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -18,
              background: '#eab308',
              color: '#070605',
              padding: '7px 24px',
              borderRadius: '20px',
              fontFamily: "'Space Mono', monospace",
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              boxShadow: '0 4px 18px rgba(234, 179, 8, 0.6)'
            }}
          >
            ✦ COLOCA AQUÍ EL STICKER DE PREGUNTAS O ENCUESTA ✦
          </div>

          <div
            style={{
              fontSize: '48px',
              marginBottom: 12,
              filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.6))'
            }}
          >
            ✍️
          </div>

          <div
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '28px',
              fontWeight: 700,
              color: '#fef08a',
              letterSpacing: '0.08em',
              marginBottom: 8
            }}
          >
            PROPÓN EL PRÓXIMO ARTISTA O TEMA
          </div>

          <div
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '19px',
              color: '#94a3b8',
              maxWidth: '680px',
              lineHeight: 1.4
            }}
          >
            "Escribe la canción o banda que merece su propio documental..."
          </div>

          <div
            style={{
              marginTop: 26,
              width: '560px',
              height: '52px',
              borderRadius: '26px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.45)',
              fontSize: '16px',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
          >
            Escribe el nombre aquí...
          </div>
        </div>

        {/* Bloque Inferior */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            maxWidth: '820px'
          }}
        >
          <p
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '23px',
              lineHeight: 1.5,
              color: '#cbd5e1',
              margin: '0 0 18px 0'
            }}
          >
            Las historias más sugeridas entrarán de inmediato a la mesa de
            investigación y producción documental.
          </p>

          <div
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '26px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#fef08a',
              fontWeight: 800,
              marginBottom: 8
            }}
          >
            10.000 VECES GRACIAS
          </div>
          <div
            style={{
              fontSize: '15px',
              fontFamily: "'Space Mono', monospace",
              letterSpacing: '0.24em',
              color: 'rgba(234, 179, 8, 0.75)',
              textTransform: 'uppercase'
            }}
          >
            LA AGUJA SIGUE GIRANDO EN 33 RPM
          </div>
        </div>
      </div>
    </CinematicFrame>
  );
};
