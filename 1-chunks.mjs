/**
 * 🐝 PASO 1: CHUNKING — Partir documentos en pedazos
 * 
 * ¿Por qué? Los LLMs tienen límite de contexto, y los embeddings
 * funcionan mejor con textos cortos y enfocados en un tema.
 * 
 * UPGRADE: Ahora con Smart Chunking para Markdown!
 * - Archivos .md → se parten por headers (##) para respetar la estructura
 * - Archivos .txt → se parten por tamaño con overlap (método original)
 * 
 * Conceptos:
 * - Chunk: Un pedazo de texto (generalmente 200-500 tokens)
 * - Overlap: Traslapar chunks para no perder contexto entre pedazos
 * - Smart Chunking: Partir por estructura semántica, no por caracteres
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// ============================================
// CONFIGURACIÓN — Juega con estos valores!
// ============================================
const CHUNK_SIZE = 500;    // caracteres por chunk (para .txt)
const CHUNK_OVERLAP = 50;  // caracteres de traslape (para .txt)
const MAX_CHUNK_SIZE = 1000; // si una sección de .md es muy larga, la partimos

/**
 * MÉTODO 1: Chunking por tamaño (para .txt)
 * El método original — parte por cantidad de caracteres con overlap
 */
export function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + chunkSize;
    
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
    
    start = end - overlap;
  }
  
  return chunks;
}

/**
 * MÉTODO 2: Smart Chunking por headers de Markdown (para .md)
 * 
 * En vez de cortar arbitrariamente, respeta la estructura del documento.
 * Cada sección (definida por un header #, ##, ###) se vuelve un chunk.
 * 
 * Ventajas:
 * - Cada chunk tiene contexto completo de su sección
 * - El header le da "título" al chunk → mejores embeddings
 * - No cortas ideas a la mitad
 */
export function chunkMarkdown(text) {
  const chunks = [];
  
  // Regex para detectar headers de Markdown (# Header, ## Header, etc.)
  const headerRegex = /^(#{1,4})\s+(.+)$/gm;
  
  // Encontrar todas las posiciones de headers
  const headers = [];
  let match;
  while ((match = headerRegex.exec(text)) !== null) {
    headers.push({
      level: match[1].length,    // 1 = #, 2 = ##, etc.
      title: match[2].trim(),
      position: match.index
    });
  }
  
  // Si no hay headers, usar el método de texto plano
  if (headers.length === 0) {
    return chunkText(text);
  }
  
  // Extraer el texto antes del primer header (si existe)
  if (headers[0].position > 0) {
    const preText = text.slice(0, headers[0].position).trim();
    if (preText.length > 0) {
      chunks.push({ text: preText, section: 'intro' });
    }
  }
  
  // Partir por secciones
  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].position;
    const end = i + 1 < headers.length ? headers[i + 1].position : text.length;
    const sectionText = text.slice(start, end).trim();
    
    if (sectionText.length === 0) continue;
    
    // Si la sección es muy larga, partirla con el método de texto
    if (sectionText.length > MAX_CHUNK_SIZE) {
      const subChunks = chunkText(sectionText);
      subChunks.forEach((sub, j) => {
        chunks.push({
          text: sub,
          section: headers[i].title,
          subChunk: j
        });
      });
    } else {
      chunks.push({
        text: sectionText,
        section: headers[i].title
      });
    }
  }
  
  return chunks;
}

/**
 * Lee todos los archivos .txt y .md de una carpeta y los parte en chunks
 * Elige automáticamente el método según la extensión
 */
export function loadAndChunkDocs(docsDir = './docs') {
  const allChunks = [];
  const files = readdirSync(docsDir).filter(f => 
    f.endsWith('.txt') || f.endsWith('.md')
  );
  
  for (const file of files) {
    const content = readFileSync(join(docsDir, file), 'utf-8');
    const isMarkdown = file.endsWith('.md');
    
    // 🧠 Elegir método de chunking según el tipo de archivo
    const chunks = isMarkdown ? chunkMarkdown(content) : chunkText(content);
    
    // Cada chunk guarda metadata de dónde viene
    const processedChunks = Array.isArray(chunks) 
      ? chunks.map((item, i) => {
          // chunkMarkdown devuelve objetos, chunkText devuelve strings
          const text = typeof item === 'string' ? item : item.text;
          const section = typeof item === 'object' ? item.section : null;
          
          return {
            id: `${file}-chunk-${i}`,
            text,
            source: file,
            chunkIndex: i,
            ...(section && { section }),  // metadata extra para .md
            method: isMarkdown ? 'markdown-headers' : 'text-split'
          };
        })
      : [];
    
    allChunks.push(...processedChunks);
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
    const method = chunk.method === 'markdown-headers' ? '📝 MD' : '📄 TXT';
    const section = chunk.section ? ` [${chunk.section}]` : '';
    console.log(`--- ${method} ${chunk.id}${section} ---`);
    console.log(chunk.text.slice(0, 120) + (chunk.text.length > 120 ? '...' : ''));
    console.log(`(${chunk.text.length} caracteres)\n`);
  }
  
  console.log(`\n📊 Resumen:`);
  const mdChunks = chunks.filter(c => c.method === 'markdown-headers').length;
  const txtChunks = chunks.filter(c => c.method === 'text-split').length;
  console.log(`   📝 Markdown smart chunks: ${mdChunks}`);
  console.log(`   📄 Text split chunks: ${txtChunks}`);
  console.log('\n🎯 Siguiente paso: node 2-embeddings.mjs');
}
