import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id?: string
      keycloakId?: string
      firstName?: string
      lastName?: string
    } & DefaultSession["user"]
    error?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    refreshToken?: string
    accessTokenExpires?: number
    idToken?: string
    dbId?: string
    lastActiveOrgId?: string | null
    error?: string
  }
}
