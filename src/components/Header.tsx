import { Link } from '@tanstack/react-router'
import { UserButton } from '@clerk/tanstack-react-start'

import './Header.css'

export default function Header() {
  return (
    <header className="header">
      <nav className="nav flex justify-between items-center p-4">
        <div className="flex items-center gap-4">
          <div className="nav-item">
            <Link to="/" className="text-foreground hover:text-primary">Home</Link>
          </div>

          <div className="nav-item">
            <Link to="/sign-in" className="text-foreground hover:text-primary">Sign In</Link>
          </div>

          <div className="nav-item">
            <Link to="/sign-up" className="text-foreground hover:text-primary">Sign Up</Link>
          </div>
        </div>

        <div className="flex items-center">
          <UserButton 
            appearance={{
              elements: {
                userButtonBox: "cl-internal-bg border rounded-lg p-1",
                userButtonTrigger: "cl-internal-button hover:bg-primary/90",
                avatarBox: "w-8 h-8",
                userButtonMain: "flex items-center gap-2"
              }
            }}
          />
        </div>
      </nav>
    </header>
  )
}
