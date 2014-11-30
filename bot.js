var Bot = require('./lib/bot').Bot,
    argv = require('yargs').argv,
    bot;

bot = new Bot({
    birthdaysFile: argv.birthdaysfile,
    nick: argv.nick,
    channel: argv.channel,
    password: argv.password,
    autojoin: argv.autojoin,
    autoset: argv.autoset
});

bot.mainloop();
