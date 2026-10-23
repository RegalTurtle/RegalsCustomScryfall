import CustomCardSearch from "@/components/CustomCardSearch";
import Link from "next/link";
import RegalsMagicHeader from "@/components/RegalsMagicHeader";

export default async function CustomCardSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col bg-teal-900">
      <RegalsMagicHeader showBack backUrl="/" backText="Home" />
      <main className="flex-1 px-4 py-8 text-center">
        <h2 className="mb-2 text-3xl font-semibold text-white">Regal&apos;s Custom Cards</h2>
        <p className="mb-8 text-teal-100">A search engine for custom cards</p>
        <CustomCardSearch initialQuery={q} />
      </main>
      <footer className="mt-10 flex h-16 items-center justify-center bg-gray-900 text-white">
        <Link href="/" className="text-teal-200 hover:text-white">Home</Link>
      </footer>
    </div>
  );
}
