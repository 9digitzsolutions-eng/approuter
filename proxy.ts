import NextAuth from 'next-auth';
import { authConfig } from './app/auth.config'
import { NextRequest } from 'next/server';

 
export default NextAuth(authConfig).auth;
 
export const config = {
  // https://nextjs.org/docs/app/api-reference/file-conventions/proxy#matcher
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};

// export default function proxy(request: NextRequest) {
//   console.log("Hola");
// }