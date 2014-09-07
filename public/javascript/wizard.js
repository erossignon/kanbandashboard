var app = angular.module('kanbanApp',
    ['ui.bootstrap','gettext',
      'mgo-angular-wizard'
    ]);


app.directive("projectSelector", function() {
    return {
        restrict: "E",
        templateUrl: "/partials/project-selector.html",
        controller: function() {
            this.stuff = {};
            this.stuff.project= "";
        }
    };
});

app.controller("MyAppController",['$scope','$http','gettext', 'gettextCatalog','WizardHandler',
    function ($scope, $http, gettext, gettextCatalog, WizardHandler) {

    // window.onbeforeunload = function() { return "You work will be lost."; };

    gettextCatalog.currentLanguage = "fr";
    //xx gettextCatalog.debug = true;

    $scope.sample_list    = [ 'a' ,'b','c'];
    $scope.sample_possible_state = ['New' , 'In Progress' ,'Done', 'unplanned', 'unused'];


    $scope.url = "https://redmine-ext.euriware.fr/redmineDCNS";
    $scope.api_key = "6962619c0e7b1d6c605baa23c6d014123477de7f";

    $scope.projects = [];
    $scope.issue_statuses = [];
    $scope.stuff = {};
    $scope.stuff.project = null;

    function fetch_project(project,element,callback) {
        var path =$scope.url + "/projects/" + project +"/" + element + ".json";
        $http.get(path,{
            params: { key: $scope.api_key }
        }).success(function (data) {
            $scope[element] = data[element];
            callback();
        }).error(function (err) {
            console.log(err);
        });

    }
    function fetch(element,callback) {
        var path =$scope.url + "/" + element + ".json";
        $http.get(path,{
            params: { key: $scope.api_key }
        }).success(function (data) {
            $scope[element] = data[element];
            callback();
        }).error(function (err) {
            console.log(err);
        });
    }
    $scope.fetch_information = function() {

        fetch("projects",function() {
            if ($scope.project === null) {
            }
        });
        fetch("issue_statuses",function(){

        });
    };

    $scope.on_project_chosen = function(projectId) {
        fetch_project(projectId,"issue_categories",function(){


            fetch("trackers",function(){
                console.log("issue_categories =",$scope.issue_categories);
                console.log("trackers =",$scope.trackers);
                WizardHandler.wizard().next();
            });
        });
    };

    $scope.DoStuff =function() {
        var a = 1;
    };
}]);

app.directive("status_creator",function(){
    return {
        restrict: 'E',
        transclude: true,
        scope: {
            categories: "=",
            statuses: "="  ,
            options: "@"
        },
        controller: ['$scope', '$element', function ($scope, $element) {

        }],
        templateUrl: "/partials/status_creator.html"
    };
});


app.directive("multiSelector",function() {
    return {
        restrict: 'E',
        transclude: true,
        scope: {
            states: "=",
          list: "="  ,
          options: "@"
        },
        controller: ['$scope', '$element', function ($scope, $element) {

            $scope.debug = false;
            if ($scope.debug) {
                console.log(" list = ",$scope.list);
                console.log(" states = ",$scope.states);
            }
            $scope.options = $scope.options || "element.id as element.name for element ";



            $scope._selection = {

            };
            $scope.selector = function(name) {
              if (!$scope._selection[name]) {
                  $scope._selection[name]={
                      selection: [],
                      possible: []
                  };
              }
              return $scope._selection[name];
            };
            $scope.onSelectionChanged = function(/*name*/) {

                _.forEach($scope.states,function(current_state) {

                    var invalid = [];
                    _.forEach($scope.states, function (state) {
                        if (state !== current_state) {
                            invalid = invalid.concat($scope.selector(state).selection);
                            if ($scope.debug) {
                                console.log(" state = ", state, invalid);
                            }
                        }
                    });
                    if ($scope.debug) {
                        console.log(" invalid state for ", current_state);
                        console.log(" ", invalid);
                    }
                    var possible_state = _.filter($scope.list, function (element) {
                        return invalid.indexOf(element.id) === -1;
                    });
                    if ($scope.debug) {
                        console.log(" possible state for ", current_state);
                        console.log(" ", possible_state);
                    }
                    $scope.selector(current_state).possible =   possible_state;
                });

            };
            $scope.onSelectionChanged();

            $scope.combo_size = function() {
                return 30;
            };

        }],
        templateUrl: "/partials/multi-selector.html"
    };
});


//
//app.directive("wizard",function() {
//    return {
//        restrict: 'E',
//        transclude: true,
//        template: "<div style='border:10pt;background:dimgrey' ng-transclude> </div>",
//        controller: ['$scope', '$element', function ($scope, $element) {
//
//            $scope.selectedStep = null;
//            $scope.steps = [];
//            this.addStep = function(scope_step) {
//                $scope.steps.push(scope_step);
//
//            };
//
//            $scope.goTo = function(step) {
//                unselectAll();
//                $scope.selectedStep = step;
//                if (!_.isUndefined($scope.currentStep)) {
//                    $scope.currentStep = step.title || step.wzTitle;
//                }
//                step.selected = true;
//                $scope.$emit('wizard:stepChanged', {step: step, index: _.indexOf($scope.steps , step)});
//            };
//
//            function unselectAll() {
//                _.forEach($scope.steps,function (step) {
//                    step.selected = false;
//                });
//                $scope.selectedStep = null;
//            }
//        }],
//    };
//
//});
//
//app.directive("wzStep",function() {
//
//    return {
//        restrict :'E',
//        transclude: true,
//        template: "<div class='alert' style='border:10pt;background:aliceblue' ng-transclude> </div>",
//        scope: {
//            wzTitle: '@',
//            title: '@',
//            selected: false
//        },
//        require:"^wizard",
//
//        link: function($scope, $element, $attrs, wizard) {
//
//            $scope.title = $scope.title || $scope.wzTitle;
//
//            wizard.addStep($scope);
//        }
//
//    };
//});