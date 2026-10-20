import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const coverPath = path.join(rootDir, 'book/volumen-01/output/Portada_Acordes_Ocultos_Volumen_I.jpg');

const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; }
    html, body {
      background: transparent !important;
      width: 1600px;
      height: 1600px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  </style>
</head>
<body>
  <div id="container"></div>
  <script type="module">
    import * as THREE from '/three/three.module.js';

    const width = 1600;
    const height = 1600;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(24, width / height, 0.1, 1000);
    camera.position.set(0, 0.1, 28);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1.5);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    document.getElementById('container').appendChild(renderer.domElement);

    // Iluminación de estudio editorial
    const ambientLight = new THREE.AmbientLight(0xfff7ee, 1.15);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffeedd, 2.6);
    keyLight.position.set(-10, 16, 16);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xddeeff, 1.0);
    fillLight.position.set(12, 6, 10);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xf5b85a, 2.4);
    rimLight.position.set(6, 10, -10);
    scene.add(rimLight);

    // Dimensiones proporcionales para libro de 6x9 pulgadas y 241 páginas
    const bookWidth = 6.0;
    const bookHeight = 9.0;
    const bookThickness = 0.78; // Grosor perceptible de 241 páginas

    // 1. Textura del canto de páginas (papel editorial ahuesado con estrías)
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = 512;
    pageCanvas.height = 1024;
    const pctx = pageCanvas.getContext('2d');
    pctx.fillStyle = '#f7ede0';
    pctx.fillRect(0, 0, 512, 1024);

    for (let y = 0; y < 1024; y += 2) {
      const shade = Math.sin(y * 1.6) * 16 + Math.random() * 8;
      const gray = Math.floor(236 - shade);
      pctx.fillStyle = \`rgb(\${gray}, \${gray - 12}, \${gray - 26})\`;
      pctx.fillRect(0, y, 512, 1.2);
    }
    const pGrad = pctx.createLinearGradient(0, 0, 512, 0);
    pGrad.addColorStop(0, 'rgba(0,0,0,0.28)');
    pGrad.addColorStop(0.1, 'rgba(0,0,0,0.02)');
    pGrad.addColorStop(0.9, 'rgba(0,0,0,0.02)');
    pGrad.addColorStop(1, 'rgba(0,0,0,0.32)');
    pctx.fillStyle = pGrad;
    pctx.fillRect(0, 0, 512, 1024);
    const pageTexture = new THREE.CanvasTexture(pageCanvas);

    // 2. Textura del lomo
    const spineCanvas = document.createElement('canvas');
    spineCanvas.width = 512;
    spineCanvas.height = 2048;
    const sctx = spineCanvas.getContext('2d');
    sctx.fillStyle = '#100e0b';
    sctx.fillRect(0, 0, 512, 2048);
    sctx.strokeStyle = '#d4af37';
    sctx.lineWidth = 8;
    sctx.strokeRect(40, 80, 432, 8);
    sctx.strokeRect(40, 1960, 432, 8);
    sctx.save();
    sctx.translate(256, 1024);
    sctx.rotate(-Math.PI / 2);
    sctx.fillStyle = '#f3cf7a';
    sctx.font = 'bold 54px serif';
    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';
    sctx.letterSpacing = '8px';
    sctx.fillText('ACORDES OCULTOS · VOLUMEN I', 0, 0);
    sctx.restore();
    const spineTexture = new THREE.CanvasTexture(spineCanvas);

    // 3. Contraportada
    const backCanvas = document.createElement('canvas');
    backCanvas.width = 682;
    backCanvas.height = 1024;
    const bctx = backCanvas.getContext('2d');
    bctx.fillStyle = '#100e0b';
    bctx.fillRect(0, 0, 682, 1024);
    const backTexture = new THREE.CanvasTexture(backCanvas);

    const loader = new THREE.TextureLoader();
    loader.load('/cover.jpg', (frontTexture) => {
      frontTexture.colorSpace = THREE.SRGBColorSpace;
      frontTexture.anisotropy = 16;

      const materials = [
        new THREE.MeshStandardMaterial({ map: pageTexture, roughness: 0.9, metalness: 0.05 }), // derecha (+X: páginas)
        new THREE.MeshStandardMaterial({ map: spineTexture, roughness: 0.45, metalness: 0.2 }), // lomo (-X)
        new THREE.MeshStandardMaterial({ map: pageTexture, roughness: 0.9, metalness: 0.05 }), // arriba (+Y)
        new THREE.MeshStandardMaterial({ map: pageTexture, roughness: 0.9, metalness: 0.05 }), // abajo (-Y)
        new THREE.MeshStandardMaterial({ map: frontTexture, roughness: 0.35, metalness: 0.08 }), // portada oficial (+Z)
        new THREE.MeshStandardMaterial({ map: backTexture, roughness: 0.45, metalness: 0.15 })  // contraportada (-Z)
      ];

      const bookGeo = new THREE.BoxGeometry(bookWidth, bookHeight, bookThickness);
      const bookMesh = new THREE.Mesh(bookGeo, materials);
      bookMesh.castShadow = true;
      bookMesh.receiveShadow = true;

      const bookGroup = new THREE.Group();
      bookGroup.add(bookMesh);

      // Perspectiva 3D con la portada oficial al frente e inclinada para lucir el canto de páginas
      bookGroup.rotation.y = -0.38; // Muestra portada oficial nítida y canto de páginas a la derecha
      bookGroup.rotation.x = 0.12;  // Inclinación suave hacia adelante
      bookGroup.rotation.z = 0.02;
      bookGroup.position.set(0.1, 0.1, 0);

      scene.add(bookGroup);

      // Sombra de contacto suave en el suelo
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = 512;
      shadowCanvas.height = 512;
      const shctx = shadowCanvas.getContext('2d');
      const shGrad = shctx.createRadialGradient(256, 256, 30, 256, 256, 250);
      shGrad.addColorStop(0, 'rgba(0,0,0,0.65)');
      shGrad.addColorStop(0.5, 'rgba(0,0,0,0.3)');
      shGrad.addColorStop(1, 'rgba(0,0,0,0)');
      shctx.fillStyle = shGrad;
      shctx.fillRect(0, 0, 512, 512);
      const shadowTex = new THREE.CanvasTexture(shadowCanvas);

      const shadowPlaneGeo = new THREE.PlaneGeometry(12, 10);
      const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.85 });
      const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowMat);
      shadowPlane.rotation.x = -Math.PI / 2;
      shadowPlane.position.set(0.2, -4.6, -0.5);
      scene.add(shadowPlane);

      renderer.render(scene, camera);
      window.__RENDER_DONE__ = true;
    });
  </script>
</body>
</html>`;

async function main() {
  console.log('1. Levantando servidor...');
  const server = http.createServer((req, res) => {
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(htmlContent);
    } else if (req.url.startsWith('/three/')) {
      const fileName = req.url.replace('/three/', '');
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(fs.readFileSync(path.join(rootDir, 'node_modules/three/build', fileName)));
    } else if (req.url === '/cover.jpg') {
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      res.end(fs.readFileSync(coverPath));
    }
  });

  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  console.log('2. Capturando render transparente de alta resolución...');
  const browser = await chromium.launch({
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    headless: true,
    args: ['--disable-gpu', '--no-sandbox']
  });

  const page = await browser.newPage({ viewport: { width: 1600, height: 1600 } });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__RENDER_DONE__ === true, { timeout: 15000 });
  await page.waitForTimeout(500);

  const rawTransparentPng = path.join(rootDir, 'scratch/raw_book_official_transparent.png');
  await page.screenshot({ path: rawTransparentPng, type: 'png', omitBackground: true });
  await browser.close();
  server.close();

  console.log('3. Detectando bordes exactos del libro...');
  const rawRgbaBin = path.join(rootDir, 'scratch/raw_crop.bin');
  execSync(`ffmpeg -y -i "${rawTransparentPng}" -pix_fmt rgba -f rawvideo "${rawRgbaBin}"`);
  const buf = fs.readFileSync(rawRgbaBin);
  const w = 1600;
  const h = 1600;

  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const a = buf[idx + 3];
      if (a > 220) { // Libro opaco
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Margen de respiración
  const pad = 30;
  const cropX = Math.max(0, minX - pad);
  const cropY = Math.max(0, minY - pad);
  const cropW = Math.min(w - cropX, (maxX - minX) + pad * 2);
  const cropH = Math.min(h - cropY, (maxY - minY) + pad * 2);

  console.log(`   Recorte óptimo: ${cropW}x${cropH} en offset (${cropX}, ${cropY})`);

  console.log('4. Generando variantes optimizadas WebP y PNG con la PORTADA OFICIAL...');
  const outHdWebp = path.join(rootDir, 'web/public/book/libro-fisico-3d-hd.webp');
  const outHdPng = path.join(rootDir, 'web/public/book/libro-fisico-3d-hd.png');
  const outThumbWebp = path.join(rootDir, 'web/public/book/libro-fisico-3d-thumb.webp');
  const outThumbPng = path.join(rootDir, 'web/public/book/libro-fisico-3d-thumb.png');

  execSync(`ffmpeg -y -i "${rawTransparentPng}" -vf "crop=${cropW}:${cropH}:${cropX}:${cropY}" "${outHdPng}"`);
  execSync(`cwebp -q 94 "${outHdPng}" -o "${outHdWebp}"`);

  // Thumbnail para la barra del header (200px de ancho)
  execSync(`ffmpeg -y -i "${outHdPng}" -vf "scale=200:-1" "${outThumbPng}"`);
  execSync(`cwebp -q 94 "${outThumbPng}" -o "${outThumbWebp}"`);

  console.log('✅ Portada oficial 3D generada y recortada a la perfección:');
  console.log('   - HD WebP:', outHdWebp);
  console.log('   - HD PNG:', outHdPng);
  console.log('   - Thumb WebP:', outThumbWebp);
  console.log('   - Thumb PNG:', outThumbPng);
}

main().catch(console.error);
