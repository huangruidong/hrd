//  Version 1.0
//  Update time 17-09-21
var userAgent = navigator.userAgent || navigator.vendor || window.opera;

function setupWebViewJavascriptBridge(callback) {
    if (window.WebViewJavascriptBridge) { return callback(WebViewJavascriptBridge); }
    if (window.WVJBCallbacks) { return window.WVJBCallbacks.push(callback); }
    window.WVJBCallbacks = [callback];
    var WVJBIframe = document.createElement('iframe');
    WVJBIframe.style.display = 'none';
    WVJBIframe.src = 'https://__bridge_loaded__';
    document.documentElement.appendChild(WVJBIframe);
    setTimeout(function () { document.documentElement.removeChild(WVJBIframe) }, 0)
}

function connectWebViewJavascriptBridge(callback) {
    if (window.WebViewJavascriptBridge) {
        callback(WebViewJavascriptBridge)
    } else {
        document.addEventListener('WebViewJavascriptBridgeReady', function () { callback(WebViewJavascriptBridge) }, false);
    }
}

if (userAgent.match(/iPad/i) || userAgent.match(/iPhone/i) || userAgent.match(/iPod/i)) {
    connectWebViewJavascriptBridge(function (bridge) {
        window.nativeContext = bridge;
        window.nativeContext.init(function (data, responseCallback) {
            responseCallback(data);
        });
    });

    initializeEverything();
} else if (userAgent.match(/Android/i)) {
    connectWebViewJavascriptBridge(function (bridge) {
        window.nativeContext = bridge;
        windownativeContext.init(function (data, responseCallback) {
            responseCallback(data);
        });
    });

}

if (window.nativeContext == undefined) {
    window.nativeContext = new Object();
    window.nativeContext.callHandler = function (method, data, callback) {
        console.log('JSBridge method call ' + method + ' call received');
    }
}

function JSPush(url, callback) {
    window.nativeContext.callHandler('push', url, callback);
}

function JSPresent(url, callback) {
    window.nativeContext.callHandler('present', url, callback);
}

function JSPop(result, callback) {
    window.nativeContext.callHandler('pop', result, callback);
}

function JSClose(result, callback) {
    window.nativeContext.callHandler('close', result, callback);
}

function JSPopToHome(result, callback) {
    window.nativeContext.callHandler('popToHome', result, callback);
}

function JSAlert(title, callback) {
    window.nativeContext.callHandler('alert', title, callback);
}

function JSShowLoading(result, callback) {
    window.nativeContext.callHandler('showLoading', result, callback);
}

function JSHideLoading(result, callback) {
    window.nativeContext.callHandler('hideLoading', result, callback);
}

function JSReloadWebView(url, callback) {
    window.nativeContext.callHandler('reload', url, callback);
}

function JSUpdateTitle(title, callback) {
    window.nativeContext.callHandler('updateTitle', title, callback);
}

function JSSetLeftActionButton(title, callback) {
    window.nativeContext.callHandler('setLeftActionButton', title, callback);
}

function JSSetRightActionButton(title, callback) {
    window.nativeContext.callHandler('setRightActionButton', title, callback);
}

function JSLoggedIn(callback) {
    window.nativeContext.callHandler('loggedIn', {}, callback);
}

function JSLoggedOut(callback) {
    window.nativeContext.callHandler('loggedOut', {}, callback);
}

function JSGoBack(callback) {
    window.nativeContext.callHandler('goback', {}, callback);
}

function JSScanFace(callback) {
    window.nativeContext.callHandler('scanFace', {}, callback);
}

function JSScanCard(callback) {
    window.nativeContext.callHandler('scanCard', {}, callback);
}

function JSUploadFaceCardInfo(callback) {
    window.nativeContext.callHandler('uploadFaceCardInfo', {}, callback);
}

function initializeEverything() {
    if (window.WebViewJavascriptBridge) { return }
    var messagingIframe
    var sendMessageQueue = []
    var receiveMessageQueue = []
    var messageHandlers = {}

    var CUSTOM_PROTOCOL_SCHEME = 'wvjbscheme'
    var QUEUE_HAS_MESSAGE = '__WVJB_QUEUE_MESSAGE__'

    var responseCallbacks = {}
    var uniqueId = 1

    function _createQueueReadyIframe(doc) {
        messagingIframe = doc.createElement('iframe')
        messagingIframe.style.display = 'none'
        messagingIframe.src = CUSTOM_PROTOCOL_SCHEME + '://' + QUEUE_HAS_MESSAGE
        doc.documentElement.appendChild(messagingIframe)
    }

    function init(messageHandler) {
        if (WebViewJavascriptBridge._messageHandler) { throw new Error('WebViewJavascriptBridge.init called twice') }
        WebViewJavascriptBridge._messageHandler = messageHandler
        var receivedMessages = receiveMessageQueue
        receiveMessageQueue = null
        for (var i = 0; i < receivedMessages.length; i++) {
            _dispatchMessageFromObjC(receivedMessages[i])
        }
    }

    function send(data, responseCallback) {
        _doSend({ data: data }, responseCallback)
    }

    function registerHandler(handlerName, handler) {
        messageHandlers[handlerName] = handler
    }

    function callHandler(handlerName, data, responseCallback) {
        _doSend({ handlerName: handlerName, data: data }, responseCallback)
    }

    function _doSend(message, responseCallback) {
        if (responseCallback) {
            var callbackId = 'cb_' + (uniqueId++) + '_' + new Date().getTime()
            responseCallbacks[callbackId] = responseCallback
            message['callbackId'] = callbackId
        }
        sendMessageQueue.push(message)
        messagingIframe.src = CUSTOM_PROTOCOL_SCHEME + '://' + QUEUE_HAS_MESSAGE
    }

    function _fetchQueue() {
        var messageQueueString = JSON.stringify(sendMessageQueue)
        sendMessageQueue = []
        return messageQueueString
    }

    function _dispatchMessageFromObjC(messageJSON) {
        setTimeout(function _timeoutDispatchMessageFromObjC() {
            var message = JSON.parse(messageJSON)
            var messageHandler
            var responseCallback

            if (message.responseId) {
                responseCallback = responseCallbacks[message.responseId]
                if (!responseCallback) { return; }
                responseCallback(message.responseData)
                delete responseCallbacks[message.responseId]
            } else {
                if (message.callbackId) {
                    var callbackResponseId = message.callbackId
                    responseCallback = function (responseData) {
                        _doSend({ responseId: callbackResponseId, responseData: responseData })
                    }
                }

                var handler = WebViewJavascriptBridge._messageHandler
                if (message.handlerName) {
                    handler = messageHandlers[message.handlerName]
                }

                try {
                    handler(message.data, responseCallback)
                } catch (exception) {
                    if (typeof console != 'undefined') {
                        console.log("WebViewJavascriptBridge: WARNING: javascript handler threw.", message, exception)
                    }
                }
            }
        })
    }

    function _handleMessageFromObjC(messageJSON) {
        if (receiveMessageQueue) {
            receiveMessageQueue.push(messageJSON)
        } else {
            _dispatchMessageFromObjC(messageJSON)
        }
    }

    window.WebViewJavascriptBridge = {
        init: init,
        send: send,
        registerHandler: registerHandler,
        callHandler: callHandler,
        _fetchQueue: _fetchQueue,
        _handleMessageFromObjC: _handleMessageFromObjC
    }

    var doc = document
    _createQueueReadyIframe(doc)
    var readyEvent = doc.createEvent('Events')
    readyEvent.initEvent('WebViewJavascriptBridgeReady')
    readyEvent.bridge = WebViewJavascriptBridge
    doc.dispatchEvent(readyEvent)
};
