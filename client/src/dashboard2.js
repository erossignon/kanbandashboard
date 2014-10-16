
function sum2array(array1, array2, a, b) {
    "use strict";
    var res = [];
    for (var i = 0; i < array1.length; i++) {
        res.push(array1[i] * a + array2[i] * b);
    }
    return res;
}

function round(value, n) {
    if (!n) n = 2;
    var coef = 100;
    return Math.round(value * coef) / coef;
}


function install_lead_time_graph(options, raw_data) {



    // Candle Stick
    // Create and populate the data table.
    var data = new google.visualization.DataTable();

    var days = raw_data["Day"].data;

    var lead_time = raw_data['lead_time'];

    var coef = 0.64; // Math.sqrt(2.0);

    lead_time.average_low = {};
    lead_time.average_low.data = sum2array(lead_time.average.data, lead_time.std_deviation.data, 1, -coef);
    lead_time.average_high = {}
    lead_time.average_high.data = sum2array(lead_time.average.data, lead_time.std_deviation.data, 1, coef);

    lead_time.tooltip = { data: []}
    for (var i = 0; i < days.length; i++) {
        lead_time.tooltip.data.push(
            "average" + " " + lead_time.average.data[i] + "\n"
        + "high" + " " + round(lead_time.average_high.data[i]) + "\n"
        + "low" + " " + round(lead_time.average_low.data[i]) + "\n"
        + "min" + " " + round(lead_time.min_value.data[i]) + "\n"
        + "max" + " " + round(lead_time.max_value.data[i]) + "\n"
        + "stddev" + " " + round(lead_time.std_deviation.data[i]) + "\n"
        + "calculated with" + lead_time.count.data[i] + " " + "values" + ")");
    }
    // extract column name
    var columns = [];
    columns.push({label: "Minimum", type: 'number', id: "min_value"});
    columns.push({label: "Average", type: 'number', id: "average_low"});
    columns.push({label: "Average", type: 'number', id: "average_high"});
    columns.push({label: "Maximum", type: 'number', id: "max_value"});
    columns.push({label: "tooltip", type: 'string', role: 'tooltip', id: "tooltip"});


    data.addColumn('string', 'days');
    for ( i in columns) {
        data.addColumn(columns[i]);
    }

    data.addRows(days.length);
    // setup date column
    for (i = 0; i < days.length; ++i) {
        data.setCell(i, 0, days[i]);
    }

    for (i = 0; i < columns.length; i++) {
        var series = lead_time[columns[i].id].data;
        for (var day = 0; day < series.length; ++day) {
            data.setCell(day, i + 1, series[day]);
        }
    }


    var chartObject = {
        type: "CandlestickChart",
        displayed:true,
        data:data,
        options: {
            title: options.title,
                // isStacked: true,
                // width: 1024,
            height: 400,
            vAxis: {title: "Lead Time"},
            hAxis: {title: "Day", showTextEvery: 5, slantedText: true, slantedTextAngle: 90}
        }
    };
    return chartObject;
}

function install_throughput_graph(options, raw_data) {

    var data = new google.visualization.DataTable();

    var days = raw_data["Day"].data;

    var throuhput = raw_data['throuhput'];


    // extract column name
    var columns = [];
    columns.push({full_name: "In", type: 'number', id: "through_in"});
    columns.push({full_name: "Out", type: 'number', id: "through_out"});

    data.addColumn('string', 'days')

    for (var i in columns) {
        var column = columns[i];
        data.addColumn(column.type, column.full_name, column.full_name);
    }

    data.addRows(days.length);

    // setup date column
    for ( i = 0; i < days.length; ++i) {
        data.setCell(i, 0, days[i]);
    }

    for ( i = 0; i < columns.length; i++) {
        var serieS = throuhput[columns[i].id].data;
        for (var day = 0; day < serieS.length; ++day) {
            data.setCell(day, i + 1, serieS[day]);
        }
    }

    var chartObject = {
        type: "LineChart",
        displayed: true,
        data: data,
        options: {
            title: options.title,
            // isStacked: true,
//            width: 1024,
            height: 400,
            vAxis: {title: "Velocity" },
            hAxis: {title: "Day", showTextEvery: 5, slantedText: true, slantedTextAngle: 90}
        }
    };
    return chartObject;

}


function install_cumulative_graph(options, raw_data) {


    // Create and populate the data table.
    var data = new google.visualization.DataTable();

    var days = raw_data.Day.data;

    var work_in_progress = raw_data.work_in_progress;

    // extract column name
    var columns = [];
    columns.push({full_name: "Done",        id: "done"});
    columns.push({full_name: "In Progress", id: "in_progress"});
    columns.push({full_name: "Planned",     id: "planned"});
    columns.push({full_name: "Proposed",    id: "proposed"});


    data.addColumn('string', 'days');
    for (var i in columns) {
        var column = columns[i];
        data.addColumn('number', column.full_name, column.full_name.substring(0, 2));
    }
    data.addRows(days.length);

    for (i = 0; i < days.length; ++i) {
        data.setCell(i, 0, days[i]);
    }

    for (i = 0; i < columns.length; i++) {
        var series = work_in_progress[columns[i].id].data;
        for (var day = 0; day < series.length; ++day) {
            data.setCell(day, i + 1, series[day]);
        }
    }
    var chartObject = {
        "type": "AreaChart",
        "displayed": true,
        data: data,
        options:{
            title: options.title,
            isStacked: true,
            // width: 1024,
            height: 400,
            vAxis: {title: "Cumulative Flow Chart"},
            hAxis: {title: "Day", showTextEvery: 5, slantedText: false, slantedTextAngle: 90}
        }
    };
    return chartObject;
}


angular.module('kanbanApp', ['ui.bootstrap','googlechart','gettext'])
       .controller("MyAppController", function  MyAppController($scope, $http ,gettext,gettextCatalog) {

    gettextCatalog.currentLanguage = "fr";
    gettextCatalog.debug = true;

    var myString = gettext("Hello");

    $scope.startDate = new Date("2011/12/01 15:00");
    $scope.endDate   = new Date("2011/12/02 15:00");
    $scope.todayDate = new Date();
    $scope.etaDate = new Date();


    $scope.minDate = "2010/01/01";
    $scope.format = "yyyy-MMM-dd";

    $scope.open = function ($event, element) {
        $event.preventDefault();
        $event.stopPropagation();
        $scope[element + "_opened"] = true;
    };

    $scope.dateOptions = {
        formatYear: 'yy',
        startingDay: 1
    };

    // Initial get start and ETA Date
    $http.get('/kanban/project_info.json', {cache:false,params: {}}).success(function (data) {

        $scope.startDate = new Date(data.startDate);
        $scope.etaDate =  new Date(data.etaDate);
        $scope.projectName = data.projectName;

        $scope.submit();
    });

    $scope.submit = function () {

        console.log($scope.todayDate,typeof $scope.todayDate);
        console.log($scope.endDate,typeof $scope.endDate);
        console.log("startDate",$scope.startDate,typeof $scope.startDate);
        console.log($scope.etaDate,typeof $scope.etaDate);
        var data = {
            //today: $scope.todayDate,
            //startDate: $scope.startDate,
            //endDate: $scope.endDate

            today: $scope.todayDate.toISOString(),
            endDate: $scope.endDate.toISOString(),
            startDate: $scope.startDate.toISOString(),
            eta_expected: $scope.etaDate.toISOString()
        };
        $http.get('/kanban/statistics.json', {cache:false,params: data}).success(function (data) {
            $scope.stats = data;
            //xx $scope.startDate = new Date(data.startDate);
            //xx $scope.etaDate = new Date(data.etaDate);
        });

        // xx alert( JSON.stringify(data),new Date($scope.todayDate));

        function cumulative(name,filter) {
            $http.get('/kanban/series.json', { params: {
                ticketType:filter,
                //today: $scope.todayDate,
                //startDate: $scope.startDate,
                //endDate: $scope.endDate
                today: $scope.todayDate.toISOString(),
                endDate: $scope.endDate.toISOString(),
                startDate: $scope.startDate.toISOString(),
            } }).success(function (data) {
                $scope[name+ "_CumulativeFlowDiagram"] =  install_cumulative_graph({title: "Cumulative Flow Diagram for " + filter},data);
                $scope[name+ "_LeadTime"] =  install_lead_time_graph({title: "Lead Time for " + filter},data);
                $scope[name+ "_Throughput"] =  install_throughput_graph({title: "Velocity for " + filter},data);
            });

        }
        cumulative("global","U-S,BUG,EVO");
        cumulative("us","U-S");
        cumulative("bug","BUG");


    };



});



