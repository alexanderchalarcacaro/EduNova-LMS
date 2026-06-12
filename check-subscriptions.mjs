async function check() {
  const res = await fetch('https://api.clerk.com/v1/subscriptions', {
    headers: {
      Authorization: `Bearer sk_test_ys7Z8TMEL56UU2CpOGJhyuifxaSArGHIe1WmAmRrjG`
    }
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

check();
