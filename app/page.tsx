import { redirect } from 'next/navigation'

import { ROUTES } from '@/lib/routes'

/**
 * The product lives under its own module route; the root is just a doorway.
 *
 * The target comes from ROUTES rather than a literal for the reason that file
 * was created: this is the one link with no component behind it to grep for,
 * so a hand-typed path here would survive a rename of the route base and drop
 * every visitor arriving at the bare domain onto a 404.
 */
export default function RootPage() {
  redirect(ROUTES.landing)
}
