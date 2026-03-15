import { ChromaClient } from 'chromadb';
import OpenAI from 'openai';
import readline from 'readline';

const openai = new OpenAI();
const chroma = new ChromaClient();

// Conectar a la colección que ya creamos
const collection = await chroma.getCollection({ name: 'bumbei-docs' });

// Función para buscar contexto relevante
async function getContext(question) {
    const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: question,
    });

    const results = await collection.query({
        queryEmbeddings: [embedding.data[0].embedding],
        nResults: 3,
    });

    return results.documents[0].join('\n\n');
}

// Función para hacer la pregunta con RAG
async function ask(question) {
    const context = await getContext(question);

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content: `Eres un asistente de Bumbei. Responde SOLO con la información del contexto proporcionado. Si no sabes la respuesta, di "No tengo esa información."

Contexto:
${context}`,
            },
            {
                role: 'user',
                content: question,
            },
        ],
    });

    return response.choices[0].message.content;
}

// Chat interactivo
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

console.log('🐝 Bumbei RAG Chat — Pregúntame lo que quieras (escribe "salir" para terminar)\n');

function prompt() {
    rl.question('Tú: ', async (input) => {
        if (input.toLowerCase() === 'salir') {
            console.log('👋 ¡Hasta luego!');
            rl.close();
            return;
        }

        const answer = await ask(input);
        console.log(`\n🐝 Bumbei: ${answer}\n`);
        prompt();
    });
}

prompt();