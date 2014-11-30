var Bot = require('./lib/bot').Bot,
    argv = require('yargs').argv,
    fs = require('fs'),
    bot,
    password;

if (argv.pwfile) {
    password = fs.readFileSync(argv.pwfile).toString().trim();
} else {
    password = argv.password;
}

bot = new Bot({
    birthdaysFile: argv.birthdaysfile,
    nick: argv.nick,
    channel: argv.channel,
    password: password,
    autojoin: argv.autojoin,
    autoset: argv.autoset
});

bot.mainloop();
