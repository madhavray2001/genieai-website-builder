import ClientPage from "./ClientPage"

export default async function Page({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ prompt?: string }>
}) {
  // Await the promises
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  
  return <ClientPage params={resolvedParams} searchParams={resolvedSearchParams} />
}