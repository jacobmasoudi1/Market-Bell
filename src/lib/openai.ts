import OpenAI from "openai";

declare const global: {
  _openai?: OpenAI;
};

export const openai =
  global._openai ||
  new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

if (process.env.NODE_ENV !== "production") {
  global._openai = openai;
}
