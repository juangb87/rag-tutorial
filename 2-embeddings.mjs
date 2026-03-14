/**
 * 🐝 PASO 2: EMBEDDINGS — Convertir texto en vectores
 * 
 * ¿Qué es un embedding? Es una lista de números (vector) que representa
 * el "significado" de un texto. Textos con significados similares tendrán
 * vectores cercanos entre sí.
 * 
 * Ejemplo simplificado:
 *   "gato" → [0.2, 0.8, 0.1, ...]
 *   "perro" → [0.3, 0.7, 0.1, ...]  ← cercano a "gato"
 *   "avión" → [0.9, 0.1, 0.7, ...]  ← lejos de "gato"
 * 
 * OpenAI genera vectores de 1536 dimensiones (text-embedding-3-small)
 */

import OpenAI from 'openai';
import { writeFileSync } from 'fs';
import { loadAndChunkDocs } from './1-chunks.mjs';

const openai = new OpenAI(); // usa OPENAI_API_KEY del environment

// ============================================
// GENERAR EMBEDDINGS
// ============================================

/**
 * Genera embeddings para una lista de textos usando OpenAI
 */
export async function generateEmbeddings(texts) {
  // OpenAI acepta batch de textos — más eficiente que uno por uno
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',  // barato y bueno
    input: texts,
  });
  
  // Regresa un array de vectores en el mismo orden
  return response.data.map(item => item.embedding);
}

/**
 * Indexa chunks: les genera embeddings y guarda todo en un JSON
 */
async function indexDocs() {
  console.log('📄 Paso 1: Cargando y partiendo documentos...');
  const chunks = loadAndChunkDocs();
  console.log(`   ${chunks.length} chunks listos\n`);
  
  console.log('🧮 Paso 2: Generando embeddings con OpenAI...');
  const texts = chunks.map(c => c.text);
  const embeddings = await generateEmbeddings(texts);
  console.log(`   ${embeddings.length} embeddings generados`);
  console.log(`   Dimensiones por vector: ${embeddings[0].length}\n`);
  
  // Combinar chunks con sus embeddings
  const vectorStore = chunks.map((chunk, i) => ({
    ...chunk,
    embedding: embeddings[i]
  }));
  
  // Guardar en JSON (en producción usarías Pinecone, Chroma, pgvector, etc.)
  writeFileSync('vector-store.json', JSON.stringify(vectorStore, null, 2));
  console.log('💾 Vector store guardado en vector-store.json');
  console.log(`   Tamaño: ${(JSON.stringify(vectorStore).length / 1024).toFixed(1)} KB\n`);
  
  console.log('🎯 Siguiente paso: node 3-search.mjs "¿cómo funciona bumbei?"');
}

indexDocs().catch(console.error);
