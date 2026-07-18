import { redirect } from 'next/navigation'

export default async function LandingPage({ params }) {
  const { lang } = await params;
  redirect(`/${lang}/dashboard`)
}
