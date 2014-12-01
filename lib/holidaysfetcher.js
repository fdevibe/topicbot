var nodemw = require('nodemw');
var _ = require('lodash');

exports.fetchHolidays = function (day, callback) {
    var months = [
            'januar',
            'februar',
            'mars',
            'april',
            'mai',
            'juni',
            'juli',
            'august',
            'september',
            'oktober',
            'november',
            'desember'
        ],
        mwClient;

    mwClient = new nodemw({
        server: 'no.wikipedia.org',
        path: '/w',
        debug: false
    });

    function stripLinks(text) {
        var result = '',
            tempLinkDesc = '',
            inLink = false,
            i,
            c;
        for (i = 0; i < text.length; i++) {
            c = text.charAt(i);
            switch (c) {
            case '[':
                if (i > 0 && text.charAt(i - 1) === '[') {
                    inLink = true;
                }
                break;
            case ']':
                if (i > 0 && text.charAt(i - 1) === ']') {
                    inLink = false;
                    result += tempLinkDesc;
                    tempLinkDesc = '';
                }
                break;
            case '|':
                tempLinkDesc = '';
                break;
            default:
                if (inLink) {
                    tempLinkDesc += c;
                } else {
                    result += c;
                }
            }
        }
        return result.trim();
    }

    mwClient.getArticle(day.date() + '._' + months[day.month()], function (page) {
        var holidays = [],
            start = -1,
            lines,
            markers = [
                'Helligdager',
                'Merkedager'
            ],
            i,
            begun = false;
        for (i = 0; start === -1 && i < markers.length; i++) {
            start = page.indexOf(markers[i]);
        }
        start += page.substr(start).indexOf('\n');
        lines = page.substr(start).split('\n');
        for (i = 0; i < lines.length; i++) {
            if (begun && lines[i][0] !== '*') {
                break;
            } else if (!begun && lines[i][0] === '*') {
                begun = true;
            }
            if (begun) {
                holidays.push(stripLinks(lines[i].substr(lines[i].search(/[^* ]/))));
            }
        }
        callback(holidays);
    });
};
