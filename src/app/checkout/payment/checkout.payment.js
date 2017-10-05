angular.module('orderCloud')
	.config(checkoutPaymentConfig)
	.controller('CheckoutPaymentCtrl', CheckoutPaymentController)
    .factory('CheckoutPaymentService', CheckoutPaymentService)
;

function checkoutPaymentConfig($stateProvider) {
	$stateProvider
		.state('checkout.payment', {
			url: '/payment',
			templateUrl: 'checkout/payment/templates/checkout.payment.tpl.html',
			controller: 'CheckoutPaymentCtrl',
            controllerAs: 'checkoutPayment',
            resolve: {
               UpdateOrder: function($rootScope, CurrentOrder){
                    $rootScope.$broadcast('OC:UpdateOrder', CurrentOrder.ID);
                }
            }
		})
    ;
}

function CheckoutPaymentController($exceptionHandler, $rootScope, toastr, OrderCloudSDK, AddressSelectModal, MyAddressesModal) {
	var vm = this;
    vm.createAddress = createAddress;
    vm.changeBillingAddress = changeBillingAddress;

    function createAddress(order){
        return MyAddressesModal.Create()
            .then(function(address) {
                toastr.success('Address Created', 'Success');
                order.BillingAddressID = address.ID;
                saveBillingAddress(order);
            });
    }

    function changeBillingAddress(order) {
        AddressSelectModal.Open('billing')
            .then(function(address) {
                if (address == 'create') {
                    createAddress(order);
                } else {
                    order.BillingAddressID = address.ID;
                    saveBillingAddress(order);
                }
            });
    }

    function saveBillingAddress(order) {
        if (order && order.BillingAddressID) {
            OrderCloudSDK.Orders.Patch('outgoing', order.ID, {BillingAddressID: order.BillingAddressID})
                .then(function(updatedOrder) {
                    $rootScope.$broadcast('OC:OrderBillAddressUpdated', updatedOrder);
                })
                .catch(function(ex) {
                    $exceptionHandler(ex);
                });
        }
    }
}

function CheckoutPaymentService($q, $uibModal, OrderCloudSDK ) {
    var service = {
        PaymentsExceedTotal: _paymentsExceedTotal,
        RemoveAllPayments: _removeAllPayments,
        PaymentsMatchTotal: _paymentsMatchTotal
    };

    function _paymentsExceedTotal(payments, orderTotal) {
        var paymentTotal = 0;
        angular.forEach(payments.Items, function(payment) {
            paymentTotal += payment.Amount;
        });

        return paymentTotal.toFixed(2) > orderTotal;
    }

    function _removeAllPayments(payments, order) {
        var deferred = $q.defer();

        var queue = [];
        angular.forEach(payments.Items, function(payment) {
            queue.push(OrderCloudSDK.Payments.Delete('outgoing', order.ID, payment.ID));
        });

        $q.all(queue).then(function() {
            deferred.resolve();
        });

        return deferred.promise;
    }
     function _paymentsMatchTotal(payments, orderTotal) {
        var paymentTotal = 0;
        angular.forEach(payments.Items, function(payment) {
            paymentTotal += payment.Amount;
        });

        return paymentTotal.toFixed(2) === orderTotal;
    }

    return service;
}