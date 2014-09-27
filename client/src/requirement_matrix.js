var rkc = require("redmine-kanban-core");

var app = angular.module('kanbanApp', ['ui.bootstrap','treeGrid','googlechart','gettext' ]);

app.controller("RequirementMatrixController", function  MyAppController($scope, $http ,gettext,gettextCatalog) {

    gettextCatalog.currentLanguage = "fr";
    gettextCatalog.debug = true;


    $scope.currentPage  = 0;
    $scope.itemsPerPage = 10;

    $scope.project = new rkc.Project();

    $scope.prevPage = function( ) { if ($scope.currentPage>0) { $scope.currentPage--; } }
    $scope.nextPage = function( ) { if ($scope.currentPage< $scope.pageCount()) { $scope.currentPage++; } }
    $scope.pageCount = function( ) { Math.ceil($scope.project.requirements/$scope.itemsPerPage); }
    $scope.prevPageDisable = function( ) { return ($scope.currentPage==0) ? "disabled" : ""; }
    $scope.nextPageDisable = function( ) { return ($scope.currentPage == $scope.pageCount()) ? "disabled" : ""; }

    $scope.visible_requirements = [];

    $scope.pageChanged = function() {
        console.log('Page changed to: ' + $scope.currentPage);

        var start = $scope.currentPage* $scope.itemsPerPage;
        var end = start + $scope.itemsPerPage;
        $scope.visible_requirements = $scope.project._requirements.slice(start,end);

    };

    $http.get('/kanban/project.json', { params: {} }).success(function (data) {


            $scope.project.loadString(data,function(err) {
                $scope.project.associate_use_case_and_user_stories();
                $scope.project.associate_requirements();
                $scope.project.calculate_requirement_coverage();

                $scope.project._requirements = $scope.project.requirements;

                $scope.pageChanged();

                console.log($scope.project.nb_work_items);

            });

    });

 });

