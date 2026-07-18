import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

const locales = ['pt', 'es']
const defaultLocale = 'pt'

function getLocale(request) {
  const acceptLanguage = request.headers.get('accept-language')
  if (!acceptLanguage) return defaultLocale
  const esIndex = acceptLanguage.indexOf('es')
  const ptIndex = acceptLanguage.indexOf('pt')
  if (esIndex !== -1 && (ptIndex === -1 || esIndex < ptIndex)) {
    return 'es'
  }
  return 'pt'
}

export async function proxy(request) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // 1. Ignorar rotas internas e arquivos
  if (
    path.startsWith('/api') ||
    path.startsWith('/_next') ||
    path.includes('.') ||
    path === '/favicon.ico'
  ) {
    return supabaseResponse
  }

  // 2. Determinar o idioma atual ou redirecionar
  let pathnameHasLocale = locales.some((loc) => path.startsWith(`/${loc}/`) || path === `/${loc}`)
  let locale = defaultLocale

  if (!pathnameHasLocale) {
    locale = getLocale(request)
    const newUrl = request.nextUrl.clone()
    newUrl.pathname = `/${locale}${path}`
    // If we're redirecting, we return early, but we still need to preserve cookies? Redirect doesn't set cookies.
    return NextResponse.redirect(newUrl)
  } else {
    locale = path.split('/')[1]
  }

  // 3. Checagem de Autenticação Supabase
  const pathWithoutLocale = path.replace(`/${locale}`, '') || '/'
  const isAuthPage = pathWithoutLocale === '/login' || pathWithoutLocale === '/register'
  const isRoot = pathWithoutLocale === '/'

  // Se o usuário NÃO está logado e tenta acessar rotas protegidas
  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/login`
    return NextResponse.redirect(url)
  }

  // Se o usuário ESTÁ logado e tenta acessar login ou raiz
  if (user && (isAuthPage || isRoot)) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/dashboard`
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
