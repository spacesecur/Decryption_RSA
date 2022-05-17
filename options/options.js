var ALERT_BUTTON_TEXT = "Ok";

if(document.getElementById) {
	window.alert = function(txt) {
		createCustomAlert(txt);
	}
}

function createCustomAlert(txt) {
	d = document;
	if(d.getElementById("modalContainer")) return;
	mObj = d.getElementsByTagName("body")[0].appendChild(d.createElement("div"));
	mObj.id = "modalContainer";
	mObj.style.height = d.documentElement.scrollHeight + "px";
	alertObj = mObj.appendChild(d.createElement("div"));
	alertObj.id = "alertBox";
	if(d.all && !window.opera) alertObj.style.top = document.documentElement.scrollTop + "px";
	alertObj.style.left = (d.documentElement.scrollWidth - alertObj.offsetWidth)/2 + "px";
	alertObj.style.visiblity="visible";
	msg = alertObj.appendChild(d.createElement("p"));
	msg.innerHTML = txt;
	btn = alertObj.appendChild(d.createElement("a"));
	btn.id = "closeBtn";
	btn.appendChild(d.createTextNode(ALERT_BUTTON_TEXT));
	btn.href = "#";
	btn.focus();
	btn.onclick = function() { removeCustomAlert();return false; }
	alertObj.style.display = "block";
}

function removeCustomAlert() {
	document.getElementsByTagName("body")[0].removeChild(document.getElementById("modalContainer"));
}
function ful(){
alert('Alert this pages');
}

$(function () {
    var generateKeys = function () {
      var sKeySize = $('#key-size').attr('data-value');
      var keySize = parseInt(sKeySize);
      var crypt = new JSEncrypt({default_key_size: keySize});
      var dt = new Date();
      var time = -(dt.getTime());
      crypt.getKey();
      dt = new Date();
      time += (dt.getTime());
      $('#time-report').text('Created in ' + time + ' ms');
      $('#privkey').val(crypt.getPrivateKey());
      $('#pubkey').val(crypt.getPublicKey());
    };

    // If they wish to generate new keys.
    $('#generate').click(generateKeys);
    generateKeys();

//Clear locale store
function clear_chrome_storage_local(){
  chrome.storage.local.clear(function() {
      var error = chrome.runtime.lastError;
      if (error) {
          console.error(error);
      }
  });
  chrome.storage.sync.clear(); // callback is optional
}
  
//Seal of saved keys
function load_data_key(){
  chrome.storage.local.get(console.log);
  chrome.storage.sync.get(console.log);
  chrome.storage.local.get(['private_key', 'public_key'], function(data) {
      private_key = data.private_key;
      public_key = data.public_key;
      $('#public_pers').val(public_key);
      $('#privkey_pers').val(private_key);
  });
}

//Saving entered keys
var save_key_new = function () {
    var private_key = $("#privkey_pers").val();
    var public_key = $("#public_pers").val();

    chrome.storage.local.set({private_key: private_key}, () => {
        if (chrome.runtime.lastError)
            alert("Error setting!")
    });
    alert("You have saved the private key in the local storage of your browser!")
}

//Click the "Save" button
$('#save_rsa_key').click(save_key_new);
//Retrieving Key Data
load_data_key();
});