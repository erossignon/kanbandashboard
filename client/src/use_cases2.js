var rkc = require("redmine-kanban-core");

angular.module('kanbanApp', ['ui.bootstrap','treeGrid']).controller("MyAppController", function  MyAppController($scope, $http) {

    $scope.tree_data =  [  {id:"",subject:"" , percent:"%"} ];

    $scope.project = new rkc.Project();

    $http.get('/kanban/project.json').success(function(data) {
        $scope.project.loadString(data,function(err){
            $scope.project.associate_use_case_and_user_stories();
            console.log($scope.project);
            $scope.top_level_use_cases = $scope.project.top_level_use_cases;
            // x$scope.tree_data= $scope.top_level_use_cases;

            function mydump_use_cases(use_cases) {
                var t = [];
                use_cases.forEach(function(use_case){
                    t.push({
                        id: use_case.id,
                        subject: use_case.subject,
                        children: mydump_use_cases(use_case.children),
                        percent: use_case.percent_done()
                    });
                });
                return t;
            }
            var t = mydump_use_cases($scope.project.top_level_use_cases);
            $scope.tree_data = t;
        });
    });
});

function getTree(data, primaryIdName, parentIdName){
    if(!data || data.length==0 || !primaryIdName ||!parentIdName)
        return [];

    var tree = [],
        rootIds = [],
        item = data[0],
        primaryKey = item[primaryIdName],
        treeObjs = {},
        parentId,
        parent,
        len = data.length,
        i = 0;

    while(i<len){
        item = data[i++];
        primaryKey = item[primaryIdName];
        treeObjs[primaryKey] = item;
        parentId = item[parentIdName];

        if(parentId){
            parent = treeObjs[parentId];

            if(parent.children){
                parent.children.push(item);
            }
            else{
                parent.children = [item];
            }
        }
        else{
            rootIds.push(primaryKey);
        }
    }

    for (var i = 0; i < rootIds.length; i++) {
        tree.push(treeObjs[rootIds[i]]);
    };

    return tree;
}