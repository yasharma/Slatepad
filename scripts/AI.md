# AI chat setup for Slatepad

Slatepad's AI assistant talks to any **OpenAI-compatible** `/v1/chat/completions` endpoint. You run the model server separately — nothing Python/LiteLLM is bundled with the app.

## Quick start with Ollama (local, no API key)

1. Install [Ollama](https://ollama.com/) and pull a model:

   ```bash
   ollama pull llama3.2
   ```

2. Ollama exposes an OpenAI-compatible API at `http://localhost:11434/v1`.

3. In Slatepad → **Settings → AI** (or the gear icon in the chat panel):

   | Setting      | Value                        |
   |--------------|------------------------------|
   | API base URL | `http://localhost:11434/v1`  |
   | API key      | *(leave blank)*              |
   | Model        | `llama3.2`                   |

4. Open a note, click the **sparkle button** (bottom-right) or press **⌘⇧A** to open the AI panel on the right, and send a message.

Use **Test connection** in Settings → AI (or the gear icon in the chat panel) to verify your URL, key, and model before chatting.

## LiteLLM proxy (multiple providers)

[LiteLLM](https://docs.litellm.ai/) sits in front of OpenAI, Anthropic, Azure, Bedrock, Ollama, etc. and exposes one OpenAI-compatible API.

1. Install and run the proxy (example):

   ```bash
   pip install 'litellm[proxy]'
   export OPENAI_API_KEY=sk-...   # if using OpenAI
   litellm --model gpt-4o-mini --port 4000
   ```

   Or use a `config.yaml` with many models — see [LiteLLM proxy docs](https://docs.litellm.ai/docs/simple_proxy).

2. Default proxy URL: `http://localhost:4000/v1`

3. In Slatepad settings:

   | Setting      | Value                        |
   |--------------|------------------------------|
   | API base URL | `http://localhost:4000/v1`   |
   | API key      | LiteLLM master key if set    |
   | Model        | Model name from your config  |

## On-prem / custom OpenAI-compatible servers

Point **API base URL** at your server, e.g.:

- `https://llm.internal.company/v1`
- `http://192.168.1.50:8080/v1`

Set **API key** if your gateway requires `Authorization: Bearer …`.

## How context works

Each request includes a **system message** with:

- Your custom system prompt (editable in Settings → AI)
- The **currently open note**: title, tags, and body as markdown

If no note is selected, context is `No note open`. Chat still works for general questions.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Network / fetch error | Ensure the server is running; check the base URL ends with `/v1` (not `/v1/chat/completions` — the app adds that path). |
| Empty or wrong model | Match the **Model** field to what your server expects (`llama3.2`, `gpt-4o-mini`, etc.). |
| CORS (browser dev only) | `npm run tauri dev` uses the Tauri webview; localhost fetch usually works. For `npm run dev` in a browser, enable CORS on your proxy. |
| Slow first reply | Local models may load into memory on first request; wait for Ollama/LiteLLM to finish loading. |

## Defaults (first launch)

| Setting      | Default                      |
|--------------|------------------------------|
| API base URL | `http://localhost:11434/v1`  |
| Model        | `llama3.2`                   |
| API key      | *(empty)*                    |

Settings are stored in `localStorage` under `slatepad-ai-settings`.

## Keyboard shortcut

**⌘⇧A** — toggle AI chat panel

## Meeting Notes (Transcription)

The Meeting Notes feature uses LiteLLM's `/audio/transcriptions` endpoint (compatible with OpenAI Whisper).

### Configure a Whisper model in LiteLLM

Add this to your `litellm_config.yaml`:

```yaml
model_list:
  - model_name: whisper-1
    litellm_params:
      model: whisper/whisper-1        # or groq/whisper-large-v3, openai/whisper-1, etc.
      api_key: YOUR_KEY_HERE
      # For local Whisper (faster-whisper):
      # model: faster_whisper/base
      # api_base: http://localhost:8000
```

Then set **Transcription model** in Slatepad Settings → Meeting Notes to `whisper-1`.

### Supported providers

| Provider | model string in config |
|----------|----------------------|
| OpenAI | `openai/whisper-1` |
| Groq | `groq/whisper-large-v3` |
| Local faster-whisper | `faster_whisper/base` |
| Azure Whisper | `azure/whisper-1` |

### macOS Requirements

- **Microphone recording**: Works on all supported macOS versions
- **System audio recording** (capturing other participants): Requires **macOS 14.2+ (Sonoma)**

### Permissions

On first enable, Slatepad will prompt for:
1. **Microphone** — to capture your own voice
2. **System Audio** — to capture meeting participant audio (macOS 14.2+)

If you deny a permission, you can re-grant it in **System Settings → Privacy & Security**.
