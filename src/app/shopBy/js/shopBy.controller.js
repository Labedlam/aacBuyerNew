angular.module('orderCloud')
    .controller('shopByCtrl', ShopByContoller)
;

function ShopByContoller($state, OrderCloudSDK, vendors, Parameters, CategoryList){
    var vm = this;
    vm.type =  Parameters.type === 'vendor' ? 'Vendors' : 'Categories';
    vm.list =  Parameters.type === 'vendor' ? vendors : CategoryList;

 //reload the state with the incremented page parameter
 vm.pageChanged = function () {
    $state.go('.', {
        page: vm.list.Meta.Page
    });
};

//load the next page of results with all the same parameters
vm.loadMore = function () {
    var opts = {
        search:Parameters.search,
        page: vm.list.Meta.Page + 1,
        pageSize: Parameters.pageSize || vm.list.Meta.PageSize,
        searchOn:Parameters.searchOn,
        sortBy: Parameters.sortBy,
        filters:  Parameters.filters
    };
    return OrderCloudSDK.Me.ListProducts(opts)
        .then(function (data) {
            vm.list.Items = vm.list.Items.concat(data.Items);
            vm.list.Meta = data.Meta;
        });
};

}