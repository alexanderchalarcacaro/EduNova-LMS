async function check() {
  const res = await fetch('https://api.clerk.com/v1/users', {
    headers: {
      Authorization: `Bearer sk_test_ys7Z8TMEL56UU2CpOGJhyuifxaSArGHIe1WmAmRrjG`
    }
  });
  const data = await res.json();
  console.log(JSON.stringify(data[0].entitlements || data[0].subscription || data[0], null, 2));
}

check();
