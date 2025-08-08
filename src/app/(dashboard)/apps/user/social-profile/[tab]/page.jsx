import SocialProfile from 'views/application/users/social-profile';

// ==============================|| PAGE ||============================== //

// Multiple versions of this page will be statically generated
// using the `params` returned by `generateStaticParams`
export default function Page() {
  return <SocialProfile />;
}

// Return a list of `params` to populate the [slug] dynamic segment
export async function generateStaticParams() {
  const response = ['posts', 'follower', 'friends', 'gallery', 'friend-request'];

  return response.map((tab) => ({
    tab: tab
  }));
}
