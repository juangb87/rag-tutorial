import { ChromaClient } from 'chromadb';
import OpenAI from 'openai';
import readline from 'readline';

const openai = new OpenAI();
const chroma = new ChromaClient();
const collection = await chroma.getCollection({ name: 'bumbei-docs' });

// --- FAKE DB (simula tu base de datos de tiendas) ---
const tiendas = {
    nike: { id: 'nike', nombre: 'Nike', cashback: '5%', url: 'https://app.bumbei.com/nike' },
    amazon: { id: 'amazon', nombre: 'Amazon', cashback: '3%', url: 'https://app.bumbei.com/amazon' },
    liverpool: { id: 'liverpool', nombre: 'Liverpool', cashback: '4%', url: 'https://app.bumbei.com/liverpool' },
    walmart: { id: 'walmart', nombre: 'Walmart', cashback: '2.5%', url: 'https://app.bumbei.com/walmart' },
    mercadolibre: { id: 'mercadolibre', nombre: 'Mercado Libre', cashback: '3.5%', url: 'https://app.bumbei.com/mercadolibre' },
};

// --- TOOLS: las funciones que el agente puede usar ---
const tools = [
    {
        type: 'function',
        function: {
            name: 'buscar_tienda',
            description: 'Busca una tienda en Bumbei y muestra su porcentaje de cashback en Bitcoin',
            parameters: {
                type: 'object',
                properties: {
                    nombre: { type: 'string', description: 'Nombre de la tienda a buscar' },
                },
                required: ['nombre'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'generar_link_cashback',
            description: 'Genera un link de cashback para que el usuario compre y gane Bitcoin',
            parameters: {
                type: 'object',
                properties: {
                    tienda_id: { type: 'string', description: 'ID de la tienda' },
                },
                required: ['tienda_id'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'buscar_en_docs',
            description: 'Busca información en la base de conocimiento de Bumbei (FAQs, documentación)',
            parameters: {
                type: 'object',
                properties: {
                    pregunta: { type: 'string', description: 'La pregunta a buscar' },
                },
                required: ['pregunta'],
            },
        },
    },
];

// --- EJECUTAR TOOLS ---
async function executeTool(name, args) {
    console.log(` 🔧 Usando herramienta: ${name}(${JSON.stringify(args)})`);

    if (name === 'buscar_tienda') {
        const key = args.nombre.toLowerCase().replace(/\s/g, '');
        const tienda = tiendas[key];
        if (tienda) {
            return JSON.stringify({ found: true, ...tienda });
        }
        return JSON.stringify({ found: false, mensaje: `No encontré "${args.nombre}" en Bumbei` });
    }

    if (name === 'generar_link_cashback') {
        const tienda = Object.values(tiendas).find((t) => t.id === args.tienda_id);
        if (tienda) {
            return JSON.stringify({ link: tienda.url, cashback: tienda.cashback, tienda: tienda.nombre });
        }
        return JSON.stringify({ error: 'Tienda no encontrada' });
    }

    if (name === 'buscar_en_docs') {
        const embedding = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: args.pregunta,
        });
        const results = await collection.query({
            queryEmbeddings: [embedding.data[0].embedding],
            nResults: 3,
        });
        return JSON.stringify({ contexto: results.documents[0] });
    }

    return JSON.stringify({ error: 'Herramienta no encontrada' });
}

// --- AGENT LOOP ---
async function agent(question) {
    const messages = [
        {
            role: 'system',
            content: `Eres Bumbei 🐝, un agente inteligente de cashback en Bitcoin.

Tienes herramientas disponibles:
- buscar_tienda: para buscar tiendas y su cashback
- generar_link_cashback: para dar links de compra al usuario
- buscar_en_docs: para consultar la base de conocimiento

Usa las herramientas cuando sea necesario. Puedes usar varias en secuencia.
Sé amigable, directo, y siempre menciona que el cashback es en Bitcoin/satoshis.`,
        },
        { role: 'user', content: question },
    ];

    // Loop: el agente puede llamar tools múltiples veces
    while (true) {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            tools,
        });

        const choice = response.choices[0];

        // Si el modelo quiere usar herramientas
        if (choice.finish_reason === 'tool_calls') {
            messages.push(choice.message);
            for (const toolCall of choice.message.tool_calls) {
                const result = await executeTool(
                    toolCall.function.name,
                    JSON.parse(toolCall.function.arguments)
                );
                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: result,
                });
            }
            continue; // Vuelve al loop para que GPT procese los resultados
        }

        // Si ya terminó, regresa la respuesta
        return choice.message.content;
    }
}

// --- CHAT INTERACTIVO ---
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log('🐝 Bumbei Agent — Puedo buscar tiendas, generar links y responder preguntas\n');
console.log('Prueba: "Quiero comprar en Nike", "¿Qué es Bumbei?", "Dame link de Amazon"\n');

function prompt() {
    rl.question('Tú: ', async (input) => {
        if (input.toLowerCase() === 'salir') {
            console.log('👋 ¡Hasta luego!');
            rl.close();
            return;
        }
        const answer = await agent(input);
        console.log(`\n🐝 Bumbei: ${answer}\n`);
        prompt();
    });
}

prompt();