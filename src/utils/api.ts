export async function getProfile(token: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}
