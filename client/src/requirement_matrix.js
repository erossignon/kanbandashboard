
var rkc = require("redmine-kanban-core");
//var angular = require("angular");
//

var app = angular.module('kanbanApp', ['ui.bootstrap','treeGrid','googlechart','gettext']);

app.filter("startFrom",function() {
    return function(input,start) {
        start = parseInt(start,10);
        if (!input) {
            return [];
        }
        return input.slice(start);
    };
});

app.controller("RequirementMatrixController", function  MyAppController($scope, $http ,gettext,gettextCatalog) {


    $scope.hello = "World";


    $scope.currentPage  = 0;
    $scope.itemsPerPage = 50;

    $scope.project = new rkc.Project();

    $scope.prevPage = function( ) { if ($scope.currentPage>0) { $scope.currentPage--; } }
    $scope.nextPage = function( ) { if ($scope.currentPage< $scope.pageCount()) { $scope.currentPage++; } }
    $scope.pageCount = function( ) { Math.ceil($scope.project.requirements/$scope.itemsPerPage); }
    $scope.prevPageDisable = function( ) { return ($scope.currentPage==0) ? "disabled" : ""; }
    $scope.nextPageDisable = function( ) { return ($scope.currentPage == $scope.pageCount()) ? "disabled" : ""; }



    $http.get('/kanban/project.json', { params: {} }).success(function (data) {



            $scope.project.loadString(data,function(err) {
                $scope.project.associate_use_case_and_user_stories();
                $scope.project.associate_requirements();
                $scope.project.calculate_requirement_coverage();

                $scope.project._requirements = $scope.project.requirements;



                console.log($scope.project.nb_work_items);

            });

        });

    $scope.get_tree_data = function(requirement) {

        if (requirement.__cached) { return requirement.__cached; }

        var data = [];

        requirement.use_case_details.forEach(function(detail){

            var tmp = {

                "issue_id": detail.use_case.id,
                "percent":  detail.percent_done,
                "subject": detail.use_case.subject,
                "collapsed": false

            };
            detail.user_stories.forEach(function(us) {
                tmp.children = tmp.children || [];
                tmp.children.push({
                   "issue_id": us.id,
                   "percent":  us.percent_done(),
                   "subject": us.subject
               });
            });
            data.push(tmp);

        });


        if (data.length === 0 ) {
            data.push({
                "issue_id": 0,
                "percent":  "none",
                "subject": "none",
            });
        }

        if (requirement.extra_user_stories.length >0 ) {

            var tmp = {
                "issue_id": 0,
                "percent": 0,
                "subject": "orphan us",
                "collapsed": false
            };
            data.push(tmp);
            tmp.children = tmp.children || [];
            requirement.extra_user_stories.forEach(function(us) {
                tmp.children.push({
                    "issue_id": us.id,
                    "percent":  us.percent_done(),
                    "subject": us.subject,
                });
            });
        }

        requirement.__cached = data;
        return  requirement.__cached;

    }

 });

