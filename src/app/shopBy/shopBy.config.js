angular.module('orderCloud')
.config( ShopByConfig)
;

function ShopByConfig($stateProvider){
    $stateProvider
        .state('shopBy', {
            parent: 'base',
            url: '/shop-by?type?page',
            templateUrl: 'shopBy/templates/shopBy.tpl.html',
            controller: 'shopByCtrl',
            controllerAs: 'shopBy',
            data: {
                pageTitle: 'Shop By'
            },
            resolve: {
                Parameters: function ($stateParams, ocParameters) {
                    return ocParameters.Get($stateParams);
                },
                CategoryList: function(Parameters, OrderCloudSDK){
                    var page = Parameters.page || 1;
                    var categories = {};
                    var opts = {
                        page: page,
                        pageSize: 40,
                        // depth: 'all',
                        filters: {ID: '!TopStores' }
                    };
                    categories.Items = [];
                    // TODO: Remove punchout Categories
                    //Add Pagination
                    function getCategories() {
                        return OrderCloudSDK.Me.ListCategories(opts)
                            // .then(function (data) {
                            //     categories.Items = categories.Items.concat(data.Items);
                            //     if (data.Meta.Page < data.Meta.TotalPages) {
                            //         page++;
                            //         opts.page = page;
                            //         return getCategories();
                            //     }
                            //     else {
                            //         return categories;
                            //     }
                            // });
                    }

                   return  Parameters.type === 'category' ? getCategories() : null;


                }
            }
        })
}