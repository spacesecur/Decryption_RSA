// Copyright (c) 2022, SpaceSec. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be found in the LICENSE file.

var private_k
 
function getStorage() {
    chrome.storage.local.get(['private_key'], function(result) {
        private_k = result.private_key;
    });
}
getStorage();
var btn=document.getElementById("decrypt");

if(btn){
  btn.addEventListener("click",function(){
      var crypt = new JSEncrypt();
      crypt.setPrivateKey(private_k);
      var input = $('#input').val();
      var crypted = $('#crypted').val();
      if (crypted) {
        var decrypted = crypt.decrypt(crypted);
        if (!decrypted)
          decrypted = chrome.i18n.getMessage("notDecipher");
        $('#input').val(decrypted);
      }
  });
}