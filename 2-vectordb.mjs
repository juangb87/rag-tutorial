import { ChromaClient } from 'chromadb';
import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI();
const chroma = new ChromaClient();

// 1. Crear (o conectar a) una colección
const collection = await chroma.getOrCreateCollection({
    name: 'bumbei-docs',
});

// 2. Leer tus docs y hacer chunks (reutiliza tu lógica de 1-chunks.mjs)
const doc = fs.readFileSync('./docs/bumbei-faq.md', 'utf-8');
const chunks = doc.split(/\n## /).filter(Boolean); // split por headers

// 3. Generar embeddings con OpenAI
const embeddings = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: chunks,
});

// 4. Guardar en ChromaDB
await collection.add({
    ids: chunks.map((_, i) => `chunk-${i}`),
    embeddings: embeddings.data.map(e => e.embedding),
    documents: chunks,
});

console.log(`✅ ${chunks.length} chunks guardados en ChromaDB`);

// 5. Buscar algo!
const query = '¿Qué es Bumbei?';
const queryEmbedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
});

const results = await collection.query({
    queryEmbeddings: [queryEmbedding.data[0].embedding],
    nResults: 3,
});

console.log(`\n🔍 Query: "${query}"`);
console.log('📄 Resultados:', results.documents);