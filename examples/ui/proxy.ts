import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { APPS, getEnabledApps } from './app/config/features';

// For high traffic, add matcher to avoid running on static assets:
// export const config = { matcher: ['/addresses', '/cross-chain'] };

export function proxy(request: NextRequest) {
  const validApp = APPS.find((a) => a.href === request.nextUrl.pathname);
  if (validApp && !getEnabledApps().some((a) => a.id === validApp.id)) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}
