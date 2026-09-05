export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIGenerateOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface AIGenerateResult {
  text: string;
  model: string;
}

export interface AIProvider {
  generate(
    messages: AIMessage[],
    options?: AIGenerateOptions,
  ): Promise<AIGenerateResult>;
}
