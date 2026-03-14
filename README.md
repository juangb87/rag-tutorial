# 🐝 RAG desde Cero — Tutorial Práctico

## ¿Qué vamos a construir?
Un sistema RAG (Retrieval-Augmented Generation) que:
1. Lee documentos de texto
2. Los parte en "chunks" (pedazos)
3. Genera embeddings (vectores) para cada chunk usando OpenAI
4. Cuando haces una pregunta, busca los chunks más relevantes
5. Le pasa esos chunks como contexto a GPT para que responda

## Estructura
```
rag-tutorial/
├── 1-chunks.mjs        ← Paso 1: Partir documentos en chunks
├── 2-embeddings.mjs    ← Paso 2: Generar embeddings con OpenAI
├── 3-search.mjs        ← Paso 3: Búsqueda por similitud
├── 4-rag.mjs           ← Paso 4: RAG completo (búsqueda + LLM)
├── docs/               ← Documentos de ejemplo para indexar
└── vector-store.json   ← La "base de datos" de vectores (se genera)
```

## Requisitos
- Node.js 18+
- OpenAI API key (`export OPENAI_API_KEY=sk-...`)

## Cómo correrlo
```bash
# Paso a paso:
node 1-chunks.mjs          # Ver cómo se parten los documentos
node 2-embeddings.mjs       # Generar los vectores
node 3-search.mjs "tu pregunta"  # Buscar chunks relevantes
node 4-rag.mjs "tu pregunta"     # RAG completo con respuesta de GPT
```
