import { redirect } from "next/navigation";

export default async function ContactsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/dashboard/org/${slug}/contacts/owners`);
}
