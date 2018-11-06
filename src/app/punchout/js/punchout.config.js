angular.module('orderCloud')
    .config(OrderCloudPunchoutConfig)
    .config(OrderCloudPunchoutStatesConfig)
;

function OrderCloudPunchoutConfig($ocPunchoutProvider) {
    var punchouts = [
        {Name: 'officedepot', CategoryID: 'TopStores_OfficeDepot', SupplierPartID: 'AAA'},
        {Name: 'bestbuy', CategoryID: 'TopStores_BestBuy'},
        {Name: 'kaplan', CategoryID: 'TopStores_Kaplan'},
        {Name: 'reallygoodstuff', CategoryID: 'TopStores_ReallyGoodStuff'},
        {Name: 'schoolspeciality', CategoryID: 'TopStores_SchoolSpecialty'},
        {Name: 'freyscientific', CategoryID: 'TopStores_FreyScientific'},
        {Name: 'lakeshorelearning', CategoryID: 'TopStores_LakeshoreLearning'},
        {Name: 'officedepottest', CategoryID: 'TopStores_OfficeDepotTest', SupplierPartID: 'AAA'},
        {Name: 'bestbuytest', CategoryID: 'TopStores_BestBuyTest'},
        {Name: 'kaplantest', CategoryID: 'TopStores_KaplanTest'},
        {Name: 'reallygoodstufftest', CategoryID: 'TopStores_ReallyGoodStuffTest'},
        {Name: 'schoolspecialitytest', CategoryID: 'TopStores_SchoolSpecialtyTest'},
        {Name: 'freyscientifictest', CategoryID: 'TopStores_FreyScientificTest'},
        {Name: 'lakeshorelearningtest', CategoryID: 'TopStores_LakeshoreLearningTest'},
        {Name: 'octest', CategoryID: 'octest', SupplierPartID:'octest'}
    ];

    angular.forEach(punchouts, function(punchout) {
        $ocPunchoutProvider.AddPunchout(punchout);
    });
}

function OrderCloudPunchoutStatesConfig($stateProvider) {
    $stateProvider
        .state('punchout', {
            url: '/punchout?link',
            templateUrl: 'punchout/templates/punchout.tpl.html',
            controller: 'OCPunchoutCtrl',
            controllerAs: 'punchout',
            resolve: {
                Parameters: function ($stateParams, ocParameters) {
                    return ocParameters.Get($stateParams);
                }
            }
        })
        .state('punchoutreturn', {
            url: '/punchoutreturn?state',
            templateUrl: 'common/templates/view.loading.tpl.html',
            controller: 'OCPunchoutReturnCtrl'
        })
    ;
}