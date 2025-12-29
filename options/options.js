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
	var modalContainer = document.getElementById("modalContainer");
	if(modalContainer) {
		document.getElementsByTagName("body")[0].removeChild(modalContainer);
	}
}

function createConfirmDialog(txt, onConfirm, onCancel) {
	d = document;
	if(d.getElementById("modalContainer")) return;
	mObj = d.getElementsByTagName("body")[0].appendChild(d.createElement("div"));
	mObj.id = "modalContainer";
	mObj.style.height = Math.max(d.documentElement.scrollHeight, d.documentElement.clientHeight) + "px";
	alertObj = mObj.appendChild(d.createElement("div"));
	alertObj.id = "alertBox";
	if(d.all && !window.opera) alertObj.style.top = document.documentElement.scrollTop + "px";
	alertObj.style.left = (d.documentElement.scrollWidth - alertObj.offsetWidth)/2 + "px";
	alertObj.style.visiblity="visible";
	msg = alertObj.appendChild(d.createElement("p"));
	msg.innerHTML = txt;
	msg.style.marginBottom = "30px";
	var btnContainer = alertObj.appendChild(d.createElement("div"));
	btnContainer.style.display = "flex";
	btnContainer.style.gap = "10px";
	btnContainer.style.justifyContent = "center";
	var cancelBtn = btnContainer.appendChild(d.createElement("a"));
	cancelBtn.id = "cancelBtn";
	cancelBtn.appendChild(d.createTextNode("Cancel"));
	cancelBtn.href = "#";
	cancelBtn.style.cssText = "background-color: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; padding: 10px 32px; margin: 0 5px; cursor: pointer; text-transform: uppercase; font-size: 17px; font-weight: 500; font-family: Roboto, Tahoma, Arial, Verdana, sans-serif; text-decoration: none; display: inline-block;";
	cancelBtn.onclick = function() {
		removeCustomAlert();
		if (onCancel) onCancel();
		return false;
	};
	var okBtn = btnContainer.appendChild(d.createElement("a"));
	okBtn.id = "okBtn";
	okBtn.appendChild(d.createTextNode("Ok"));
	okBtn.href = "#";
	okBtn.style.cssText = "background-color: #8dcafe; color: #212635; border: none; box-shadow: none; font-size: 17px; font-weight: 500; border-radius: 10px; padding: 10px 32px; margin: 0 5px; cursor: pointer; text-transform: uppercase; font-family: Roboto, Tahoma, Arial, Verdana, sans-serif; text-decoration: none; display: inline-block;";
	okBtn.onmouseover = function() { this.style.backgroundColor = "#a1d9f2"; };
	okBtn.onmouseout = function() { this.style.backgroundColor = "#8dcafe"; };
	okBtn.onclick = function() {
		removeCustomAlert();
		if (onConfirm) onConfirm();
		return false;
	};
	
	alertObj.style.display = "block";
	okBtn.focus();
}

function showLoadingAlert() {
	d = document;
	if(d.getElementById("modalContainer")) {
		removeCustomAlert();
	}
	mObj = d.getElementsByTagName("body")[0].appendChild(d.createElement("div"));
	mObj.id = "modalContainer";
	mObj.style.height = Math.max(d.documentElement.scrollHeight, d.documentElement.clientHeight) + "px";
	alertObj = mObj.appendChild(d.createElement("div"));
	alertObj.id = "alertBox";
	alertObj.style.display = "block";
	
	var loadingContainer = alertObj.appendChild(d.createElement("div"));
	loadingContainer.style.display = "flex";
	loadingContainer.style.flexDirection = "column";
	loadingContainer.style.alignItems = "center";
	loadingContainer.style.justifyContent = "center";
	loadingContainer.style.padding = "40px 20px";
	var spinner = loadingContainer.appendChild(d.createElement("div"));
	spinner.id = "loadingSpinner";
	spinner.style.width = "50px";
	spinner.style.height = "50px";
	spinner.style.border = "4px solid rgba(141,202,254,0.3)";
	spinner.style.borderTop = "4px solid #8DCAFE";
	spinner.style.borderRadius = "50%";
	spinner.style.animation = "spin 1s linear infinite";
	spinner.style.marginBottom = "20px";
	msg = loadingContainer.appendChild(d.createElement("p"));
	msg.innerHTML = "Generation is in progress";
	msg.style.color = "#fff";
	msg.style.fontSize = "20px";
	msg.style.margin = "0";
	msg.style.fontFamily = "Roboto, Tahoma, Arial, Verdana, sans-serif";
}
function ful(){
alert('Alert this pages');
}

$(function () {
    $('#current-year').text(new Date().getFullYear());
    var generateKeys = function () {
      showLoadingAlert();
      setTimeout(function() {
        var sKeySize = $('#key-size').val();
        var keySize = parseInt(sKeySize);
        var crypt = new JSEncrypt({default_key_size: keySize});
        var dt = new Date();
        var time = -(dt.getTime());
        crypt.getKey();
        dt = new Date();
        time += (dt.getTime());
        $('#time-report').text('Created in ' + time + ' ms');
        var privateKey = crypt.getPrivateKey();
        var publicKey = crypt.getPublicKey();
        $('#privkey').val(privateKey);
        $('#pubkey').val(publicKey);
        if ($('#privkey_pers').length) {
            $('#privkey_pers').val(privateKey);
        }
        if ($('#pubkey_pers').length) {
            $('#pubkey_pers').val(publicKey);
        }
        removeCustomAlert();
      }, 100);
    };
    $('#generate').click(generateKeys);

//Clear local storage
function clear_chrome_storage_local(){
  chrome.storage.local.clear(function() {
      var error = chrome.runtime.lastError;
      if (error) {
          //Ignore
      }
  });
  chrome.storage.sync.clear();
}
  
//Load saved keys
function load_data_key(){
  chrome.storage.local.get(function() {});
  chrome.storage.sync.get(function() {});
  chrome.storage.local.get(['private_key', 'public_key'], function(data) {
      var private_key = data.private_key;
      var public_key = data.public_key;
      if ($('#privkey_pers').length) {
          $('#privkey_pers').val(private_key || '');
      }
      if ($('#pubkey_pers').length) {
          $('#pubkey_pers').val(public_key || '');
      }
  });
}

//Save entered keys
var save_key_new = function (e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    var private_key = $("#privkey_pers").val();
    
    if (!private_key || private_key.trim() === '') {
        alert("Please enter a private key before saving!");
        return false;
    }
    private_key = private_key.trim();
    if (!private_key.includes('-----BEGIN') || !private_key.includes('-----END')) {
        alert("Error: Invalid private key format. The key should start with \"-----BEGIN PRIVATE KEY-----\" or \"-----BEGIN RSA PRIVATE KEY-----\" and end with \"-----END PRIVATE KEY-----\" or \"-----END RSA PRIVATE KEY-----\".");
        return false;
    }
    try {
        var testCrypt = new JSEncrypt();
        var setKeyResult = testCrypt.setPrivateKey(private_key);
        if (!setKeyResult) {
            //Ignore
        }
    } catch (e) {
        alert("Error: Invalid private key format. " + e.message);
        return false;
    }

    chrome.storage.local.set({private_key: private_key}, function() {
        if (chrome.runtime.lastError) {
            alert("Error saving: " + chrome.runtime.lastError.message);
        } else {
            alert("You have saved the private key in the local storage of your browser!");
        }
    });
    
    return false;
}

//Saving public key
var save_public_key_new = function (e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    var public_key = $("#pubkey_pers").val();
    
    if (!public_key || public_key.trim() === '') {
        alert("Please enter a public key before saving!");
        return false;
    }
    public_key = public_key.trim();
    if (!public_key.includes('-----BEGIN') || !public_key.includes('-----END')) {
        alert("Error: Invalid public key format. The key should start with \"-----BEGIN PUBLIC KEY-----\" or \"-----BEGIN RSA PUBLIC KEY-----\" and end with \"-----END PUBLIC KEY-----\" or \"-----END RSA PUBLIC KEY-----\".");
        return false;
    }
    try {
        var testCrypt = new JSEncrypt();
        var setKeyResult = testCrypt.setPublicKey(public_key);
        var testEncrypted = testCrypt.encrypt('test');
        if (!testEncrypted && !setKeyResult) {
            alert("Error: Invalid public key format. The key cannot be used for encryption. Please check that:\n\n1. The key is complete and not corrupted\n2. The key format is correct\n3. The key is a valid RSA public key");
            return false;
        }
    } catch (e) {
        alert("Error: Invalid public key format. " + e.message);
        return false;
    }

    chrome.storage.local.set({public_key: public_key}, function() {
        if (chrome.runtime.lastError) {
            alert("Error saving: " + chrome.runtime.lastError.message);
        } else {
            alert("You have saved the public key in the local storage of your browser!");
        }
    });
    
    return false;
}

$(document).on('click', '#save_rsa_key', save_key_new);
$('#save_rsa_key').on('click', save_key_new);
$(document).on('click', '#save_public_key', save_public_key_new);
$('#save_public_key').on('click', save_public_key_new);

$('#clear_private_key').click(function() {
    createConfirmDialog(
        "The private key will be cleared from browser storage. Continue?",
        function() {
            $('#privkey_pers').val('');
            chrome.storage.local.remove('private_key', function() {
                if (chrome.runtime.lastError) {
                    alert("Error clearing key: " + chrome.runtime.lastError.message);
                } else {
                    alert("Private key has been cleared from browser storage!");
                }
            });
        },
        function() {
            //Ignore
        }
    );
});

$('#clear_public_key').click(function() {
    createConfirmDialog(
        "The public key will be cleared from browser storage. Continue?",
        function() {
            $('#pubkey_pers').val('');
            chrome.storage.local.remove('public_key', function() {
                if (chrome.runtime.lastError) {
                    alert("Error clearing key: " + chrome.runtime.lastError.message);
                } else {
                    alert("Public key has been cleared from browser storage!");
                }
            });
        },
        function() {
            //Ignore
        }
    );
});

//Verify keys match
function verifyKeysMatch() {
    var privateKey = $('#privkey_pers').val();
    var publicKey = $('#pubkey_pers').val();
    if (!privateKey || privateKey.trim() === '') {
        alert('Error: Private key is not provided. Please enter a private key.');
        return;
    }
    
    if (!publicKey || publicKey.trim() === '') {
        alert('Error: Public key is not provided. Please enter a public key.');
        return;
    }
    privateKey = privateKey.trim();
    publicKey = publicKey.trim();
    if (!publicKey.includes('-----BEGIN') || !publicKey.includes('-----END')) {
        alert('Error: Public key format is invalid.\n\nThe key should start with "-----BEGIN PUBLIC KEY-----" or "-----BEGIN RSA PUBLIC KEY-----" and end with "-----END PUBLIC KEY-----" or "-----END RSA PUBLIC KEY-----".');
        return;
    }
    
    if (!privateKey.includes('-----BEGIN') || !privateKey.includes('-----END')) {
        alert('Error: Private key format is invalid.\n\nThe key should start with "-----BEGIN PRIVATE KEY-----" or "-----BEGIN RSA PRIVATE KEY-----" and end with "-----END PRIVATE KEY-----" or "-----END RSA PRIVATE KEY-----".');
        return;
    }
    try {
        var testMessage = 'RSA Key Verification Test - ' + new Date().getTime();
        var encrypt = new JSEncrypt();
        var setPublicKeyResult = encrypt.setPublicKey(publicKey);
        var encrypted = encrypt.encrypt(testMessage);
        if (!encrypted) {
            var errorDetails = 'The public key may be invalid or corrupted.';
            if (!setPublicKeyResult) {
                errorDetails += '\n\nJSEncrypt.setPublicKey() returned false, which usually means:\n';
                errorDetails += '- The key format is incorrect\n';
                errorDetails += '- The key is corrupted or incomplete\n';
                errorDetails += '- The key is not a valid RSA public key';
            }
            alert('Error: Failed to encrypt test message.\n\n' + errorDetails);
            return;
        }
        var decrypt = new JSEncrypt();
        var setPrivateKeyResult = decrypt.setPrivateKey(privateKey);
        var decrypted = decrypt.decrypt(encrypted);
        if (!setPrivateKeyResult && !decrypted) {
            alert('Error: Invalid private key format.\n\nJSEncrypt.setPrivateKey() returned false, which usually means:\n- The key format is incorrect\n- The key is corrupted or incomplete\n- The key is not a valid RSA private key');
            return;
        }
        if (decrypted === testMessage) {
            alert('✓ Success! The keys match each other.\n\nThe private and public keys are a valid key pair.');
        } else if (decrypted) {
            alert('✗ Error: The keys do not match.\n\nThe decrypted message does not match the original. These keys are not a pair.');
        } else {
            alert('✗ Error: Decryption failed.\n\nThe private key cannot decrypt data encrypted with the provided public key. These keys are not a pair.');
        }
    } catch (e) {
        var errorMsg = 'Error during key verification: ' + e.message;
        if (e.stack) {
            //Ignore
        }
        alert(errorMsg + '\n\nPlease check that both keys are correctly formatted and complete.');
    }
}

$('#verify_keys').click(function() {
    verifyKeysMatch();
});

load_data_key();
});