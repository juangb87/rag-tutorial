import express from 'express';
import cors from 'cors';
import { ChromaClient } from 'chromadb';
import OpenAI from 'openai';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const openai = new OpenAI();
const chroma = new ChromaClient();
const collection = await chroma.getCollection({ name: 'bumbei-docs' });

app.post('/chat', async (req, res) => {
    const { question } = req.body;

    // 1. Embedding de la pregunta
    const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: question,
    });

    // 2. Buscar en ChromaDB
    const results = await collection.query({
        queryEmbeddings: [embedding.data[0].embedding],
        nResults: 3,
    });
    const context = results.documents[0].join('\n\n');

    // 3. Generar respuesta
    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content: `Eres un asistente de Bumbei. Responde usando el contexto proporcionado. Si no sabes, di que no tienes esa información.\n\nContexto:\n${context}`,
            },
            { role: 'user', content: question },
        ],
    });

    res.json({ answer: response.choices[0].message.content });
});

app.listen(3000, () => {
    console.log('🐝 Bumbei Chat corriendo en http://localhost:3000');
});