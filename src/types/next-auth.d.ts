import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id?: string
      keycloakId?: string
      firstName?: string
      lastName?: string
    } & DefaultSession["user"]
  }
}
