angular.module('orderCloud')
    .config(BaseConfig)
    .controller('BaseCtrl', BaseController)
    .factory('NewOrder', NewOrderService);

function BaseConfig($stateProvider) {
    $stateProvider.state('base', {
        url: '',
        abstract: true,
        views: {
            '': {
                templateUrl: 'base/templates/base.tpl.html',
                controller: 'BaseCtrl',
                controllerAs: 'base'
            },
            'nav@base': {
                'templateUrl': 'base/templates/navigation.tpl.html'
            }
        },
        resolve: {
            isAuthenticated: function ($state, $localForage, OrderCloudSDK, LoginService) {
                return OrderCloudSDK.Me.Get()
                    .then(function () {
                        return true;
                    })
                    .catch(function () {
                        LoginService.Logout();
                        return false;
                    });
            },
            CurrentUser: function ($q, $state, OrderCloudSDK, OrderCloud, buyerid) {
                return OrderCloudSDK.Me.Get()
                    .then(function (data) {
                        OrderCloud.BuyerID.Set(buyerid);
                        return data;
                    })
            },
            ExistingOrder: function ($q, OrderCloudSDK, CurrentUser) {
                var opts = {
                    page: 1,
                    pageSize: 1,
                    sortBy: '!DateCreated',
                    filters: {
                        Status: 'Unsubmitted'
                    }
                };
                return OrderCloudSDK.Me.ListOrders(opts)
                    .then(function (data) {
                        return data.Items[0];
                    });
            },
            CurrentOrder: function (ExistingOrder, NewOrder, CurrentUser) {
                if (!ExistingOrder) {
                    return NewOrder.Create({});
                } else {
                    return ExistingOrder;
                }
            },
            AnonymousUser: function ($q, OrderCloudSDK, CurrentUser) {
                CurrentUser.Anonymous = angular.isDefined(JSON.parse(atob(OrderCloudSDK.GetToken().split('.')[1])).orderid);
            },
            LineItemsList: function (OrderCloudSDK, CurrentOrder) {
                return OrderCloudSDK.LineItems.List('outgoing', CurrentOrder.ID);
            }
        }
    });
}

function BaseController($rootScope, $state, $http, $cookies, ProductSearch, CurrentUser, CurrentOrder, LineItemsList, LoginService, OrderCloudSDK, buyerid, environment) {
    var vm = this;
    var routeParam = $cookies.get('routeBackTo');
    var urlStart = ((environment === 'dev') | (environment === 'staging')) ? 'https://qa-' : 'https://'
    vm.teachersDashboard = urlStart + 'adoptaclassroom.force.com/' + routeParam + '/s/';
    vm.currentUser = CurrentUser;
    vm.currentOrder = CurrentOrder;
    vm.lineItems = LineItemsList;
    vm.storeUrl;


    vm.getAvailableBalance = function () {
        vm.availableFunds = 0;
        OrderCloudSDK.Me.Get().then(function (result) {
            var userId = result.ID;
            var opts = {
                userID: userId
            };
            OrderCloudSDK.SpendingAccounts.ListAssignments(buyerid, opts).then(function (accountsResult) {
                var accountAssignments = accountsResult.Items;
                angular.forEach(accountAssignments, function (a) {
                    OrderCloudSDK.SpendingAccounts.Get(buyerid, a.SpendingAccountID).then(
                        function (aResult) {
                            vm.availableFunds += aResult.Balance;
                        });
                });
            });
        });
    };

    vm.logout = function () {
        LoginService.Logout(vm.teachersDashboard);
    };

    vm.getAvailableBalance();

    vm.mobileSearch = function () {
        ProductSearch.Open()
            .then(function (data) {
                if (data.productID) {
                    $state.go('productDetail', {
                        productid: data.productID
                    });
                } else {
                    $state.go('productSearchResults', {
                        searchTerm: data.searchTerm
                    });
                }
            });
    };

    $rootScope.$on('OC:UpdateOrder', function (event, OrderID, message) {
        vm.orderLoading = {
            message: message
        };
        vm.orderLoading.promise = OrderCloudSDK.Orders.Get('outgoing', OrderID)
            .then(function (data) {
                vm.currentOrder = data;
                OrderCloudSDK.LineItems.List('outgoing', vm.currentOrder.ID)
                    .then(function (lineItems) {
                        vm.lineItems = lineItems;
                    })
            });
    });

    $http.get("/communityUrl").then(function (response) {
        vm.storeUrl = response.data;
    });
}

function NewOrderService($q, OrderCloudSDK) {
    var service = {
        Create: _create
    };

    function _create() {
        var deferred = $q.defer();
        var order = {};
        var opts = {
            page: 1,
            pageSize: 100,
            filters: {
                Shipping: true
            }
        };
        //ShippingAddressID
        OrderCloudSDK.Me.ListAddresses(opts)
            .then(function (shippingAddresses) {
                if (shippingAddresses.Items.length) order.ShippingAddressID = shippingAddresses.Items[0].ID;
                setBillingAddress();
            });

        //BillingAddressID
        function setBillingAddress() {
            opts.filters = {
                Billing: true
            };
            OrderCloudSDK.Me.ListAddresses(opts)
                .then(function (billingAddresses) {
                    if (billingAddresses.Items.length) order.BillingAddressID = billingAddresses.Items[0].ID;
                    createOrder();
                });
        }

        function createOrder() {
            OrderCloudSDK.Orders.Create('outgoing', order)
                .then(function (order) {
                    deferred.resolve(order);
                });
        }

        return deferred.promise;
    }

    return service;
}