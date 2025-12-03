import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Protected routes - must be logged in
  if (pathname.startsWith('/onboarding') || pathname.startsWith('/feed')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Check onboarding status for routing
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('onboarding_completed, agent_ready, display_name')
      .eq('user_id', user.id)
      .single()

    const isOnboardingComplete = profile?.onboarding_completed || profile?.agent_ready
    const hasProfile = !!profile?.display_name

    // User trying to access feed but hasn't completed onboarding
    if (pathname.startsWith('/feed') && !isOnboardingComplete) {
      if (hasProfile) {
        // Has profile but not complete - go to conversation
        return NextResponse.redirect(new URL('/onboarding/conversation', request.url))
      } else {
        // No profile - start onboarding
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    }

    // User trying to access onboarding but already completed
    if (pathname.startsWith('/onboarding') && isOnboardingComplete) {
      return NextResponse.redirect(new URL('/feed', request.url))
    }

    // User trying to access basic onboarding but already has profile
    if (pathname === '/onboarding' && hasProfile && !isOnboardingComplete) {
      return NextResponse.redirect(new URL('/onboarding/conversation', request.url))
    }
  }

  // Auth routes (redirect if already logged in)
  if (pathname === '/login' || pathname === '/') {
    if (user) {
      // Check if they have completed onboarding
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarding_completed, agent_ready, display_name')
        .eq('user_id', user.id)
        .single()

      const isOnboardingComplete = profile?.onboarding_completed || profile?.agent_ready
      const hasProfile = !!profile?.display_name

      if (isOnboardingComplete) {
        return NextResponse.redirect(new URL('/feed', request.url))
      } else if (hasProfile) {
        return NextResponse.redirect(new URL('/onboarding/conversation', request.url))
      } else {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes - handled separately or let through for auth)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

