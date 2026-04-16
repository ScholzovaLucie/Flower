import * as FileSystem from 'expo-file-system';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

const callClaude = async (apiKey, messages, maxTokens = 1024) => {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
};

const imageToBase64 = async (uri) => {
  return await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
};

const getMediaType = (uri) => {
  const lower = uri.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.gif')) return 'image/gif';
  if (lower.includes('.webp')) return 'image/webp';
  return 'image/jpeg';
};

/**
 * Identifikuje kytku na fotce pomocí Claude AI.
 * Vrací objekt { name, species, description, wateringTips, wateringIntervalDays }
 */
export const identifyPlant = async (apiKey, imageUri) => {
  if (!apiKey) throw new Error('API klíč není nastaven. Nastav ho v Nastavení.');

  const base64 = await imageToBase64(imageUri);
  const mediaType = getMediaType(imageUri);

  const text = await callClaude(apiKey, [
    {
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        },
        {
          type: 'text',
          text: `Identifikuj kytku na této fotce. Odpověz POUZE jako validní JSON bez markdown formátování, bez \`\`\`json, bez žádného dalšího textu. Formát:
{"name":"český název kytky","species":"latinský název","description":"2-3 věty o kytce a péči o ni","wateringTips":"konkrétní rada pro zalévání","wateringIntervalDays":7}

Pole wateringIntervalDays je celé číslo – jak často v dnech se má kytka zalévat (typicky 3-14).`,
        },
      ],
    },
  ]);

  // Extract JSON even if model adds extra text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI nevrátila validní odpověď');
  return JSON.parse(jsonMatch[0]);
};

/**
 * Poskytne radu pro péči o kytku na základě fotky.
 */
export const getPlantAdvice = async (apiKey, imageUri, plantName, plantDescription) => {
  if (!apiKey) throw new Error('API klíč není nastaven. Nastav ho v Nastavení.');

  const base64 = await imageToBase64(imageUri);
  const mediaType = getMediaType(imageUri);

  const context = plantDescription
    ? `Kytka se jmenuje "${plantName}". Popis: ${plantDescription}.`
    : `Kytka se jmenuje "${plantName}".`;

  return await callClaude(
    apiKey,
    [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: `${context} Podívej se na tuto fotku a poraď mi:
1. Jak vypadá zdraví kytky? Má dostatek vody, světla?
2. Vidíš nějaké problémy (žluté listy, škůdci, nemoc)?
3. Co konkrétně dělat pro zlepšení stavu?

Odpověz v češtině, buď konkrétní a praktický. Maximálně 200 slov.`,
          },
        ],
      },
    ],
    600
  );
};
