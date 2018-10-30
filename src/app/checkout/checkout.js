angular.module('orderCloud')
	.config(checkoutConfig)
	.controller('CheckoutCtrl', CheckoutController)
    .factory('AddressSelectModal', AddressSelectModalService)
    .controller('AddressSelectCtrl', AddressSelectController)
    .constant('CheckoutConfig', {
        ShippingRates: true,
        TaxRates: false,
        TransactionType: 'AuthNet',
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
                UpdateOrder: function($rootScope, CurrentOrder){
                    $rootScope.$broadcast('OC:UpdateOrder', CurrentOrder.ID);
                },
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
                        var opts = {page: 1, pageSize: 100, filters: {Shipping: true}};
                            OrderCloudSDK.Me.ListAddresses(opts)
                            .then(function(shippingAddresses) {
                                if (shippingAddresses.Items.length) {
                                    CurrentOrder.ShippingAddressID = shippingAddresses.Items[0].ID;
                                    OrderCloudSDK.Orders.Patch('outgoing', CurrentOrder.ID, {ShippingAddressID: CurrentOrder.ShippingAddressID})
                                        .then(function(){
                                            OrderCloudSDK.Me.GetAddress(CurrentOrder.ShippingAddressID)
                                            .then(function(address) {
                                                deferred.resolve(address);
                                            });
                                        });
                                }
                                else{
                                    deferred.resolve(null);
                                }
                            })
                            .catch(function(){ deferred.resolve(null);});
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

function CheckoutController($state, $rootScope, toastr, OrderCloudSDK, OrderShipAddress, CurrentPromotions, OrderBillingAddress, CheckoutConfig, ccPayment) {
    var vm = this;

    vm.shippingAddress = OrderShipAddress;
    vm.billingAddress = OrderBillingAddress;
    vm.promotions = CurrentPromotions.Items;
    vm.checkoutConfig = CheckoutConfig;
    vm.submitBtnDisabled = false;

    vm.submitOrder = function(order) {
        vm.submitBtnDisabled = true;
        return OrderCloudSDK.Payments.List('outgoing', order.ID).then( function(payments) {
            if (_.pluck(payments.Items, 'Type').indexOf('CreditCard') > -1) {
                return ccPayment.AuthCapture(order)
                    .then( function(data) {
                        if (data[0].ChargeStatus === '1') {
                            return finalSubmit(order);
                        } else {
                            toastr.error(data[0].Message, 'Error');
                            vm.submitBtnDisabled = false;
                            return;
                        }
                    });
            } else {
                return finalSubmit(order);
            }
        });        
    };

    function finalSubmit(order) {
         vm.submitLoading = {
            message: 'Submitting Order'
        };
        vm.submitLoading.promise = OrderCloudSDK.Orders.Submit('outgoing', order.ID)
            .then(function(order) {
                $state.go('confirmation', {orderid:order.ID}, {reload:'base'});
                toastr.success('Your order has been submitted', 'Success');
            })
            .catch(function(ex) {
                toastr.error('Your order did not submit successfully.', 'Error');
            });
    }

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
            });
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
            });
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