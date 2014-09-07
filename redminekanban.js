/* global require, exports, console */
"use strict";

/*
 * --------------------------------------------------------------------------------------------------------------------
 *
 * --------------------------------------------------------------------------------------------------------------------
 *  note :inspiration for login https://github.com/alexyoung/nodepad/blob/master/models.js
 */
var fs = require('fs');
var path = require('path');
var https = require('https');
var http = require('http');
var assert = require('assert');
var async = require("async");

var rkc = require('redmine-kanban-core');
var redmine_api = require('redmine-api');
var RedmineWebServer = redmine_api.RedmineWebServer;
var _ = require('underscore');

function isoDateTime(d) {
    "use strict";
    var curr_date = d.getDate();
    var curr_month = d.getMonth() + 1; //Months are zero based
    var curr_year = d.getFullYear();
    return curr_year + "/" + curr_month + "/" + curr_date;
}

var g_adaptor = null; // require("./redmineCustomisation");

function setRedmineAdaptor(adaptor) {
    g_adaptor = adaptor;
}

var g_configuration= null;

exports.setConfiguration = function(configuration_script) {


    if (!fs.existsSync(configuration_script)) {
        console.log("  Error: redmine kanban.js cannot find its configuration file");
        console.log("  please create a configuration.js file ");
        console.log("  you can find a example at configuration.js.example");
        throw new Error("Invalid configuration file : "+ configuration_script);
    }

    var configuration = require(configuration_script).config;

// xxvar configuration = JSON.parse(fs.readFileSync("configuration.json", "utf8"));
    assert(configuration.url !== null); // must end with /
    //xx assert(configuration.username);
    //xx assert(configuration.password);
    //xx assert(configuration.api_key);
    assert(configuration.startDate);

    configuration.startDate = new Date(configuration.startDate);

    var cache_folder = 'cache/';
    if (configuration.cache_folder) {
        cache_folder = configuration.cache_folder;
    }

    var adaptor = require(configuration_script).adaptor;
    assert(adaptor, "configuration must have a redmine g_adaptor ");

    setRedmineAdaptor(adaptor);

    g_configuration =  configuration;
    return configuration;

};

var WorkItem = require("redmine-kanban-core/lib/workitem").WorkItem;

function redmine_parent(redmine_ticket) {

  if (!redmine_ticket.parent) {
    return "noparent";
  }
  return redmine_ticket.parent.id;
}

/**
 * simplify a redmine json ticket and turn
 * it to our internal WorkItem
 *
 * the method calls next(us) with the simplified object
 * next(us);
 */
/**
 *
 * @param redmine_ticket
 * @param callback {Function}
 * @param callback.err {Error|null}
 * @param callback.item {WorkItem|null}
 */
function simplify_redmine_ticket(redmine_ticket, callback) {

  assert(redmine_ticket.journals);

  var workitem = new WorkItem();
  workitem.id = redmine_ticket.id;
  workitem.project = redmine_ticket.project.name;
  workitem.subject = redmine_ticket.subject;
  workitem.type = g_adaptor.redmine_ticket_type(redmine_ticket);
  workitem.created_on = new Date(redmine_ticket.created_on);
  workitem.updated_on = new Date(redmine_ticket.updated_on);

  workitem.fixed_version = "";
  workitem.current_status = "New";

  if (redmine_ticket.fixed_version) {
    var unplanned = g_adaptor.redmine_check_unplanned(redmine_ticket);
    if (!unplanned) {
      workitem.fixed_version  = redmine_ticket.fixed_version.name;
      workitem.current_status = g_adaptor.redmine_simple_status(redmine_ticket.status.id);
    } else {
       workitem.fixed_version  = "unplanned";
       workitem.current_status = "unplanned";
    }
  }

  workitem.priority = redmine_ticket.priority.name;
  workitem.complexity = g_adaptor.redmine_complexity(redmine_ticket);

  workitem.journal = detect_status_change(redmine_ticket);

  workitem.parent_id = redmine_parent(redmine_ticket);
  workitem.done_ratio = redmine_ticket.done_ratio;


  // relations
  if (redmine_ticket.relations) {
      workitem.relations = redmine_ticket.relations.map(function (r) { return  r.issue_id; });
  }

  //xx // fix done ratio
  //xx workitem.adjust_done_ratio();

  callback(null,workitem);

}
exports.simplify_redmine_ticket = simplify_redmine_ticket;

/* construct the status change journal of redmine issue,
 * in a more manageable form and produce a journal
 */
function detect_status_change(redmine_ticket) {
    "use strict";
    var jo = [];
    var journals = redmine_ticket.journals;


    var current_status = "unknown";
    function set_status_at_date(date,old_status,new_status) {

        if (jo.length===0) {
            jo.push({
                date: new Date(redmine_ticket.created_on),
                old_value: current_status,
                new_value: old_status
            });
            current_status =  old_status;
        }
        if ( new_status != current_status) {
            jo.push({
                date: new Date(date),
                old_value: current_status,
                new_value: new_status
            });
            current_status = new_status;
        }
    }


    var current_projet = "unplanned";
    journals.forEach(function (jentry) {
        // scan details sections
        for (var i in jentry.details) {
            var detail = jentry.details[i];
            if (detail.name === "fixed_version_id") {
                var p1 = g_adaptor.redmine_is_projectid_unplanned(detail.old_value);
                var p2 = g_adaptor.redmine_is_projectid_unplanned(detail.new_value);
                console.warn(" id =", redmine_ticket.id, "   ", jentry.created_on, "  : P  ", detail.old_value,p1, "-> ", detail.new_value,p2);
                if (p2 === false ) {
                    // gone to unplanned
                    set_status_at_date(jentry.created_on, current_status,"unplanned");
                    return;
                }
            }
            if (detail.name === "status_id") {
                var s1 = detail.old_value;
                var s2 = detail.new_value;
                //xx console.warn(" id =", redmine_ticket.id, "    ", jentry.created_on, "  :  ", g_adaptor.redmine_simple_status(s1), " -> ", g_adaptor.redmine_simple_status(s2))
                var old_value =  g_adaptor.redmine_simple_status(s1);
                var new_value =  g_adaptor.redmine_simple_status(s2);
                set_status_at_date(jentry.created_on,old_value,new_value);
            }
        }
    });
    return  jo;
}

function dump_cvs_file(filename, issues) {
  var header = ["project", "id", "type"];
  header = header.map(function (el) {
    return '"' + el + '"';
  });
  var startDate = new Date(configuration.startDate);
  var timeline = rkc.build_time_line(startDate);
  header = header.concat(timeline.map(function (d) {
    return isoDateTime(d);
  }));
  var stream = fs.createWriteStream(filename);
  stream.once('open', function (fd) {
    // write header
    var str = header.join(';');
    console.log("  dumping ... csv", issues.length, " in ", filename);
    stream.write(str);
    stream.write("\n");
    for (var i in issues) {
      var issue = issues[i];
      var fields = [];
      fields.push(issue.project);
      fields.push(issue.id);
      fields.push(issue.type);

      var s = issue.subject;
      s.replace(/\"/g, "'");
      // fields.push('"'+s+'"');

      for (var t in timeline) {
        var d = timeline[t];
        var s = issue.find_status_at_date(d);
        fields.push(s.substring(0, 1));
      }
      str = fields.join(';');
      stream.write(str);
      stream.write("\n");
    }
  });
}
exports.dump_cvs_file = dump_cvs_file;




/**
 *
 * @param options
 * @param callback
 */
exports.load_all_work_items= function(callback) {

   var options = g_configuration;

   var redmine = new RedmineWebServer(g_configuration);

   var ignored_tracker = {};
   redmine.load_all_tickets(options,function(err,redmine_tickets){

       if (!err) {

           async.map(redmine_tickets,function(redmine_ticket,inner_callback){
               if (g_adaptor.redmine_ticket_type(redmine_ticket) !== "??") {
                   simplify_redmine_ticket(redmine_ticket,inner_callback);
               } else {
                   var tracker = redmine_ticket.tracker.name;
                   if (!(tracker  in ignored_tracker)) {
                       console.log(" ignoring ",redmine_ticket.tracker.name);
                       ignored_tracker[tracker] = tracker;
                   }
                   inner_callback(null,null);
               }

           } ,function(err,work_items){
               console.log(" converted : ",work_items.length,"tickets");
               work_items =  work_items.filter(function(wi){ return wi !==null;});
               callback(err,work_items);
           });

       } else {
           console.log(" ERROR".red,err.message);
           console.log("  STACK".red,err.stack);
           console.log( redmine._projects);
           callback(err);
       }
   });
};


function anonymize_workitems(workitems,callback) {

    assert(_.isArray(workitems));
    assert(_.isFunction(callback));

    var use_case_counter = 0;
    var user_story_counter = 0;


    function anonymize(workitem) {

        var new_subject = "<subjet>";

        workitem.project = "P1";

        switch (workitem.type) {
            case "U-C":
                new_subject = "[Use Case " + (use_case_counter++) + "] description";
                break;
            case "U-S":
                new_subject = "[User Story " + (user_story_counter++) + "] description";
                break;
            case "ARB":
                new_subject = "Arbitrage";
                break;
            case "Test Case":
                new_subject = "Test Case";
                break;
            case "BUG":
                new_subject = "BUG #" + workitem.id;
        }
        workitem.subject = new_subject;
        //xx console.log(ticket);
        return workitem;
    }
    workitems = workitems.map(anonymize);

    callback(null, workitems);
}

exports.buildWorkItemDatabaseFromCache = function(callback) {

    exports.load_all_work_items(function(err,workitems) {

        if(err) {
            console.log(" buildWorkItemDatabaseFromCache : load_all_work_items has failed");
            return callback(err);
        }

        var nullTrans = function(tickets,callback) {
            callback(null,tickets);
        };

        function persist_workitems(workitems,callback) {
            // persist tickets to database
            var project = new rkc.Project();
            workitems.forEach(function(workitem) { project.add_work_item(workitem);});

            var filename = path.join(g_configuration.cache_folder,"database.db");
            project.save(filename,function(err){
                console.log("saved...");
                console.log(" Start Date   ", project.startDate);
                console.log(" Last  Update ", project.lastUpdatedDate);
                callback(err);
            });
//                    var serialize = require("serialijse").serialize;
//                    var serializeString = serialize(project);
//                    var stream = fs.createWriteStream(filename);
//                    stream.on('open', function (fd) {
//                        stream.write(serializeString);
//                        stream.end();
//                    }).on("finish",function(){
//                        console.log("saved...");
//                        callback(err);
//                    });
        }
        //var trans = anonymize_workitems;  // nullTrans;
        var trans = nullTrans;
        trans(workitems,function(err,workitems){
            if (!err) {
                persist_workitems(workitems,callback);
            } else {
                callback(err);
            }
        });

    });

};

exports.updateRedmineTicketCache = function(project,callback) {

    assert(_.isFunction(callback));
    var s = new RedmineWebServer(g_configuration);
    s.fetchProjectIssues(project, function (err) {
        s.load_all_tickets({project:project},function (err, redmine_issues) {

            exports.buildWorkItemDatabaseFromCache(callback);

        });
    });

};

