angular.module('orderCloud')
    .config(ProductBrowseConfig)
    .controller('ProductBrowseCtrl', ProductBrowseController)
    .controller('ProductViewCtrl', ProductViewController)
    .directive('preventClick', PreventClick)
    .controller('MobileCategoryModalCtrl', MobileCategoryModalController)
;

function ProductBrowseConfig($urlRouterProvider, $stateProvider) {
    $urlRouterProvider.when('/browse', '/browse/products');
    $stateProvider
        .state('productBrowse', {
            abstract: true,
            parent: 'base',
            url: '/browse',
            templateUrl: 'productBrowse/templates/productBrowse.tpl.html',
            controller: 'ProductBrowseCtrl',
            controllerAs: 'productBrowse',
            data: {
                pageTitle: 'Browse Products'
            },
            resolve: {
                Parameters: function ($stateParams, ocParameters) {
                    return ocParameters.Get($stateParams);
                },
                CategoryList: function (OrderCloudSDK) {
                    var page = 1;
                    var categories = {};
                    var opts = {
                        page: page,
                        pageSize: 100,
                        depth: 'all'
                    };
                    categories.Items = [];

                    function getCategories() {
                        return OrderCloudSDK.Me.ListCategories(opts)
                            .then(function (data) {
                                categories.Items = categories.Items.concat(data.Items);
                                if (data.Meta.Page < data.Meta.TotalPages) {
                                    page++;
                                    opts.page = page;
                                    return getCategories();
                                }
                                else {
                                    return categories;
                                }
                            });
                    }

                    return getCategories();

                },
                CategoryTree: function (CategoryList) {
                    var tree = {};
                    tree.result = [];
                    tree.filteredResult = [];
                    angular.forEach(_.where(CategoryList.Items, {ParentID: null}), function (node) {
                        node.ID === 'TopStores' ? tree.filteredResult.push(getnode(node)) : tree.result.push(getnode(node));
                        
                    });
                    function getnode(node) {
                        var children = _.where(CategoryList.Items, {ParentID: node.ID});
                        if (children.length > 0) {
                            node.children = children;
                            angular.forEach(children, function (child) {
                                return getnode(child);
                            });
                        } else {
                            node.children = [];
                        }
                        return node;
                    }

                    return tree;
                }
            }
        })
        .state('productBrowse.products', {
            url: '/products?categoryID?favorites?vendor?search?page?pageSize?searchOn?sortBy?filters?depth',
            templateUrl: 'productBrowse/templates/productView.tpl.html',
            controller: 'ProductViewCtrl',
            controllerAs: 'productView',
            resolve: {
                Parameters: function ($stateParams, ocParameters) {
                    return ocParameters.Get($stateParams);
                },
                ProductList: function(OrderCloudSDK, ocFavoriteProducts, Parameters, CurrentUser, catalogid) {
                    if (Parameters.favorites) {
                        return ocFavoriteProducts.Get()
                            .then(function(favoriteProductIDs) {
                                Parameters.filters ? angular.extend(Parameters.filters, Parameters.filters, {ID:favoriteProductIDs.join('|')}) : Parameters.filters = {ID:favoriteProductIDs.join('|')};
                                return _mergeParameters();
                            });
                    } else if (Parameters.filters) {
                        delete Parameters.filters.ID;
                        return _mergeParameters();
                    } if (Parameters.vendor) {
                        Parameters.filters ? angular.extend(Parameters.filters, Parameters.filters, {'xp.VendorName': Parameters.vendor}) : Parameters.filters = {'xp.VendorName': Parameters.vendor};
                        delete Parameters.vendor;
                        return _mergeParameters();
                    } else {
                        return OrderCloudSDK.Me.ListProducts(Parameters);
                    }

                    function _mergeParameters() {
                        var parameters = angular.extend({catalogID: catalogid, categoryID: Parameters.categoryID, depth: 'all'}, Parameters);
                        return OrderCloudSDK.Me.ListProducts(parameters);
                    }
                    
                }
            }
        });
}

function ProductBrowseController($state, $window, $uibModal, ocPunchout, CategoryList, CategoryTree, Parameters, CurrentOrder, vendors) {
    var vm = this;
    vm.parameters = Parameters;
    vm.categoryList = CategoryList;
    vm.vendors = vendors;
    vm.treeConfig = {};

    vm.treeConfig.treeData = CategoryTree.result;
    vm.treeConfig.filteredTreeData = CategoryTree.filteredResult[0].children;
    vm.treeConfig.treeOptions = {
        equality: function (node1, node2) {
            if (node2 && node1) {
                return node1.ID === node2.ID;
            } else {
                return node1 === node2;
            }
        }
    };

    vm.treeConfig.selectNode = function (node) {
        var punchoutCategory = ocPunchout.IsPunchoutCategory(node.ID);
        if (punchoutCategory) {
            vm.loading = ocPunchout.SetupRequest(punchoutCategory.Name, punchoutCategory.SupplierPartID, CurrentOrder.ID)
                .then(function(data) {
                    $state.go('punchout', {link:data.StartURL});
                });
        } else {
            $state.go('productBrowse.products', {categoryID: node.ID, page: '', vendor: ''});
        }
    };
    //Initiate breadcrumbs is triggered by product list view (child state "productBrowse.products")
    vm.treeConfig.initBreadcrumbs = function (activeCategoryID, ignoreSetNode) {
        if (!ignoreSetNode) { //first iteration of initBreadcrumbs(), initiate breadcrumb array, set selected node for tree
            vm.treeConfig.selectedNode = {ID: activeCategoryID};
            vm.breadcrumb = [];
        }
        if (!activeCategoryID) { //at the catalog root, no expanded nodes
            vm.treeConfig.expandedNodes = angular.copy(vm.breadcrumb);
        } else {
            var activeCategory = _.findWhere(vm.categoryList.Items, {ID: activeCategoryID});
            if (activeCategory) {
                vm.breadcrumb.unshift(activeCategory);
                if (activeCategory.ParentID) {
                    vm.treeConfig.initBreadcrumbs(activeCategory.ParentID, true);
                } else { //last iteration, set tree expanded nodes to the breadcrumb
                    vm.treeConfig.expandedNodes = angular.copy(vm.breadcrumb);
                }
            }
        }
    };

    vm.vendorFilter = function(vendor) {
        $state.go('productBrowse.products', {page: '', vendor: vendor.Value});
    }

    vm.toggleFavorites = function () {
        if (vm.parameters.filters && vm.parameters.filters.ID) delete vm.parameters.filters.ID;
        if (vm.parameters.favorites) {
            vm.parameters.favorites = '';
        } else {
            vm.parameters.favorites = true;
            vm.parameters.page = '';
        }
        $state.go('productBrowse.products', vm.parameters);
    };

    vm.openCategoryModal = function () {
        $uibModal.open({
            animation: true,
            backdrop: 'static',
            templateUrl: 'productBrowse/templates/mobileCategory.modal.tpl.html',
            controller: 'MobileCategoryModalCtrl',
            controllerAs: 'mobileCategoryModal',
            size: '-full-screen',
            resolve: {
                TreeConfig: function () {
                    return vm.treeConfig;
                }
            }
        }).result.then(function (node) {
            //Check Punchout Here
            $state.go('productBrowse.products', {categoryID: node.ID, page: ''});
        });
    };
}

function ProductViewController($state, $ocMedia, ocParameters, OrderCloudSDK, CurrentOrder, ProductList, CategoryList, Parameters) {
    var vm = this;
    vm.parameters = Parameters;
    vm.categories = CategoryList;
    vm.list = ProductList;

    vm.sortSelection = Parameters.sortBy ? (Parameters.sortBy.indexOf('!') == 0 ? Parameters.sortBy.split('!')[1] : Parameters.sortBy) : null;

    //Filtering and Search Functionality
    //check if filters are applied
    vm.filtersApplied = vm.parameters.filters || ($ocMedia('max-width: 767px') && vm.sortSelection);
    vm.showFilters = vm.filtersApplied;


    //reload the state with new filters
    vm.filter = function (resetPage) {
        $state.go('.', ocParameters.Create(vm.parameters, resetPage));
    };

    //clear the relevant filters, reload the state & reset the page
    vm.clearFilters = function () {
        vm.parameters.filters = null;
        $ocMedia('max-width: 767px') ? vm.parameters.sortBy = null : angular.noop();
        vm.filter(true);
    };

    vm.updateSort = function (value) {
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

    vm.reverseSort = function () {
        Parameters.sortBy.indexOf('!') == 0 ? vm.parameters.sortBy = Parameters.sortBy.split('!')[1] : vm.parameters.sortBy = '!' + Parameters.sortBy;
        vm.filter(false);
    };

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

function PreventClick() {
    return {
        link: function ($scope, element) {
            element.on("click", function (e) {
                e.stopPropagation();
            });
        }
    };
}

function MobileCategoryModalController($uibModalInstance, TreeConfig) {
    var vm = this;
    vm.treeConfig = TreeConfig;

    vm.cancel = function () {
        $uibModalInstance.dismiss();
    };

    vm.selectNode = function (node) {
        $uibModalInstance.close(node);
    };
}
