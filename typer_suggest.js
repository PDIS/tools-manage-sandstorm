/**
 * Created by Romulus on 2016/11/21.
 */

const SERVER_URL = "https://ey.sandcats.io";
const START_URL = "https://ey.sandcats.io/grain/yj2LeFtyv8KrzucRR78cvp";
const SEND_EMAIL_URL = "https://ey.sandcats.io/admin/users/invite";
const SUGGESTEE_DATA_URL = "https://ey.sandcats.io/grain/Na3CDn7dXPibTf9hyAxr6m/";
const CONF_FILE = "typer_suggest.conf";
const CONF_HANDLED = "handled";

const SUBJECT = "標題";
function generateSuggestBody(suggester, suggestee) {
    return suggester + "推薦您以下略";
}

var fHandled = 0;
var fConfig = null;

var system = require('system');
var fs = require('fs');
var page = require('webpage').create();
page.viewportSize = {width: 1024, height: 1400};
//page.onConsoleMessage = function (msg) {
//    console.log(msg);
//};
//page.onResourceError = function (resourceError) {
//    console.error(resourceError.url + ': ' + resourceError.errorString);
//    page.render('error.png');
//};

init();
execute();

function init() {
    if (!fs.isFile(CONF_FILE)) {
        var f = fs.open(CONF_FILE, "w");
        f.write('{}');
        f.close();
    }
    var confFile = fs.open(CONF_FILE, 'r');
    var readData = confFile.read();
    if (readData[0] != '{') {
        fConfig = {};
    } else {
        fConfig = JSON.parse(readData);
    }
    confFile.close();
    fHandled = parseInt(config(CONF_HANDLED));
    if (!fHandled) fHandled = 0;
}

function execute() {
    page.open(START_URL, function (status) {
        if (status !== "success") {
            console.log("Unable to access network");
        } else {
            console.log('Loading...');
            waitFor(function () {
                page.render('debug.png');
                return page.evaluate(function () {
                    var $msg = $('.request-access');
                    if ($msg.size() > 0) {
                        if ($msg[0].innerHTML.indexOf('You do not have permission') >= 0) {
                            return 1; // redirectToLogin()
                        }
                    }
                    var $cont = $('.grain-frame');
                    if ($cont.size() > 0) {
                        var frameDoc = $cont[0].contentDocument;
                        if (frameDoc === null) {
                            return -1;
                        }
                        var frameEle = frameDoc.documentElement;
                        var $frame = $(frameEle);

                        var $resp = $frame.find('.navigation__item:contains(Responses)');
                        if ($resp.size() > 0) {
                            $resp[0].click();
                        }
                        var $mc = $frame.find('.main-content table');
                        if ($mc.size() > 0) {
                            return 0;
                        }
                    }
                    return -1;
                });
            }, [seeSuggesterList, redirectToLogin], 10000);
        }
    });
}

function seeSuggesterList() {
    seeList();
    if (config(CONF_HANDLED) === undefined) {
        system.stdout.write("How many records is handled, so I don't need to send e-mails" +
            " again? (0): ");
        var d_handled = system.stdin.readLine();
        if (!parseInt(d_handled)) {
            d_handled = 0;
        }
        config(CONF_HANDLED, parseInt(d_handled));
    }
    fHandled = config(CONF_HANDLED);

    console.log(records.length + " records with " + fHandled + " already handled, " +
        (records.length - fHandled) + " to go.");
    if (records.length <= fHandled) {
        checkSuggestee();
    } else {
        openEMailPage(records.slice(fHandled));
    }
}

function seeSuggesteeList() {
    seeList();
    if (config(CONF_HANDLED) === undefined) {
        system.stdout.write("How many records is handled, so I don't need to send e-mails" +
            " again? (0): ");
        var d_handled = system.stdin.readLine();
        if (!parseInt(d_handled)) {
            d_handled = 0;
        }
        config(CONF_HANDLED, parseInt(d_handled));
    }
    fHandled = config(CONF_HANDLED);

    console.log(records.length + " records with " + fHandled + " already handled, " +
        (records.length - fHandled) + " to go.");
    if (records.length <= fHandled) {
        checkSuggestee();
    } else {
        openEMailPage(records.slice(fHandled));
    }
}

function seeList() {
    console.log('Checking records...');
    var records = page.evaluate(function () {
        var $records = $($('.grain-frame')[0].contentDocument.documentElement).find('tbody tr');
        var records = [];
        $records.each(function (index, ele) {
            var $tds = $(ele).children('td');
            var record = {};
            record.suggester = $tds.eq(0).html();
            record.suggestee = $tds.eq(1).html();
            record.mail = $tds.eq(2).html();
            records.push(record);
        });
        return records;
    });
}

function openEMailPage(targets) {
    console.log('Ready to send mail.');
    page.open(SEND_EMAIL_URL, function (status) {
        if (status !== "success") {
            console.log("Unable to access network");
        } else {
            waitFor('.to-addresses', function () {
                sendEmail(targets, 0);
            });
        }
    });
}

function sendEmail(targets, cursor) {
    if (cursor >= targets.length) {
        // Update recording how many records we have handled
        config(CONF_HANDLED, targets.length + fHandled);
        console.log('All mails sent.');
        checkSuggestee();
    }
    console.log('Sending mail #' + (cursor + 1) + '/' + targets.length + ' to '
    + targets[cursor].suggestee + '(' + targets[cursor].mail + ')...');
    var target = targets[cursor];
    page.evaluate(function (target) {
            $('.to-addresses').focus();
            $('.to-addresses').val(target.mail);
        },
        target
    );
    sendRealKeyboardEvent();
    page.evaluate(function (body) {
            $('[name=message-body]').focus();
            $('[name=message-body]').val(body);
        },
        generateSuggestBody(target.suggester, target.suggestee)
    );
    sendRealKeyboardEvent();
    page.evaluate(function (subject) {
            $('[name=subject]').focus();
            $('[name=subject]').val(subject);
        },
        SUBJECT
    );
    sendRealKeyboardEvent();
    waitFor(function () {
        return page.evaluate(function(){
            return !$('button:contains(Send invite)').prop('disabled');
        });
    }, function () {
        page.evaluate(function () {
            $('button:contains(Send invite)').click();
        });
        waitFor('.flash-message', function () {
            page.render('send' + cursor + '.png');
            sendEmail(targets, cursor + 1);
        }, 10000);
    });
}

/**
 * Sandstorm e-mail page won't read form data until you really send a key to DOM.
 */
function sendRealKeyboardEvent() {
    page.sendEvent('keypress', page.event.key.Space);
    page.sendEvent('keypress', page.event.key.Backspace);
}

function checkSuggestee() {
    page.open(SUGGESTEE_DATA_URL, function (status) {
        if (status !== "success") {
            console.log("Unable to access network");
        } else {
            console.log('Loading suggestees...');
            waitFor(function () {
                page.render('debug-2.png');
                return page.evaluate(function () {
                    var $cont = $('.grain-frame');
                    if ($cont.size() > 0) {
                        var frameDoc = $cont[0].contentDocument;
                        if (frameDoc === null) {
                            return false;
                        }
                        var frameEle = frameDoc.documentElement;
                        var $frame = $(frameEle);

                        var $resp = $frame.find('.navigation__item:contains(Responses)');
                        if ($resp.size() > 0) {
                            $resp[0].click();
                        }
                        var $mc = $frame.find('.main-content table');
                        if ($mc.size() > 0) {
                            return true;
                        }
                    }
                    return false;
                });
            }, seeSuggesteeList, 10000);
        }
    });
    finish();
}

function redirectToLogin() {
    page.open(SERVER_URL, function (status) {
        if (status !== "success") {
            console.log("Unable to access network");
        } else {
            page.render('waitToLogin.png');
            waitFor(function () {
                return page.evaluate(function () {
                    return $('[name=email]').size() > 0;
                });
            }, login);
        }
    });
}

function login() {
    system.stdout.write("Not logged in. Please input admin's E-Mail: ");
    var email = system.stdin.readLine();
    page.evaluate(function (email) {
        $('[name=email]').val(email);
        $('.login.email').click();
    }, email);
    waitFor(function () {
        return page.evaluate(function () {
            return $('p:contains(sent a login e-mail to)').size() > 0;
        });
    }, function () {
        page.render('login.png');
        var error = page.evaluate(function () {
            return $('.error-message').html();
        });
        if (error) {
            system.stdout.write(error + '\n');
        }
        system.stdout.write("Please input the mailed confirm link URL: ");
        var confirmLink = system.stdin.readLine();
        page.open(confirmLink, function (status) {
            waitFor(function () {
                var ret = page.evaluate(function () {
                    if ($('.icon-notification').size() > 0) return 0;
                    var $err = $('h2:contains(Invalid authentication code)');
                    if ($err.size() > 0) {
                        return $err.html();
                    }
                    return -1;
                });
                if (typeof ret === 'string') {
                    system.stdout.write(ret + '\n');
                    return 1;
                } else {
                    return ret;
                }
            }, [execute, login]);
        });
    });
}

function waitFor(testFx, onReady, timeOutMillis) {
    var maxtimeOutMillis = timeOutMillis ? timeOutMillis : 5000,
        start = new Date().getTime(),
        condition = -1,
        interval = setInterval(function () {
            if ((new Date().getTime() - start < maxtimeOutMillis) && condition < 0) {
                // If not time-out yet and condition not yet fulfilled
                if (typeof(testFx) === "string") {
                    // testFx is a jQuery selector, we're testing if it exists
                    condition = function () {
                        return page.evaluate(function (selector) {
                            return $(selector).size() > 0;
                        }, testFx);
                    }();
                } else {
                    condition = testFx();
                }
                if (condition === true) condition = 0;
                if (condition === false) condition = -1;
            } else {
                if (condition < 0) {
                    // If condition still not fulfilled (timeout but condition is 'false')
                    console.log("'waitFor()' timeout");
                    console.log(testFx);
                    page.render('waitfor.png');
                    phantom.exit(1);
                } else {
                    // Condition fulfilled (timeout and/or condition is 'true')
                    //console.log("'waitFor()' finished in " + (new Date().getTime() - start) + "ms.");
                    var func;
                    if (onReady instanceof Array) {
                        func = onReady[condition];
                    } else {
                        func = onReady;
                    }
                    typeof(func) === "string" ?
                        eval(func) : func(); //< Do what it's supposed to do once the condition is fulfilled
                    clearInterval(interval); //< Stop this interval
                }
            }
        }, 250); //< repeat every 250ms
}

function config(key, value) {
    if (value === undefined) {
        return fConfig[key];
    }
    fConfig[key] = value;
    var f = fs.open(CONF_FILE, 'w');
    f.write(JSON.stringify(fConfig));
    f.close();
}

function finish() {
    phantom.exit();
}