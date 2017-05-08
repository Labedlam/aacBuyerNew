angular.module('orderCloud')
    .config(MyPaymentsConfig)
    .controller('MyPaymentsCtrl', MyPaymentsController)
;

function MyPaymentsConfig($stateProvider) {
    $stateProvider
        .state('myPayments', {
            parent: 'account',
            url: '/payments',
            templateUrl: 'myPayments/templates/myPayments.tpl.html',
            controller: 'MyPaymentsCtrl',
            controllerAs: 'myPayments',
            data: {
                pageTitle: "Payment Methods"
            },
            resolve: {
                UserCreditCards: function(OrderCloudSDK) {
                    var opts = {filters: {'Editable': true}};
                    return OrderCloudSDK.Me.ListCreditCards(opts);
                },
                UserSpendingAccounts: function(OrderCloudSDK) {
                    var opts = {filters: {'RedemptionCode': '!*'}};
                   return OrderCloudSDK.Me.ListSpendingAccounts(opts);
                },
                GiftCards: function(OrderCloudSDK) {
                    var opts = {filters:  {'RedemptionCode': '*'}};
                    return OrderCloudSDK.Me.ListSpendingAccounts(opts);
                }
            }
        });
}

function MyPaymentsController($q, $state, toastr, $exceptionHandler, ocConfirm, ocAuthNet, MyPaymentCreditCardModal, UserCreditCards, UserSpendingAccounts, GiftCards) {
    var vm = this;
    vm.personalCreditCards =  UserCreditCards;
    vm.personalSpendingAccounts = UserSpendingAccounts;
    vm.giftCards = GiftCards;

    vm.createCreditCard = function(){
        MyPaymentCreditCardModal.Create()
        .then(function(data) {
            toastr.success('Credit Card Created', 'Success');
            vm.personalCreditCards.Items.push(data);
        });
    };

    vm.edit = function(scope){
        MyPaymentCreditCardModal.Edit(scope.creditCard)
            .then(function(data){
                toastr.success('Credit Card Updated', 'Success');
                vm.personalCreditCards.Items[scope.$index] = data;
            });
    };

    vm.delete = function(scope){
        vm.loading = [];
        ocConfirm.Confirm("Are you sure you want to delete this Credit Card?")
            .then(function(){
                vm.loading[scope.$index] = ocAuthNet.DeleteCreditCard(scope.creditCard)
                    .then(function(){
                        toastr.success('Credit Card Deleted', 'Success');
                        vm.personalCreditCards.Items.splice(scope.$index, 1);
                    })
                    .catch(function(error) {
                        $exceptionHandler(error);
                    });
            });
    };
}