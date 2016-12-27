const SERVER_URL = 'https://ey.sandcats.io';

var mManageQueue = [];

var system = require('system');
var page = require('webpage').create();
page.viewportSize = {width: 1024, height: 768};
//page.onConsoleMessage = function (msg) {
//    console.log(msg);
//};
//page.onResourceError = function (resourceError) {
//    console.error(resourceError.url + ': ' + resourceError.errorString);
//};
//

execute();

function execute() {
    page.open(SERVER_URL + '/admin/users', function (status) {
        if (status !== "success") {
            console.log("Unable to access network");
        } else {
            waitFor(function () {
                return page.evaluate(function () {
                    var $as = $('.admin-settings');
                    if ($as.size() == 0) return -1;
                    if ($as[0].innerHTML.indexOf('are not logged in') >= 0) {
                        return 1; // redirectToLogin()
                    }
                    return 0; // waitForCheckbox()
                });
            }, [waitForCheckbox, redirectToLogin]);
        }
    });
}

function waitForCheckbox() {
    page.open(SERVER_URL + '/admin/users', function (status) {
        if (status !== "success") {
            console.log("Unable to access network");
        } else {
            waitFor(function () {
                return page.evaluate(function () {
                    return $('.user-class-visitor').size() > 0;
                });
            }, showVisitors);
        }
    });
}

function showVisitors() {
    page.evaluate(function () {
        $('[name=show-admins]').click(); // The page detects click event, not checkbox property
        $('[name=show-users]').click();
        $('[name=show-visitors]').click();
        $('.created[role=columnheader]').click(); // Sort with latest first
    });
    // Separate since engine needs to wait click event triggered and change table content
    setTimeout(waitFiltering, 500);
}

function waitFiltering(retry) {
    if (retry === undefined) retry = 0;
    page.render('visitors_' + retry + '.png');
    if (page.evaluate(function () {
            return $('.user-class-visitor').size() == 0;
        })) {
        if (retry < 3) {
            setTimeout(function () {
                waitFiltering(retry + 1);
            }, 500);
        } else {
            console.log("No any visitors found. Job done.");
            page.render('no-visitor.png');
            finish();
        }
        return;
    }
    var manageLinks = page.evaluate(function () {
        var links = [];
        $('.identity-intrinsic-name').each(function (index, ele) {
            var email = $(ele).html();
            if (email.match(/gov\.tw$/) || email.match(/sinica\.edu\.tw$/)) {
                links.push($(ele).parents('.identities').siblings('.actions').children('.manage-user-button')
                    .attr('href'));
            }
        });
        return links;
    });
    if (manageLinks.length > 0) {
        mManageQueue = manageLinks;
        promoteToUser(0);
    } else {
        console.log('No new legal visitors found. Job done.');
        finish();
    }
}

function promoteToUser(cursor) {
    var link = mManageQueue[cursor];
    page.open(SERVER_URL + link, function (status) {
        if (status !== "success") {
            console.log("Unable to access network");
        } else {
            waitFor(function () {
                return page.evaluate(function () {
                    return $('.make-user').size() > 0;
                });
            }, function () {
                page.evaluate(function () {
                    $('.make-user:contains(Promote)').click();
                });
                console.log("Promoted link " + link + " to user.");
                if (cursor < mManageQueue.length - 1) {
                    promoteToUser(cursor + 1);
                } else {
                    console.log("Promoted " + mManageQueue.length + " visitors to user. Job done.");
                    finish();
                }
            });
        }
    });
}

function redirectToLogin() {
    page.open(SERVER_URL, function (status) {
        if (status !== "success") {
            console.log("Unable to access network");
        } else {
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
        return page.evaluate(function() {
            return $('p:contains(sent a login e-mail to)').size() > 0;
        });
    }, function () {
        page.render('login.png');
        var error = page.evaluate(function() {
            return $('.error-message').html();
        });
        if (error) {
            system.stdout.write(error + '\n');
        }
        system.stdout.write("Please input the mailed confirm link URL: ");
        var confirmLink = system.stdin.readLine();
        page.open(confirmLink, function(status) {
            waitFor(function() {
                var ret = page.evaluate(function() {
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
                condition = (typeof(testFx) === "string" ? eval(testFx) : testFx()); //< defensive code
                if (condition === true) condition = 0;
                if (condition === false) condition = -1;
            } else {
                if (condition < 0) {
                    // If condition still not fulfilled (timeout but condition is 'false')
                    console.log("'waitFor()' timeout");
                    console.log(onReady);
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
        }, 250); //< repeat waitForCheckbox every 250ms
};

function finish() {
    phantom.exit();
}
