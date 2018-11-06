angular.module('orderCloud')
    .config(ProductSearchConfig)
    .controller('ProductSearchCtrl', ProductSearchController)
    .controller('ProductSearchDirectiveCtrl', ProductSearchDirectiveController)
    .controller('ProductSearchModalCtrl', ProductSearchModalController)
    .component('ordercloudProductSearch', OrderCloudProductSearchComponent())
    .factory('ProductSearch', ProductSearchService)
;

function ProductSearchConfig($stateProvider) {
    $stateProvider
        .state('productSearchResults', {
            parent: 'base',
            url: '/productSearchResults/:searchTerm?page&pageSize&sortBy',
            templateUrl: 'productSearch/templates/productSearch.results.tpl.html',
            controller: 'ProductSearchCtrl',
            controllerAs: 'productSearch',
            resolve: {
                Parameters: function(ocParameters, $stateParams) {
                    return ocParameters.Get($stateParams);
                },
                ProductList: function(OrderCloudSDK, Parameters) {
                    var opts = {
                        search:Parameters.searchTerm,
                        page: Parameters.page,
                        pageSize: Parameters.pageSize ||12,
                        sortBy: Parameters.sortBy
                    };
                    return OrderCloudSDK.Me.ListProducts(opts);
                }
            }
        });
}

function ProductSearchController($state, ocParameters, Parameters, ProductList) {
    var vm = this;
    vm.list = ProductList;
    vm.parameters = Parameters;
    vm.sortSelection = Parameters.sortBy ? (Parameters.sortBy.indexOf('!') === 0 ? Parameters.sortBy.split('!')[1] : Parameters.sortBy) : null;

    //Reload the state with new parameters
    vm.filter = function(resetPage) {
        $state.go('.', ocParameters.Create(vm.parameters, resetPage));
    };

    vm.updateSort = function(value) {
        value ? angular.noop() : value = vm.sortSelection;
        switch (vm.parameters.sortBy) {
            case value:
                vm.parameters.sortBy = '!' + value;
                break;
            case '!' + value:
                vm.parameters.sortBy = null;
                break;
            default:
                vm.parameters.sortBy = value;
        }
        vm.filter(false);
    };

    vm.updatePageSize = function(pageSize) {
        vm.parameters.pageSize = pageSize;
        vm.filter(true);
    };

    vm.pageChanged = function(page) {
        vm.parameters.page = page;
        vm.filter(false);
    };

    vm.reverseSort = function() {
        Parameters.sortBy.indexOf('!') === 0 ? vm.parameters.sortBy = Parameters.sortBy.split('!')[1] : vm.parameters.sortBy = '!' + Parameters.sortBy;
        vm.filter(false);
    };
}

function OrderCloudProductSearchComponent() {
    return {
        replace:true,
        templateUrl: 'productSearch/templates/productSearch.component.tpl.html',
        controller: 'ProductSearchDirectiveCtrl',
        bindings: {
            maxProducts: '<'
        }
    };
}

function ProductSearchDirectiveController($state, OrderCloudSDK) {
    var vm = this;

    vm.getSearchResults = function() {
        var opts = {search: vm.searchTerm, page: 1, pageSize:vm.maxProducts || 5 };
        return OrderCloudSDK.Me.ListProducts(opts)
            .then(function(data) {
                return data.Items;
            });
    };

    vm.onSelect = function(productID) {
        $state.go('productDetail', {
            productid: productID
        });
    };

    vm.onHardEnter = function(searchTerm) {
        $state.go('productSearchResults', {
            searchTerm: searchTerm
        }, {reload: true});
    };
}

function ProductSearchService($uibModal) {
    var service = {
        Open:_open
    };

    function _open() {
        return $uibModal.open({
            backdrop:'static',
            templateUrl:'productSearch/templates/productSearch.modal.tpl.html',
            controller: 'ProductSearchModalCtrl',
            controllerAs: '$ctrl',
            size: '-full-screen c-productsearch-modal'
        }).result
    }

    return service;
}

function ProductSearchModalController($uibModalInstance, $timeout, $scope, OrderCloudSDK) {
    var vm = this;

    $timeout(function() {
        $('#ProductSearchInput').focus();
    }, 300);

    vm.getSearchResults = function() {
        var opts = {search: vm.searchTerm, page: 1, pageSize:vm.maxProducts || 5 };
        return OrderCloudSDK.Me.ListProducts(opts)
            .then(function(data) {
                return data.Items;
            });
    };

    //Mobile functionality
    vm.cancel = function() {
        $uibModalInstance.dismiss();
    };

    vm.onSelect = function(productID) {
        $uibModalInstance.close({productID: productID});
    };

    vm.onHardEnter = function(searchTerm) {
        $uibModalInstance.close({searchTerm: searchTerm});
    };
}