import { createFileRoute } from '@tanstack/react-router'
import { SignUp } from '@clerk/tanstack-react-start'

export const Route = createFileRoute('/sign-up')({
  component: SignUpPage,
})

function SignUpPage() {
  return (
    <div className="container justify-center items-center min-h-screen">
      <div className="max-w-md w-full">
        <SignUp 
          appearance={{
            elements: {
              rootBox: "cl-internal-bg border rounded-lg p-6",
              card: "cl-internal-bg border shadow-lg",
              headerTitle: "cl-internal-text text-2xl font-semibold mb-6",
              headerSubtitle: "cl-internal-text-muted-foreground text-sm mb-6",
              socialButtonsBlock: "flex flex-col gap-2",
              socialButtonsBlockButton: "cl-internal-button flex items-center justify-center gap-2",
              dividerText: "cl-internal-text-muted-foreground text-sm mb-4",
              formFieldLabel: "cl-internal-text text-sm font-medium mb-1.5",
              formFieldInput: "cl-internal-input",
              formButton: "cl-internal-button w-full",
              footerAction: "cl-internal-text text-sm",
              footerActionLink: "cl-internal-text-muted-foreground hover:text-primary ml-1"
            }
          }}
        />
      </div>
    </div>
  )
}