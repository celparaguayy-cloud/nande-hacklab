/**
 * Catálogo de proveedores de IA de ÑANDE.
 *
 * Esto es SÓLO metadatos (sin red): qué proveedores existen, con qué "forma"
 * de API hablan, su URL base, modelo por defecto y dónde saca el jugador su
 * clave. La red real vive únicamente en src/core/ai/net/ (test de aislamiento).
 *
 * Tres "formas" de API cubren prácticamente todo el ecosistema:
 *   - "openai"    → Chat Completions estilo OpenAI (OpenAI, Groq, OpenRouter,
 *                   Mistral, DeepSeek, Together, xAI, Ollama/LM Studio local,
 *                   y cualquier endpoint compatible que el jugador tenga).
 *   - "gemini"    → Google Gemini (generateContent).
 *   - "anthropic" → Anthropic Claude (/v1/messages).
 *
 * Realidad del navegador (CORS): ÑANDE corre en el navegador. Sólo algunos
 * proveedores permiten llamadas directas desde el navegador. Lo marcamos con
 * `browserOk` y somos honestos en la UI: los demás necesitan un proxy o correr
 * en escritorio. OpenRouter es el atajo universal: una sola clave habla con
 * OpenAI, Anthropic, Google, Meta, DeepSeek, xAI y cientos de modelos, y SÍ
 * anda desde el navegador.
 */

export type ProviderKind = "offline" | "openai" | "gemini" | "anthropic";

export interface ProviderPreset {
  /** Identificador estable (se guarda en la config del jugador). */
  id: string;
  /** Nombre visible. */
  label: string;
  /** Forma de la API con la que se habla. */
  kind: ProviderKind;
  /** URL base para las formas "openai"/"anthropic" (Gemini la trae fija). */
  baseUrl?: string;
  /** Modelo por defecto al elegir el proveedor. */
  defaultModel: string;
  /** Modelos sugeridos (chips en Configuración). */
  suggestedModels?: string[];
  /** Dónde consigue el jugador su clave (link informativo). */
  keyUrl?: string;
  /** El jugador escribe su propia URL base (endpoints locales / a medida). */
  customBaseUrl?: boolean;
  /** Se sabe que anda directo desde el navegador (CORS permitido). */
  browserOk?: boolean;
  /** ¿Necesita clave? (Ollama/LM Studio local no). */
  noKey?: boolean;
  /** Nota corta para la UI. */
  note?: string;
}

export const OFFLINE_PRESET: ProviderPreset = {
  id: "offline",
  label: "Offline (ÑANDE local)",
  kind: "offline",
  defaultModel: "nande-offline",
  browserOk: true,
  noKey: true,
  note: "IA determinista incluida. Sin internet, sin clave. Siempre funciona.",
};

/**
 * Todos los proveedores conectados. El orden es el de la UI: primero los que
 * andan directo desde el navegador (celu incluido), después los que piden
 * proxy/escritorio, y al final el endpoint a medida.
 */
export const CONNECTED_PRESETS: ProviderPreset[] = [
  {
    id: "gemini",
    label: "Google Gemini",
    kind: "gemini",
    defaultModel: "gemini-2.0-flash",
    suggestedModels: ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash"],
    keyUrl: "https://aistudio.google.com/apikey",
    browserOk: true,
    note: "Clave gratis. Anda desde el celular. Recomendado para empezar.",
  },
  {
    id: "openrouter",
    label: "OpenRouter (universal)",
    kind: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    suggestedModels: [
      "openai/gpt-4o-mini",
      "anthropic/claude-3.5-haiku",
      "google/gemini-2.0-flash-001",
      "meta-llama/llama-3.3-70b-instruct",
      "deepseek/deepseek-chat",
    ],
    keyUrl: "https://openrouter.ai/keys",
    browserOk: true,
    note: "Una clave → OpenAI, Anthropic, Google, Meta, DeepSeek, xAI y +300 modelos. Anda desde el navegador.",
  },
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    kind: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-5-haiku-latest",
    suggestedModels: ["claude-3-5-haiku-latest", "claude-3-5-sonnet-latest"],
    keyUrl: "https://console.anthropic.com/settings/keys",
    browserOk: true,
    note: "Anda desde el navegador (habilitamos el acceso directo). Clave propia.",
  },
  {
    id: "ollama",
    label: "Ollama / LM Studio (local)",
    kind: "openai",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.2",
    suggestedModels: ["llama3.2", "qwen2.5", "mistral", "phi4"],
    customBaseUrl: true,
    browserOk: true,
    noKey: true,
    note: "Corre modelos en tu propia PC, 100% gratis y privado. Requiere Ollama con OLLAMA_ORIGINS=* o LM Studio.",
  },
  {
    id: "openai",
    label: "OpenAI (GPT)",
    kind: "openai",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    suggestedModels: ["gpt-4o-mini", "gpt-4o", "o4-mini"],
    keyUrl: "https://platform.openai.com/api-keys",
    browserOk: false,
    note: "La API de OpenAI bloquea el navegador (CORS). Usala con un proxy o desde escritorio — o llegá a GPT vía OpenRouter.",
  },
  {
    id: "groq",
    label: "Groq (Llama, veloz)",
    kind: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    suggestedModels: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "openai/gpt-oss-20b"],
    keyUrl: "https://console.groq.com/keys",
    browserOk: false,
    note: "Muy rápida, pero a veces bloquea el navegador (CORS). Si falla, probá Gemini/OpenRouter o un proxy.",
  },
  {
    id: "mistral",
    label: "Mistral AI",
    kind: "openai",
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-small-latest",
    suggestedModels: ["mistral-small-latest", "mistral-large-latest", "open-mistral-nemo"],
    keyUrl: "https://console.mistral.ai/api-keys",
    browserOk: false,
    note: "Puede requerir proxy por CORS. También accesible vía OpenRouter.",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    kind: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    suggestedModels: ["deepseek-chat", "deepseek-reasoner"],
    keyUrl: "https://platform.deepseek.com/api_keys",
    browserOk: false,
    note: "Puede requerir proxy por CORS. También accesible vía OpenRouter.",
  },
  {
    id: "xai",
    label: "xAI (Grok)",
    kind: "openai",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-2-latest",
    suggestedModels: ["grok-2-latest", "grok-beta"],
    keyUrl: "https://console.x.ai",
    browserOk: false,
    note: "Puede requerir proxy por CORS. También accesible vía OpenRouter.",
  },
  {
    id: "together",
    label: "Together AI",
    kind: "openai",
    baseUrl: "https://api.together.xyz/v1",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    suggestedModels: [
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      "Qwen/Qwen2.5-72B-Instruct-Turbo",
    ],
    keyUrl: "https://api.together.xyz/settings/api-keys",
    browserOk: false,
    note: "Puede requerir proxy por CORS.",
  },
  {
    id: "custom",
    label: "Endpoint a medida (compatible OpenAI)",
    kind: "openai",
    baseUrl: "",
    defaultModel: "",
    customBaseUrl: true,
    note: "Cualquier API compatible con OpenAI: tu propio proxy, un gateway, un servidor de la escuela. Pegá la URL base y el modelo.",
  },
];

export const ALL_PRESETS: ProviderPreset[] = [OFFLINE_PRESET, ...CONNECTED_PRESETS];

/** Busca un preset por id (o el de offline si no existe). */
export function presetFor(id: string): ProviderPreset {
  return ALL_PRESETS.find((p) => p.id === id) ?? OFFLINE_PRESET;
}

/** ¿Este id de proveedor es uno conocido? */
export function isKnownProvider(id: string): boolean {
  return ALL_PRESETS.some((p) => p.id === id);
}
