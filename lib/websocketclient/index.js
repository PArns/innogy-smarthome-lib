const inherits = require('util').inherits;
const EventEmitter = require('events').EventEmitter;
const WebSocket = require('ws');

function WebSocketClient(url) {
    if (!(this instanceof WebSocketClient)) return new WebSocketClient();
    EventEmitter.call(this);

    this.number = 0;    // Message number
    this.autoReconnectInterval = 2 * 1000; // ms
    this._closed = true;
    this._reconnecting = false;
    this._reconnectInterval = null;

    this.open(url);
}

inherits(WebSocketClient, EventEmitter);
module.exports = WebSocketClient;

WebSocketClient.prototype.open = function (url) {
    if (this.instance) {
        this.instance.removeAllListeners("close");
        this.instance.removeAllListeners("error");

        try {
            if (this.instance.readyState === WebSocket.OPEN)
                this.instance.close();
        } catch (e) {
            // Ignore
        }
    }

    var that = this;
    this.url = url;
    this._closed = false;

    this.instance = new WebSocket(url);

    this.instance.on('open', function () {
        if (that._reconnectInterval) {
            clearTimeout(that._reconnectInterval);
            that._reconnectInterval = null;
        }

        that._reconnecting = false;

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
            that.reconnect(e);

        that.onerror(e);

        return true;
    });

    this.instance.on('unexpected-response', function(e) {
        if (!that._closed)
            that.reconnect(e);

        that.onclose(e);

        return true;
    });
};

WebSocketClient.prototype.close = function () {
    this._closed = true;

    if (this.instance.readyState == WebSocket.OPEN)
        this.instance.close();

    if (this._reconnectInterval) {
        clearTimeout(this._reconnectInterval);
        this._reconnectInterval = null;
    }

    this.onclose();
};

WebSocketClient.prototype.send = function (data, option) {
    try {
        this.instance.send(data, option);
    } catch (e) {
        this.instance.emit('error', e);
    }
};

var _reconnect = function (that) {
    console.log("RECONNECTING");

    if (that.instance) {
        if (that.instance.readyState != WebSocket.OPEN) {
            if (!that._closed) {
                that.emit("reconnect");
                that.open(that.url);

                that._reconnecting = true;
                that._reconnectInterval = setTimeout(function () {
                    _reconnect(that);
                }, that.autoReconnectInterval);
            }
        } else {
            that._reconnecting = false;
            clearInterval(that._reconnectInterval);
            that._reconnectInterval = null;
        }
    } else {
        if (!that._closed) {
            that.emit("reconnect");
            that.open(that.url);

            that._reconnecting = true;
            that._reconnectInterval = setTimeout(function () {
                _reconnect(that);
            }, that.autoReconnectInterval);
        }
    }
};

WebSocketClient.prototype.reconnect = function () {
    var that = this;

    if (this._reconnecting || this._closed)
        return;

    this._reconnecting = true;

    if (this._reconnectInterval) {
        clearTimeout(this._reconnectInterval);
        this._reconnectInterval = null;
    }

    this._reconnectInterval = setTimeout(function() { _reconnect(that); }, this.autoReconnectInterval);
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