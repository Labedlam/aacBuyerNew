angular.module('orderCloud')
    .controller('productFilterListCtrl', ProductFilterListCtrl)
;

function ProductFilterListCtrl($state, OrderCloudSDK, Parameters, Products, Category){
    var vm = this;
    vm.products=Products;
    vm.type = Parameters.vendor ? 'Vendors' : 'Categories'
    vm.shopBy = Parameters.vendor? Parameters.vendor : Category.Name;


    //reload the state with the incremented page parameter
    vm.pageChanged = function () {
        $state.go('.', {
            page: vm.products.Meta.Page
        });
    };

    //load the next page of results with all the same parameters
    vm.loadMore = function () {
        var opts = {
            search:Parameters.search,
            page: vm.products.Meta.Page + 1,
            pageSize: Parameters.pageSize || vm.products.Meta.PageSize,
            searchOn:Parameters.searchOn,
            sortBy: Parameters.sortBy,
            filters:  Parameters.filters
        };
        return OrderCloudSDK.Me.ListProducts(opts)
            .then(function (data) {
                vm.products.Items = vm.products.Items.concat(data.Items);
                vm.products.Meta = data.Meta;
            });
    };
}