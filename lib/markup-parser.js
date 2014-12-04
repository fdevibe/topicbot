var _ = require('lodash');

function fetchSection(section, markup) {
    var start,
        end;
    for (i = 0; start === -1 && i < markers.length; i++) {
        start = page.indexOf(markers[i]);
    }
    start += markup.indexOf(start).indexOf('\n');
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
}

function WikiMarkup(markup) {
    this.markup = markup;
    this.header = this.getHeader(markup);
    this.sections = this.getSections(markup);
};

WikiMarkup.prototype.getHeader = function () {
    return this.markup.substr(0, this.markup.indexOf('\n==') + 1);
};

WikiMarkup.prototype.getSections = function () {
    var self = this;
    var headerPositions = [],
        i = 0;
    for (; i < self.markup.length - 1; i++) {
        if (self.markup.substr(i, 2) === '==' && (i === 0 || self.markup[i - 1] === '\n')) {
            headerPositions.push(i);
        }
    }
    return _.map(headerPositions, function (start, index) {
        return self.getSection(
            start,
            (index === headerPositions.length - 1)
                ? self.endOfLastSection(headerPositions[index]) - start
                : headerPositions[index + 1] - start
        );
    });
};

WikiMarkup.prototype.getSection = function (start, end) {
    var section = this.markup.substr(start, end);
    return {
        header: this.getSectionHeader(section),
        body: this.getSectionBody(section)
    };;
};

WikiMarkup.prototype.getSectionHeader = function (section) {
    var r = new RegExp(/==+(.+?)==+/).exec(section.substr(0, section.indexOf('\n')));
    return r[1].trim();
};

WikiMarkup.prototype.getSectionBody = function (section) {
    var start = section.indexOf('\n');
    return _.compact(
        _.map(section.substr(start + 1).split('\n\n'), function (part) {
            return part.trim().replace('\n', ' ');
        })
    );
};

WikiMarkup.prototype.endOfLastSection = function (pos) {
    var catpos = this.markup.substr(pos).indexOf('[[Kategori:');
    return (catpos !== -1) ? pos + catpos : this.markup.length;
};

exports.WikiMarkup = WikiMarkup;
