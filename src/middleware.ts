import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/api/webhooks/clerk',
  '/api/boards',
  '/boards(.*)' // Public views handled in individual page logic
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html|css|js|gif|svg|png|jpg|jpeg|webp|js|json|wasm|xml|txt)).*)',
    '/(api|trpc)(.*)',
  ],
};
