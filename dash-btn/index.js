const macs = {
  signal: 'fc:a6:67:8f:42:7c'
}

var dash_button = require('node-dash-button');

var dash = dash_button(macs.signal, null, null, 'arp');

dash.on("detected", function (){
  console.log("omg found signal :)");
});
