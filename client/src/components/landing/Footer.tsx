import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { HeartPulse, Github, Twitter, Linkedin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row md:items-start">
          <div className="max-w-sm text-center md:text-left">
            <Logo size="sm" />
            <p className="mt-3 text-sm text-ink-2">
              Jeevan Intelligence &amp; Virtual Assistance — an AI powered smart healthcare
              platform built for modern hospitals.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <div>
              <h4 className="mb-3 text-sm font-semibold">Product</h4>
              <ul className="space-y-2 text-sm text-ink-2">
                <li><a href="#features" className="hover:text-primary">Features</a></li>
                <li><a href="#ai" className="hover:text-primary">AI Engine</a></li>
                <li><a href="#network" className="hover:text-primary">Network</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold">Platform</h4>
              <ul className="space-y-2 text-sm text-ink-2">
                <li><Link href="/login" className="hover:text-primary">Patient Login</Link></li>
                <li><Link href="/login" className="hover:text-primary">Doctor Login</Link></li>
                <li><Link href="/login" className="hover:text-primary">Admin Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold">Contact</h4>
              <ul className="space-y-2 text-sm text-ink-2">
                <li><a href="#contact" className="hover:text-primary">Support</a></li>
                <li><a href="mailto:hello@jiva.ai" className="hover:text-primary">hello@jiva.ai</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-ink-3">
            © {new Date().getFullYear()} JIVA Healthcare. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-ink-2">
            <span className="flex items-center gap-1.5 text-xs">
              <HeartPulse className="h-4 w-4 text-primary" /> Care for every life
            </span>
            <a href="#" className="rounded-lg p-2 hover:text-primary" aria-label="GitHub"><Github className="h-4 w-4" /></a>
            <a href="#" className="rounded-lg p-2 hover:text-primary" aria-label="Twitter"><Twitter className="h-4 w-4" /></a>
            <a href="#" className="rounded-lg p-2 hover:text-primary" aria-label="LinkedIn"><Linkedin className="h-4 w-4" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
