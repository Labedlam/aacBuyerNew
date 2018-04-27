angular.module('orderCloud')
    .config(ProductFilterList)    
;

function ProductFilterList($stateProvider){
    $stateProvider
        .state('productFilterList',{
            parent: 'base',
            url: '/filter-products?categoryID?vendor?page',
            templateUrl: 'productFilterList/templates/productFilterList.tpl.html',
            controller: 'productFilterListCtrl',
            controllerAs: 'productFilterList',
            resolve: {
                Parameters: function ($stateParams, ocParameters) {
                    return ocParameters.Get($stateParams);
                },
                Products: function(OrderCloudSDK, Parameters, catalogid){
                    if(Parameters.vendor){
                        Parameters.filters = {'xp.VendorName': Parameters.vendor}
                    }
                    var parameters = angular.extend({catalogID: catalogid, categoryID: Parameters.categoryID, depth: 'all'}, Parameters);
                    return OrderCloudSDK.Me.ListProducts(parameters);
                }, 
                Category: function(Parameters, OrderCloudSDK, catalogid){
                    function grabCatName(){
                        return OrderCloudSDK.Categories.Get(catalogid, Parameters.categoryID)
                    }
                    return  Parameters.categoryID? grabCatName() : null;
                }
            }
        })
}
