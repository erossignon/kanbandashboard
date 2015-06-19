/* global console, require */
"use strict";

var express = require("express");
//xx var engine = require('ejs-locals');
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var rck = require('redmine-kanban-core');
var Today = rck.Today;
var _ = require("underscore");
var colors = require('colors');
var Project = rck.Project;

// load translation file
var locale = JSON.parse(fs.readFileSync("translation.json", "utf8"));

var argv = require('yargs')
    .usage("  ")
    .demand("config")
    .describe('config', 'specify the configuration js file')
    .argv;


var configuration_script = __dirname + "/" + argv.config;
var configuration = require(configuration_script).config;

configuration.startDate = new Date(configuration.startDate);
configuration.eta_expected = new Date(configuration.eta_expected);

/**
 * translate a neutral language string into target locale
 * @method tr
 * @param str {String} the neutral language string to translate
 * @returns {String} the translated string.
 */
function tr(str) {
    var locStr = locale[str];
    if (locStr) return locStr;
    return "**" + str + "**";
}


var g_project = null;
function get_tickets() {
    if (!g_project) {
        return null;
    }
  return  g_project._work_items;
}

var filename = path.join(configuration.cache_folder,"database.db");

function load_tickets(next) {

    console.log(" loading tickets ... ".cyan);
    g_project = null;
    var project = new Project();

    project.load(filename, function (err) {

        if (err) {
            console.log(" ERROR".red, " filename :".yellow, filename);
            next(null);
        } else {

            g_project = _.clone(project);

            var url     = configuration.url;
            var project_name = configuration.project;
            project.url_issue = url+ "/issues/%d";
            project.name =  project_name;
            project.eta_expected  = configuration.eta_expected;

            console.log("     filename          :".yellow,filename.cyan  );
            console.log("     start date        :".yellow,g_project.startDate   );
            console.log("     end date          :".yellow,g_project.endDate);
            console.log("     eta               :".yellow,g_project.eta_expected);
            console.log("     project.url_issue :".yellow,g_project.url_issue );
            console.log("     nb workitems      :".yellow,g_project._work_items.length);

            assert(g_project.startDate);

            console.log(" loading tickets done ".cyan);
            next(project._work_items);
        }
    });
}



function ensure_database_exists(callback) {

    console.log(" file = ", filename , fs.existsSync(filename));

    if (!fs.existsSync(filename)) {
        console.log(" Warning : ",filename , " doesn't exist");

        var redmine_importer = require("./redminekanban");
        var configuration = redmine_importer.setConfiguration(configuration_script);

        redmine_importer.buildWorkItemDatabaseFromCache(function (err) {
            if(err) {
                console.log(" make sure you've run 'redmineExtract --config "+ argv.config, " --refresh' at least once");
                process.exit(-200);
            }
            console.log("loading ticket done");

            callback(err);
        });
    } else {
        setImmediate(function(){ callback();  });
    }
}

ensure_database_exists( function(err) {

    if (!err) {
        console.log("monitoring change  on ",filename);
        fs.watch(filename, function (event, filename) {
            load_tickets(function(){
                console.log(" reloaded filename " +filename);
            });
        });
    }
})




var uri_root = '/kanban';

var month = ["Jan", "Feb", "Mar", "Avr", "Mai", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function my_formatDate(date) {
    // if (date.getDay()!=1) {  return ""; }
    return date.getDate() + " " + month[date.getMonth()] + " " + (date.getYear() - 100);
}

function build_filter_options(req) {
    var filterOptions = {
        projectFilter: req.query.projectFilter,
        ticketType: req.query.ticketType,
        version: req.query.version,
        today: req.today ? req.today : Today()
    };
    var t = Date.parse(req.query.today);
    if (!isNaN(t)) {
        filterOptions.today = new Date(t);
    }
    console.log("Filter Options".yellow,JSON.stringify(filterOptions, " "));
    console.log(" building stats for ".yellow, filterOptions);
    console.log(" today ", filterOptions.today.toLocaleString());
    return filterOptions;
}

function is_one_of(value, array_of_values) {
    return ( array_of_values.indexOf(value) > -1);
}

function apply_filters(tickets, filters) {

    if (filters.ticketType) {

        var ticketTypes =  (typeof  filters.ticketType === "string" ) ? filters.ticketType.split(","): filters.ticketType;

        tickets = tickets.filter(function (ticket) {return is_one_of(ticket.type,ticketTypes);});

        console.log("  Getting Series filtering on type: ", tickets.length, " tickets to scan" );
    }
    if (filters.version) {
        tickets = tickets.filter(function (ticket) {
            if (ticket.type === "U-C") {
                // do not filter UC per version
                return true;
            }
            return (ticket.fixed_version === filters.version);
        });
    }
    return tickets;
}


function ellipsys(str, maxl) {

    if (!maxl) {
        maxl = 40;
    }
    if (!str) {
        return " UNDEFINED ....";
    }
    if (str.length <= maxl) {
        return str;
    }
    return str.substring(0, maxl) + "...";
}


function percent_bar(percent) {
    var str = "<table class='progress' style='width:80px' >";
    str += "<tbody><tr>";
    str += "<td class='closed' width='" + percent + "%'></td>";
    str += "<td class='todo'   width='" + (100 - percent) + "%'></td>";
    str += "</tr></tbody>";
    str += "</table>";
    str += "<p class='percent'>" + percent + "%</p>";
    return str;
}


load_tickets(function () { console.log("done");});

var app = express();

//xx app.engine('ejs', engine);
//xx app.set('view engine', 'ejs');
//xx app.set('view engine', 'jade');
app.engine('.html', require('ejs-locals'));

app.locals.uri_root = uri_root;
app.locals.percent_bar = percent_bar;
app.locals.ellipsys = ellipsys;


app.use('/kanban', express.static(__dirname + '/public'));
app.use('/kanban', express.static(__dirname + '/bower_components'));
//xx app.use('/redmine-kanban-core', express.static(__dirname + '/node_modules/redmine-kanban-core/'));

app.get(uri_root + '/main', function (req, res) {
    res.render("main.html", {req: req, res: res, tr: tr});
});


function exec_cmd(strCmd,done) {

    console.log(strCmd.split(" "));

    var util  = require('util');
    var spawn = require('child_process').spawn;
    var child_process    = spawn('node', strCmd.split(" "));

    child_process.stdout.on('data', function (data) {
        data.toString("ascii").split("\n").forEach(function(line) {
            console.log('stdout: ' + line.green);
        });
    });

    child_process.stderr.on('data', function (data) {
        data.toString("ascii").split("\n").forEach(function(line) {
            console.log('stderr: ' + line.red);
        });
    });

    var done_called = false;
    child_process.on('error',function(){
        if (!done_called){ done_called=true; done();}
    });
    child_process.on('exit', function (code,signal) {
        console.log('child process exited with code ' + code , " signal ", signal);
        if (!done_called){ done_called=true; done();}
    });
}

var _fetching = false;
function launch_fetch_process(done) {

    if (_fetching) {
        console.log("already fetching".yellow)
        done(new Error("already fetching"));
        return;
    }

    _fetching = true;

    var strCmd = "redmineExtract --config "+ argv.config + " --fetch";

    exec_cmd(strCmd,function(err){
        var strCmd2 = "redmineExtract --config "+ argv.config + " --refresh";
        exec_cmd(strCmd2,function(err) {
            _fetching = false;
            done();
        });
    });


}

app.get(uri_root + '/export.csv', function (req, res) {

    var project = g_project;
    var date_str = new Date().toISOString();
    var filename = __dirname+"/export"+date_str+".csv";
    project.associate_use_case_and_user_stories();
    project.associate_requirements();
    project.export_requirement_coverage_CSV(filename,function(err) {
        res.sendFile(filename,{},function(){
            console.log("done...");
        });
    });

});
app.get(uri_root + '/dashboard', function (req, res) {
    res.render("dashboard.html", {req: req, res: res, tr: tr});
});

app.get(uri_root + '/requirement_matrix', function (req, res) {
    res.render("requirement_matrix.html", {req: req, res: res, tr: tr});
});
app.get(uri_root + '/requirement_matrix_by_use_case', function (req, res) {
    res.render("requirement_matrix_by_use_case.html", {req: req, res: res, tr: tr});
});

app.get(uri_root + '/use_cases', function (req, res) {
    if (!g_project) {
        res.render("not_ready.ejs");
    } else {
        res.render('use_cases.html', {res: res});
    }
});
app.get(uri_root + '/project_view', function (req, res) {
    res.render('project_view.html', { req:req, res: res});
});
app.get(uri_root + '/wizard', function (req, res) {
    // get a fresh update from redmine ticket and update the cache
    res.render('wizard.html', { req:req, res: res});
});

/**
 */
app.get(uri_root + '/refresh', function (req, res) {

    launch_fetch_process(function(err){
        // get a fresh update from redmine ticket and update the cache
        load_tickets(function() {
            res.send("done");
        });

    });

});

app.get(uri_root + '/project.json', function (req, res) {

    var s = require("serialijse");
    console.log(" project.url_issue = ".red,g_project.url_issue);

    g_project.saveString(function(err,serialiseString){
        res.send(serialiseString);
    });
});
app.get(uri_root + '/demo_project.json', function (req, res) {

    var s = require("serialijse");
    var project = require("./node_modules/redmine-kanban-core/test/fixture_fake_project_for_requirement_matrix").project;
    project.saveString(function(err,serialiseString){
        res.send(serialiseString);
    });
});

/**
 */
app.get(uri_root + '/timeline', function (req, res) {

    var today    = new Date(req.query.today || Today());
    var startDate = new Date(req.query.startDate || today);

    console.log(" start date".yellow, startDate);
    console.log(" today     ".yellow, today);
    var timeline = rck.build_time_line(startDate,today);
    console.log("time line ", timeline);
    res.send(timeline);
});





function extract_dates_from_query(req) {

    console.log("------ REQUEST".cyan);
    console.log(" req.query" ,req.query );
    console.log("   start Date         ".cyan,req.query.startDate);
    console.log("   end   Date         ".cyan,req.query.endDate);
    console.log("   today              ".cyan,req.query.today);
    console.log("   eta_expected       ".cyan,req.query.eta_expected);

    var today = new Date(req.query.today || Today());
    var startDate =  new Date( req.query.startDate || today.removeBusinessDay(10) );
    var endDate   =  new Date( req.query.endDate || startDate.addBusinessDay(10) );

    assert(g_project.startDate);
    assert(g_project.hasOwnProperty("startDate"));

    if (startDate.getTime() < g_project.startDate.getTime()  ) {
        startDate =   g_project.startDate;
    }

    if (today.getTime()< startDate.getTime()) {
        today =  startDate.addBusinessDay(10);
    }

    if (endDate.getTime()< startDate.getTime()) {
        endDate =  startDate.addBusinessDay(10);
    }

    if (endDate.getTime() > g_project.lastUpdatedDate.getTime()  ) {
        endDate =   g_project.lastUpdatedDate;
    }
    if (today.getTime() > g_project.lastUpdatedDate.getTime()  ) {
        today =   g_project.lastUpdatedDate;
    }


    if (endDate.getTime()< today.getTime()) {
        endDate =  today.addBusinessDay(10);
    }



    var eta_expected = new Date(req.query.eta_expected || endDate );

    console.log(" start Date         ".yellow,my_formatDate(startDate));
    console.log(" end   Date         ".yellow,my_formatDate(endDate));
    console.log(" today              ".yellow,my_formatDate(today));
    console.log(" eta_expected       ".yellow,my_formatDate(eta_expected));

    assert(startDate.getTime() < endDate.getTime(), "invalid startEnd / endDate");

    var options = {
        startDate: startDate,
        endDate:   endDate,
        today:     today,
        eta_expected: eta_expected
    };
    return options;

}


app.get(uri_root + '/project_info.json', function(req,res){

    var result = {
        projectName:   configuration.project,
        startDate: configuration.startDate.toISOString(),
        etaDate:   configuration.eta_expected.toISOString()
    };
    res.send(result);
});

app.get(uri_root + '/statistics.json', function (req, res) {


    var tickets = get_tickets() || [];
    var filterOptions = build_filter_options(req);
    tickets = apply_filters(tickets, filterOptions);

    var options = extract_dates_from_query(req);
    var statistics = rck.statistics(tickets,options);

    statistics.startDate =  g_project.startDate;
    statistics.etaDate   =  g_project.eta_expected;

    console.log(require("util").inspect(statistics,{colors: true, depth:10}));

    statistics.forecasts = [];
    statistics.forecasts.push(statistics.forecast(0));
    statistics.forecasts.push(statistics.forecast(10));
    statistics.forecasts.push(statistics.forecast(50));
    statistics.forecasts.push(statistics.forecast(100));

    // res.send(JSON.stringify(statistics, null, " "));
    res.send(statistics);

});
/**
 */
app.get(uri_root + '/series.json', function (req, res) {

    var options = extract_dates_from_query(req);

    var tickets = get_tickets() || [];

    var filterOptions = build_filter_options(req);
    tickets = apply_filters(tickets, filterOptions);

    if (tickets.length === 0 ) {
        console.log(" EMPTY SET".red);
        res.send(500,{});

    } else {
        var timeline = rck.build_time_line(options.startDate,options.today);

        var values = {};

        values.Day = {name: "Day", type: "string", data: timeline.map(my_formatDate) };

        var wip = rck.calculate_progression(tickets, timeline, 1);
        values.work_in_progress = {};
        for (var p in wip) {
            if (wip.hasOwnProperty(p)) {
                values.work_in_progress[p] = wip[p];
            }
        }

        var alt = rck.average_lead_time_progression(tickets, timeline, 5);
        values.lead_time = {};
        _.keys(alt).forEach(function(p){values.lead_time[p] = alt[p]; });

        var thru = rck.throughput_progression(tickets, timeline, 30);
        values.throuhput = {};
        _.keys(thru).forEach(function(p){values.throuhput[p] = thru[p]; });

        res.status(200).send(values);

    }
});





var port = 3000;
console.log("  listening to port ", port);
app.listen(port);
console.log("' visit : http://localhost:" + port + "" + uri_root + '/dashboard');
