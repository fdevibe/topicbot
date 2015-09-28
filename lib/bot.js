var irc = require('irc'),
    fetcher = require('./holidaysfetcher'),
    _ = require('lodash'),
    fs = require('fs'),
    moment = require('moment');

function Bot(opts) {
    var today = moment(),
        mainloop,
        interval,
        setTopic,
        client,
        joined = false,
        birthdays = readBirthdays();

    client = new irc.Client(
        'irc.freenode.net',
        opts.nick,
        {
            channels: [],
            debug: true
        }
    );

    function isPrivate(to) {
        return to === client.nick;
    }

    client.addListener('message', function (from, to, message) {
        var args = _.filter(message.split(/[ ,;]/), function (s) {
            return s.length > 0;
        }),
            recipient = opts.channel;
        if (isPrivate(to)) {
            args.unshift(null);
            recipient = from;
        }
        if (isPrivate(to) || message.indexOf(client.nick) === 0) {
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
                    listHolidays(recipient, moment(args[2]));
                } else {
                    listHolidays(recipient, today);
                }
                break;
            case 'bursdagar':
            case 'birthdays':
                listBirthdays(recipient);
                break;
            case 'bursdag':
            case 'birthday':
                if (args.length > 3) {
                    addBirthday(from, args[2], args[3], recipient);
                }
                break;
            case 'fjernBursdag':
            case 'removeBirthday':
                if (args.length > 2) {
                    removeBirthday(from, parseInt(args[2], 10), recipient);
                }
                break;
            case 'topic':
                setTopic();
                break;
            case 'hjelp':
            case 'help':
                help(recipient);
                break;
            default:
                if (opts.helpful) {
                    handleError(recipient, message);
                } else {
                    pointlessStatement(recipient, from, message);
                }
            }
        }
    });

    function join() {
        client.join(opts.channel);
    }

    if (opts.password !== undefined) {
        client.addListener('notice', function (nick, to, text, message) {
            if (nick === 'NickServ' && to === client.nick) {
                if (text.indexOf('This nickname is registered') === 0) {
                    client.say('NickServ', 'identify ' + opts.password);
                } else if (text.indexOf('You are now identified') === 0) {
                    if (joined) {
                        setTopic();
                    } else {
                        join();
                    }
                }
            } else if (
                nick === 'ChanServ'
                    && to === client.nick
                    && text.indexOf('Unbanned ' + client.nick + ' on ' + opts.channel) === 0
            ) {
                join();
            }
        });
    }

    if (opts.autojoin) {
        client.addListener('registered', function (message) {
            join();
        });
    }

    client.addListener('error', function (message) {
        if (message.command === 'err_bannedfromchan') {
            client.say('ChanServ', 'unban ' + opts.channel);
        } else {
            console.log('Got error:');
            console.dir(message);
        }
    });

    client.addListener('+mode', function (channel, by, mode, argument, message) {
        if (mode === 'b') {
            getUserMask(function (userMask) {
                if (userMask === argument) {
                    client.say('ChanServ', 'unban ' + opts.channel);
                }
            });
        }
    });

    function getUserMask(callback) {
        client.whois(client.nick, function (message) {
            callback('*!*' + message.user.replace('~', '') + '@*' + message.host.substr(message.host.indexOf('.')));
        });
    }

    client.addListener('-mode', function (channel, by, mode, argument, message) {
        if (argument === client.nick && mode === 'o') {
            client.part(opts.channel, 'brb', function () {
                join();
            });
        }
    });

    function help(where) {
        client.say(where, 'Gyldige kommandoar er:\n' + validArgs());
    }

    function handleError(where, message) {
        client.say(where, 'Eg forstår ikkje "' + message + '", gyldige kommandoar er:\n' + validArgs());
    }

    function pointlessStatement(where, from, message) {
        pfsay(where, from, randomStuff(message));
    }

    function randomStuff(message) {
        var weekdays =
                [
                    'måndag',
                    'tysdag',
                    'onsdag',
                    'torsdag',
                    'fredag',
                    'laurdag',
                    'søndag'
                ],
            stuff =
                [
                    'Kva meiner du med «' + message + '»?',
                    'Det tykjer ikkje eg!',
                    'Altså, ikkje på ein ' + weekdays[today.weekday()] + '!',
                    'Det er ein god tanke!',
                    'Kvifor ikkje?',
                    'Your mother is a hamster and your father smells of elderberries!',
                    'OK!'
                ];
        return stuff[Math.floor(Math.random() * stuff.length)];
    }

    function readBirthdays() {
        return JSON.parse(fs.readFileSync(opts.birthdaysFile));
    }

    function removeBirthday(from, indexToRemove, messageRecipient) {
        var callback = function () {
            var removedDate;
            birthdays = _.compact(_.map(birthdays, function (birthday, index) {
                if (index === indexToRemove - 1) {
                    removedDate = birthday.date;
                    return false;
                }
                return birthday;
            }));
            fs.writeFile(opts.birthdaysFile, JSON.stringify(birthdays));
            if (removedDate !== undefined && removedDate === today.format('YYYY-MM-DD')) {
                setTopic();
            }
            pfsay(messageRecipient, from, 'fjerna ' + removedDate.date + ' som bursdagen til ' + removedDate.name);
        };
        opAction(from, callback, messageRecipient);
    }

    function addBirthday(from, name, date, messageRecipient) {
        var callback = function () {
            birthdays.push({
                name: name,
                date: date
            });
            fs.writeFile(opts.birthdaysFile, JSON.stringify(birthdays));
            if (date === today.format('YYYY-MM-DD')) {
                setTopic();
            }
            pfsay(messageRecipient, from, 'la til ' + date + ' som bursdagen til ' + name);
        };
        opAction(from, callback, messageRecipient);
    }

    function pfsay(recipient, from, message) {
        var prefix = '';
        if (recipient === opts.channel) {
            prefix = from + ': ';
        }
        client.say(recipient, prefix + message);
    }

    function opAction(from, callback, messageRecipient) {
        var nameCallback = function (nicks) {
            var n = _.pick(nicks, from);
            if (n !== undefined && n[from].indexOf('@') !== -1) {
                callback();
            } else {
                pfsay(messageRecipient, from, 'du har ikkje rettighetar til denne operasjonen');
            }
            client.removeListener('names' + opts.channel, nameCallback);
        };
        client.addListener('names' + opts.channel, nameCallback);
        client.send('NAMES', opts.channel);
    }

    function listBirthdays(where) {
        client.say(where, '--  Registrerte bursdagar: --');
        _.each(birthdays, function (birthday, index) {
            client.say(where, ' ' + ' [' + (index + 1) + '] ' + birthday.name + ': ' + birthday.date);
        });
    }

    function validArgs() {
        return [
            ' hjelp -- Denne teksta',
            ' heilagdag [n] -- Vel kva for heilagdag som skal visast',
            ' heilagdagar [datestring] -- Vis ei liste over heilagdager i dag eller for valt dato',
            ' bursdagar -- Vis ei liste over registrerte bursdagar',
            ' bursdag <navn> <dato> -- Legg til bursdag. Må vere på forma YYYY-MM-DD',
            ' fjernBursdag <indeks> -- Fjern ein bursdag. Indeks finst i lista over bursdagar',
            ' topic -- Set topic, frå bursdagslista eller frå heilagdagslista'
        ].join('\n');
    }

    function setHolidayTopic(index) {
        fetcher.fetchHolidays(today, function (holidays) {
            if (index === undefined) {
                index = Math.floor(Math.random() * holidays.length) + 1;
            }
            client.send(
                'TOPIC',
                opts.channel,
                'I dag: ' + holidays[index - 1]);
        });
    }

    function listHolidays(where, day) {
        fetcher.fetchHolidays(day, function (holidays) {
            client.say(where, '-- ' + day.format('YYYY-MM-DD') + ': --');
            _.each(holidays, function (holiday, index) {
                client.say(where, ' [' + (index + 1) + '] ' + holiday);
            });
        });
    }

    function setBirthdayTopic(birthdays) {
        var all = birthdays.length > 1 ? birthdays.slice(0, birthdays.length - 1).join(', ') + ' og ' + birthdays[birthdays.length - 1] : birthdays[0];
        client.send(
            'TOPIC',
            opts.channel,
            'Topic gratulerer ' + all + ' med dagen!');
    }

    function getBirthdays(date) {
        return _.filter(birthdays, function (birthday) {
            return birthday.date.substr(5) === date.format('MM-DD');
        });
    }

    client.addListener('join', function (chan, nick, message) {
        joined = true;
        if (nick === client.nick && opts.autoset) {
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

exports.Bot = Bot;
