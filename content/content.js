// Content script for automatic decryption on page

(function() {
    'use strict';
    
    let isSelectionMode = false;
    let selectedElements = new Set();
    let privateKey = null;
    let autoDecryptEnabled = false;
    let decryptOnCurrentSite = false;
    let currentSite = null;
    
    //Load settings and keys
    function loadSettings() {
        chrome.storage.local.get(['private_key', 'auto_decrypt', 'decrypt_on_sites', 'selected_elements'], function(result) {
            privateKey = result.private_key || null;
            autoDecryptEnabled = result.auto_decrypt === true;
            
            currentSite = window.location.hostname;
            const decryptOnSites = result.decrypt_on_sites || {};
            decryptOnCurrentSite = decryptOnSites[currentSite] === true;
            const siteElements = result.selected_elements || {};
            if (siteElements[currentSite]) {
                selectedElements = new Set(siteElements[currentSite]);
            }
            if (autoDecryptEnabled && decryptOnCurrentSite && privateKey && selectedElements.size > 0) {
                startAutoDecrypt();
            }
        });
    }
    
    //Listen for storage changes
    chrome.storage.onChanged.addListener(function(changes, namespace) {
        if (namespace === 'local') {
            if (changes.auto_decrypt) {
                autoDecryptEnabled = changes.auto_decrypt.newValue === true;
            }
            if (changes.decrypt_on_sites) {
                const decryptOnSites = changes.decrypt_on_sites.newValue || {};
                decryptOnCurrentSite = decryptOnSites[currentSite] === true;
            }
            if (changes.private_key) {
                privateKey = changes.private_key.newValue || null;
            }
            if (changes.selected_elements) {
                const siteElements = changes.selected_elements.newValue || {};
                if (siteElements[currentSite]) {
                    selectedElements = new Set(siteElements[currentSite]);
                } else {
                    selectedElements.clear();
                }
            }
            
            if (autoDecryptEnabled && decryptOnCurrentSite && privateKey && selectedElements.size > 0) {
                startAutoDecrypt();
            } else {
                stopAutoDecrypt();
            }
        }
    });
    
    //Listen for messages from popup
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === 'startSelectionMode') {
            startSelectionMode();
            sendResponse({success: true});
        } else if (request.action === 'stopSelectionMode') {
            stopSelectionMode();
            sendResponse({success: true});
        } else if (request.action === 'getSelectionModeStatus') {
            sendResponse({isActive: isSelectionMode});
        } else if (request.action === 'updateSelectedElements') {
            chrome.storage.local.get(['selected_elements'], function(result) {
                const siteElements = result.selected_elements || {};
                if (siteElements[currentSite]) {
                    selectedElements = new Set(siteElements[currentSite]);
                } else {
                    selectedElements = new Set();
                }
            });
            sendResponse({success: true});
        }
        return true;
    });
    
    //Handle ESC key to exit selection mode
    function handleKeyDown(e) {
        if (isSelectionMode && (e.key === 'Escape' || e.keyCode === 27)) {
            e.preventDefault();
            e.stopPropagation();
            stopSelectionMode();
        }
    }
    
    //Start selection mode
    function startSelectionMode() {
        isSelectionMode = true;
        document.body.style.cursor = 'crosshair';
        const notification = document.createElement('div');
        notification.id = 'rsa-selection-notification';
        notification.style.cssText = 'position:fixed;top:10px;right:10px;background:#4CAF50;color:#fff;padding:12px 18px;border-radius:6px;z-index:1000000;font-family:Roboto,Tahoma,Arial,Verdana,sans-serif;font-size:13px;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:none;max-width:300px;';
        document.body.appendChild(notification);
        document.addEventListener('click', handleElementClick, true);
        document.addEventListener('mouseover', handleElementHover, true);
        document.addEventListener('mouseout', handleElementHoverOut, true);
        document.addEventListener('keydown', handleKeyDown, true);
    }
    
    //Stop selection mode
    function stopSelectionMode() {
        isSelectionMode = false;
        document.body.style.cursor = '';
        const notification = document.getElementById('rsa-selection-notification');
        if (notification) {
            notification.remove();
        }
        document.removeEventListener('click', handleElementClick, true);
        document.removeEventListener('mouseover', handleElementHover, true);
        document.removeEventListener('mouseout', handleElementHoverOut, true);
        document.removeEventListener('keydown', handleKeyDown, true);
        document.querySelectorAll('.rsa-selection-hover').forEach(el => {
            el.classList.remove('rsa-selection-hover');
            const label = el.querySelector('.rsa-element-label');
            if (label) {
                label.remove();
            }
            if (el.dataset.rsaOriginalPosition === 'static') {
                el.style.position = '';
                delete el.dataset.rsaOriginalPosition;
            }
        });
    }
    
    //Show notification
    function showNotification(message, type) {
        const notification = document.getElementById('rsa-selection-notification');
        if (!notification) return;
        
        notification.textContent = message;
        notification.style.backgroundColor = type === 'success' ? '#4CAF50' : '#f44336';
        notification.style.display = 'block';
        setTimeout(function() {
            notification.style.display = 'none';
        }, 3000);
    }
    
    //Handle element click in selection mode
    function handleElementClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const element = e.target;
        const selector = getElementSelector(element);
        const elementName = getElementName(element);
        const elementInfo = getElementInfo(element);
        
        if (selectedElements.has(selector)) {
            selectedElements.delete(selector);
            element.classList.remove('rsa-selected');
            showNotification('Element removed: ' + elementName, 'success');
        } else {
            selectedElements.add(selector);
            element.classList.add('rsa-selected');
            const computedStyle = window.getComputedStyle(element);
            if (computedStyle.position === 'static') {
                element.style.position = 'relative';
                element.dataset.rsaOriginalPosition = 'static';
            }
            element.style.zIndex = '999998';
            const existingLabel = element.querySelector('.rsa-element-label');
            if (existingLabel) {
                existingLabel.remove();
            }
            const label = document.createElement('div');
            label.className = 'rsa-element-label';
            label.textContent = elementInfo;
            label.style.cssText = 'position:absolute;top:4px;left:4px;background-color:#8DCAFE;color:#000;padding:6px 10px;border-radius:4px;font-size:10px;font-weight:500;font-family:Roboto,Tahoma,Arial,Verdana,sans-serif;z-index:999999;pointer-events:none;white-space:normal;box-shadow:0 2px 4px rgba(0,0,0,0.2);max-width:300px;line-height:1.4;word-wrap:break-word;';
            element.appendChild(label);
            showNotification('✓ Element added: ' + elementName, 'success');
            setTimeout(function() {
                if (!privateKey) {
                    showNotification('⚠ Private key not found. Please set your private key in settings.', 'error');
                    return;
                }
                const encryptedText = extractEncryptedText(element);
                if (!encryptedText) {
                    return;
                }
                if (!window.JSEncrypt) {
                    loadJSEncrypt(function() {
                        const result = processElementText(element);
                        if (result === false) {
                            showNotification('⚠ Decryption failed for this element. Check your private key or encrypted data.', 'error');
                        }
                    });
                } else {
                    const result = processElementText(element);
                    if (result === false) {
                        showNotification('⚠ Decryption failed for this element. Check your private key or encrypted data.', 'error');
                    }
                }
            }, 500);
        }
        saveSelectedElements();
    }
    
    //Get element info for display
    function getElementInfo(element) {
        if (!element) return '';
        var info = [];
        info.push('Tag: ' + element.tagName.toLowerCase());
        if (element.id) {
            info.push('ID: #' + element.id);
        }
        if (element.className && typeof element.className === 'string') {
            const classes = element.className.toString().trim().split(/\s+/)
                .filter(c => c && !c.includes('rsa-') && !c.includes('@') && !c.includes(':') && c.length < 50);
            if (classes.length > 0) {
                info.push('Classes: ' + classes.slice(0, 3).join(', ') + (classes.length > 3 ? '...' : ''));
            }
        }
        const text = element.textContent || element.innerText || '';
        if (text.trim()) {
            const preview = text.trim().substring(0, 30).replace(/\s+/g, ' ');
            info.push('Text: "' + preview + (text.trim().length > 30 ? '...' : '') + '"');
        }
        return info.join(' | ');
    }
    
    //Get element name (short version)
    function getElementName(element) {
        if (!element) return '';
        var name = '';
        if (element.id) {
            name = '#' + element.id;
        } else {
            name = element.tagName.toLowerCase();
            if (element.className && typeof element.className === 'string') {
                const classes = element.className.toString().trim().split(/\s+/).filter(c => c && !c.includes('rsa-'));
                if (classes.length > 0) {
                    name += '.' + classes[0];
                }
            }
        }
        
        return name;
    }
     
    //Handle element hover in selection mode
    function handleElementHover(e) {
        if (isSelectionMode) {
            const element = e.target;
            element.classList.add('rsa-selection-hover');
            const computedStyle = window.getComputedStyle(element);
            if (computedStyle.position === 'static') {
                element.style.position = 'relative';
                element.dataset.rsaOriginalPosition = 'static';
            }
            element.style.zIndex = '999998';
            const existingLabel = element.querySelector('.rsa-element-label');
            if (existingLabel) {
                existingLabel.remove();
            }
            const label = document.createElement('div');
            label.className = 'rsa-element-label';
            label.textContent = getElementInfo(element);
            label.style.cssText = 'position:absolute;top:4px;left:4px;background-color:#8DCAFE;color:#000;padding:6px 10px;border-radius:4px;font-size:10px;font-weight:500;font-family:Roboto,Tahoma,Arial,Verdana,sans-serif;z-index:999999;pointer-events:none;white-space:normal;box-shadow:0 2px 4px rgba(0,0,0,0.2);max-width:300px;line-height:1.4;';
            element.appendChild(label);
        }
    }
    
    //Handle element hover out in selection mode
    function handleElementHoverOut(e) {
        if (isSelectionMode) {
            const element = e.target;
            element.classList.remove('rsa-selection-hover');
            const label = element.querySelector('.rsa-element-label');
            if (label) {
                label.remove();
            }
            if (!element.classList.contains('rsa-selected')) {
                if (element.dataset.rsaOriginalPosition === 'static') {
                    element.style.position = '';
                    delete element.dataset.rsaOriginalPosition;
                }
                if (element.dataset.rsaOriginalZIndex !== undefined) {
                    element.style.zIndex = element.dataset.rsaOriginalZIndex;
                    delete element.dataset.rsaOriginalZIndex;
                } else {
                    element.style.zIndex = '';
                }
            }
        }
    }
    
    //Escape CSS identifier if needed
    function escapeCSSIdentifier(identifier) {
        if (/^\d/.test(identifier)) {
            return '\\' + identifier.charCodeAt(0).toString(16) + ' ' + identifier.slice(1);
        }
        return identifier;
    }
    
    //Get unique selector for element
    function getElementSelector(element) {
        if (element.id) {
            const idSelector = '#' + escapeCSSIdentifier(element.id);
            try {
                document.querySelectorAll(idSelector);
                return idSelector;
            } catch (e) {
                try {
                    document.querySelectorAll('#' + element.id);
                    return '#' + element.id;
                } catch (e2) {
                    //Fall through to path-based selector
                }
            }
        }
        let current = element;
        let path = [];
        let depth = 0;
        const maxDepth = 8;
        while (current && current.nodeType === Node.ELEMENT_NODE && depth < maxDepth) {
            if (current.id) {
                if (depth === 0) {
                    return '#' + current.id;
                }
                path.unshift('#' + current.id);
                break;
            }
            let selector = current.nodeName.toLowerCase();
            if (current.className && typeof current.className === 'string') {
                const classes = current.className.toString().trim().split(/\s+/)
                    .filter(c => {
                        return c && 
                               !c.includes('rsa-') && 
                               !c.includes('@') && 
                               !c.includes(':') &&
                               !c.includes('[') &&
                               !c.includes(']') &&
                               c.length < 50;
                    });
                if (classes.length > 0) {
                    const limitedClasses = classes.slice(0, 3);
                    selector += '.' + limitedClasses.join('.');
                }
            }
            path.unshift(selector);
            current = current.parentNode;
            depth++;
        }
        const result = path.join(' > ');
        if (result.length > 500) {
            if (element.parentElement) {
                const parentSelector = element.parentElement.id ? '#' + element.parentElement.id : element.parentElement.tagName.toLowerCase();
                const siblings = Array.from(element.parentElement.children);
                const index = siblings.indexOf(element);
                if (index >= 0) {
                    return parentSelector + ' > ' + element.tagName.toLowerCase() + ':nth-child(' + (index + 1) + ')';
                }
            }
            const allSameTag = document.querySelectorAll(element.tagName.toLowerCase());
            const index = Array.from(allSameTag).indexOf(element);
            if (index >= 0) {
                return element.tagName.toLowerCase() + ':nth-of-type(' + (index + 1) + ')';
            }
        }
        return result;
    }
    
    //Save selected elements
    function saveSelectedElements() {
        chrome.storage.local.get(['selected_elements'], function(result) {
            const siteElements = result.selected_elements || {};
            siteElements[currentSite] = Array.from(selectedElements);
            chrome.storage.local.set({selected_elements: siteElements});
        });
    }
    
    //Load JSEncrypt library
    let jsEncryptLoading = false;
    let jsEncryptLoadCallbacks = [];
    
    function loadJSEncrypt(callback) {
        if (window.JSEncrypt) {
            if (callback) callback();
            return;
        }
        
        if (jsEncryptLoading) {
            if (callback) {
                jsEncryptLoadCallbacks.push(callback);
            }
            return;
        }
        
        jsEncryptLoading = true;
        
        try {
            if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.getURL) {
                jsEncryptLoading = false;
                if (callback) callback();
                return;
            }
            
            const scriptUrl = chrome.runtime.getURL('lib/jsencrypt.min.js');
            const script = document.createElement('script');
            script.src = scriptUrl;
            script.async = false;
            script.type = 'text/javascript';
            
            const cleanup = function() {
                jsEncryptLoading = false;
                jsEncryptLoadCallbacks = [];
            };
            
            const executeCallbacks = function() {
                cleanup();
                jsEncryptLoadCallbacks.forEach(cb => {
                    try { cb(); } catch (e) {}
                });
                if (callback) {
                    try { callback(); } catch (e) {}
                }
            };
            
            script.onload = function() {
                let attempts = 0;
                const maxAttempts = 100;
                const check = function() {
                    if (window.JSEncrypt) {
                        executeCallbacks();
                    } else if (attempts < maxAttempts) {
                        attempts++;
                        setTimeout(check, 10);
                    } else {
                        fetch(scriptUrl)
                            .then(response => response.text())
                            .then(code => {
                                try {
                                    eval(code);
                                    if (window.JSEncrypt) {
                                        executeCallbacks();
                                    } else {
                                        cleanup();
                                        if (callback) {
                                            try { callback(); } catch (e) {}
                                        }
                                    }
                                } catch (e) {
                                    cleanup();
                                    if (callback) {
                                        try { callback(); } catch (e) {}
                                    }
                                }
                            })
                            .catch(() => {
                                cleanup();
                                if (callback) {
                                    try { callback(); } catch (e) {}
                                }
                            });
                    }
                };
                setTimeout(check, 10);
            };
            
            script.onerror = function() {
                cleanup();
                if (callback) {
                    try { callback(); } catch (e) {}
                }
            };
            
            (document.head || document.documentElement).appendChild(script);
        } catch (e) {
            jsEncryptLoading = false;
            jsEncryptLoadCallbacks = [];
            if (callback) {
                try { callback(); } catch (e2) {}
            }
        }
    }
    
    //Decrypt text synchronously
    function decryptTextSync(encryptedText) {
        if (!privateKey || !window.JSEncrypt) return null;
        
        try {
            const crypt = new window.JSEncrypt();
            crypt.setPrivateKey(privateKey);
            return crypt.decrypt(encryptedText);
        } catch (e) {
            return null;
        }
    }
    
    //Get clean text content from element
    function getCleanTextContent(element) {
        if (!element) return '';
        const clone = element.cloneNode(true);
        clone.querySelectorAll('.rsa-element-label, .rsa-dec-tag, [data-rsa-processed]').forEach(el => el.remove());
        let text = clone.textContent || clone.innerText || '';
        text = text.replace(/\s+/g, ' ').trim();
        return text;
    }
    
    //Extract encrypted text from element
    function extractEncryptedText(element) {
        if (!element) return null;
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    let parent = node.parentElement;
                    while (parent && parent !== element) {
                        if (parent.classList.contains('rsa-element-label') || 
                            parent.classList.contains('rsa-dec-tag') ||
                            parent.dataset.rsaProcessed === 'true') {
                            return NodeFilter.FILTER_REJECT;
                        }
                        parent = parent.parentElement;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            },
            false
        );
        let textNode;
        while (textNode = walker.nextNode()) {
            const nodeText = textNode.textContent.trim();
            if (nodeText && isEncryptedText(nodeText)) {
                return nodeText.replace(/\s+/g, '');
            }
        }
        let text = getCleanTextContent(element);
        if (text && isEncryptedText(text)) {
            return text.replace(/\s+/g, '');
        }
        const innerText = element.innerText || '';
        if (innerText && isEncryptedText(innerText)) {
            return innerText.replace(/\s+/g, '');
        }
        const textContent = element.textContent || '';
        if (textContent && isEncryptedText(textContent)) {
            return textContent.replace(/\s+/g, '');
        }
        return null;
    }
    
    //Check if text looks like encrypted data
    function isEncryptedText(text) {
        if (!text || typeof text !== 'string') return false;
        const cleanText = text.replace(/\s+/g, '');
        if (cleanText.length < 20) return false;
        if (text.includes('-----BEGIN') || text.includes('-----END')) {
            return true;
        }
        const base64Pattern = /^[A-Za-z0-9+\/]+=*$/;
        const validBase64Chars = cleanText.match(/[A-Za-z0-9+\/=]/g);
        if (validBase64Chars && validBase64Chars.length / cleanText.length > 0.8) {
            if (cleanText.length >= 50 && (cleanText.endsWith('=') || cleanText.endsWith('==') || !cleanText.includes('='))) {
                return true;
            }
        }
        if (base64Pattern.test(cleanText) && cleanText.length >= 50) {
            return true;
        }
        return false;
    }
    
    //Process element text - returns true if success, false if failed, null if no encrypted text
    function processElementText(element) {
        if (!element) {
            return null;
        }
        try {
            if (!element.parentNode && element !== document.body && element !== document.documentElement) {
                return null;
            }
        } catch (e) {
            return null;
        }
        if (!element.dataset) {
            return null;
        }
        if (element.dataset.rsaProcessed === 'true') {
            return true;
        }
        if (element.dataset.rsaProcessing === 'true') {
            return false;
        }
        if (!window.JSEncrypt) {
            if (element.dataset.rsaProcessing === 'true') {
                return false;
            }
            try {
                element.dataset.rsaProcessing = 'true';
            } catch (e) {
                return false;
            }
            loadJSEncrypt(function() {
                try {
                    if (!element) {
                        return;
                    }
                    try {
                        const isConnected = element.parentNode || element === document.body || element === document.documentElement;
                        if (!isConnected) {
                            return;
                        }
                    } catch (e) {
                        return;
                    }
                    if (window.JSEncrypt) {
                        try {
                            if (element.dataset) {
                                delete element.dataset.rsaProcessing;
                            }
                        } catch (e) {
                            //Ignore
                        }
                        setTimeout(function() {
                            try {
                                if (!element) {
                                    return;
                                }
                                try {
                                    const isConnected = element.parentNode || element === document.body || element === document.documentElement;
                                    if (!isConnected) {
                                        return;
                                    }
                                } catch (e) {
                                    return;
                                }
                                if (element.dataset && element.dataset.rsaProcessed !== 'true' && element.dataset.rsaProcessing !== 'true') {
                                    processElementText(element);
                                }
                            } catch (e) {
                                //Ignore
                            }
                        }, 100);
                    } else {
                        try {
                            if (element.dataset) {
                                delete element.dataset.rsaProcessing;
                            }
                        } catch (e) {
                            //Ignore
                        }
                    }
                } catch (e) {
                    if (e.message && e.message.includes('Extension context invalidated')) {
                        try {
                            if (element && element.dataset) {
                                delete element.dataset.rsaProcessing;
                            }
                        } catch (e2) {
                            //Ignore
                        }
                        return;
                    }
                    try {
                        if (element && element.dataset) {
                            delete element.dataset.rsaProcessing;
                        }
                    } catch (e2) {
                        //Ignore
                    }
                }
            });
            return false;
        }
        element.dataset.rsaProcessing = 'true';
        const encryptedText = extractEncryptedText(element);
        if (!encryptedText) {
            delete element.dataset.rsaProcessing;
            return null;
        }
        const decrypted = decryptTextSync(encryptedText);
        if (!decrypted) {
            delete element.dataset.rsaProcessing;
            return false;
        }
        delete element.dataset.rsaProcessing;
        element.dataset.rsaProcessed = 'true';
        element.dataset.rsaOriginalText = encryptedText;
        const labels = Array.from(element.querySelectorAll('.rsa-element-label'));
        const decLabel = document.createElement('span');
        decLabel.className = 'rsa-dec-tag';
        decLabel.textContent = 'dec';
        decLabel.style.cssText = 'background-color: yellow; color: #000; padding: 2px 4px; margin-right: 4px; border-radius: 2px; font-size: 0.8em; font-weight: bold; display: inline-block;';
        const computedStyle = window.getComputedStyle(element);
        const styleProps = ['color', 'fontSize', 'fontFamily', 'fontWeight', 'fontStyle', 'textDecoration', 'lineHeight'];
        const preservedStyles = {};
        styleProps.forEach(prop => {
            preservedStyles[prop] = computedStyle[prop];
        });
        const wrapper = document.createElement('span');
        styleProps.forEach(prop => {
            wrapper.style[prop] = preservedStyles[prop];
        });
        wrapper.appendChild(decLabel);
        wrapper.appendChild(document.createTextNode(decrypted));
        element.innerHTML = '';
        labels.forEach(label => element.appendChild(label));
        element.appendChild(wrapper);
    }
    
    //Start auto-decrypt
    let mutationObserver = null;
    
    function startAutoDecrypt() {
        if (!privateKey || selectedElements.size === 0) {
            return;
        }
        
        loadJSEncrypt(function() {
            processSelectedElements();
            
            if (!mutationObserver) {
                mutationObserver = new MutationObserver(function(mutations) {
                    processSelectedElements();
                });
                
                mutationObserver.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            }
        });
    }
    
    //Stop auto-decrypt
    function stopAutoDecrypt() {
        if (mutationObserver) {
            mutationObserver.disconnect();
            mutationObserver = null;
        }
        document.querySelectorAll('[data-rsa-processed="true"]').forEach(element => {
            const originalText = element.dataset.rsaOriginalText;
            if (originalText) {
                element.textContent = originalText;
                delete element.dataset.rsaProcessed;
                delete element.dataset.rsaOriginalText;
            }
        });
    }
    
    //Validate CSS selector syntax
    function isValidSelector(selector) {
        if (!selector || typeof selector !== 'string' || selector.trim() === '') {
            return false;
        }
        if (selector.includes('@')) {
            return false;
        }
        try {
            const test = document.querySelectorAll(selector);
            return true;
        } catch (e) {
            if (e instanceof SyntaxError || e instanceof DOMException) {
                return false;
            }
            return true;
        }
    }
    
    //Process all selected elements
    function processSelectedElements() {
        if (selectedElements.size === 0) {
            return;
        }
        
        selectedElements.forEach(selector => {
            if (!selector || typeof selector !== 'string') {
                return;
            }
            
            let elements = null;
            const idMatch = selector.match(/#([\w-]+)/);
            const parts = selector.split(' > ');
            const lastPart = parts[parts.length - 1] || '';
            const tagMatch = lastPart.match(/^(\w+)/);
            const tagName = tagMatch ? tagMatch[1] : null;
            if (idMatch && tagName) {
                try {
                    const idElement = document.querySelector('#' + idMatch[1]);
                    if (idElement) {
                        elements = idElement.querySelectorAll(tagName);
                        if (elements.length > 0) {
                            elements.forEach(element => {
                                try {
                                    processElementText(element);
                                } catch (e) {
                                    //Ignore
                                }
                            });
                            return;
                        }
                    }
                } catch (e) {
                    //Continue to next strategy
                }
            }
            if (!selector.includes('[') && !selector.includes(']')) {
                try {
                    elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        elements.forEach(element => {
                            try {
                                processElementText(element);
                            } catch (e) {
                                //Ignore
                            }
                        });
                        return;
                    }
                } catch (e) {
                    //Continue to next strategy
                }
            }
            if (idMatch && tagName) {
                try {
                    const idElement = document.querySelector('#' + idMatch[1]);
                    if (idElement) {
                        const allTags = idElement.getElementsByTagName(tagName);
                        if (allTags.length > 0) {
                            Array.from(allTags).forEach(element => {
                                try {
                                    processElementText(element);
                                } catch (e) {
                                    //Ignore
                                }
                            });
                        }
                    }
                } catch (e) {
                    //Ignore
                }
            }
        });
    }
    
    //Add CSS for selection mode
    const style = document.createElement('style');
    style.textContent = `
        .rsa-selection-hover {
            outline: 2px solid #8DCAFE !important;
            outline-offset: 2px !important;
            cursor: pointer !important;
            background-color: rgba(141, 202, 254, 0.2) !important;
            position: relative !important;
            z-index: 999998 !important;
            isolation: isolate !important;
        }
        .rsa-selected {
            outline: 2px solid #8DCAFE !important;
            outline-offset: 2px !important;
            background-color: rgba(141, 202, 254, 0.15) !important;
            position: relative !important;
            z-index: 999998 !important;
            isolation: isolate !important;
        }
        .rsa-element-label {
            position: absolute !important;
            top: 4px !important;
            left: 4px !important;
            background-color: #8DCAFE !important;
            color: #000 !important;
            padding: 6px 10px !important;
            border-radius: 4px !important;
            font-size: 10px !important;
            font-weight: 500 !important;
            font-family: Roboto, Tahoma, Arial, Verdana, sans-serif !important;
            z-index: 999999 !important;
            pointer-events: none !important;
            white-space: normal !important;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
            max-width: 300px !important;
            line-height: 1.4 !important;
            word-wrap: break-word !important;
        }
    `;
    document.head.appendChild(style);
    
    //Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            loadSettings();
            setTimeout(function() {
                if (autoDecryptEnabled && decryptOnCurrentSite && privateKey && selectedElements.size > 0) {
                    startAutoDecrypt();
                }
            }, 1000);
        });
    } else {
        loadSettings();
        setTimeout(function() {
            if (autoDecryptEnabled && decryptOnCurrentSite && privateKey && selectedElements.size > 0) {
                startAutoDecrypt();
            }
        }, 1000);
    }
})();

