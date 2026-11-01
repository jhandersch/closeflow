# Azure OpenAI setup

CloseFlow sends AI requests only to Azure OpenAI. There is no OpenAI API fallback. AI routes return an error until the required Azure settings are present.

## 1. Create Azure deployments

In Azure AI Foundry, create or select an Azure OpenAI resource and deploy both models:

- GPT-4.1 mini
- GPT-4o mini

Use an EU Data Zone deployment when the models are available there for your subscription. Confirm the deployment's processing location and the applicable data-handling terms in Azure before using customer data. A deployment's data zone does not disable Azure abuse monitoring or create a zero-retention guarantee.

## 2. Configure server-side environment variables

Set these variables in the server environment (for example, Vercel project settings and local `.env.local`). Never use `NEXT_PUBLIC_` prefixes for Azure credentials.

| Variable | Value |
| --- | --- |
| `AZURE_OPENAI_ENDPOINT` | HTTPS endpoint of the Azure OpenAI resource, without a path or query string |
| `AZURE_OPENAI_API_KEY` | Server-side key for that resource |
| `AZURE_OPENAI_API_VERSION` | API version supported by the resource and selected deployments |
| `AZURE_OPENAI_GPT_4_1_MINI_DEPLOYMENT` | Exact deployment name for GPT-4.1 mini |
| `AZURE_OPENAI_GPT_4O_MINI_DEPLOYMENT` | Exact deployment name for GPT-4o mini |
| `AZURE_OPENAI_GPT_4_1_MINI_INPUT_USD_PER_1M_TOKENS` | Your Azure input-token rate in USD per 1 million tokens |
| `AZURE_OPENAI_GPT_4_1_MINI_OUTPUT_USD_PER_1M_TOKENS` | Your Azure output-token rate in USD per 1 million tokens |
| `AZURE_OPENAI_GPT_4O_MINI_INPUT_USD_PER_1M_TOKENS` | Your Azure input-token rate in USD per 1 million tokens |
| `AZURE_OPENAI_GPT_4O_MINI_OUTPUT_USD_PER_1M_TOKENS` | Your Azure output-token rate in USD per 1 million tokens |

Use the rates shown for your Azure deployment, region/data zone, and billing agreement. CloseFlow uses these values to record estimated AI costs; the application's usage estimate is not an Azure invoice.

## 3. Verify

After setting all variables, check `/api/health`. Its configuration check requires both model deployments and their token rates. Then test each AI feature in a non-production environment before enabling it for customers.

The Azure OpenAI SDK and REST API can accept prompts containing customer data. Review Microsoft's current data, privacy, and abuse-monitoring terms for the chosen resource and deployment before sending production data:

- [Azure OpenAI data, privacy, and security](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/openai/data-privacy)
