const inherits = require('util').inherits;
const EventEmitter = require('events').EventEmitter;
const WebSocket = require('ws');

function WebSocketClient(url) {
    if (!(this instanceof WebSocketClient)) return new WebSocketClient();
    EventEmitter.call(this);

    this.number = 0;    // Message number
    this.autoReconnectInterval = 10 * 1000;    // ms
    this._closed = true;

    this.open(url);
}

inherits(WebSocketClient, EventEmitter);
module.exports = WebSocketClient;

WebSocketClient.prototype.open = function (url) {
    if (this.instance) {
        this.instance.removeAllListeners("close");
        this.instance.removeAllListeners("error");
        this.instance.close();
    }

    var that = this;
    this.url = url;
    this._closed = false;
    this.instance = new WebSocket(url);

    this.instance.on('open', function () {
        that.onopen();
    });

    this.instance.on('message', function (data, flags) {
        that.number++;
        that.onmessage(data, flags, that.number);
    });

    this.instance.on('close', function (e) {
        if (!that._closed)
            that.reconnect(e);

        that.onclose(e);
    });

    this.instance.on('error', function (e) {
        if (!that._closed)
            that.reconnect();

        that.onclose(e);
    });
};

WebSocketClient.prototype.close = function () {
    this._closed = true;
    this.instance.close();
};

WebSocketClient.prototype.send = function (data, option) {
    try {
        this.instance.send(data, option);
    } catch (e) {
        this.instance.emit('error', e);
    }
};

WebSocketClient.prototype.reconnect = function () {
    var that = this;

    if (!this._closed) {
        setTimeout(function () {
            that.emit("reconnect");
            that.open(that.url);
        }, this.autoReconnectInterval);
    }
};

WebSocketClient.prototype.onopen = function (e) {
    this.emit("open", e);
};

WebSocketClient.prototype.onmessage = function (data, flags, number) {
    this.emit("message", data, flags, number);
};

WebSocketClient.prototype.onerror = function (e) {
    this.emit("error", e);
};

WebSocketClient.prototype.onclose = function (e) {
    this.emit("close", e);
};