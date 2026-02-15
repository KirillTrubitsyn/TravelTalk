export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  try {
    const { system, content, max_tokens } = req.body;

    // Build Gemini request parts from the incoming content
    const parts = [];

    if (Array.isArray(content)) {
      for (const item of content) {
        if (item.type === 'text') {
          parts.push({ text: item.text });
        } else if (item.type === 'image') {
          // Anthropic format: { type: 'image', source: { type: 'base64', media_type, data } }
          parts.push({
            inlineData: {
              mimeType: item.source.media_type,
              data: item.source.data
            }
          });
        } else if (item.type === 'document') {
          // Anthropic format: { type: 'document', source: { type: 'base64', media_type, data } }
          parts.push({
            inlineData: {
              mimeType: item.source.media_type,
              data: item.source.data
            }
          });
        }
      }
    } else {
      // Simple text content
      parts.push({ text: typeof content === 'string' ? content : JSON.stringify(content) });
    }

    const requestBody = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        maxOutputTokens: max_tokens || 1024,
        thinkingConfig: { thinkingBudget: 0 }
      }
    };

    // Add system instruction if provided
    if (system) {
      requestBody.systemInstruction = {
        parts: [{ text: system }]
      };
    }

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify(requestBody)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error?.message || JSON.stringify(data.error) || 'API error';
      return res.status(response.status).json({ error: errorMsg });
    }

    // Extract text from Gemini response
    const text = data.candidates?.[0]?.content?.parts
      ?.filter(p => p.text)
      ?.map(p => p.text)
      ?.join('') || '';

    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
