/**
 * 🐝 PASO 4: RAG COMPLETO — Búsqueda + LLM = Respuestas inteligentes
 * 
 * Este es el paso final. Combinamos todo:
 * 1. El usuario hace una pregunta
 * 2. Buscamos los chunks más relevantes (Paso 3)
 * 3. Los metemos como contexto en el prompt del LLM
 * 4. El LLM responde BASÁNDOSE en los documentos, no inventando
 * 
 * Esto es RAG: Retrieval (buscar) + Augmented (agregar contexto) + Generation (responder)
 */

import OpenAI from 'openai';
import { search } from './3-search.mjs';

const openai = new OpenAI();

// ============================================
// RAG: BÚSQUEDA + GENERACIÓN
// ============================================

async function rag(question) {
  console.log(`❓ Pregunta: "${question}"\n`);
  
  // PASO 1: Retrieval — buscar documentos relevantes
  console.log('🔍 Buscando documentos relevantes...');
  const relevantChunks = await search(question, 3);
  
  console.log(`📄 ${relevantChunks.length} chunks encontrados:`);
  for (const chunk of relevantChunks) {
    const score = (chunk.score * 100).toFixed(1);
    console.log(`   - [${score}%] ${chunk.source}: "${chunk.text.slice(0, 60)}..."`);
  }
  console.log();
  
  // PASO 2: Augmentation — construir el prompt con contexto
  const context = relevantChunks
    .map((c, i) => `[Documento ${i + 1} - ${c.source}]\n${c.text}`)
    .join('\n\n---\n\n');
  
  const systemPrompt = `Eres un asistente que responde preguntas SOLO basándote en los documentos proporcionados.
  
Reglas:
- Solo usa información de los documentos de contexto
- Si no encuentras la respuesta en los documentos, di "No tengo información sobre eso"
- Cita de qué documento sacaste la info
- Responde en español, de forma clara y directa`;

  const userPrompt = `Documentos de contexto:

${context}

---

Pregunta del usuario: ${question}`;

  // PASO 3: Generation — dejar que el LLM responda
  console.log('🤖 Generando respuesta con GPT...\n');
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',  // barato y rápido, perfecto para RAG
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,  // bajo = más fiel a los documentos
  });
  
  const answer = completion.choices[0].message.content;
  
  console.log('━'.repeat(50));
  console.log('💡 RESPUESTA:');
  console.log('━'.repeat(50));
  console.log(answer);
  console.log('━'.repeat(50));
  
  // Mostrar tokens usados (para que veas el costo)
  const usage = completion.usage;
  console.log(`\n📊 Tokens: ${usage.prompt_tokens} prompt + ${usage.completion_tokens} respuesta = ${usage.total_tokens} total`);
}

// Correr con la pregunta del argumento
const question = process.argv[2] || '¿Cómo puedo ganar Bitcoin con mis compras?';
rag(question).catch(console.error);
