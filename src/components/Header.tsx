import { Link } from '@tanstack/react-router'
import { UserButton, SignedIn, SignedOut } from '@clerk/tanstack-react-start'
import { Button } from '@/components/ui/button'
import { Command } from 'lucide-react'

export default function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center space-x-2">
            <Command className="h-6 w-6" />
            <span className="font-bold tracking-tight">lightloop</span>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link to="/" className="transition-colors hover:text-foreground/80 text-foreground/60">Dashboard</Link>
            <Link to="/" className="transition-colors hover:text-foreground/80 text-foreground/60">Candidates</Link>
            <Link to="/" className="transition-colors hover:text-foreground/80 text-foreground/60">Settings</Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <SignedOut>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/sign-in">Sign In</Link>
            </Button>
            <Button size="sm" asChild className="rounded-full px-4">
              <Link to="/sign-up">Get Started</Link>
            </Button>
          </SignedOut>
          <SignedIn>
            <UserButton 
              appearance={{
                elements: {
                  userButtonAvatarBox: "h-8 w-8",
                  userButtonTrigger: "focus:shadow-none focus:ring-0"
                }
              }}
            />
          </SignedIn>
        </div>
      </div>
    </header>
  )
}
