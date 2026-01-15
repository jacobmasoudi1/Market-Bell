import OpenAI from "openai";

declare const global: {
  _openai?: OpenAI;
};

export const openai =
  global._openai ||
  new OpenAI({
    apiKey: (() => {
      const key = process.env.OPENAI_API_KEY;
      if (!key) {
        throw new Error("Missing OPENAI_API_KEY");
      }
      return key;
    })(),
  });

if (process.env.NODE_ENV !== "production") {
  global._openai = openai;
}
