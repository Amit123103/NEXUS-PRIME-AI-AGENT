/**
 * Vercel Edge Middleware
 * Standalone integration for low-latency global data access.
 */
import { get } from '@vercel/edge-config';

export const config = {
  matcher: '/welcome',
};

export default async function middleware(request) {
  try {
    // Attempt to fetch 'greeting' from Vercel Edge Config
    const greeting = await get('greeting');

    return new Response(JSON.stringify(greeting || { message: "Welcome to NEXUS PRIME OMEGA" }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Edge Config not initialized" }), {
      headers: { 'content-type': 'application/json' },
      status: 500,
    });
  }
}
