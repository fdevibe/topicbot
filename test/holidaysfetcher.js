var assert = require('assert'),
    sinon = require('sinon');

describe('holidaysfetcher', function () {
    var nodemw = require('nodemw'),
        holidaysfetcher = require('../lib/holidaysfetcher'),
        moment = require('moment'),
        stub;

    afterEach(function () {
        if (stub.restore !== undefined) {
            stub.restore();
        }
    });

    it('parses Merkedager', function () {
        stub = sinon.stub(nodemw.prototype, 'getArticle')
                .yields('== Merkedager ==\n\n* foo\n\n'),
            callbackCalled = false;
        holidaysfetcher.fetchHolidays(moment(), function (holidays) {
            assert.deepEqual(holidays, ['foo']);
            callbackCalled = true;
            stub.restore();
        });
        assert(callbackCalled);
    });

    it('parses Helligdager', function () {
        stub = sinon.stub(nodemw.prototype, 'getArticle')
                .yields('== Helligdager ==\n\n* foo\n\n'),
            callbackCalled = false;
        holidaysfetcher.fetchHolidays(moment(), function (holidays) {
            assert.deepEqual(holidays, ['foo']);
            callbackCalled = true;
            stub.restore();
        });
        assert(callbackCalled);
    });

    it('parses links', function () {
        stub = sinon.stub(nodemw.prototype, 'getArticle')
                .yields('== Helligdager ==\n\n* [[foo]]\n* [[bar | baz]]\n* [[zoot]] xyzzy\n\n'),
            callbackCalled = false;
        holidaysfetcher.fetchHolidays(moment(), function (holidays) {
            assert.deepEqual(holidays, ['foo', 'baz', 'zoot xyzzy']);
            callbackCalled = true;
            stub.restore();
        });
        assert(callbackCalled);
    });

    it('ignores stuff before first item', function () {
        stub = sinon.stub(nodemw.prototype, 'getArticle')
                .yields('== Merkedager ==\n[[file:Red Ribbon.svg|right|30 px]]\n* [[foo]]\n\n'),
            callbackCalled = false;
        holidaysfetcher.fetchHolidays(moment(), function (holidays) {
            assert.deepEqual(holidays, ['foo']);
            callbackCalled = true;
            stub.restore();
        });
        assert(callbackCalled);
    });

    it('also parses without whitespace around title', function () {
        stub = sinon.stub(nodemw.prototype, 'getArticle')
                .yields('==Merkedager==\n\n* [[foo]]\n\n'),
            callbackCalled = false;
        holidaysfetcher.fetchHolidays(moment(), function (holidays) {
            assert.deepEqual(holidays, ['foo']);
            callbackCalled = true;
            stub.restore();
        });
        assert(callbackCalled);
    });
});
