import { Link } from '@tanstack/react-router'
import { UserButton, SignedIn, SignedOut } from '@clerk/tanstack-react-start'
import { Button } from '@/components/ui/button'
import { Command } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useWorkspaceStore } from '@/stores/workspace'
import { cn } from '@/lib/utils'

export default function Header() {
  const { view, setView } = useWorkspaceStore()
  const navItems = [
    { label: 'Dashboard', view: 'dashboard' as const },
    { label: 'Candidates', view: 'candidates' as const },
    { label: 'Settings', view: 'settings' as const },
  ]

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center space-x-2">
            <Command className="h-6 w-6" />
            <span className="font-bold tracking-tight">lightloop</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            {navItems.map((item) => (
              <button
                key={item.view}
                type="button"
                onClick={() => setView(item.view)}
                className={cn(
                  'transition-colors hover:text-foreground/80 text-foreground/60',
                  view === item.view && 'text-foreground'
                )}
                aria-current={view === item.view ? 'page' : undefined}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
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
