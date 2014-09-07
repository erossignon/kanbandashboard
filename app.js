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

var argv = require('optimist')
    .usage("  ")
    .demand("config")
    .describe('config', 'specify the configuration js file')
    .argv;


var configuration_script = __dirname + "/" + argv.config;
var configuration = require(configuration_script).config;

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

    g_project = null;
    var project = new Project();
    project.load(filename, function (err) {
        g_project = project;
        next(project._work_items);
    });
}

console.log(" file = ", filename , fs.existsSync(filename));

if (!fs.existsSync(filename)) {
    console.log(" Warning : ",filename , " doesn't exist");
    console.log(" make sure you've run 'redmineExtract --config "+ argv.config, "' at least once");
    process.exit(-200);
};

fs.watch(filename, function (event, filename) {
    load_tickets(function(){
        console.log(" reloaded filename " +filename);
    });
});

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


app.use('/', express.static(__dirname + '/public'));
app.use('/', express.static(__dirname + '/bower_components'));
app.use('/redmine-kanban-core', express.static(__dirname + '/node_modules/redmine-kanban-core/'));


app.get(uri_root + '/dashboard', function (req, res) {
    res.render("dashboard.html", {req: req, res: res, tr: tr});
});

app.get(uri_root + '/requirement_matrix', function (req, res) {
    res.render("requirement_matrix.html", {req: req, res: res, tr: tr});
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
    // get a fresh update from redmine ticket and update the cache
    load_tickets(function() {
        res.send("done");
    });

});

app.get(uri_root + '/project.json', function (req, res) {

    var s = require("serialijse");
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
    console.log(" req.query" ,req.query );

    console.log(" start Date         ".cyan,req.query.startDate);
    console.log(" end   Date         ".cyan,req.query.endDate);
    console.log(" today              ".cyan,req.query.today);
    console.log(" eta_expected       ".cyan,req.query.eta_expected);

    var today = new Date(req.query.today || Today());
    var startDate =  new Date( req.query.startDate || today.removeBusinessDay(10) );
    var endDate   =  new Date( req.query.endDate || startDate.addBusinessDay(10) );

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
        eta_expected: eta_expected,
    };
    return options;

}
app.get(uri_root + '/statistics.json', function (req, res) {


    var tickets = get_tickets() || [];
    var filterOptions = build_filter_options(req);
    tickets = apply_filters(tickets, filterOptions);

    var options = extract_dates_from_query(req);
    var statistics = rck.statistics(tickets,options);

    console.log(require("util").inspect(statistics,{colors: true, depth:10}));

    statistics.forecasts = [];
    statistics.forecasts.push(statistics.forecast(0));
    statistics.forecasts.push(statistics.forecast(10));
    statistics.forecasts.push(statistics.forecast(50));
    statistics.forecasts.push(statistics.forecast(100));

    res.send(JSON.stringify(statistics, null, " "));


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

        res.send(200,values);

    }
});





var port = 3000;
console.log("  listening to port ", port);
app.listen(port);
console.log("' visit : http://localhost:" + port + "" + uri_root + '/dashboard');
