'use strict';

var test = require('tape');

var cheatChannel = require('../index.js');

test('cheatChannel is a function', function t(assert) {
    assert.equal(typeof cheatChannel, 'function');
    assert.end();
});
