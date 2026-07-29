import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const apiKey = process.env.ELEVENLABS_API_KEY;
const voiceId = "g10k86KeEUyBqW9lcKYg"; // Lizy - Storytelling

const outputDir = "public/audio/youtube/isabel-pantoja-marinero-de-luces";
fs.mkdirSync(outputDir, { recursive: true });

const blocks = [
  {
    id: "01_prologo",
    title: "Prólogo: La tarde plomiza de Pozoblanco",
    text: "La tarde del 26 de septiembre de 1984, la localidad cordobesa de Pozoblanco ardía bajo un sol de plomo. Nadie entre las miles de almas que llenaban los tendidos presagiaba que aquella corrida de feria partiría en dos la historia de España. Sobre la arena, Francisco Rivera «Paquirri», en la cima de su gloria y con apenas treinta y seis años, fue prendido violentamente por el cuarto toro de la tarde, «Avispado». Los segundos que siguieron parecieron una eternidad suspendida en el aire. En la modesta enfermería de la plaza, desangrándose con una entereza casi mística, el matador miró al cirujano y le pidió calma: 'Abran lo que tengan que abrir, doctor. Lo demás está en sus manos'. Pero en la ambulancia que lo trasladaba a Córdoba, la vida se le apagó antes de llegar al hospital. La noticia cayó como un trueno sobre el país."
  },
  {
    id: "02_acto1",
    title: "Acto I: La Boda del Siglo y el Idilio Roto",
    text: "Apenas diecisiete meses antes, el 30 de abril de 1983, Sevilla había celebrado la llamada 'boda del siglo'. Ante el altar del Gran Poder se fundían las dos pasiones más hondas del alma popular andaluza: el torero más carismático y la joven tonadillera llamada a reinar en la copla, Isabel Pantoja. Hija humilde del barrio del Tardón, Isabel había forjado su voz en la disciplina de los tablaos. Junto a Paco, encontró un refugio de ternura y plenitud. En febrero de 1984 nació su hijo, colmando un hogar que parecía inexpugnable. Pero el destino es a veces un relámpago implacable. Aquel niño tenía apenas siete meses cuando una llamada telefónica destrozó para siempre el mundo de Isabel. Con veintiocho años recién cumplidos, la dicha se había transformado en un abismo negro."
  },
  {
    id: "03_acto2",
    title: "Acto II: El Silencio Sepulcral de Cantora",
    text: "Tras un entierro multitudinario en Sevilla, Isabel tomó una decisión tajante: canceló todos sus compromisos, clausuró sus apariciones públicas y se recluyó tras los muros encalados de la finca Cantora. Durante catorce meses interminables, la finca fue un monasterio de soledad. Isabel vistió rigurosamente de negro azabache, sin alhajas, sin afeites, consagrada en cuerpo y alma a la crianza de su pequeño huérfano. La prensa la bautizó como 'La Viuda de España'. Los rumores se multiplicaban y las casas discográficas intentaban convencerla de regresar, pero encontraban siempre una muralla inquebrantable. Su respuesta era lapidaria: 'No volveré a cantar jamás. La voz se me murió con Paco'."
  },
  {
    id: "04_acto3",
    title: "Acto III: El Orfebre Secreto y la Metáfora del Mar",
    text: "En la primavera de 1985, la discográfica acudió al único hombre capaz de descifrar aquel duelo: José Luis Perales. Perales comprendió de inmediato el inmenso peligro ético del encargo. Caer en el morbo de la sangre, los cuernos o el ruedo habría sido una profanación del dolor. Fue entonces cuando tomó una decisión de una delicadeza maestra: trasladar la tragedia al mar. El albero de Pozoblanco se transformó en la orilla de una bahía. El traje de luces del torero se convirtió en un 'marinero de luces'. Y la muerte no se nombró como una herida, sino como un viaje en la distancia: un barco velero cargado de sueños que cruzaba la bahía para no regresar. Con la maqueta bajo el brazo, Perales viajó a Cantora y le cantó el tema mirándola a los ojos. Tras horas de llanto liberador, Isabel alzó la mirada y sentenció: 'José Luis, estas canciones son mi propia alma. Las voy a cantar'."
  },
  {
    id: "05_acto4",
    title: "Acto IV: La Noche del Lope de Vega y el Desgarro ante la Reina",
    text: "La noche del 5 de diciembre de 1985, Madrid contuvo el aliento. En el Teatro Lope de Vega, ante la presencia de la Reina Doña Sofía y transmitido en directo para millones de hogares, el telón de terciopelo se abrió para descubrir a una mujer enlutada frente a su destino. Al entonar las estrofas de 'Marinero de Luces', el dique de la compostura se rompió. Las lágrimas surcaron sus mejillas y su voz se quebró en un desgarro telúrico, desgarrador y visceral. No era un concierto; era la catarsis de un país entero que lloraba con ella. La Reina aplaudió con los ojos humedecidos y la ovación se prolongó durante más de diez minutos. Aquella noche, Isabel no solo recuperó su canto: aprendió a renacer desde las cenizas."
  },
  {
    id: "06_epilogo",
    title: "Epílogo: El Velero hacia la Eternidad",
    text: "El álbum 'Marinero de Luces' vendió más de un millón de copias, consagrando el disco más emblemático de la música española de los ochenta. Pero más allá de las cifras, logró el milagro de transformar una pérdida devastadora en un refugio poético inmortal. Porque gracias a la orfebrería de Perales y al corazón de Isabel, Paquirri no quedó atrapado en el polvo de una tarde aciaga, sino navegando para siempre en un mar donde los barcos jamás naufragan. ¿Dónde estabas tú la primera vez que escuchaste este himno? Cuéntanoslo en los comentarios y suscríbete a Acordes Ocultos para seguir descubriendo el alma detrás de las canciones."
  }
];

async function generateBlock(block, index) {
  const filePath = path.join(outputDir, `${block.id}.mp3`);
  console.log(`[${index + 1}/${blocks.length}] Generando ${block.title} (${block.text.length} caracteres)...`);

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: block.text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.50,
        similarity_boost: 0.75,
        style: 0.20,
        use_speaker_boost: true
      }
    })
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`Error en bloque ${block.id}:`, response.status, err);
    throw new Error(`Fallo en bloque ${block.id}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
  console.log(`✓ Guardado: ${filePath} (${(arrayBuffer.byteLength / 1024).toFixed(1)} KB)`);
}

async function main() {
  console.log("Iniciando generación de narración completa con Lizy para Acordes Ocultos YouTube...\n");
  for (let i = 0; i < blocks.length; i++) {
    await generateBlock(blocks[i], i);
    // Pausa breve para cuidar rate limit
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log("\n🎉 ¡Todos los bloques de audio han sido generados exitosamente!");
}

main().catch(err => {
  console.error("Error fatal:", err);
  process.exit(1);
});
