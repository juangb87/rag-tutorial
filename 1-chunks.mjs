/**
 * 🐝 PASO 1: CHUNKING — Partir documentos en pedazos
 * 
 * ¿Por qué? Los LLMs tienen límite de contexto, y los embeddings
 * funcionan mejor con textos cortos y enfocados en un tema.
 * 
 * Conceptos:
 * - Chunk: Un pedazo de texto (generalmente 200-500 tokens)
 * - Overlap: Traslapar chunks para no perder contexto entre pedazos
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// ============================================
// CONFIGURACIÓN — Juega con estos valores!
// ============================================
const CHUNK_SIZE = 500;    // caracteres por chunk (en producción usarías tokens)
const CHUNK_OVERLAP = 50;  // caracteres de traslape entre chunks

/**
 * Parte un texto en chunks con overlap
 */
export function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    // Tomar un pedazo del texto
    let end = start + chunkSize;
    
    // Intentar cortar en un punto natural (fin de oración)
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const bestBreak = Math.max(lastPeriod, lastNewline);
      
      if (bestBreak > start + chunkSize * 0.5) {
        end = bestBreak + 1;
      }
    }
    
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    
    // Avanzar, pero con overlap para no perder contexto
    start = end - overlap;
  }
  
  return chunks;
}

/**
 * Lee todos los archivos .txt de una carpeta y los parte en chunks
 */
export function loadAndChunkDocs(docsDir = './docs') {
  const allChunks = [];
  const files = readdirSync(docsDir).filter(f => f.endsWith('.txt'));
  
  for (const file of files) {
    const content = readFileSync(join(docsDir, file), 'utf-8');
    const chunks = chunkText(content);
    
    // Cada chunk guarda metadata de dónde viene
    chunks.forEach((text, i) => {
      allChunks.push({
        id: `${file}-chunk-${i}`,
        text,
        source: file,
        chunkIndex: i
      });
    });
  }
  
  return allChunks;
}

// Si corremos este archivo directamente, mostrar los chunks
const isMain = process.argv[1]?.endsWith('1-chunks.mjs');
if (isMain) {
  console.log('📄 Cargando documentos y partiendo en chunks...\n');
  
  const chunks = loadAndChunkDocs();
  
  console.log(`✅ ${chunks.length} chunks creados:\n`);
  
  for (const chunk of chunks) {
    console.log(`--- ${chunk.id} ---`);
    console.log(chunk.text.slice(0, 100) + '...');
    console.log(`(${chunk.text.length} caracteres)\n`);
  }
  
  console.log('\n🎯 Siguiente paso: node 2-embeddings.mjs');
}
