angular.module('orderCloud')

    //Single Purchase Order Payment
    .directive('ocPaymentPo', OCPaymentPurchaseOrder)
    .controller('PaymentPurchaseOrderCtrl', PaymentPurchaseOrderController)

    //Single Spending Account Payment
    .directive('ocPaymentSa', OCPaymentSpendingAccount)
    .controller('PaymentSpendingAccountCtrl', PaymentSpendingAccountController)

    //Single Credit Card Payment
    .directive('ocPaymentCc', OCPaymentCreditCard)
    .controller('PaymentCreditCardCtrl', PaymentCreditCardController)

    //Single Payment, Multiple Types
    .directive('ocPayment', OCPayment)
    .controller('PaymentCtrl', PaymentController)

    //Multiple Payment, Multiple Types
    .directive('ocPayments', OCPayments)
    .controller('PaymentsCtrl', PaymentsController);


function OCPaymentPurchaseOrder() {
    return {
        restrict: 'E',
        scope: {
            order: '=',
            payment: '=?'
        },
        templateUrl: 'checkout/payment/directives/templates/purchaseOrder.tpl.html',
        controller: 'PaymentPurchaseOrderCtrl'
    }
}

function PaymentPurchaseOrderController($scope, $rootScope, toastr, OrderCloudSDK, $exceptionHandler) {
    if (!$scope.payment) {
        OrderCloudSDK.Payments.List('outgoing', $scope.order.ID)
            .then(function (data) {
                if (data.Items.length) {
                    OrderCloudSDK.Payments.Delete('outgoing', $scope.order.ID, data.Items[0].ID)
                        .then(function (data) {
                            OrderCloudSDK.Payments.Create('outgoing', $scope.order.ID, {
                                    Type: 'PurchaseOrder',
                                    CreditCardID: null,
                                    SpendingAccountID: null,
                                    Amount: null
                                })
                                .then(function (payment) {
                                    $scope.payment = payment;
                                });
                        });
                } else {
                    OrderCloudSDK.Payments.Create('outgoing', $scope.order.ID, {
                            Type: 'PurchaseOrder'
                        })
                        .then(function (data) {
                            $scope.payment = data;
                        });
                }
            });
    } else if (!($scope.payment.Type == "PurchaseOrder" && $scope.payment.CreditCardID == null && $scope.payment.SpendingAccountID == null)) {
        $scope.payment.Type = "PurchaseOrder";
        $scope.payment.CreditCardID = null;
        $scope.payment.SpendingAccountID = null;
        OrderCloudSDK.Payments.Delete('outgoing', $scope.order.ID, $scope.payment.ID)
            .then(function () {
                delete $scope.payment.ID;
                OrderCloudSDK.Payments.Create('outgoing', $scope.order.ID, $scope.payment)
                    .then(function () {
                        toastr.success('Paying by purchase order', 'Purchase Order Payment');
                        $rootScope.$broadcast('OC:PaymentsUpdated');
                    });
            });
    }

    $scope.updatePayment = function () {
        if ($scope.payment.xp && $scope.payment.xp.PONumber && (!$scope.payment.xp.PONumber.length)) $scope.payment.xp.PONumber = null;
        // OrderCloud.Payments.Update($scope.order.ID, $scope.payment.ID, $scope.payment)
        OrderCloudSDK.Payments.Delete('outgoing', $scope.order.ID, $scope.payment.ID)
            .then(function () {
                delete $scope.payment.ID;
                OrderCloudSDK.Payments.Create('outgoing', $scope.order.ID, $scope.payment)
                    .then(function () {
                        toastr.success('Purchase Order Number Saved');
                        $rootScope.$broadcast('OC:PaymentsUpdated');
                    });
            })
            .catch(function (ex) {
                $exceptionHandler(ex);
            });
    }
}

function OCPaymentSpendingAccount() {
    return {
        restrict: 'E',
        scope: {
            order: '=',
            payment: '=?',
            excludedSpendingAccounts: '=?excludeOptions'
        },
        templateUrl: 'checkout/payment/directives/templates/spendingAccount.tpl.html',
        controller: 'PaymentSpendingAccountCtrl',
        controllerAs: 'paymentSA'
    }
}

function PaymentSpendingAccountController($scope, $rootScope, toastr, OrderCloudSDK, $exceptionHandler) {
    OrderCloudSDK.Me.ListSpendingAccounts({
            page: 1,
            pageSize: 100,
            filters: {
                RedemptionCode: '!*',
                AllowAsPaymentMethod: true,
                Balance: '!<1'
            }
        })
        .then(function (data) {
            $scope.spendingAccounts = data.Items;
        });

    if (!$scope.payment) {
        OrderCloudSDK.Payments.List($scope.order.ID)
            .then(function (data) {
                if (data.Items.length) {
                    OrderCloudSDK.Payments.Delete('outgoing', $scope.order.ID, data.Items[0].ID)
                        .then(function () {
                            OrderCloudSDK.Payments.Create('outgoing', $scope.order.ID, {
                                    Type: 'SpendingAccount',
                                    xp: {
                                        PONumber: null
                                    },
                                    CreditCardID: null,
                                    SpendingAccountID: null,
                                    Amount: null,
                                    Accepted: true
                                })
                                .then(function (payment) {
                                    $scope.payment = payment;
                                    if (!$scope.payment.SpendingAccountID) $scope.showPaymentOptions = true;
                                });
                        });
                } else {
                    OrderCloudSDK.Payments.Create('outgoing', $scope.order.ID, {
                            Type: 'SpendingAccount',
                            Accepted: true
                        })
                        .then(function (data) {
                            $scope.payment = data;
                            $scope.showPaymentOptions = true;
                        });
                }
            });
    } else {
        delete $scope.payment.CreditCardID;
        if ($scope.payment.xp && $scope.payment.xp.PONumber) $scope.payment.xp.PONumber = null;
        if (!$scope.payment.SpendingAccountID) $scope.showPaymentOptions = true;
    }

    $scope.changePayment = function () {
        $scope.showPaymentOptions = true;
    };

    $scope.updatePayment = function (scope) {
        var oldSelection = angular.copy($scope.payment.SpendingAccountID);
        $scope.payment.SpendingAccountID = scope.spendingAccount.ID;
        $scope.updatingSpendingAccountPayment = OrderCloudSDK.Payments.Delete('outgoing', $scope.order.ID, $scope.payment.ID)
            .then(function () {
                OrderCloudSDK.Payments.Create('outgoing', $scope.order.ID, $scope.payment)
                    .then(function (payment) {
                        $scope.showPaymentOptions = false;
                        toastr.success('Using ' + scope.spendingAccount.Name, 'Spending Account Payment');
                        $rootScope.$broadcast('OC:PaymentsUpdated');
                    })
                    .catch(function (er) {
                        if (er.response.body.Errors[0].ErrorCode === "Payment.ExceedsBalance") {
                            $scope.payment.Amount = er.response.body.Errors[0].Data.Balance;
                            $scope.payment.MaxAmount = er.response.body.Errors[0].Data.Balance;
                            OrderCloudSDK.Payments.Create('outgoing', $scope.order.ID, $scope.payment)
                                .then(function () {
                                    $scope.showPaymentOptions = false;
                                    toastr.success('Using ' + scope.spendingAccount.Name, 'Spending Account Payment');
                                    toastr.warning('Not Enough on Spending Account, Please Add an Aditional Payment');
                                    $rootScope.$broadcast('OC:PaymentsUpdated');
                                })


                            // });
                        }
                    });
            })
    };

    $scope.$watch('payment', function (n, o) {
        if (n && !n.SpendingAccountID) {
            $scope.OCPaymentSpendingAccount.$setValidity('SpendingAccount_Not_Set', false);
        } else {
            $scope.OCPaymentSpendingAccount.$setValidity('SpendingAccount_Not_Set', true);
        }
    }, true);
}

function OCPaymentCreditCard() {
    return {
        restrict: 'E',
        scope: {
            order: '=',
            payment: '=?',
            excludedCreditCards: '=?excludeOptions'
        },
        templateUrl: 'checkout/payment/directives/templates/creditCard.tpl.html',
        controller: 'PaymentCreditCardCtrl',
        controllerAs: 'paymentCC'
    }
}

function PaymentCreditCardController($scope, $rootScope, toastr, $filter, OrderCloudSDK, MyPaymentCreditCardModal, $exceptionHandler) {
    OrderCloudSDK.Me.ListCreditCards({
            page: 1,
            pageSize: 100,
            filters: {}
        })
        .then(function (data) {
            $scope.creditCards = data.Items;
        });

    if (!$scope.payment) {
        OrderCloudSDK.Payments.List($scope.order.ID)
            .then(function (data) {
                if (data.Items.length) {
                    //check to see if it the first payment is a spending account if not , do not delete it. 
                    OrderCloudSDK.Payments.Delete('outgoing', $scope.order.ID, data.Items[0].ID)
                        .then(function () {
                            OrderCloudSDK.Payments.Create('outgoing', $scope.order.ID, {
                                    Type: 'CreditCard',
                                    xp: {
                                        PONumber: null
                                    },
                                    CreditCardID: null,
                                    SpendingAccountID: null,
                                    Amount: null,
                                    Accepted: true
                                })
                                .then(function (payment) {
                                    $scope.payment = payment;
                                    if (!$scope.payment.SpendingAccountID) $scope.showPaymentOptions = true;
                                });
                        });
                } else {
                    OrderCloudSDK.Payments.Create('outgoing', $scope.order.ID, {
                            Type: 'CreditCard',
                            Accepted: true
                        })
                        .then(function (data) {
                            $scope.payment = data;
                            $scope.showPaymentOptions = true;
                        });
                }
            });
    } else {
        delete $scope.payment.SpendingAccountID;
        if ($scope.payment.xp && $scope.payment.xp.PONumber) $scope.payment.xp.PONumber = null;
        if (!$scope.payment.CreditCardID) $scope.showPaymentOptions = true;
    }

    $scope.changePayment = function () {
        $scope.showPaymentOptions = true;
    };

    $scope.$watch('payment', function (n, o) {
        if (n && !n.CreditCardID) {
            $scope.OCPaymentCreditCard.$setValidity('CreditCard_Not_Set', false);
        } else {
            $scope.OCPaymentCreditCard.$setValidity('CreditCard_Not_Set', true);

        }
    }, true);

    $scope.updatePayment = function (scope) {
        var oldSelection = angular.copy($scope.payment.CreditCardID);
        $scope.payment.CreditCardID = scope.creditCard.ID;
        $scope.updatingCreditCardPayment = OrderCloudSDK.Payments.Delete('outgoing', $scope.order.ID, $scope.payment.ID)
            .then(function () {
                OrderCloudSDK.Payments.Create('outgoing', $scope.order.ID, $scope.payment)
                    .then(function (payment) {
                        $scope.showPaymentOptions = false;
                        // $scope.payment = payment;
                        toastr.success('Using ' + $filter('humanize')(scope.creditCard.CardType) + ' ending in ' + scope.creditCard.PartialAccountNumber, 'Credit Card Payment');
                        $rootScope.$broadcast('OC:PaymentsUpdated');
                    });
            })
            .catch(function (ex) {
                $scope.payment.CreditCardID = oldSelection;
                $exceptionHandler(ex);
            });
    };

    $scope.createCreditCard = function () {
        MyPaymentCreditCardModal.Create()
            .then(function (card) {
                toastr.success('Credit Card Created', 'Success');
                $scope.creditCards.push(card);
                $scope.updatePayment({
                    creditCard: card
                });
            });
    };
}

function OCPayment() {
    return {
        restrict: 'E',
        scope: {
            order: '=',
            methods: '=?',
            payment: '=?',
            paymentIndex: '=?',
            excludeOptions: '=?'
        },
        templateUrl: 'checkout/payment/directives/templates/payment.tpl.html',
        controller: 'PaymentCtrl',
        controllerAs: 'ocPayment'
    }
}

function PaymentController($scope, $rootScope, OrderCloudSDK, CheckoutConfig, CheckoutPaymentService) {
    if (!$scope.methods) $scope.methods = CheckoutConfig.AvailablePaymentMethods;
    if (!$scope.payment) {
        OrderCloudSDK.Payments.List($scope.order.ID)
            .then(function (data) {
                if (CheckoutPaymentService.PaymentsExceedTotal(data, $scope.order.Total)) {
                    CheckoutPaymentService.RemoveAllPayments(data, $scope.order)
                        .then(function (data) {
                            OrderCloudSDK.Payments.Create('outgoing', $scope.order.ID, {
                                    Type: CheckoutConfig.AvailablePaymentMethods[0],
                                    Accepted: true
                                })
                                .then(function (data) {
                                    $scope.payment = data;
                                    $rootScope.$broadcast('OC:PaymentsUpdated');
                                });
                        });
                } else if (data.Items.length) {
                    $scope.payment = data.Items[0];
                    if ($scope.methods.length === 1) $scope.payment.Type = $scope.methods[0];
                } else {
                    OrderCloudSDK.Payments.Create('outgoing', $scope.order.ID, {
                            Type: CheckoutConfig.AvailablePaymentMethods[0],
                            Accepted: true
                        })
                        .then(function (data) {
                            $scope.payment = data;
                            $rootScope.$broadcast('OC:PaymentsUpdated');
                        });
                }
            });
    } else if ($scope.methods.length == 1) {
        $scope.payment.Type = $scope.methods[0];
    }
}

function OCPayments() {
    return {
        restrict: 'E',
        scope: {
            order: '=',
            methods: '=?'
        },
        templateUrl: 'checkout/payment/directives/templates/payments.tpl.html',
        controller: 'PaymentsCtrl'
    }
}

function PaymentsController($rootScope, $scope, $exceptionHandler, toastr, OrderCloudSDK, CheckoutPaymentService, CheckoutConfig, buyerid) {
    if (!$scope.methods) $scope.methods = CheckoutConfig.AvailablePaymentMethods;

    OrderCloudSDK.Payments.List('outgoing', $scope.order.ID)
        .then(function (data) {
            if (data.Items.length === 0) {
                $scope.payments = {
                    Items: []
                };
                $scope.addNewPayment();
            } else if (CheckoutPaymentService.PaymentsExceedTotal(data, $scope.order.Total)) {
                CheckoutPaymentService.RemoveAllPayments(data, $scope.order)
                    .then(function (data) {
                        $scope.payments = {
                            Items: []
                        };
                        $scope.addNewPayment();
                    });
            } else if (CheckoutPaymentService.PaymentsMatchTotal(data, $scope.order.Total)) {
                $scope.payments = data;
            } else {
                OrderCloudSDK.Payments.Patch('outgoing', $scope.order.ID, data.Items[0].ID, {
                        Amount: null
                    })
                    .then(function (updatedPayment) {
                        $scope.payments = {
                            Items: [updatedPayment]
                        };
                        calculateMaxTotal();
                    })
                    .catch(function (er) {

                        console.log(er);
                    });
            }
        });

    $scope.addNewPayment = function (balance) {
        OrderCloudSDK.Payments.Create('outgoing', $scope.order.ID, {
                Type: $scope.payments.Items.length >= 1 ? CheckoutConfig.AvailablePaymentMethods[1] : CheckoutConfig.AvailablePaymentMethods[0],
                Accepted: true
            })
            .then(function (data) {
                $scope.payments.Items.push(data);
                calculateMaxTotal();

            });

    };

    $scope.removePayment = function (scope) {
        OrderCloudSDK.Payments.Delete('outgoing', $scope.order.ID, scope.payment.ID)
            .then(function () {
                $scope.payments.Items.splice(scope.$index, 1);
                calculateMaxTotal();
                toastr.success('Payment Removed');
            });
    };


    $scope.updatePaymentAmount = function (scope) {
        if (scope.payment.Amount > scope.payment.MaxAmount || !scope.payment.Amount) return;
        OrderCloudSDK.Payments.Patch('outgoing', $scope.order.ID, scope.payment.ID, {
                Amount: scope.payment.Amount
            })
            .then(function (data) {
                toastr.success('Payment Amount Updated');
                calculateMaxTotal();
            })
            .catch(function (ex) {
                $exceptionHandler(ex);
            });
    };

    $rootScope.$on('OC:PaymentsUpdated', function () {
        calculateMaxTotal();
    });


    function calculateMaxTotal() {
        var paymentTotal = 0;
        $scope.excludeOptions = {
            SpendingAccounts: [],
            CreditCards: []
        };
        angular.forEach($scope.payments.Items, function (payment) {
            var maxAmount;
            paymentTotal += payment.Amount;
            if (payment.SpendingAccountID) $scope.excludeOptions.SpendingAccounts.push(payment.SpendingAccountID);
            if (payment.CreditCardID) $scope.excludeOptions.CreditCards.push(payment.CreditCardID);
            maxAmount = $scope.order.Subtotal + $scope.order.ShippingCost + $scope.order.TaxCost - _.reduce(_.pluck($scope.payments.Items, 'Amount'), function (a, b) {
                return a + b;
            });

            payment.MaxAmount = (payment.Amount + maxAmount).toFixed(2);

        });
        $scope.canAddPayment = paymentTotal < ($scope.order.Subtotal + $scope.order.ShippingCost + $scope.order.TaxCost).toFixed(2);
        if ($scope.OCPayments) $scope.OCPayments.$setValidity('Insufficient_Payment', !$scope.canAddPayment);
    }
}