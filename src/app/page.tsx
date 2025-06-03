import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
  // Return null or a loading component if redirect takes time or for RSC compliance
  return null; 
}
