import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 600; // 10 minute timeout for Modal processing (cold start can be slow)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Use local backend if NEXT_PUBLIC_EVO2_API_URL is set to localhost, otherwise use Modal
    // Note: In server-side routes, we can access all env vars, not just NEXT_PUBLIC_ ones
    let apiUrl = process.env.NEXT_PUBLIC_EVO2_API_URL || 
      'https://ajiteshshukla1234--variant-analysis-evo2-evo2model-analy-012766.modal.run';
    
    // Replace localhost with 127.0.0.1 for server-side fetch (Next.js can't resolve localhost)
    if (apiUrl.includes('localhost')) {
      apiUrl = apiUrl.replace('localhost', '127.0.0.1');
    }
    
    // Determine the correct endpoint based on the API URL
    const isLocalBackend = apiUrl.includes('127.0.0.1') || apiUrl.includes('localhost');
    const endpoint = isLocalBackend ? `${apiUrl}/analyze-variant` : apiUrl;
    
    console.log(`[API Route] Forwarding to: ${endpoint}`);
    console.log('[API Route] Request body:', JSON.stringify(body));
    console.log('[API Route] Environment variable:', process.env.NEXT_PUBLIC_EVO2_API_URL);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 540000); // 9 minute timeout
    
    try {
      // For localhost in Next.js server-side, we might need to use the full URL
      const fetchUrl = endpoint.startsWith('http') ? endpoint : `http://${endpoint}`;
      
      console.log(`[API Route] Fetching from: ${fetchUrl}`);
      
      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
        // Add cache control for localhost
        cache: 'no-store',
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[API Route] Backend error (${response.status}):`, errorText);
        return NextResponse.json(
          { error: `API error: ${response.status}`, detail: errorText },
          { status: response.status }
        );
      }
      
      const data = await response.json();
      console.log('[API Route] Backend response:', JSON.stringify(data));
      
      // Transform responses to match frontend expected format
      if (isLocalBackend) {
        // Local backend response format
        const transformed = {
          position: data.position,
          reference: data.reference || "",
          alternative: data.alternative,
          delta_score: data.delta_score || 0,
          classification: data.classification || "UNKNOWN",
          evo2_score: data.evo2_score || 0,
        };
        console.log('[API Route] Transformed local response:', JSON.stringify(transformed));
        return NextResponse.json(transformed);
      } else {
        // Modal response format - map to expected format
        const transformed = {
          position: data.position,
          reference: data.reference || "",
          alternative: data.alternative,
          delta_score: data.delta_score || 0,
          classification: data.prediction || data.classification || "UNKNOWN",
          evo2_score: data.evo2_score || 0,
        };
        console.log('[API Route] Transformed Modal response:', JSON.stringify(transformed));
        return NextResponse.json(transformed);
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('[API Route] Request timeout after 9 minutes');
        return NextResponse.json(
          { error: 'Analysis timeout', detail: 'Backend is taking too long. The EVO2 model may still be loading. Please try again.' },
          { status: 504 }
        );
      }
      // Log the full error for debugging
      console.error('[API Route] Fetch error:', fetchError);
      if (fetchError instanceof Error) {
        console.error('[API Route] Error message:', fetchError.message);
        console.error('[API Route] Error stack:', fetchError.stack);
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('[API Route] Top-level error:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API Route] Error details:', {
      message: errorMsg,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to analyze variant', detail: errorMsg },
      { status: 500 }
    );
  }
}
