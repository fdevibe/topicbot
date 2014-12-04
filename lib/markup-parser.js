var _ = require('lodash'),
    Part = {
        NONE: 0,
        PARAGRAPH: 1,
        LI: 2
    };

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
    var lines = section.split('\n'),
        part = Part.NONE,
        line,
        current,
        prev = '',
        body = [];
    function appendToBody(part, current, body) {
        if (current === '') {
            return;
        }
        switch (part) {
        case Part.PARAGRAPH:
            body.push(current);
            break;
        case Part.LI:
            body.push({li: current});
        }
    }
    _.each(lines.splice(1), function (line, index, bodylines) {
        if (line === '') {
            appendToBody(part, current, body);
            current = '';
        } else if (line[0] === '*') {
            if (part !== Part.LI) {
                appendToBody(part, current, body);
                current = [];
                part = Part.LI;
            }
            current.push(line.substr(line.search(/[^*]/)).trim());
        } else {
            if (part !== Part.PARAGRAPH) {
                appendToBody(part, current, body);
                current = '';
                part = Part.PARAGRAPH;
            }
            if (current.length > 0) {
                current += ' ';
            }
            current += line;
        }
    });
    appendToBody(part, current, body);
    return body;
};

WikiMarkup.prototype.endOfLastSection = function (pos) {
    var catpos = this.markup.substr(pos).indexOf('[[Kategori:');
    return (catpos !== -1) ? pos + catpos : this.markup.length;
};

exports.WikiMarkup = WikiMarkup;
