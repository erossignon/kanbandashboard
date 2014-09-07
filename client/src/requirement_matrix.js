
var rkc = require("redmine-kanban-core");
//var angular = require("angular");
//
angular
.module('kanbanApp', ['ui.bootstrap','treeGrid','googlechart','gettext'])
.controller("RequirementMatrixController", function  MyAppController($scope, $http ,gettext,gettextCatalog) {

    $scope.hello = "World";
    $scope.project = new rkc.Project();

        $http.get('/kanban/demo_project.json', { params: {} }).success(function (data) {
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

                "ID": detail.use_case.id,
                "percent":  detail.percent_done,
                "subject": detail.use_case.subject,

            };
            detail.user_stories.forEach(function(us) {
                tmp.children = tmp.children || [];
                tmp.children.push({
                   "ID": us.id,
                   "percent":  us.percent_done(),
                   "subject": us.subject
               });
            });
            data.push(tmp);

        });
        if (data.length === 0 ) {
            data.push({
                "ID": "none",
                "percent":  "none",
                "subject": "none",
            });
        }
        requirement.__cached = data;
        return  requirement.__cached;

    }

 });

