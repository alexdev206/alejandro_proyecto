import express from 'express';
import path from 'path';
import crypto from 'node:crypto';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for scanned PDF and high-res image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lazy-initialized Gemini client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in environment variables.');
    }
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// Fast models list: order determined dynamically based on speedMode
const getModelQueue = (speedMode?: string) => {
  if (speedMode === 'precision') {
    return [
      { model: 'gemini-3.8-flash', isGemini3: true, thinkingLevel: ThinkingLevel.LOW },
      { model: 'gemini-3.1-flash-lite', isGemini3: true, thinkingLevel: ThinkingLevel.MINIMAL },
      { model: 'gemini-flash-latest', isGemini3: false },
    ];
  }
  // Default 'fast': ultra-low latency gemini-3.1-flash-lite with minimal thinking
  return [
    { model: 'gemini-3.1-flash-lite', isGemini3: true, thinkingLevel: ThinkingLevel.MINIMAL },
    { model: 'gemini-3.8-flash', isGemini3: true, thinkingLevel: ThinkingLevel.LOW },
    { model: 'gemini-flash-latest', isGemini3: false },
  ];
};

const waitMs = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callGeminiWithRetry(client: GoogleGenAI, payload: any, speedMode?: string): Promise<any> {
  let lastError: any = null;
  const models = getModelQueue(speedMode);

  for (const { model, isGemini3, thinkingLevel } of models) {
    const modelConfig = { ...payload.config };
    if (isGemini3 && thinkingLevel) {
      modelConfig.thinkingConfig = { thinkingLevel };
    } else {
      delete modelConfig.thinkingConfig;
    }

    const modelPayload = {
      ...payload,
      model,
      config: modelConfig,
    };

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`Executing Gemini scan with model: ${model} (speedMode: ${speedMode || 'fast'}, attempt ${attempt})`);
        const startTime = Date.now();
        const response = await client.models.generateContent(modelPayload);
        console.log(`Gemini response completed in ${Date.now() - startTime}ms using ${model}`);
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || err?.toString() || '';
        console.warn(`Model ${model} attempt ${attempt} failed:`, errMsg);

        const isUnavailableOrRateLimited =
          errMsg.includes('503') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('high demand') ||
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED');

        if (isUnavailableOrRateLimited) {
          if (attempt === 1) {
            await waitMs(400);
            continue;
          }
          break;
        } else {
          console.warn(`Attempting next model after error on ${model}:`, errMsg);
          break;
        }
      }
    }
  }

  throw lastError;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// Authentication System & Pre-seeded Users
// Admin: Sisvan / S15van39**
// Invitado: Invited / 1nvited39**
// ==========================================
interface AppUser {
  id: string;
  username: string;
  password: string;
  name: string;
  role: 'admin' | 'invitado' | 'operador';
  createdAt: string;
}

interface SessionData {
  userId: string;
  username: string;
  role: 'admin' | 'invitado' | 'operador';
  name: string;
  expiresAt: number;
}

const usersList: AppUser[] = [
  {
    id: 'usr_admin_sisvan',
    username: 'Sisvan',
    password: 'S15van39**',
    name: 'Administrador SISVAN',
    role: 'admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_invited_guest',
    username: 'Invited',
    password: '1nvited39**',
    name: 'Usuario Invitado',
    role: 'invitado',
    createdAt: new Date().toISOString(),
  },
];

const sessions = new Map<string, SessionData>();

function getAuthToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const customHeader = req.headers['x-auth-token'];
  if (typeof customHeader === 'string') {
    return customHeader.trim();
  }
  return null;
}

// Auth: Login Endpoint
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Por favor ingrese usuario y contraseña.' });
    }

    const cleanUsername = String(username).trim();
    const cleanPassword = String(password);

    const user = usersList.find(
      u => u.username.toLowerCase() === cleanUsername.toLowerCase()
    );

    if (!user || user.password !== cleanPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas. Verifique el usuario o la contraseña ingresada.' });
    }

    const token = crypto.randomUUID();
    const sessionData: SessionData = {
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    sessions.set(token, sessionData);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Error interno en el servidor durante el inicio de sesión.' });
  }
});

// Auth: Register Endpoint
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password, name } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'El usuario y la contraseña son campos obligatorios.' });
    }

    const cleanUsername = String(username).trim();
    const cleanPassword = String(password);
    const cleanName = name && String(name).trim() ? String(name).trim() : cleanUsername;

    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'El nombre de usuario debe tener al menos 3 caracteres.' });
    }

    if (cleanPassword.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe contener al menos 6 caracteres.' });
    }

    const exists = usersList.some(
      u => u.username.toLowerCase() === cleanUsername.toLowerCase()
    );

    if (exists) {
      return res.status(409).json({ error: `El usuario "${cleanUsername}" ya se encuentra registrado.` });
    }

    const newUser: AppUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      username: cleanUsername,
      password: cleanPassword,
      name: cleanName,
      role: 'operador',
      createdAt: new Date().toISOString(),
    };

    usersList.push(newUser);

    const token = crypto.randomUUID();
    const sessionData: SessionData = {
      userId: newUser.id,
      username: newUser.username,
      name: newUser.name,
      role: newUser.role,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    sessions.set(token, sessionData);

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        role: newUser.role,
      },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Error interno en el servidor durante el registro.' });
  }
});

// Auth: Verify Current Session
app.get('/api/auth/me', (req, res) => {
  const token = getAuthToken(req);
  if (!token) {
    return res.status(401).json({ authenticated: false, error: 'Sin sesión activa.' });
  }

  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (session) sessions.delete(token);
    return res.status(401).json({ authenticated: false, error: 'Sesión expirada o inválida.' });
  }

  return res.json({
    authenticated: true,
    user: {
      id: session.userId,
      username: session.username,
      name: session.name,
      role: session.role,
    },
  });
});

// Auth: Logout
app.post('/api/auth/logout', (req, res) => {
  const token = getAuthToken(req);
  if (token) {
    sessions.delete(token);
  }
  return res.json({ success: true });
});

// Auth: List registered users (Only for admin)
app.get('/api/auth/users', (req, res) => {
  const token = getAuthToken(req);
  const session = token ? sessions.get(token) : null;
  if (!session || session.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de Administrador.' });
  }

  const publicUsers = usersList.map(u => ({
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt,
  }));

  return res.json({ users: publicUsers });
});


// Main PDF / Document Scanner and Transcriber Endpoint
app.post('/api/scan-pdf', async (req, res) => {
  try {
    const { fileData, mimeType, fileName, templateHint, speedMode } = req.body;

    if (!fileData) {
      return res.status(400).json({ error: 'fileData (base64) is required.' });
    }

    const client = getGeminiClient();
    const effectiveMime = mimeType || 'application/pdf';

    const systemInstruction = `
Eres un digitador y analista experto de documentos de salud pública e historias clínicas en Bogotá, Colombia (Subred Integrada de Servicios de Salud Sur E.S.E. / SISVAN).
Tu labor es transcribir con la máxima rapidez y precisión los registros manuscritos de la tabla en el documento.

REGLAS ESENCIALES:
1. ATENCIÓN A LA ORIENTACIÓN: Si el documento está rotado, léelo en su orientación correcta.
2. EXTRAE TODAS LAS FILAS CON DATOS: No omitas ninguna fila con información manuscrita.
3. PRECISIÓN EN DÍGITOS Y TEXTO:
   - Para ID y Teléfono: transcribe únicamente los números que se leen en el documento sin inventar dígitos.
   - Casilla ilegible o tachada: "[ILEGIBLE]".
   - Casilla vacía: "".
4. COLUMNAS TÍPICAS SUBRED SUR:
   - ADULTOS: UPGD, SUBRED, FECHA_CONSULTA, TIPO_ID, ID, PRIMER_NOMBRE, SEGUNDO_NOMBRE, PRIMER_APELLIDO, SEGUNDO_APELLIDO, DIRECCION_RESIDENCIA, LOCALIDAD_RESIDENCIA, TELEFONO, FECHA_VISITA.
   - GESTANTES: + SEMANAS_GESTACION, NUM_CONTROLES, FUM.
   - MENORES DE 5: + NOMBRE_QUIEN_RECIBE, TIPO_ID_RECEPTOR, ID_RECEPTOR.
   - RECIEN NACIDOS: + PESO_NACER_G, TALLA_NACER_CM, EDAD_GESTACIONAL_SEM, NOMBRE_QUIEN_RECIBE, TIPO_ID_RECEPTOR, ID_RECEPTOR.
5. FORMATO ULTRA COMPACTO: Devuelve la lista de 'columns' y en cada fila devuelve 'values' con los valores en el mismo orden de las columnas.
`;

    const promptText = `
Transcribe de inmediato todos los registros y datos de la tabla en este documento (${fileName || 'documento'}).
${templateHint && templateHint !== 'AUTO' ? `El usuario seleccionó la plantilla: ${templateHint}. Extrae los campos de esta estructura.` : 'Identifica la plantilla y transcribe todas las filas.'}
Llenar 'values' de cada fila con los textos en el mismo orden que 'columns'.
`;

    const response = await callGeminiWithRetry(client, {
      contents: [
        {
          inlineData: {
            mimeType: effectiveMime,
            data: fileData,
          },
        },
        {
          text: promptText,
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            documentTitle: {
              type: Type.STRING,
              description: 'El título del formato detectado.',
            },
            detectedTemplate: {
              type: Type.STRING,
              description: 'ADULTOS | GESTANTES | MENORES_5 | RECIEN_NACIDOS | GENERAL',
            },
            templateName: {
              type: Type.STRING,
              description: 'Nombre descriptivo de la plantilla detectada.',
            },
            totalPages: {
              type: Type.INTEGER,
              description: 'Número de páginas procesadas.',
            },
            columns: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  key: { type: Type.STRING, description: 'Clave identificadora en mayúsculas como UPGD, ID, etc.' },
                  label: { type: Type.STRING, description: 'Etiqueta legible del encabezado de la columna' },
                },
                required: ['key', 'label'],
              },
            },
            rows: {
              type: Type.ARRAY,
              description: 'Filas extraídas de la tabla',
              items: {
                type: Type.OBJECT,
                properties: {
                  rowNumber: { type: Type.INTEGER, description: 'Número de fila 1, 2, 3...' },
                  values: {
                    type: Type.ARRAY,
                    description: 'Valores en el mismo orden de columns',
                    items: { type: Type.STRING },
                  },
                },
                required: ['rowNumber'],
              },
            },
          },
          required: ['documentTitle', 'detectedTemplate', 'columns', 'rows'],
        },
      },
    }, speedMode);

    const textOutput = response.text?.trim() || '{}';
    const parsedData = JSON.parse(textOutput);
    const cols = parsedData.columns || [];

    // Normalize rows into key-value data maps so the frontend gets complete records
    const normalizedRows = (parsedData.rows || []).map((r: any, idx: number) => {
      const rowData: Record<string, string> = {};
      if (Array.isArray(r.values)) {
        r.values.forEach((val: any, colIdx: number) => {
          const col = cols[colIdx];
          if (col && col.key) {
            rowData[col.key] = val !== undefined && val !== null ? String(val).trim() : '';
          }
        });
      } else if (Array.isArray(r.cells)) {
        for (const cell of r.cells) {
          if (cell && cell.key) {
            rowData[cell.key] = cell.value !== undefined && cell.value !== null ? String(cell.value).trim() : '';
          }
        }
      } else if (r.data && typeof r.data === 'object') {
        for (const [k, v] of Object.entries(r.data)) {
          rowData[k] = v !== undefined && v !== null ? String(v).trim() : '';
        }
      }

      return {
        rowNumber: r.rowNumber || idx + 1,
        pageNumber: r.pageNumber || 1,
        data: rowData,
      };
    });

    res.json({
      success: true,
      result: {
        ...parsedData,
        rows: normalizedRows,
      },
    });
  } catch (error: any) {
    console.error('Error scanning PDF:', error);
    let userFriendlyMessage = error?.message || 'Error al procesar el archivo con el servicio de IA.';
    const isOverloaded =
      userFriendlyMessage.includes('503') ||
      userFriendlyMessage.includes('UNAVAILABLE') ||
      userFriendlyMessage.includes('high demand') ||
      userFriendlyMessage.includes('429');

    if (isOverloaded) {
      userFriendlyMessage = 'El servicio de IA experimentó un pico de demanda momentáneo. Por favor presiona "Reintentar escaneo".';
    }

    res.status(503).json({
      error: userFriendlyMessage,
      details: error.toString(),
      isRetryable: isOverloaded,
    });
  }
});

// Vite & Static file serving setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
