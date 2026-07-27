import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn } from './actions'

const messages: Record<string, string> = {
  invalid: 'That email and password did not match.',
  denied: 'This account does not have dashboard access.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl">Retro</h1>
        <p className="mt-1 text-sm text-stone">Dashboard sign in</p>

        <form action={signIn} className="mt-6 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {error ? (
            <p className="text-sm text-walnut">{messages[error] ?? 'Sign in failed.'}</p>
          ) : null}
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>
      </div>
    </main>
  )
}
