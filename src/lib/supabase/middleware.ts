import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Protect /admin routes
  if (pathname.startsWith("/admin")) {
    if (!user) {
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      const redirectRes = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value));
      return redirectRes;
    }

    // Check admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      url.pathname = "/dashboard";
      url.searchParams.set("error", "unauthorized");
      const redirectRes = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value));
      return redirectRes;
    }
  }

  // Protect user dashboard and interview routes
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/resume") ||
    pathname.startsWith("/interview")
  ) {
    if (!user) {
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      const redirectRes = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value));
      return redirectRes;
    }
  }

  // Redirect logged-in users away from auth pages
  if (pathname === "/login" || pathname === "/register") {
    if (user) {
      const redirectParam = request.nextUrl.searchParams.get("redirect");
      const target = (redirectParam && !redirectParam.startsWith("/login") && !redirectParam.startsWith("/register"))
        ? redirectParam
        : "/dashboard";
      url.pathname = target;
      url.search = "";
      const redirectRes = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value));
      return redirectRes;
    }
  }

  return supabaseResponse;
}
