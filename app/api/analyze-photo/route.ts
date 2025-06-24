import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rate limiting: track requests per minute
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const MAX_REQUESTS_PER_MINUTE = 10; // Conservative limit to stay well under OpenAI's limits

// Helper function to check rate limit
function checkRateLimit(): { allowed: boolean; waitTime?: number } {
  const now = Date.now();
  const minuteKey = Math.floor(now / 60000); // Round to minute

  const current = requestCounts.get(minuteKey.toString()) || { count: 0, resetTime: now + 60000 };

  if (current.count >= MAX_REQUESTS_PER_MINUTE) {
    const waitTime = current.resetTime - now;
    return { allowed: false, waitTime: Math.max(0, waitTime) };
  }

  requestCounts.set(minuteKey.toString(), {
    count: current.count + 1,
    resetTime: current.resetTime
  });

  return { allowed: true };
}

// Helper function to sleep
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry function with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // If it's a rate limit error, wait longer
      if (error instanceof Error && error.message.includes('429')) {
        const waitTime = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.log(`Rate limit hit, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries + 1}`);
        await sleep(waitTime);
        continue;
      }

      // For other errors, don't retry
      throw error;
    }
  }

  throw lastError!;
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, boxContext } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    // Check rate limit
    const rateLimitCheck = checkRateLimit();
    if (!rateLimitCheck.allowed) {
      console.log(`Rate limit exceeded, need to wait ${rateLimitCheck.waitTime}ms`);
      return NextResponse.json({
        error: 'Rate limit exceeded',
        retryAfter: rateLimitCheck.waitTime
      }, { status: 429 });
    }

    // Remove the data:image/jpeg;base64, prefix if present
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    // Validate base64 data
    if (!base64Data || base64Data.length < 100) {
      return NextResponse.json({ error: 'Invalid image data' }, { status: 400 });
    }

    console.log('Starting photo analysis with context:', boxContext);

    const prompt = `You are analyzing items in order to help a user pack their moving boxes. Look at this photo and identify the main item or group of similar items.

Box Context: ${boxContext || 'No specific context provided'}

Return a JSON object with an "items" array containing objects with this exact format:
{
  "items": [
    {
      "name": "Item name (be specific)",
      "description": "Brief description of the item (1-2 sentences)",
      "category": "General category (e.g., Kitchen, Electronics, Clothing, Books, etc.)"
    }
  ]
}

Guidelines:
- Focus on ONE main item per photo, unless there are multiple similar items that should be grouped together
- For similar items (e.g., 3 coffee mugs, 5 books, 2 shirts), group them as a single item with quantity
- Be specific with item names and include brand names if visible
- Choose the most prominent or important item if multiple different items are visible
- Be concise but descriptive in the description
- Use appropriate categories that help with organization


Examples:
- Single item: "Coffee Maker", "Laptop", "Winter Jacket"
- Grouped items: "3 Coffee Mugs", "5 Paperback Books", "2 T-Shirts"`;

    console.log('Sending request to OpenAI...');

    // Use retry logic for the OpenAI API call
    const response = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Data}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        response_format: { type: "json_object" },
      });
    });

    console.log('OpenAI response received');

    const content = response.choices[0]?.message?.content;

    if (!content) {
      console.error('No content in OpenAI response');
      return NextResponse.json({ error: 'No response from OpenAI' }, { status: 500 });
    }

    console.log('OpenAI response content:', content);

    // Try to parse the JSON response
    try {
      const responseData = JSON.parse(content);

      if (!responseData.items || !Array.isArray(responseData.items)) {
        console.error('Invalid response format:', responseData);
        throw new Error('Response does not contain valid items array');
      }

      console.log('Successfully parsed response with', responseData.items.length, 'items');
      return NextResponse.json({ items: responseData.items });
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      console.error('Parse error:', parseError);
      return NextResponse.json({
        error: 'Failed to parse AI response',
        rawResponse: content
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error analyzing photo:', error);

    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    return NextResponse.json({
      error: 'Failed to analyze photo',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 