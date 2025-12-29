//Copyright (c) 2025, SpaceSec. All rights reserved.
//Use of this source code is governed by a BSD-style license that can be found in the LICENSE file.

var private_k;
var public_k;

//Load keys from storage
function getStorage() {
    chrome.storage.local.get(['private_key', 'public_key'], function(result) {
        private_k = result.private_key;
        public_k = result.public_key;
    });
}
getStorage();

//Listen for storage changes to update keys
chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'local') {
        if (changes.private_key) {
            private_k = changes.private_key.newValue;
        }
        if (changes.public_key) {
            public_k = changes.public_key.newValue;
        }
    }
});

var currentDomain = null;

//Estimate key size and max message length
function getMaxMessageLength(publicKey) {
    if (!publicKey) return null;
    if (publicKey.includes('MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A')) {
        return { size: 2048, maxBytes: 245, maxChars: 245 };
    } else if (publicKey.length < 400) {
        return { size: 1024, maxBytes: 117, maxChars: 117 };
    } else if (publicKey.length > 800) {
        return { size: 4096, maxBytes: 501, maxChars: 501 };
    } else {
        return { size: 2048, maxBytes: 245, maxChars: 245 };
    }
}

//Update character counter and max length info
function updateCharCounter() {
    var input = $('#data_input').val();
    var charCount = input ? new TextEncoder().encode(input).length : 0;
    $('#char_count').text(charCount);
    chrome.storage.local.get(['public_key'], function(result) {
        var publicKey = result.public_key;
        if (publicKey && publicKey.trim()) {
            var maxInfo = getMaxMessageLength(publicKey.trim());
            if (maxInfo) {
                var maxText = '(Max: ~' + maxInfo.maxChars + ' bytes for ' + maxInfo.size + '-bit key)';
                $('#max_length_info').text(maxText);
                if (charCount > maxInfo.maxChars) {
                    $('#char_counter').css('color', '#ff6b6b');
                } else if (charCount > maxInfo.maxChars * 0.8) {
                    $('#char_counter').css('color', '#ffa500');
                } else {
                    $('#char_counter').css('color', 'rgba(255,255,255,0.6)');
                }
            }
        } else {
            $('#max_length_info').text('(Save public key to see max length)');
            $('#char_counter').css('color', 'rgba(255,255,255,0.6)');
        }
    });
}

function getCurrentDomain() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (chrome.runtime.lastError) {
            var errorMsg = chrome.runtime.lastError.message || 'Unknown error';
            $('#current_domain').text('(error)');
            loadSettings();
            return;
        }
        if (tabs[0] && tabs[0].url) {
            try {
                var url = new URL(tabs[0].url);
                currentDomain = url.hostname;
                $('#current_domain').text('(' + currentDomain + ')');
                loadSettings();
            } catch (e) {
                $('#current_domain').text('(unknown)');
                loadSettings();
            }
        } else {
            $('#current_domain').text('(no page)');
            loadSettings();
        }
    });
}

//Load extension settings
function loadSettings() {
    chrome.storage.local.get(['extension_enabled', 'auto_decrypt', 'decrypt_on_sites'], function(result) {
        $('#extension_enabled').prop('checked', result.extension_enabled !== false);
        $('#auto_decrypt').prop('checked', result.auto_decrypt === true);
        var decryptOnSites = result.decrypt_on_sites || {};
        if (currentDomain && decryptOnSites[currentDomain] !== undefined) {
            $('#decrypt_on_current_site').prop('checked', decryptOnSites[currentDomain] === true);
        } else {
            $('#decrypt_on_current_site').prop('checked', false);
        }
        loadSavedElements();
    });
}

//Load and display saved elements for current site
function loadSavedElements() {
    if (!currentDomain) {
        $('#saved_elements_list').html('<div style="color: rgba(255,255,255,0.5); font-size: 11px; text-align: center; padding: 10px; font-family: Roboto, Tahoma, Arial, Verdana, sans-serif;">No domain detected</div>');
        return;
    }
    
    chrome.storage.local.get(['selected_elements'], function(result) {
        var siteElements = result.selected_elements || {};
        var elements = siteElements[currentDomain] || [];
        
        var listContainer = $('#saved_elements_list');
        listContainer.empty();
        
        if (elements.length === 0) {
            listContainer.html('<div style="color: rgba(255,255,255,0.5); font-size: 11px; text-align: center; padding: 10px; font-family: Roboto, Tahoma, Arial, Verdana, sans-serif;">No elements saved yet</div>');
            return;
        }
        
        elements.forEach(function(selector, index) {
            var item = $('<div>').css({
                'display': 'flex',
                'align-items': 'center',
                'justify-content': 'space-between',
                'padding': '8px 12px',
                'margin-bottom': '6px',
                'background-color': 'rgba(255,255,255,0.05)',
                'border-radius': '4px',
                'border': '1px solid rgba(255,255,255,0.1)',
                'font-family': 'Roboto, Tahoma, Arial, Verdana, sans-serif'
            });
            
            var selectorText = $('<span>').css({
                'color': 'rgba(255,255,255,0.8)',
                'font-size': '11px',
                'flex': '1',
                'word-break': 'break-all',
                'margin-right': '10px'
            }).text(selector);
            
            var deleteBtn = $('<button>').css({
                'background-color': 'rgba(255,0,0,0.2)',
                'border': '1px solid rgba(255,0,0,0.3)',
                'border-radius': '4px',
                'padding': '4px 10px',
                'color': '#ff6b6b',
                'font-size': '10px',
                'cursor': 'pointer',
                'font-family': 'Roboto, Tahoma, Arial, Verdana, sans-serif',
                'white-space': 'nowrap'
            }).text('Delete').attr('data-selector', selector).attr('data-index', index);
            
            deleteBtn.on('click', function() {
                removeElement(selector);
            });
            
            item.append(selectorText).append(deleteBtn);
            listContainer.append(item);
        });
    });
}

//Remove element from saved list
function removeElement(selector) {
    if (!currentDomain) return;
    
    chrome.storage.local.get(['selected_elements'], function(result) {
        var siteElements = result.selected_elements || {};
        if (siteElements[currentDomain]) {
            siteElements[currentDomain] = siteElements[currentDomain].filter(function(s) {
                return s !== selector;
            });
            if (siteElements[currentDomain].length === 0) {
                delete siteElements[currentDomain];
            }
            chrome.storage.local.set({selected_elements: siteElements}, function() {
                loadSavedElements();
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    if (tabs[0] && tabs[0].url && (tabs[0].url.startsWith('http://') || tabs[0].url.startsWith('https://'))) {
                        chrome.tabs.sendMessage(tabs[0].id, {action: 'updateSelectedElements'}, function() {
                            if (chrome.runtime.lastError) {
                                //Ignore
                            }
                        });
                    }
                });
            });
        }
    });
}

//Add element manually
function addManualElement(selector) {
    if (!selector || !selector.trim()) {
        alert('Please enter a valid CSS selector');
        return;
    }
    if (!currentDomain) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0] && tabs[0].url) {
                try {
                    var url = new URL(tabs[0].url);
                    currentDomain = url.hostname;
                    addManualElement(selector);
                } catch (e) {
                    alert('Cannot add element: Could not detect domain. Please make sure you are on a valid webpage.');
                }
            } else {
                alert('Cannot add element: No domain detected. Please make sure you are on a valid webpage.');
            }
        });
        return;
    }
    
    selector = selector.trim();
    
    chrome.storage.local.get(['selected_elements'], function(result) {
        if (chrome.runtime.lastError) {
            alert('Error loading elements: ' + chrome.runtime.lastError.message);
            return;
        }
        var siteElements = result.selected_elements || {};
        if (!siteElements[currentDomain]) {
            siteElements[currentDomain] = [];
        }
        if (siteElements[currentDomain].indexOf(selector) !== -1) {
            alert('This selector is already in the list');
            return;
        }
        
        siteElements[currentDomain].push(selector);
        chrome.storage.local.set({selected_elements: siteElements}, function() {
            if (chrome.runtime.lastError) {
                alert('Error adding element: ' + chrome.runtime.lastError.message);
                return;
            }
            $('#manual_selector_input').val('');
            loadSavedElements();
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (!tabs[0]) return;
                var url = tabs[0].url;
                if (!url) return;
                if (url.startsWith('chrome://') || url.startsWith('about:') || 
                    url.startsWith('chrome-extension://') || url.startsWith('moz-extension://')) {
                    return;
                }
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    chrome.tabs.sendMessage(tabs[0].id, {action: 'updateSelectedElements'}, function(response) {
                        if (chrome.runtime.lastError) {
                            //Ignore
                        }
                    });
                }
            });
        });
    });
}

//Save extension settings
function saveSettings() {
    var settings = {
        extension_enabled: $('#extension_enabled').is(':checked'),
        auto_decrypt: $('#auto_decrypt').is(':checked')
    };
    if (currentDomain) {
        chrome.storage.local.get(['decrypt_on_sites'], function(result) {
            var decryptOnSites = result.decrypt_on_sites || {};
            decryptOnSites[currentDomain] = $('#decrypt_on_current_site').is(':checked');
            settings.decrypt_on_sites = decryptOnSites;
            
            chrome.storage.local.set(settings);
        });
    } else {
        chrome.storage.local.set(settings);
    }
}

getCurrentDomain();

$(function() {
    $('#data_input').on('input', function() {
        updateCharCounter();
        $(this).removeClass('decoded');
    });
    setTimeout(function() {
        updateCharCounter();
    }, 100);
    chrome.storage.onChanged.addListener(function(changes, namespace) {
        if (namespace === 'local' && changes.public_key) {
            setTimeout(function() {
                updateCharCounter();
            }, 100);
        }
    });
});

$('.tab-button').click(function() {
    var tabId = $(this).data('tab');
    $('.tab-button').removeClass('active');
    $('.tab-content').removeClass('active');
    $(this).addClass('active');
    $('#' + tabId).addClass('active');
});

$('#extension_enabled, #auto_decrypt, #decrypt_on_current_site').change(function() {
    saveSettings();
});

$(document).on('click', '#add_manual_selector_btn', function(e) {
    e.preventDefault();
    e.stopPropagation();
    var selector = $('#manual_selector_input').val();
    if (!selector || !selector.trim()) {
        alert('Please enter a valid CSS selector');
        return;
    }
    addManualElement(selector);
});

$('#manual_selector_input').on('keypress', function(e) {
    if (e.which === 13) {
        e.preventDefault();
        var selector = $(this).val();
        if (!selector || !selector.trim()) {
            alert('Please enter a valid CSS selector');
            return;
        }
        addManualElement(selector);
    }
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'local' && changes.selected_elements) {
        loadSavedElements();
    }
});

$('#encode_btn').click(function() {
    var input = $('#data_input').val();
    if (!input) {
        alert('Please enter data to encode');
        return;
    }
    chrome.storage.local.get(['public_key'], function(result) {
        if (chrome.runtime.lastError) {
            alert('Error loading public key: ' + chrome.runtime.lastError.message);
            return;
        }
        var publicKey = result.public_key;
        if (!publicKey || publicKey.trim() === '') {
            alert('Error: Public key not found.\n\nPlease save your PUBLIC key in the Settings tab.\n\nRemember: Use PUBLIC key for encryption, PRIVATE key for decryption.');
            return;
        }
        publicKey = publicKey.trim();
        if (!publicKey.includes('-----BEGIN') || !publicKey.includes('-----END')) {
            alert('Error: Invalid public key format.\n\nThe key should start with "-----BEGIN PUBLIC KEY-----" or "-----BEGIN RSA PUBLIC KEY-----" and end with "-----END PUBLIC KEY-----" or "-----END RSA PUBLIC KEY-----".');
            return;
        }
        var hasPrivate = publicKey.includes('PRIVATE KEY');
        var hasPublic = publicKey.includes('PUBLIC KEY');
        if (hasPrivate && !hasPublic) {
            alert('Error: This appears to be a PRIVATE key, not a PUBLIC key.\n\nFor encryption, you need the PUBLIC key.\n\nPlease use the PUBLIC key from your key pair.');
            return;
        }
        var inputBytes = new TextEncoder().encode(input).length;
        var maxInfo = getMaxMessageLength(publicKey);
        if (maxInfo && inputBytes > maxInfo.maxBytes) {
            alert('Error: Message too long for RSA encryption.\n\n' +
                  'Message length: ' + inputBytes + ' bytes\n' +
                  'Maximum for ' + maxInfo.size + '-bit key: ~' + maxInfo.maxBytes + ' bytes\n\n' +
                  'RSA encryption limits (approximate):\n' +
                  '- 1024-bit key: ~117 bytes\n' +
                  '- 2048-bit key: ~245 bytes\n' +
                  '- 4096-bit key: ~501 bytes\n\n' +
                  'Solutions:\n' +
                  '1. Use a larger key size (4096 bits)\n' +
                  '2. Split the message into smaller parts\n' +
                  '3. Use hybrid encryption (RSA + AES)');
            return;
        }
        try {
            var crypt = new JSEncrypt();
            var setKeyResult = crypt.setPublicKey(publicKey);
            var encrypted = crypt.encrypt(input);
            if (encrypted && encrypted.length > 0) {
                $('#data_input').val(encrypted);
                $('#data_input').removeClass('decoded');
            } else {
                var inputBytes = new TextEncoder().encode(input).length;
                var maxLength = 245;
                var keySize = '2048-bit';
                if (publicKey.includes('MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A')) {
                    maxLength = 245;
                    keySize = '2048-bit';
                } else if (publicKey.length < 400) {
                    maxLength = 117;
                    keySize = '1024-bit';
                } else if (publicKey.length > 800) {
                    maxLength = 501;
                    keySize = '4096-bit';
                }
                var errorMsg = 'Error: Encryption failed.\n\n';
                errorMsg += 'Message length: ' + inputBytes + ' bytes\n';
                errorMsg += 'Estimated key size: ' + keySize + ' (max ~' + maxLength + ' bytes)\n\n';
                if (!setKeyResult) {
                    errorMsg += 'Note: JSEncrypt.setPublicKey() returned false.\n';
                    errorMsg += 'This may indicate a key format issue, but the key might still work.\n\n';
                }
                if (inputBytes > maxLength) {
                    errorMsg += 'The message is too long for your key size.\n\n';
                    errorMsg += 'RSA encryption limits (approximate):\n';
                    errorMsg += '- 1024-bit key: ~117 bytes\n';
                    errorMsg += '- 2048-bit key: ~245 bytes\n';
                    errorMsg += '- 4096-bit key: ~501 bytes\n\n';
                    errorMsg += 'Solutions:\n';
                    errorMsg += '1. Use a larger key size (4096 bits)\n';
                    errorMsg += '2. Split the message into smaller parts';
                } else {
                    errorMsg += 'Possible reasons:\n';
                    if (!setKeyResult) {
                        errorMsg += '1. Public key format may be incorrect\n';
                        errorMsg += '2. Key may be corrupted or incomplete\n';
                    } else {
                        errorMsg += '1. Key size estimation may be incorrect\n';
                    }
                    errorMsg += '2. Message may still be too long for the actual key size\n';
                    errorMsg += '3. Unknown encryption error\n\n';
                    errorMsg += 'Try:\n';
                    errorMsg += '- Verify the key is complete and correctly formatted\n';
                    errorMsg += '- Use a larger key size (4096 bits)\n';
                    errorMsg += '- Try with a shorter test message first';
                }
                alert(errorMsg);
            }
        } catch (e) {
            var errorMsg = e.message || 'Unknown error';
            if (errorMsg.includes('too long') || errorMsg.includes('Message too long')) {
                var inputLength = new TextEncoder().encode(input).length;
                alert('Error: Message too long for RSA encryption.\n\n' +
                      'Message length: ' + inputLength + ' bytes\n\n' +
                      'RSA encryption limits (approximate):\n' +
                      '- 1024-bit key: ~117 bytes\n' +
                      '- 2048-bit key: ~245 bytes\n' +
                      '- 4096-bit key: ~501 bytes\n\n' +
                      'Solutions:\n' +
                      '1. Use a larger key size (4096 bits)\n' +
                      '2. Split the message into smaller parts\n' +
                      '3. Use hybrid encryption (RSA + AES)');
            } else {
                alert('Error during encryption: ' + errorMsg + '\n\nPlease check that the public key is correctly formatted and complete.');
            }
        }
    });
});

$('#decode_btn').click(function() {
    var input = $('#data_input').val();
    if (!input || input.trim() === '') {
        alert('Please enter encrypted data to decode');
        return;
    }
    chrome.storage.local.get(['private_key'], function(result) {
        private_k = result.private_key;
        
        if (!private_k || private_k.trim() === '') {
            alert('Error: Private key not found. Please set your private key in settings.');
            return;
        }
        private_k = private_k.trim();
        if (!private_k.includes('-----BEGIN') || !private_k.includes('-----END')) {
            alert('Error: Invalid private key format.\n\nThe key should start with "-----BEGIN PRIVATE KEY-----" or "-----BEGIN RSA PRIVATE KEY-----" and end with "-----END PRIVATE KEY-----" or "-----END RSA PRIVATE KEY-----".');
            return;
        }
        
        try {
            var crypt = new JSEncrypt();
            var setKeyResult = crypt.setPrivateKey(private_k);
            var decrypted = crypt.decrypt(input);
            
            if (decrypted) {
                $('#data_input').val(decrypted);
                $('#data_input').addClass('decoded');
            } else {
                var errorMsg = 'Error: Decryption failed.';
                if (!setKeyResult) {
                    errorMsg += '\n\nJSEncrypt.setPrivateKey() returned false. The key may be:\n';
                    errorMsg += '- Incorrectly formatted\n';
                    errorMsg += '- Corrupted or incomplete\n';
                    errorMsg += '- Not a valid RSA private key';
                } else {
                    errorMsg += '\n\nPossible reasons:\n';
                    errorMsg += '1. The private key does not match the public key used for encryption\n';
                    errorMsg += '2. The encrypted data format is incorrect\n';
                    errorMsg += '3. The encrypted data is corrupted';
                }
                errorMsg += '\n\nPlease verify that you are using the correct private key for this encrypted data.';
                alert(errorMsg);
            }
        } catch (e) {
            alert('Error during decryption: ' + e.message + '\n\nPlease check:\n' +
                  '- Private key format is correct\n' +
                  '- Encrypted data is valid\n' +
                  '- Private key matches the public key used for encryption');
        }
    });
});

$('#data_input').on('input', function() {
    $(this).removeClass('decoded');
});

let isSelectionModeActive = false;

$('#start_selection_btn').click(function() {
    if (isSelectionModeActive) {
        stopSelectionMode();
    } else {
        startSelectionMode();
    }
});

function startSelectionMode() {
    isSelectionModeActive = true;
    $('#start_selection_btn').text('Stop Element Selection Mode');
    $('#start_selection_btn').css('background-color', 'rgba(255, 0, 0, 0.3)');
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (chrome.runtime.lastError) {
            var errorMsg = chrome.runtime.lastError.message || 'Unknown error';
            alert('Error: Could not access the current tab.\n\n' + errorMsg);
            stopSelectionMode();
            return;
        }
        if (!tabs[0]) {
            alert('Error: No active tab found.');
            stopSelectionMode();
            return;
        }
        var url = tabs[0].url;
        if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:') || url.startsWith('moz-extension://') || url.startsWith('edge://')) {
            alert('Error: Selection mode is not available on this page.\n\nPlease open a regular website (http:// or https://).');
            stopSelectionMode();
            return;
        }
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            alert('Error: Selection mode is only available on HTTP/HTTPS pages.\n\nCurrent URL: ' + url);
            stopSelectionMode();
            return;
        }
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['content/content.js']
        }, function() {
            if (chrome.runtime.lastError) {
                //Ignore
            }
            setTimeout(function() {
                chrome.tabs.sendMessage(tabs[0].id, {action: 'startSelectionMode'}, function(response) {
                    if (chrome.runtime.lastError) {
                        var errorMsg = chrome.runtime.lastError.message || 'Unknown error';
                        var userMessage = 'Error: Could not start selection mode.\n\n';
                        if (errorMsg.includes('Receiving end does not exist') || errorMsg.includes('Could not establish connection')) {
                            userMessage += 'The content script could not be loaded on this page.\n\n';
                            userMessage += 'Possible reasons:\n';
                            userMessage += '1. The page is still loading\n';
                            userMessage += '2. The page blocks content scripts\n';
                            userMessage += '3. Extension permissions issue\n\n';
                            userMessage += 'Please try:\n';
                            userMessage += '1. Refresh the page and try again\n';
                            userMessage += '2. Make sure you are on a regular website (http:// or https://)\n';
                            userMessage += '3. Check if the page has finished loading';
                        } else {
                            userMessage += 'Reason: ' + errorMsg;
                        }
                        alert(userMessage);
                        stopSelectionMode();
                    }
                });
            }, 200);
        });
    });
}

function stopSelectionMode() {
    isSelectionModeActive = false;
    $('#start_selection_btn').text('Activate Element Selection Mode');
    $('#start_selection_btn').css('background-color', '');
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (!tabs[0]) {
            return;
        }
        var url = tabs[0].url;
        if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:') || url.startsWith('moz-extension://')) {
            return;
        }
        chrome.tabs.sendMessage(tabs[0].id, {action: 'stopSelectionMode'}, function(response) {
            if (chrome.runtime.lastError) {
                //Ignore
            }
        });
    });
}

chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (!tabs[0]) {
        return;
    }
    
    var url = tabs[0].url;
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:') || url.startsWith('moz-extension://')) {
        return;
    }
    
    chrome.tabs.sendMessage(tabs[0].id, {action: 'getSelectionModeStatus'}, function(response) {
        if (chrome.runtime.lastError) {
            return;
        }
        if (response && response.isActive) {
            isSelectionModeActive = true;
            $('#start_selection_btn').text('Stop Element Selection Mode');
            $('#start_selection_btn').css('background-color', 'rgba(255, 0, 0, 0.3)');
        }
    });
});