const messageHandlers = {};
const CUSTOM_PROTOCOL_SCHEME = 'wvjbscheme';
const responseCallbacks = {};

function _createMessageIframe (src) {
  const messagingIframe = document.createElement('iframe');
  messagingIframe.style.display = 'none';
  messagingIframe.src = src;
  document.documentElement.appendChild(messagingIframe);
  // setTimeout(function () {
  //   document.documentElement.removeChild(messagingIframe);
  // }, 0);
}

// 调用app原生页面
function startPage (data) {
  callHandler('startPage', data, null);
}

// 调用app原生功能或事件（app原生类的静态方法）,
function startAction (data, responseCallback) {
  callHandler('startAction', data, responseCallback);
}

// 获取app本地存储的数据, keys为要获取数据数组key： ["username", "password"]
function get (keys, responseCallback) {
  callHandler('get', keys, responseCallback);
}

// 保存数据到app原生, data 为要保存到app本地的数据： {"username":"xxx", "password":"xxx"}
function set (data) {
  callHandler('set', data, null);
}

// 关闭h5
function close () {
  callHandler('close', '', null);
}

// 当前页面重新显示时调用
function onRestart (callback) {
  registerHandler('onRestart', function (data, responseCallback) {
    callback();
  });
}

// 当按下 android 手机的物理返回按键时调用
function onBackPressed (callback) {
  registerHandler('onBackPressed', function (data, responseCallback) {
    callback(responseCallback);
  });
}

// 通过app 请求网络数据
function requestData (params, callback) {
  // const params = {'url': url, 'data': data};
  callHandler('requestData', params, callback);
}

function send (data, responseCallback) {
  _doSend({data: data}, responseCallback);
}

function registerHandler (handlerName, handler) {
  messageHandlers[handlerName] = handler;
}

function getHandler (handlerName) {
  return messageHandlers[handlerName];
}

function callHandler (handlerName, data, responseCallback) {
  _doSend({handlerName: handlerName, data: data}, responseCallback);
}

function _doSend (message, responseCallback) {
  if (responseCallback) {
    const callbackId = 'cb_' + new Date().getTime();
    responseCallbacks[callbackId] = responseCallback;
    message.callbackId = callbackId;
  }
  const messageQueueString = JSON.stringify(message);
  _createMessageIframe(CUSTOM_PROTOCOL_SCHEME + '://' + encodeURIComponent(messageQueueString));
}

function _dispatchMessageFromApp (messageJSON) {
  setTimeout(function () {
    messageJSON = messageJSON.replace(/(\t)/g, '    ');
    messageJSON = messageJSON.replace(/(\r\n)|(\n)/g, '<br>');
    const message = JSON.parse(messageJSON);
    var responseCallback;
    if (message.responseId) {
      responseCallback = responseCallbacks[message.responseId];
      if (!responseCallback) {
        return;
      }
      responseCallback(message.responseData);
      delete responseCallbacks[message.responseId];
    } else {
      if (message.callbackId) {
        const callbackResponseId = message.callbackId;
        responseCallback = function (responseData) {
          _doSend({responseId: callbackResponseId, responseData: responseData});
        };
      }
      var handler;
      if (message.handlerName) {
        handler = messageHandlers[message.handlerName];
      }
      if (handler) {
        handler(message.data, responseCallback);
      }
    }
  });
}

function _handleMessageFromApp (messageJSON) {
  _dispatchMessageFromApp(messageJSON);
}

const app = window.app = {
  onRestart: onRestart,
  onBackPressed: onBackPressed,
  startPage: startPage,
  startAction: startAction,
  requestData: requestData,
  get: get,
  set: set,
  close: close,
  send: send,
  registerHandler: registerHandler,
  getHandler: getHandler,
  callHandler: callHandler,
  _handleMessageFromApp: _handleMessageFromApp
};
app.onBackPressed(function (responseCallback) {
  responseCallback('false');
});
