/**
 * 🐝 PASO 3: BÚSQUEDA POR SIMILITUD — Encontrar chunks relevantes
 * 
 * Aquí está la magia del RAG. Cuando haces una pregunta:
 * 1. Convertimos tu pregunta en un embedding (vector)
 * 2. Comparamos ese vector con todos los vectores de los chunks
 * 3. Los chunks más "cercanos" son los más relevantes
 * 
 * ¿Cómo se mide "cercano"? Con COSINE SIMILARITY:
 * - 1.0 = idénticos
 * - 0.0 = no relacionados
 * - -1.0 = opuestos
 */

import OpenAI from 'openai';
import { readFileSync } from 'fs';

const openai = new OpenAI();

// ============================================
// FUNCIONES DE BÚSQUEDA
// ============================================

/**
 * Cosine similarity entre dos vectores
 * Esta es LA función clave de todo sistema RAG
 */
export function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Busca los K chunks más relevantes para una query
 */
export async function search(query, topK = 3) {
  // Cargar el vector store
  const vectorStore = JSON.parse(readFileSync('vector-store.json', 'utf-8'));
  
  // Generar embedding de la pregunta
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });
  const queryEmbedding = response.data[0].embedding;
  
  // Calcular similitud con cada chunk
  const results = vectorStore.map(chunk => ({
    ...chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding)
  }));
  
  // Ordenar por similitud (mayor = más relevante)
  results.sort((a, b) => b.score - a.score);
  
  // Regresar los top K
  return results.slice(0, topK);
}

// Si corremos directamente, hacer una búsqueda
const isMain = process.argv[1]?.endsWith('3-search.mjs');
if (isMain) {
  const query = process.argv[2] || '¿cómo funciona bumbei?';
  
  console.log(`🔍 Buscando: "${query}"\n`);
  
  const results = await search(query);
  
  console.log(`📊 Top ${results.length} resultados:\n`);
  
  for (const [i, result] of results.entries()) {
    const score = (result.score * 100).toFixed(1);
    console.log(`#${i + 1} [${score}% similar] — ${result.source}`);
    console.log(`   "${result.text.slice(0, 150)}..."`);
    console.log();
  }
  
  console.log('🎯 Siguiente paso: node 4-rag.mjs "tu pregunta"');
}
