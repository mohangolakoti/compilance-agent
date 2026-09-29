import { NextResponse } from 'next/server';
import { checkEnvHealth } from '@/lib/env';
import { checkMongoHealth } from '@/lib/mongodb';
import { checkHindsightHealth } from '@/lib/hindsight';
import { checkGroqHealth } from '@/lib/groq';

export const dynamic = 'force-dynamic';

export async function GET() {
  const env = checkEnvHealth();
  
  // If environment variables are missing, don't crash the health check
  // but report missing variables gracefully
  const [mongo, hindsight, groq] = await Promise.all([
    env.present.includes('MONGODB_URI')
      ? checkMongoHealth()
      : Promise.resolve({ ok: false, status: 'unconfigured', error: 'MONGODB_URI missing' }),
    env.present.includes('HINDSIGHT_API_KEY') && env.present.includes('HINDSIGHT_API_URL')
      ? checkHindsightHealth()
      : Promise.resolve({ ok: false, status: 'unconfigured', error: 'HINDSIGHT credentials missing' }),
    env.present.includes('GROQ_API_KEY')
      ? checkGroqHealth()
      : Promise.resolve({ ok: false, status: 'unconfigured', error: 'GROQ_API_KEY missing' }),
  ]);

  const allOk = env.ok && mongo.ok && hindsight.ok && groq.ok;
  const anyOk = mongo.ok || hindsight.ok || groq.ok;

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'unhealthy';
  if (allOk) {
    overallStatus = 'healthy';
  } else if (anyOk || env.ok) {
    overallStatus = 'degraded';
  }

  const responseBody = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services: {
      environment: {
        ok: env.ok,
        present: env.present,
        missing: env.missing,
      },
      database: mongo,
      hindsight,
      groq,
    },
  };

  return NextResponse.json(responseBody, {
    status: overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503,
  });
}
