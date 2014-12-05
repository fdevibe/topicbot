var nodemw = require('nodemw'),
    _ = require('lodash'),
    parser = require('./markup-parser');

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
            section,
            markup = new parser.WikiMarkup(page);
        section = _.find(markup.sections, function (sec) {
            return sec.header === 'Merkedager' || sec.header === 'Helligdager';
        });
        _.each(section.body, function (part) {
            if (part.li !== undefined) {
                _.each(part.li, function (el) {
                    holidays.push(stripLinks(el));
                });
            } else if (part.indexOf('[[file:') !== 0) {
                    holidays.push(stripLinks(part));
            }
        });
        callback(holidays);
    });
};
