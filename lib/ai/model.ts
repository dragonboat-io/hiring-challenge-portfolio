import "server-only";

import { createOpenAI } from "@ai-sdk/openai";

/**
 * Dragonboat's Azure OpenAI resource is configured with Azure's newer
 * OpenAI-compatible "v1" surface — the endpoint already ends in
 * `/openai/v1/`. That is NOT the classic `/openai/deployments/<id>` shape
 * that @ai-sdk/azure's createAzure() targets, so we use @ai-sdk/openai's
 * createOpenAI with the endpoint as baseURL and the deployment name as the
 * model id. Same approach as dragonboat-ai's lib/azure/client.ts.
 */
export function getChatModel() {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;

  if (!apiKey || !endpoint || !deployment) {
    throw new Error(
      "Missing Azure OpenAI configuration. Set AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_DEPLOYMENT (see .env.example).",
    );
  }

  const openai = createOpenAI({ apiKey, baseURL: endpoint.replace(/\/$/, "") });
  return openai(deployment);
}
