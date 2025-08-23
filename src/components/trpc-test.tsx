"use client";

import { api } from "@/trpc/client";

export function TrpcTest() {
  const { data: user, isLoading } = api.user.profile.useQuery();

  return (
    <div className="p-4 bg-gray-100 rounded-md mb-4">
      <h2 className="text-lg font-semibold mb-2">tRPC Test Component</h2>
      {isLoading ? (
        <p>Loading user data...</p>
      ) : user ? (
        <div>
          <p>Authenticated as {user.email}</p>
          <pre className="mt-2 p-2 bg-gray-200 rounded text-xs overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      ) : (
        <p>Not authenticated</p>
      )}
    </div>
  );
}
