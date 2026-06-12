import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Initialize Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Clasificación heurística de preguntas para ahorrar el 50% de las consultas de cuota API de Gemini
function classifyQuestionHeuristically(question: string): "Factual" | "Procedimental" {
  const query = question.toLowerCase().trim();
  
  // Símbolos matemáticos u operadores típicos de problemas numéricos
  const mathSymbols = /[+\-*\/=^<>{}[\]]/;
  const numbers = query.match(/\d+/g) || [];
  
  // Palabras clave asociadas a ejercicios prácticos, resolución, depuración o pasos
  const proceduralKeywords = [
    "resolver", "resuelve", "calcula", "calcular", "ejercicio", "problema", 
    "paso a paso", "pasos", "solución", "solucion", "despejar", "despeja", 
    "ecuacion", "ecuación", "fraccion", "fracción", "practica", "práctica",
    "grafica", "gráfica", "derivada", "integral", "operacion", "operación",
    "resultado", "resta", "suma", "multiplica", "divide", "error", "fallo", 
    "incorrecto", "hice mal", "por qué da", "por que da", "da negativo", 
    "fracciones", "incógnita", "incognita", "x^", "x =", "y =", "ejemplo de ejercicio"
  ];

  // Si contiene símbolos matemáticos, palabras clave procedimentales o más de un número en la frase
  if (mathSymbols.test(query) || 
      proceduralKeywords.some(keyword => query.includes(keyword)) || 
      numbers.length >= 2) {
    return "Procedimental";
  }
  
  return "Factual";
}

// Resilient helper to run generator with fallback models to bypass model-specific daily quotas
async function generateSocraticResponseWithFallback(ai: GoogleGenAI, history: any[], systemInstruction: string) {
  const modelsToTry = [
    "gemini-3.1-flash-lite"
  ];

  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      console.log(`[Tutor Socrático] Intentando generación de respuesta con modelo: ${model}...`);
      const response = await ai.models.generateContent({
        model: model,
        contents: history.map((m: any) => ({
          role: m.role,
          parts: [{ text: m.text }]
        })),
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });
      console.log(`[Tutor Socrático] ¡Generación exitosa con el modelo: ${model}!`);
      return response;
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      console.warn(`[Tutor Socrático] Advertencia: Error con el modelo ${model}: ${errorMsg}`);
      lastError = err;
      
      // Keep trying remaining models in case of specific quota/access failures
    }
  }

  throw lastError;
}

app.use(express.json());

// Socratic AI Endpoint with Semantic Cache (pgvector)
app.post("/api/tutor", async (req, res) => {
  const { subject, topic, history } = req.body;

  // 1. Obtener la última pregunta del estudiante
  const userMessages = history.filter((m: any) => m.role === "user");
  const userQuestion = userMessages[userMessages.length - 1]?.text || "";

  if (!userQuestion) {
    return res.status(400).json({ error: "No se proporcionó ninguna pregunta." });
  }

  try {
    // Definición común del prompt socrático del tutor
    const systemInstruction = `Eres un tutor socrático de EduNova para la materia de ${subject}. 
Estás guiando al estudiante en el tema: "${topic.name}".
TU MISIÓN: En lugar de dar respuestas directas, haz preguntas que guíen al estudiante a descubrir la verdad por sí mismo.
- Sé alentador y pedagógico.
- Si el estudiante está muy perdido, da un pequeño empujón o pista, pero sigue con una pregunta.
- Mantén tus respuestas breves y enfocadas.
- Utiliza la metodología socrática: cuestiona las suposiciones y guía el razonamiento.`;

    // 2. Clasificar la pregunta de forma heurística y local para ahorrar 100% de la cuota de clasificación
    const isFactual = classifyQuestionHeuristically(userQuestion) === "Factual";
    console.log(`[Heurística] Pregunta: "${userQuestion}" -> Clasificado como: ${isFactual ? "Factual" : "Procedimental"}`);

    let cachedResponse: string | null = null;
    let queryEmbedding: number[] | null = null;

    // 3. Si es Factual, procedemos a cachear con Embeddings (gemini-embedding-2-preview)
    if (isFactual) {
      try {
        console.log(`[Embeddings] Generando vector para consulta Factual...`);
        const embeddingResult = await ai.models.embedContent({
          model: 'gemini-embedding-2-preview',
          contents: userQuestion,
          config: {
            outputDimensionality: 768,
          },
        });

        queryEmbedding = embeddingResult.embeddings?.[0]?.values || null;

        if (queryEmbedding && supabaseUrl && supabaseAnonKey) {
          console.log(`[Caché Semántico] Buscando similitud con pgvector en Supabase...`);
          // Query similar results using Supabase RPC "match_semantic_cache"
          const { data, error } = await supabase.rpc('match_semantic_cache', {
            query_embedding: queryEmbedding,
            match_threshold: 0.92, // Umbral de coincidencia del 92% (Similarity >= 0.92)
            match_count: 1,
            subject_filter: subject
          });

          if (error) {
            if (error.code === 'PGRST104' || error.message?.includes('match_semantic_cache') || error.message?.includes('schema cache')) {
              console.warn(`[Caché Semántico] RPC match_semantic_cache no encontrado. Bypasseando caché. Asegúrese de haber ejecutado 'supabase-setup.sql' en su panel de Supabase.`);
            } else {
              console.warn("[Caché Semántico] Advertencia al buscar en caché:", error.message);
            }
          } else if (data && data.length > 0) {
            cachedResponse = data[0].response;
            console.log(`[Caché Semántico] ¡HIT EN CACHÉ! Similitud: ${(data[0].similarity * 100).toFixed(2)}%. Respuesta servida en < 100ms.`);
            return res.json({
              text: cachedResponse,
              cached: true,
              classification: "Factual"
            });
          } else {
            console.log(`[Caché Semántico] Cache Miss. No se encontraron similitudes >= 92%.`);
          }
        }
      } catch (embErr) {
        console.error("Error durante lectura de embeddings o caché:", embErr);
      }
    } else {
      console.log(`[Socrático] Pregunta Procedimental detectada. Eludiendo caché para preservar razonamiento personalizado.`);
    }

    // 4. Si es Procedimental o en caso de Cache Miss, llamamos a Gemini para razonar
    console.log(`[Tutor Socrático] Generando respuesta socrática de forma dinámica...`);
    const socraticResponse = await generateSocraticResponseWithFallback(ai, history, systemInstruction);

    const responseText = socraticResponse.text || "";

    // 5. Si fue Factual y tuvimos Cache Miss, guardamos de manera asíncrona y segura la nueva respuesta en el caché
    if (isFactual && queryEmbedding && responseText && supabaseUrl && supabaseAnonKey) {
      try {
        console.log(`[Caché Semántico] Guardando nueva interacción teórica en base de datos...`);
        const { error } = await supabase.from('semantic_cache').insert({
          query: userQuestion,
          response: responseText,
          subject: subject,
          topic_id: topic.id || topic.name,
          is_factual: true,
          embedding: queryEmbedding
        });

        if (error) {
          if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('semantic_cache')) {
            console.warn("[Caché Semántico] Tabla 'semantic_cache' no encontrada en Supabase. Registros nuevos no se cachearán hasta ejecutar supabase-setup.sql.");
          } else {
            console.warn("[Caché Semántico] Advertencia al escribir en semantic_cache:", error.message);
          }
        } else {
          console.log("[Caché Semántico] ¡Novedad guardada exitosamente en el caché semántico vectorial!");
        }
      } catch (saveErr) {
        console.error("Error al guardar interacción en caché:", saveErr);
      }
    }

    return res.json({
      text: responseText,
      cached: false,
      classification: isFactual ? "Factual" : "Procedimental"
    });

  } catch (error: any) {
    console.error("Error en el endpoint de tutoría socrática:", error);
    
    // Identificar de manera confiable si el error se debe a límites de cuota (RESOURCE_EXHAUSTED / 429)
    const errorStr = JSON.stringify(error) + " " + String(error.message || "");
    const isQuotaError = error.status === 429 ||
                         error.code === 429 ||
                         errorStr.includes("429") ||
                         errorStr.includes("quota") ||
                         errorStr.includes("RESOURCE_EXHAUSTED") ||
                         errorStr.includes("limit");

    if (isQuotaError) {
      return res.status(429).json({
        error: "Límite de cuota excedido temporalmente en los modelos de la API de Gemini (MÁXIMO 20 solicitudes diarias en planes promocionales). Para continuar aprendiendo ahora mismo, puedes reanudar cualquiera de tus tutorías previas en el historial (que cargan al instante desde el caché local/Supabase sin consumir cuota) o esperar unos minutos a que se restablezca el límite."
      });
    }

    res.status(500).json({ error: "No se pudo contactar al tutor EduNova. Por favor, intenta de nuevo más tarde." });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
