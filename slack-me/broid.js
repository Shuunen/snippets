const BroidSlack = require('broid-slack');

const slack = new BroidSlack({
  token: 'xoxb-149292450722-G1qd04bgAdhDqewtDPlKYgM6'
});

slack.connect()
  .subscribe({
    next: data => console.log(data),
    error: err => console.error(`Something went wrong: ${err.message}`),
    complete: () => console.log('complete'),
  });
