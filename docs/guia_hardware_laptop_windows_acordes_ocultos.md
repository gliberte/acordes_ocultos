# 💻 Guía de Especificaciones de Hardware: Laptop con Windows para «Acordes Ocultos»
**Configuración óptima y más económica para el entorno de producción y renderizado**

---

## 🎯 1. Resumen Ejecutivo y Diagnóstico de Carga

Para elegir la computadora más económica posible sin comprometer la velocidad ni sufrir bloqueos durante la producción diaria, es necesario separar **qué tareas ejecuta tu equipo en local** y **cuáles se procesan en la nube**:

### ☁️ Procesamiento en la Nube (No consume tu hardware)
* **Generación de imágenes fisonómicas e históricas:** Se procesa en los servidores de Google (Google Flow / Gemini Imagen) o modelos externos.
* **Inteligencia Artificial y Redacción:** Los modelos de lenguaje (Claude / Gemini) razonan y generan textos remotamente.
* **Almacenamiento y CDN:** Cloudflare R2, base de datos en Supabase y Bóveda Maestra en Google Drive.

### 🖥️ Procesamiento Local en tu Computadora (Exige hardware real)
* **Renderizado de Video con Remotion:** Es el proceso más exigente. Remotion ejecuta instancias paralelas de Google Chromium para pintar cada uno de los 2.700 fotogramas (en resolución vertical 1080x1920 a 30 fps) y luego utiliza **FFmpeg** para la codificación del video en formato H.264.
* **Automatización con Playwright (Google Flow):** Lanza una sesión de Google Chrome para automatizar la cola de prompts y descargas.
* **Sistema Operativo (Windows 11):** Windows 11 consume por defecto entre 3.5 GB y 4.5 GB de memoria RAM en reposo.

---

## 📋 2. Ficha Técnica de Especificaciones Recomendadas

| Componente | Mínimo Indispensable (Más Económico) | Punto Óptimo Recomendado | ¿Por qué es crucial? |
| :--- | :--- | :--- | :--- |
| **Memoria RAM** | **16 GB DDR4 (3200 MHz)** | **16 GB o 32 GB DDR4 / DDR5** | **INNEGOCIABLE:** Windows 11 gasta ~4 GB. Remotion y Playwright requieren 4-6 GB adicionales al renderizar. Con 8 GB la laptop colapsa con error de memoria (*Out of Memory*). |
| **Procesador (CPU)** | **AMD Ryzen 5 (Serie 5000 / 7000)** *(ej. 5500U, 5600H, 7520U, 7530U)* o **Intel Core i5 (Gen 12ª / 13ª)** *(ej. 1235U, 12450H)* | **AMD Ryzen 5 5600H / 7535HS** o **Intel Core i5-12450H / 13420H** | El renderizado de Remotion depende 100% de la cantidad de núcleos/hilos del procesador. Requiere mínimo 6 núcleos y 12 hilos para renderizar 90 segundos en ~2-3 minutos. |
| **Tarjeta Gráfica (GPU)** | **Gráficos Integrados** *(AMD Radeon Vega / 610M / 660M o Intel Iris Xe)* | **Gráficos Integrados modernos** | **NO requieres tarjeta gráfica dedicada (Nvidia RTX)**. Remotion codifica por CPU y la IA corre en la nube. Ahorras entre $250 y $400 USD evitando GPU dedicada. |
| **Almacenamiento** | **512 GB SSD NVMe M.2 PCIe** | **512 GB o 1 TB SSD NVMe M.2** | Cada renderizado escribe cientos de megas en caché de fotogramas temporales. Un disco mecánico tradicional (HDD) haría el proceso 10 veces más lento. |
| **Pantalla** | **15.6" o 14" Full HD (1920 x 1080) IPS / Antirreflejo** | **15.6" Full HD IPS (300 nits)** | Resolución estándar para trabajar cómodamente con editores de código y previsualización de clips. |
| **Puertos y Red** | **Wi-Fi 5 o Wi-Fi 6 + Bluetooth 5.0 + USB 3.2** | **Wi-Fi 6 (802.11ax) + USB-C** | Transferencia fluida al subir videos a Cloudflare R2 y descargar audios en alta fidelidad. |
| **Sistema Operativo** | **Windows 11 Home (64 bits)** | **Windows 11 Home / Pro (64 bits)** | Compatibilidad total con Node.js v20+, Git, FFmpeg y Playwright. |

---

## 🏷️ 3. Modelos de Laptops Sugeridas (Gama Calidad / Precio)

Rango de precio estimado en el mercado: **$380 USD – $550 USD**.

### 1. Lenovo IdeaPad 1 / IdeaPad 3 (Opción #1 en Economía y Fiabilidad)
* **Procesador:** AMD Ryzen 5 5500U o Ryzen 5 7520U / 7530U (6 núcleos, 12 hilos).
* **Memoria:** 16 GB RAM DDR4.
* **Disco:** 512 GB SSD NVMe.
* **Ventaja:** Excelente gestión térmica, teclado resistente y gran rendimiento multi-hilo para render de Remotion.

### 2. Acer Aspire 3 / Aspire 5
* **Procesador:** Intel Core i5-1235U (10 núcleos: 2 de rendimiento + 8 de eficiencia) o Ryzen 5 serie 5000.
* **Memoria:** 16 GB RAM.
* **Disco:** 512 GB SSD NVMe.
* **Ventaja:** Chasis con buena capacidad de actualización de componentes a futuro.

### 3. HP 15-ef / HP 15-dy
* **Procesador:** AMD Ryzen 5 5500U o Intel Core i5 de 12ª generación.
* **Memoria:** 16 GB RAM.
* **Disco:** 512 GB SSD.
* **Ventaja:** Modelo masivo con repuestos económicos y batería de larga duración.

### 4. ASUS Vivobook 15 (F1502 / M1502)
* **Procesador:** Intel Core i5-1235U o AMD Ryzen 5 7530U.
* **Memoria:** 16 GB RAM.
* **Disco:** 512 GB SSD NVMe.
* **Ventaja:** Diseño delgado, ligero y pantalla con bisel estrecho.

---

## ⚠️ 4. Trampas Comerciales y Errores Críticos que Debes Evitar

1. **El engaño de las ofertas con 8 GB de RAM soldada:**
   * Muchas laptops económicas ofrecen 8 GB de memoria soldados a la placa madre sin ranura libre de ampliación. **No la compres**. En Windows 11, este proyecto colapsará al renderizar. Si compras un modelo con 8 GB por presupuesto, asegúrate de que tenga un slot SODIMM libre para comprar un módulo de 8 GB adicional por $20 USD.
2. **Procesadores obsoletos (Intel Celeron, Pentium o Core i3 antiguos):**
   * Un Intel Celeron o un Core i3 de 2 núcleos tardará más de 20 minutos en renderizar un video de 90 segundos y el ventilador funcionará al 100% de forma constante.
3. **Pagar de más por laptops «Gamer» pesadas:**
   * No necesitas gastar $800 o $1.000 USD en una laptop con tarjeta gráfica Nvidia GeForce RTX 3050/4060. Además de costar el doble, son más pesadas, las baterías duran poco y no aportan casi nada al pipeline de Remotion/FFmpeg en este proyecto.

---

## 🛠️ 5. Pasos Iniciales para Configurar tu Nueva Laptop con Windows

Una vez adquirida tu laptop, estos son los pasos para dejarla 100% lista:
1. **Instalar Node.js LTS:** Descarga la versión oficial recomendada (v20 o v22) desde [nodejs.org](https://nodejs.org).
2. **Instalar Git para Windows:** Desde [git-scm.com](https://git-scm.com), seleccionando Git Bash.
3. **Instalar FFmpeg:** Ejecutar en PowerShell: `winget install Gyan.FFmpeg`.
4. **Instalar VS Code:** Desde [code.visualstudio.com](https://code.visualstudio.com).
5. **Clonar el proyecto y dependencias:**
   ```bash
   git clone <tu-repositorio>
   cd acordes_ocultos
   npm install
   npx playwright install chromium
   ```

---
*Documento elaborado para el equipo de producción de Acordes Ocultos.*
