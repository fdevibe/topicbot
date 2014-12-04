var assert = require('assert'),
    sinon = require('sinon'),
    parser = require('../lib/markup-parser');

describe('markup-parser', function () {
    it('parses header part', function () {
        var wm = new parser.WikiMarkup('foo\n==bar==\nbaz\n');
        assert.strictEqual('foo\n', wm.header);
    });

    it('parses sections', function () {
        var wm = new parser.WikiMarkup('foo\n==bar==\nbar content\n==baz==\nbaz content\n== zoot ==\n\nzoot content\n\n');
        assert.deepEqual(
            [
                {
                    header: 'bar',
                    body: [
                        'bar content'
                    ]
                },
                {
                    header: 'baz',
                    body: [
                        'baz content'
                    ]
                },
                {
                    header: 'zoot',
                    body: [
                        'zoot content'
                    ]
                }
            ],
            wm.sections
        );
    });

    it('stops at category', function () {
        var wm = new parser.WikiMarkup('foo\n==bar==\nbar content\n[[Kategori:Metasyntaktiske variabler]]');
        assert.deepEqual(
            [
                {
                    header: 'bar',
                    body: [
                        'bar content'
                    ]
                }
            ],
            wm.sections
        );
    });

    it('splits paragraphs', function () {
        var wm = new parser.WikiMarkup('foo\n==bar==\nfirst par\n\nsecond par\nrest of second par');
        assert.deepEqual(
            [
                {
                    header: 'bar',
                    body: [
                        'first par',
                        'second par rest of second par'
                    ]
                }
            ],
            wm.sections
        );
    });
});
