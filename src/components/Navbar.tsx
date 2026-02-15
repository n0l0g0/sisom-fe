import Link from 'next/link'

export function Navbar() {
  return (
    <nav className="border-b bg-white shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">
          SisomAPT
        </Link>
        <div className="flex gap-6">
          <Link href="/" className="hover:text-blue-600">Dashboard</Link>
          <Link href="/meter" className="hover:text-blue-600">Meter Record</Link>
          <Link href="/invoices" className="hover:text-blue-600">Invoices</Link>
          <Link href="/tenants" className="hover:text-blue-600">Tenants</Link>
        </div>
      </div>
    </nav>
  )
}
