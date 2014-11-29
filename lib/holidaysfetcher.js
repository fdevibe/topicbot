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
        return result;
    }

    mwClient.getArticle(day.date() + '._' + months[day.month()], function (page) {
        var holidays = [],
            start,
            end,
            hoSection,
            holidays_marker = '== Helligdager ==',
            notabledays_marker = '== Merkedager ==';
        start = page.indexOf(holidays_marker);
        if (start === -1) {
            start = page.indexOf(notabledays_marker);
        }
        end = page.substr(start + holidays_marker.length + 2).indexOf('\n\n') + holidays_marker.length + 2;
        hoSection = page.substr(start, end).split('\n');
        holidays = _.map(
            _.filter(hoSection, function (line) {
                return line[0] === '*' && line[1] !== '*';
            }),
            function (line) {
                return stripLinks(line.substr(line.search(/[^* ]/)));
            }
        );
        callback(holidays);
    });
};
