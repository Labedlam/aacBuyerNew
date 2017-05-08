angular.module('orderCloud')
	.config(checkoutConfig)
	.controller('CheckoutCtrl', CheckoutController)
    .factory('AddressSelectModal', AddressSelectModalService)
    .controller('AddressSelectCtrl', AddressSelectController)
    .constant('CheckoutConfig', {
        ShippingRates: true,
        TaxRates: false,
       // AvailablePaymentMethods: ['PurchaseOrder', 'CreditCard', 'SpendingAccount']
        AvailablePaymentMethods: [ 'SpendingAccount', 'CreditCard']
    })
;

function checkoutConfig($urlRouterProvider, $stateProvider) {
    $urlRouterProvider.when('/checkout', '/checkout/shipping');
	$stateProvider
		.state('checkout', {
            abstract:true,
			parent: 'base',
			url: '/checkout',
			templateUrl: 'checkout/templates/checkout.tpl.html',
			controller: 'CheckoutCtrl',
			controllerAs: 'checkout',
			resolve: {
                OrderShipAddress: function($q, OrderCloudSDK, CurrentOrder){
                    var deferred = $q.defer();
                    if (CurrentOrder.ShippingAddressID) {
                        OrderCloudSDK.Me.GetAddress(CurrentOrder.ShippingAddressID)
                            .then(function(address) {
                                deferred.resolve(address);
                            })
                            .catch(function(ex) {
                                deferred.resolve(null);
                            });
                    }
                    else {
                        deferred.resolve(null);
                    }

                    return deferred.promise;
                },
                CurrentPromotions: function(CurrentOrder, OrderCloudSDK) {
                    return OrderCloudSDK.Orders.ListPromotions('outgoing', CurrentOrder.ID);
                },
                OrderBillingAddress: function($q, OrderCloudSDK, CurrentOrder){
                    var deferred = $q.defer();

                    if (CurrentOrder.BillingAddressID) {
                        OrderCloudSDK.Me.GetAddress(CurrentOrder.BillingAddressID)
                            .then(function(address) {
                                deferred.resolve(address);
                            })
                            .catch(function(ex) {
                                deferred.resolve(null);
                            });
                    }
                    else {
                        deferred.resolve(null);
                    }
                    return deferred.promise;
                }
			}
		})
    ;
}

function CheckoutController($state, $rootScope, toastr, OrderCloudSDK, OrderShipAddress, CurrentPromotions, OrderBillingAddress, CheckoutConfig) {
    var vm = this;
    vm.shippingAddress = OrderShipAddress;
    vm.billingAddress = OrderBillingAddress;
    vm.promotions = CurrentPromotions.Items;
    vm.checkoutConfig = CheckoutConfig;

    vm.submitOrder = function(order) {
        OrderCloudSDK.Orders.Submit('outgoing', order.ID)
            .then(function(order) {
                $state.go('confirmation', {orderid:order.ID}, {reload:'base'});
                toastr.success('Your order has been submitted', 'Success');
            })
            .catch(function(ex) {
                toastr.error('Your order did not submit successfully.', 'Error');
            });
    };

    $rootScope.$on('OC:OrderShipAddressUpdated', function(event, order) {
        OrderCloudSDK.Me.GetAddress(order.ShippingAddressID)
            .then(function(address){
                vm.shippingAddress = address;
            });
    });

    $rootScope.$on('OC:OrderBillAddressUpdated', function(event, order){
        OrderCloudSDK.Me.GetAddress(order.BillingAddressID)
            .then(function(address){
                vm.billingAddress = address;
            });
    });

    vm.removePromotion = function(order, promotion) {
        OrderCloudSDK.Orders.RemovePromotion('outgoing', order.ID, promotion.Code)
            .then(function() {
                $rootScope.$broadcast('OC:UpdatePromotions', order.ID);
            })
    };

    $rootScope.$on('OC:UpdatePromotions', function(event, orderid) {
        OrderCloudSDK.Orders.ListPromotions('outgoing', orderid)
            .then(function(data) {
                if (data.Meta) {
                    vm.promotions = data.Items;
                } else {
                    vm.promotions = data;
                }
                $rootScope.$broadcast('OC:UpdateOrder', orderid);
            })
    });
}

function AddressSelectModalService($uibModal) {
    var service = {
        Open: _open
    };

    function _open(type) {
        return $uibModal.open({
            templateUrl: 'checkout/templates/addressSelect.modal.tpl.html',
            controller: 'AddressSelectCtrl',
            controllerAs: 'addressSelect',
            backdrop: 'static',
            size: 'md',
            resolve: {
                Addresses: function(OrderCloudSDK) {
                    var opts = {
                        page: 1,
                        pageSize: 100,
                        filters:  {Shipping: true}
                    };
                    if (type == 'shipping') {
                        return OrderCloudSDK.Me.ListAddresses(opts);
                    } else if (type == 'billing') {
                        opts.filters = {Billing: true};
                        return OrderCloudSDK.Me.ListAddresses(opts);
                    } else {
                        opts.filters =  null;
                        return OrderCloudSDK.Me.ListAddresses(opts);
                    }
                }
            }
        }).result;
    }

    return service;
}

function AddressSelectController($uibModalInstance, Addresses) {
    var vm = this;
    vm.addresses = Addresses;

    vm.select = function (address) {
        $uibModalInstance.close(address);
    };

    vm.createAddress = function() {
        $uibModalInstance.close('create');
    };

    vm.cancel = function () {
        $uibModalInstance.dismiss();
    };
}