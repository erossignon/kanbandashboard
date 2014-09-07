/* global describe, it, require */
"use strict";

var fs = require("fs");
var should =require("should");
var rk =require("../redminekanban");
var rkc = require("redmine-kanban-core");

describe("testing redmine kanban",function(){

    it("should",function(done){


        var str = fs.readFileSync(__dirname + "/" + "fixture_ticket_redmine.json");

        var o = JSON.parse(str);

        rk.setConfiguration(__dirname + "/" + "configuration_test.js");

        rk.simplify_redmine_ticket(o.issue,function(err,workitem){


            var startDate= workitem.find_starting_date().removeBusinessDay(2);
            var endDate = workitem.find_completion_date().addBusinessDay(3);
            var timeline = new rkc.build_time_line(startDate,endDate);

            console.log(workitem.progress_bar(timeline));

            // now save
            require("serialijse").declarePersistable(rkc.WorkItem);
            var serializeString = require("serialijse").serialize(workitem);
            var workitem2 = require("serialijse").deserialize(serializeString);

            workitem.progress_bar(timeline).should.eql(workitem2.progress_bar(timeline))

            done(err);
        });
    });
});