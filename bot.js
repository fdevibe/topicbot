var irc = require('irc'),
    fetcher = require('./holidaysfetcher'),
    _ = require('lodash'),
    fs = require('fs'),
    moment = require('moment'),
    bot;

function Bot(birthdaysFile) {
    var today = moment(),
        mainloop,
        interval,
        setTopic,
        nick = 'NielsHenrik',
        channel = '#agnurk',
        client,
        birthdays = readBirthdays(birthdaysFile);

    client = new irc.Client(
        'irc.freenode.net',
        nick,
        {
            channels: [channel],
            debug: true
        }
    );

    client.addListener('message', function (from, to, message) {
        var args;
        if (message.indexOf(client.nick) === 0) {
            args = _.filter(message.split(/[ ,;]/), function (s) {
                return s.length > 0;
            });
            switch (args[1]) {
            case 'holiday':
            case 'heilagdag':
                if (args.length > 2) {
                    setHolidayTopic(parseInt(args[2], 10));
                } else {
                    setHolidayTopic();
                }
                break;
            case 'heilagdagar':
            case 'holidays':
                if (args.length > 2) {
                    listHolidays(moment(args[2]));
                } else {
                    listHolidays(today);
                }
                break;
            case 'bursdagar':
            case 'birthdays':
                listBirthdays();
                break;
            case 'bursdag':
            case 'birthday':
                if (args.length > 3) {
                    addBirthday(from, args[2], args[3]);
                }
                break;
            case 'fjernBursdag':
            case 'removeBirthday':
                if (args.length > 2) {
                    removeBirthday(from, parseInt(args[2], 10));
                }
                break;
            case 'hjelp':
            case 'help':
                help();
                break;
            default:
                handleError(message);
            }
        }
    });

    function help() {
        client.say(channel, 'Gyldige kommandoar er:' + validArgs());
    }

    function handleError(message) {
        client.say(channel, 'Eg forstår ikkje "' + message + '", gyldige kommandoar er:' + validArgs());
    }

    function readBirthdays(birthdaysFile) {
        return JSON.parse(fs.readFileSync(birthdaysFile));
    }

    function removeBirthday(from, indexToRemove) {
        var callback = function () {
            var removedDate;
            birthdays = _.compact(_.map(birthdays, function (birthday, index) {
                if (index === indexToRemove - 1) {
                    removedDate = birthday.date;
                    return false;
                }
                return birthday;
            }));
            fs.writeFile(birthdaysFile, JSON.stringify(birthdays));
            if (removedDate !== undefined && removedDate === today.format('YYYY-MM-DD')) {
                setTopic();
            }
        };
        opAction(from, callback);
    }

    function addBirthday(from, name, date) {
        var callback = function () {
            birthdays.push({
                name: name,
                date: date
            });
            fs.writeFile(birthdaysFile, JSON.stringify(birthdays));
            if (date === today.format('YYYY-MM-DD')) {
                setTopic();
            }
        };
        opAction(from, callback);
    }

    function opAction(from, callback) {
        var nameCallback = function (nicks) {
            var n = _.pick(nicks, from);
            if (n !== undefined && n[from].indexOf('@') !== -1) {
                callback();
            } else {
                client.say(channel, from + ': du har ikkje rettighetar til denne operasjonen');
            }
            client.removeListener('names' + channel, nameCallback);
        };
        client.addListener('names' + channel, nameCallback);
        client.send('NAMES', channel);
    }

    function listBirthdays() {
        client.say(channel, '--  Registrerte bursdagar: --');
        _.each(birthdays, function (birthday, index) {
            client.say(channel, ' ' + ' [' + (index + 1) + '] ' + birthday.name + ': ' + birthday.date);
        });
    }

    function validArgs() {
        return '\n' + [
            ' hjelp -- Denne teksta',
            ' heilagdag [n] -- Vel kva for heilagdag som skal visast',
            ' heilagdagar [datestring] -- Vis ei liste over heilagdager i dag eller for valt dato',
            ' bursdagar -- Vis ei liste over registrerte bursdagar',
            ' bursdag <navn> <dato> -- Legg til bursdag. Må vere på forma YYYY-MM-DD',
            ' fjernBursdag <indeks> -- Fjern ein bursdag. Indeks finst i lista over bursdagar'
        ].join('\n');
    }

    function setHolidayTopic(index) {
        fetcher.fetchHolidays(today, function (holidays) {
            if (index === undefined) {
                index = Math.floor(Math.random() * holidays.length) + 1;
            }
            client.send(
                'TOPIC',
                channel,
                'I dag: ' + holidays[index - 1]);
        });
    }

    function listHolidays(day) {
        fetcher.fetchHolidays(day, function (holidays) {
            client.say(channel, '-- ' + day.format('YYYY-MM-DD') + ': --');
            _.each(holidays, function (holiday, index) {
                client.say(channel, ' [' + (index + 1) + '] ' + holiday);
            });
        });
    }

    function setBirthdayTopic(birthdays) {
        var all = birthdays.length > 1 ? birthdays.slice(0, birthdays.length - 1).join(', ') + ' og ' + birthdays[birthdays.length - 1] : birthdays[0];
        client.send(
            'TOPIC',
            channel,
            'Topic gratulerer ' + all + ' med dagen!');
    }

    function getBirthdays(date) {
        return _.filter(birthdays, {date: date.format('YYYY-MM-DD')});
    }

    client.addListener('join', function (chan, nick, message) {
        if (nick === client.nick) {
            setTopic();
        }
    });

    function main() {
        var newToday = moment();
        if (today.date() !== newToday.date()) {
            today = newToday;
            setTopic();
        }
    };

    setTopic = function () {
        var todaysBirthdays = getBirthdays(moment());
        if (todaysBirthdays.length === 0) {
            setHolidayTopic();
        } else {
            setBirthdayTopic(_.map(todaysBirthdays, function (bday) { return bday.name; }));
        }
    };

    mainloop = function () {
        clearInterval(interval);
        main();
        interval = setInterval(function () {
            main();
        }, 60000);
    };

    return {
        mainloop: mainloop
    };
}

bot = new Bot('birthdays.json');

bot.mainloop();
