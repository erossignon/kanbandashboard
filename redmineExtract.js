//#!/usr/bin/env node
/*jshint node:true*/
/*global:require*/
/**
 *
 *
 */
var fs = require('fs');
var path = require('path');
var Today = require("redmine-kanban-core").Today;

var rkc = require("redmine-kanban-core");
var get_projet_names = rkc.get_projet_names;
var get_creation_date = rkc.get_creation_date;
var get_starting_date = rkc.get_starting_date;
var get_last_updated_date = rkc.get_last_updated_date;

var dateToYMD = rkc.dateToYMD;

var redmine_importer = require("./redminekanban");
var assert = require("assert");

var command = "redmineExtract";

var argv = require('optimist')
        .usage(
            "usage \n" +
            "\n  to fetch workitems from a redmine server and store them in a cache :\n" +
            "      " + command + " --fetch --config configuration_project.js\n" +
            "\n  to recreate the workitem database from the cache (without accessing the redmine server):\n" +
            "      " + command + " --refresh  [--anonymize] --config configuration_project.js\n"
        )
        .demand('config')
        .alias('f', 'fetch')
        .alias('r', 'refresh')
        .alias('d', 'dump')
        .alias('p', 'project')
        .alias('l', 'alt')
        .alias('t', 'type_filter')
        .alias('w', 'wip')
        .alias('e', 'calculate_eta')
        .alias('a', 'anonymize')
        .describe('config', 'specify the configuration js file')
        .describe('fetch', 'fetch the json file from redmine server')
        .describe('refresh', 'refresh the workitem database')
        //xx   .describe('project', 'specify the project or the list of project on which to apply the commands')

        .describe('alt', 'dump average lead times')
        .describe('wip', 'dump average wip progress ')
        .describe('type_filter', 'type of tickets (U-S,U-C,ARB,BUG)')
        .describe('dump', 'dump')
        .describe('dump_tests', 'dump_test')
        .describe('calculate_eta', 'calculate_eta')
        .describe('startDate', "specify the startDate")
        .describe('today', "overwrite today's date")
        .describe('anonymize',' anonymize intermediate database')
        .describe('rqcsv',' export requirement as CSV file')

        .argv
    ; // node-optimist


var configuration_script = __dirname + "/" + argv.config;
var configuration = redmine_importer.setConfiguration(configuration_script);


function main() {


    if (argv.today) {
        Today.set(argv.today);
    }
    var today = Today();

    console.log(" current date       => ", Today());

    if (argv.fetch) {
        console.log(" update cache by requesting issues for project", configuration.project, " out of redmine server....");
        console.log(" redmine server ",configuration.url);
        redmine_importer.updateRedmineTicketCache(configuration.project, function () {
            console.log("done");
        });
        return;
    }

    if (argv.refresh) {
        console.log(" recreating work item database from cache ....");
        redmine_importer.buildWorkItemDatabaseFromCache(function () {
            console.log("done");
        });
        return;
    }

    var filename = path.join(configuration.cache_folder,"database.db");

    var project = new rkc.Project();

    var url     = configuration.url;
    var project_name = configuration.project;
    project.url_issue = url+ "/issues/%d";


    project.load(filename, function (err) {

        if (err) {
            console.log("abandoned...");
            console.log("err",err);
            return;
        }
        var tickets = project._work_items;

        var projects = get_projet_names(tickets);
        var creationDate = get_creation_date(tickets);
        var startDate = get_starting_date(tickets);

        var endDate = get_last_updated_date(tickets);

        if (argv.startDate) {
            startDate = new Date(argv.startDate);
        }
        if (argv.endDate) {
            endDate = new Date(argv.endDate);
        }

        console.log(" project start date => ", creationDate);
        console.log(" project start date => ", startDate);
        console.log(" project end   date => ", endDate);

        console.log(" number of tickets before", tickets.length);

        console.log("-----------------------------------------------------------------------");
        //xx fs.writeFileSync('toto.json',JSON.stringify(tickets,null," "));

        //xx // filter on project
        //xx console.log("  filtering on  projects", modules," ",tickets.length, " tickets before");
        //xx var ticketsBAD = tickets.filter(function(ticket) { return  modules.indexOf(ticket.project)<0; });
        //xx tickets = tickets.filter(function(ticket) { return  modules.indexOf(ticket.project)>=0; });
        //xx console.log("  filtering on  projects", modules," ",tickets.length, " tickets remaining");
        //xx console.log("-----------------------------------------------------------------------");
        //xx console.log(" bad ",ticketsBAD[0]);

        if (tickets.length === 0) {
            console.log("nothing to do");
            return;
        }

        argv.type_filter = argv.type_filter | "";

        // all the information are now available for treatment
        if (argv.type_filter) {
            var allowed_values = argv.type_filter.split(',');
            tickets = tickets.filter(function (ticket) {
                return allowed_values.indexOf(ticket.type) > -1;
            });
            console.log("  filtering on type ", allowed_values, " ", tickets.length, " tickets remaining");
        }

        if (argv.dump_cvs) {
            redmine_importer.dump_cvs_file("toto.csv", tickets);
            console.log("done");
        }
        if (argv.alt) { // average lead time
            var tl = rkc.build_time_line(startDate, today);
            var alt = rkc.average_lead_time_progression(tickets, tl, 30);

            console.log(JSON.stringify(alt));
        }
        if (argv.wip) { // average work in progress
            var tl = rkc.build_time_line(startDate, today);
            var wip = rkc.calculate_progression(tickets, tl, 30);
            var tp = rkc.throughput_progression(tickets, tl, 30);
            console.log(JSON.stringify(wip));
            console.log(JSON.stringify(tp));
        }
        if (argv.dump) {
            console.log('dumping use cases', tickets.length);
            rkc.dump_use_cases(project, startDate, endDate, today);
            console.log("done!");
        }
        if (argv.calculate_eta) {
            //

            var options = {
                startDate: startDate,
                eta_expected: "2012/12/31",
                today: today
            };

            var s = rkc.statistics(tickets);
            console.log("");
            console.log("");
            console.log("");
            console.log('number of delivered user stories since beginning of the project         : ', s.nb_delivered_us);
            console.log('number of known bugs or improvements                                    : ', s.nb_known_defects);
            console.log('ratio bugs/evo created per delivered user story in average              : ', s.ratio_defect_per_us);
            console.log("");

            console.log('US-WIP: number of user stories currently engaged but not fully completed: ', s.nb_in_progress_us);
            console.log('US-???: number of unplanned user stories                                : ', s.nb_unplanned_us);

            console.log('number of known user stories in the backlog but not started yet         : ', s.nb_new_us);
            console.log("");
            console.log('number of bug in progress                                               : ', s.nb_in_progress_defects);
            console.log("");
            console.log('velocity of defects resolution           ', s.velocity_defects, " defects fixed per working day (including other work) ");
            console.log('                                     was ', s.velocity_defects_last_month, " last month ");
            console.log('velocity of user stories implementation  ', s.velocity_us, " user stories delivered per working day (including other work)");
            console.log('                                     was ', s.velocity_us_last_month, " last month ");
            console.log('lead time of defects resolution          ', s.average_defects_lead_time, " days ");
            console.log('                                     was ', s.average_defects_lead_time_last_month, " last month ");
            console.log('lead time of user stories implementation ', s.average_user_story_lead_time, " days");
            console.log('                                     was ', s.average_user_story_lead_time_last_month, " last month ");

            console.log("velocity_defects_last_month", s.velocity_defects_last_month);
            console.log("velocity_us_last_month", s.velocity_us_last_month);
            console.log('speeding up factor                       ', s.speedup_factor1, ' to apply to velocity of defects resolution when all users stories are finished');
            console.log('speeding up factor                       ', s.speedup_factor2, ' to apply to velocity of defects resolution when all users stories are finished');


            // different scenarios with number of added user-stories to complete project
            var scenario = [ 0, 10];

            var padding = "     ";

            scenario.forEach(function (nb_incoming_us) {

                var forecast = s.forecast(nb_incoming_us);

                console.log("");
                console.log("-------  scenario ", forecast.nb_incoming_us, "new user stories added to complete the project");
                console.log(padding, 'estimated number of generated defects           ', forecast.estimated_number_of_future_defects);
                console.log(padding, "number of fixed defect during mixed period      ", forecast.number_of_fixed_defect_during_mixed_period);
                console.log(padding, "remaining defect to fix after us_story done     ", forecast.remaining_defect_during_fast_period);
                console.log(padding, "number of days to fixed remaining defect fast   ", forecast.number_of_days_to_fixed_remaining_defect_fast1, " ", Math.round(s.velocity_defects * s.speedup_factor1 * 100) / 100, " defects per day");

                console.log(padding, "number of days to fixed remaining defect fast   ", forecast.number_of_days_to_fixed_remaining_defect_fast2, " ", Math.round(s.velocity_defects * s.speedup_factor2 * 100) / 100, " defects per day");

                console.log(" W ( estimated working days for the team to complete the project) ", forecast.nb_calendar_days_to_completion2 + forecast.number_of_days_to_fixed_remaining_defect_fast1)
                console.log(padding, " Very optimistic  Estimated Date of Arrival   : ", dateToYMD(forecast.eta_very_optimistic), " based on us resolution velocity");
                console.log(padding, "      optimistic  Estimated Date of Arrival   : ", dateToYMD(forecast.eta_optimistic_with_one_month_stab), " with one month stabilisation");
                console.log(padding, "      probable    Estimated Date of Arrival   : ", dateToYMD(forecast.eta_probable), " taking user stories velocity + speed up factor 1 ");

                console.log(padding, "      pessimistic Estimated Date of Arrival   : ", dateToYMD(forecast.eta_pessimistic), " taking user stories velocity + speed up factor 2 ");

                // user_stories.forEach(function(t){ console.log("  Getting Series : ", t.id, t.project, t.type, t.subject);});
                // console.log(padding,"  Getting Series    : ", user_stories.length, " tickets to scan");

            });
        }
        if (argv.rqcsv) {
            console.log(' dumping requirement in csv');
            var filename = "export.csv";
            project.associate_use_case_and_user_stories();
            project.associate_requirements();
            project.export_requirement_coverage_CSV(filename,function(err) {
                console.log("done...");
            });

        }
        if (argv.dump_tests) {
            console.log(' dumping test cases');
            tickets.forEach(function (ticket) {

                if (ticket.type === "Test Case") {

                    var user_stories = [];

                    console.log(ticket.id, ticket.subject, ticket.parent_id, ticket.relations);

                    if (ticket.parent_id !== "noparent") {

                        var p = tickets.filter(function (t) {
                            return t.id === ticket.parent_id;
                        })[0];
                        if (p) {
                            console.log("    Parent ", ticket.parent_id, p.type, p.id, p.subject);
                            if (p.type === "U-S") {
                                user_stories.push(p.id);
                            }
                        } else {
                            console.log(" missing Parent with id ", ticket.parent_id);
                        }
                    }
                    // now iterate on relations
                    if (ticket.relations) {

                        ticket.relations.forEach(function (r) {
                            var p = tickets.filter(function (t) {
                                return t.id === r;
                            })[0];

                            if (p) {
                                console.log("    Parent ", ticket.parent_id, p.type, p.id, p.subject);

                                if (p.type === "U-S") {
                                    user_stories.push(p.id);
                                }

                            } else {
                                //  "Test"->"Task" -> "User Story"
                                console.warn(" Cannot find", r);
                            }
                        });
                    }
                    console.warn(" Nb users stories ", user_stories);
                }
            });
        }

    });
}

main();

