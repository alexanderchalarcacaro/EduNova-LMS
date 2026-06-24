import https from 'https';

const token = "skWL1umOVIAhd9suH0VUNYewjZ7upjcehInoZDz57ZrNwK1JGFiThpkKb6HOh7LSBZ07QQmN31jldFl9oZKJsCMuO30KS8ukwqDHvKHOGHvG0rhF0rjj9TrzI6XSDnsBRD1fq4ICgTqJAZeyfQUB75pp2mEteRQ7QiiRXkRdmCfKE61aiK7m";
const options = {
  hostname: 'api.sanity.io',
  path: '/v1/projects/upjd80sb/datasets',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log(data); });
});

req.on('error', (e) => { console.error(e); });
req.end();
