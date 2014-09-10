var rkc = require("redmine-kanban-core");

angular.module('kanbanApp', ['ui.bootstrap','treeGrid']).controller("MyAppController", function  MyAppController($scope, $http) {

    $scope.tree_data =  [  {type: "", id:"",subject:"" , percent:"%" , "nb_children": "#" , "nb_us": "#US" , nb_uc: "UC"} ];

    $scope.project = new rkc.Project();

    $http.get('/kanban/project.json').success(function(data) {
        $scope.project.loadString(data,function(err){
            $scope.project.associate_use_case_and_user_stories();
            console.log($scope.project);
            $scope.top_level_use_cases = $scope.project.top_level_use_cases;
            // x$scope.tree_data= $scope.top_level_use_cases;

            function cumulative_nb_user_storie(workitem) {

                var c = workitem.use_cases.reduce(function(old,wi){ return old + cumulative_nb_user_storie(wi);},0);
                c += workitem.user_stories.length;
                return c;
            }
            function cumulative_nb_use_cases(workitem) {

                var c = workitem.use_cases.reduce(function(old,wi){ return old + cumulative_nb_use_cases(wi);},0);
                c += workitem.use_cases.length;
                return c;
            }
            function mydump_use_cases(use_cases) {
                var t = [];
                use_cases.forEach(function(use_case){
                    t.push({
                        id: use_case.id,
                        type: use_case.type,
                        subject: use_case.subject,
                        children: mydump_use_cases(use_case.children),
                        nb_children:   use_case.children.length,
                        nb_us:  cumulative_nb_user_storie(use_case),
                        nb_uc:  cumulative_nb_use_cases(use_case),
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