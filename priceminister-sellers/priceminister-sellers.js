console.clear();
var csv = '';
var product = $('.prdTitle').textContent.trim().replace(/[\n|\s]+/g, ' ');
$$('.itemList').forEach(function (item) {
    var addCartButton = item.querySelector('button[data-pickup="false"]');
    if (addCartButton) {
        var price = item.querySelector('.price').textContent.replace(',', '.');
        var priceNum = parseFloat(price.split(/\s/)[0]);
        var shippingEl = item.querySelector('.shipping .value');
        var shippingNum = 0
        if (shippingEl) {
            var shipping = shippingEl.textContent.replace(',', '.');
            shippingNum = parseFloat(shipping.split(/\s/)[0]);
        }
        var totalPrice = (priceNum + shippingNum).toFixed(2);
        var state = item.querySelector('.typeUsed.state').textContent.replace(/\n/g, ' ').trim();
        var seller = item.querySelector('.seller').textContent.trim().replace(/[\n|\s]+/g, ' ');
        csv += '"' + [product, seller, totalPrice, state].join('","') + '"' + "\r\n";
    }
});
console.log(csv);
/*
var fileName = "data.csv";
var blob = new Blob([csv], {
  "type": "text/csv;charset=utf8;"			
});
var link = document.createElement("a");
// Browsers that support HTML5 download attribute
link.setAttribute("href", window.URL.createObjectURL(blob));
link.setAttribute("download", fileName);
link.click(); // This will download the data file
  
  
link.setAttribute("href", encodedUri);
link.setAttribute("download", "my_data.csv");
// document.body.appendChild(link); // Required for FF
link.click(); // This will download the data file named "my_data.csv".

// download stuff
var fileName = "data.csv";
var buffer = csvData.join("\n");
var blob = new Blob([buffer], {
  "type": "text/csv;charset=utf8;"			
});
var link = document.createElement("a");
			
if(link.download !== undefined) { // feature detection
  // Browsers that support HTML5 download attribute
  link.setAttribute("href", window.URL.createObjectURL(blob));
  link.setAttribute("download", fileName);
 }
else {
  // it needs to implement server side export
  link.setAttribute("href", "http://www.example.com/export");
}
link.innerHTML = "Export to CSV";
document.body.appendChild(link);
*/