async function check() {
  const res = await fetch('https://api.clerk.com/v1/users/user_3F2oGGAGkcH7WKZmelvamNW9BrS/organization_memberships', {
    headers: {
      Authorization: `Bearer sk_test_ys7Z8TMEL56UU2CpOGJhyuifxaSArGHIe1WmAmRrjG`
    }
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

check();
