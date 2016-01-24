'use strict';

/* @flow */

var Buffer = require('buffer').Buffer;
var assert = require('assert');
var collectParallel = require('collect-parallel/array');
var setTimeout = require('timers').setTimeout;

var CheatChannel = require('../channel.js');

module.exports = BatchClient;

/*::
import * as type from './batch-client.h.js';
declare var BatchClient : Class<type.BatchClient>
declare var BatchClientLoop : Class<type.BatchClientLoop>
declare var BatchClientResults : Class<type.BatchClientResults>
declare var BatchClientRequestResult : Class<type.BatchClientRequestResult>
*/

function BatchClient(hosts, options) {
    var self/*:BatchClient*/ = this;

    assert(hosts.length > 0, 'expected non-empty hosts');

    self.channel = new CheatChannel();
    self.hosts = hosts;
    self.totalTime = options.totalTime || 5 * 1000;
    self.queryPerSecond = options.queryPerSecond || 20 * 1000;
    self.bodySize = options.bodySize || 128;
    self.command = options.command || 'ping';

    self.client = createClient(self.channel);
    self.key = new Buffer('KEY_VALUE');
    self.body = allocContBuf(self.bodySize);
}

function allocContBuf(size) {
    var buf = new Buffer(size);
    buf.fill('A');
    return buf;
}

function createClient(channel) {
    return channel.createClient('benchmark', {
        ping: {
            headers: {
                as: 'raw',
                cn: 'multi_bench',
                benchHeader1: 'bench value one',
                benchHeader2: 'bench value two',
                benchHeader3: 'bench value three'
            },
            ttl: 5 * 1000
        },
        get: {
            headers: {
                as: 'raw',
                cn: 'multi_bench',
                benchHeader1: 'bench value one',
                benchHeader2: 'bench value two',
                benchHeader3: 'bench value three'
            },
            ttl: 5 * 1000
        },
        set: {
            headers: {
                as: 'raw',
                cn: 'multi_bench',
                benchHeader1: 'bench value one',
                benchHeader2: 'bench value two',
                benchHeader3: 'bench value three'
            },
            ttl: 5 * 1000
        }
    });
}

BatchClient.prototype.sendRequests = function sendRequests(callback) {
    var self/*:BatchClient*/ = this;

    var loop = new BatchClientLoop({
        start: Date.now(),
        batchClient: self,
        onFinish: callback
    });
    loop.runNext();
};

BatchClient.prototype._sendRequest = function _sendRequest(cb) {
    var self/*:BatchClient*/ = this;

    var result = new BatchClientRequestResult(Date.now(), cb);
    var opts = {
        host: self.hosts[0],
        arg2: self.key,
        arg3: self.body
    };

    if (self.command === 'ping') {
        self.client.sendPing(opts, onResponse);
    } else if (self.command === 'get') {
        self.client.sendGet(opts, onResponse);
    } else if (self.command === 'set') {
        self.client.sendSet(opts, onResponse);
    }

    function onResponse(err, frame) {
        result.handleResponse(err, frame);
    }
};

function BatchClientLoop(options) {
    var self = this;

    self.batchClient = options.batchClient;
    self.startTime = options.start;
    self.onFinish = options.onFinish;

    self.requestCounter = 0;
    self.responseCounter = 0;
    self.currentRun = 0;
    self.results = new BatchClientResults();

    self.boundRunAgain = boundRunAgain;

    function boundRunAgain() {
        self.runNext();
    }
}

BatchClientLoop.prototype.runNext = function runNext() {
    var self = this;

    if (self.requestCounter >= self.batchClient.totalRequests) {
        return;
    }

    self.currentRun++;
    self.requestCounter += self.batchClient.batchSize;

    var jobs = [];
    for (var i = 0; i < self.batchClient.batchSize; i++) {
        jobs[i] = self;
    }

    collectParallel(jobs, makeRequest, onResults);

    var targetTime = self.startTime + (
        self.currentRun * self.batchClient.delay
    );
    var delta = targetTime - Date.now();

    setTimeout(self.boundRunAgain, delta);

    function onResults(err, responses) {
        self.onResults(err, responses);
    }
};

BatchClientLoop.prototype.onResults = function onResults(err, responses) {
    var self = this;

    if (err) {
        return self.onFinish(err);
    }

    for (var j = 0; j < responses.length; j++) {
        self.responseCounter++;
        self.results.push(responses[j]);
    }

    if (self.responseCounter >= self.batchClient.totalRequests) {
        self.onFinish(null, self.results);
    }
};

function makeRequest(loop, _, callback) {
    loop.batchClient._sendRequest(callback);
}

function BatchClientResults() {
    var self/*:BatchClientResults*/ = this;

    self.errors = [];
    self.results = [];
}

BatchClientResults.prototype.push = function push(result) {
    var self/*:BatchClientResults*/ = this;

    if (result.err) {
        self.errors.push(result.err);
    } else {
        self.results.push(result.value);
    }
};

function BatchClientRequestResult(start, cb) {
    var self/*:BatchClientRequestResult*/ = this;

    self.start = start;
    self.cb = cb;

    self.error = null;
    self.responseOk = null;
    self.responseId = null;
    self.duration = null;
    self.outReqHostPort = null;
}

BatchClientRequestResult.prototype.handleResponse =
function handleResponse(err, frame) {
    var self/*:BatchClientRequestResult*/ = this;

    if (err && !err.isErrorFrame) {
        return self.cb(err);
    }

    self.error = err || null;
    self.responseOk = frame ? Boolean(frame.readResCode()) : false;
    self.responseId = frame ? frame.readId() : 0;
    self.duration = Date.now() - self.start;
    self.outReqHostPort = frame ?
        frame.sourceConnection.remoteName : null;

    self.cb(null, self);
};
