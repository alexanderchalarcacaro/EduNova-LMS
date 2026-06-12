import { useUser } from "@clerk/clerk-react";

export default function TestComp() {
  const { user } = useUser();
  if (!user) return null;
  
  const obj = user as any;
  const jsonStr = JSON.stringify({
    subscription: obj.subscription,
    entitlements: obj.entitlements,
    planPublic: obj.publicMetadata?.plan,
    has: typeof obj.has
  }, null, 2);

  return <pre>{jsonStr}</pre>;
}
