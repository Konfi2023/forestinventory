import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string
      // Hier können wir später noch mehr hinzufügen, z.B. role oder orgId
    } & DefaultSession["user"]
  }
}