
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({ name, value, ...options });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({ name, value, ...options });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: '', ...options });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({ name, value: '', ...options });
                },
            },
        }
    );

    // This is a simple way to adjust for the timezone difference between UTC (server) and Dhaka.
    // We are setting a custom header that can be read by server components.
    // This is not a perfect solution for all cases, but it works for this application's needs.
    const timezoneOffset = '+06:00'; // Dhaka is UTC+6
    request.headers.set('x-timezone-offset', timezoneOffset);


    // Check if there are any users in the database using the service role key
    const supabaseAdmin = createServerClient(
         process.env.NEXT_PUBLIC_SUPABASE_URL!,
         process.env.SUPABASE_SERVICE_ROLE_KEY!,
         {
             cookies: {
                 get: () => undefined,
                 set: () => {},
                 remove: () => {},
             },
         }
     );

    const { count, error: countError } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error("Error checking for first user in middleware:", countError);
        // Fail safe: assume users exist to prevent lockout
    }

    const hasUsers = (count || 0) > 0;
    const { pathname } = request.nextUrl;

    if (!hasUsers) {
        if (pathname !== '/signup' && !pathname.startsWith('/api/')) {
            return NextResponse.redirect(new URL('/signup', request.url));
        }
        return NextResponse.next();
    }

    // Now, check the user session
    const { data: { user } } = await supabase.auth.getUser();

    const isPublicPath = pathname === '/login' || pathname.startsWith('/signup') || pathname === '/forgot-password';

    if (pathname === '/') {
        return NextResponse.redirect(new URL(user ? '/dashboard' : '/login', request.url));
    }

    if (!user && !isPublicPath) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (user && isPublicPath) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
