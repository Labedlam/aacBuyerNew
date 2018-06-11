angular.module('orderCloud')
    .factory('ccPayment', ccPaymentService)
;

function ccPaymentService($http, $q, $exceptionHandler, OrderCloudSDK, ocAuthNet, toastr) {
    var service = {
        AuthCapture: _authCapture
    };

    function _authCapture(order, user) {
        return OrderCloudSDK.Payments.List('outgoing', order.ID)
            .then(function(payments) {
                var queue = [];
                _.each(payments.Items, function(paymentData) {
                    if(paymentData.Type === 'CreditCard' && !paymentData.Accepted) {
                        queue.push(function() {
                            return ocAuthNet.AuthCaptureTransaction(order, paymentData)
                                .then(function(data) {
                                    if(data.ResponseBody.ChargeStatus === '1') {
                                        return OrderCloudSDK.Payments.Patch('outgoing', order.ID, paymentData.ID, {
                                            Accepted: true
                                        });
                                    } else {
                                        var message;
                                        if (data.ResponseBody.ChargeStatus === '2') message = 'The selected card was declined. Please selected another payment method';
                                        if (data.ResponseBody.ChargeStatus === '3') message = 'There was an error while processing the selected card';
                                        if (data.ResponseBody.ChargeStatus === '4') message = 'This card has been held for review';
                                        var response = {
                                            ChargeStatus: data.ResponseBody.ChargeStatus,
                                            Message: message
                                        };
                                        return response;
                                        /* Please reference https://developer.authorize.net/api/reference/index.html for ChargeStatus responses */
                                    }
                                })
                                .catch(function(ex) {
                                    $exceptionHandler(ex);
                                });
                        }());
                    }
                });
                return $q.all(queue);
            })
            .catch(function(ex) {
                $exceptionHandler(ex);
            });
    }

    return service;
    
}