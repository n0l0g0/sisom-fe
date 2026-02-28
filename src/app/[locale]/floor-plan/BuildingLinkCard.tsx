 'use client';
 
 import { useRouter } from 'next/navigation';
 
 export default function BuildingLinkCard({ href, children }: { href: string; children: React.ReactNode }) {
   const router = useRouter();
   const handleClick = () => {
     try {
       router.push(href);
     } catch {}
   };
   return (
     <div onClick={handleClick} role="button" tabIndex={0} className="cursor-pointer" onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}>
       {children}
     </div>
   );
 }
