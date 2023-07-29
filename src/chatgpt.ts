import { Configuration, OpenAIApi } from "openai";

export async function getReport(
  apiKey: string,
  prompt: string
): Promise<string | undefined> {
  const configuration = new Configuration({
    apiKey,
  });

  const openai = new OpenAIApi(configuration);

  const chatCompletion = await openai.createChatCompletion({
    model: "gpt-4",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return chatCompletion.data.choices[0].message?.content;
}
