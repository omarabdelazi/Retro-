const messages: Record<string, string> = {
  fields: 'Fill in every required field with valid values.',
  steps: 'Add at least one workshop step.',
  'duplicate-workshop': 'A workshop appears twice in the chain.',
  slug: 'That slug is already taken.',
  'in-use':
    'This product sits on order history and cannot be deleted. Deactivate it instead.',
}

export function FormError({ error }: { error?: string }) {
  if (!error) return null
  return (
    <p className="border border-walnut/50 bg-walnut/10 px-3 py-2 text-sm text-walnut">
      {messages[error] ?? 'Something went wrong.'}
    </p>
  )
}
