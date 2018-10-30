angular.module('orderCloud')
    .config(AutoLoginConfig)
    .factory('AutoLoginService', AutoLoginService)
    .controller('AutoLoginCtrl', AutoLoginController)
;

function AutoLoginConfig($stateProvider) {
    $stateProvider
        .state('autoLogin', {
            url: '/autoLogin/:token/:catid/:timestamp/:encryptstamp',
            //templateUrl: 'autoLogin/templates/autoLogin.tpl.html',
            controller: 'AutoLoginCtrl',
            controllerAs: 'autoLogin'
        })
    ;
}

function AutoLoginService($q, $window, $state, toastr, OrderCloud, TokenRefresh, clientid, buyerid, anonymous) {
    return {
        SendVerificationCode: _sendVerificationCode,
        ResetPassword: _resetPassword,
        RememberMe: _rememberMe,
        Logout: _logout
    };
}

function AutoLoginController($state, $stateParams, $exceptionHandler, OrderCloud, OrderCloudSDK, LoginService, TokenRefresh, buyerid, $http) {
    var vm = this;

    vm.token = $stateParams.token;
    vm.timestamp = parseInt($stateParams.timestamp);
    vm.encryptstamp = $stateParams.encryptstamp;
    vm.catid = $stateParams.catid;

    vm.form = 'login';
    vm.submit = function() {
        OrderCloudSDK.SetToken(vm.token);
        $state.go('home', {});
    };

    var loginTest = function(response) {
      var loginCheck = response.data;
  
      if(loginCheck){
        vm.submit();
      }
    }

    var OneMinuteAgo = new Date().getTime() - 120000;
 
    if(vm.token && (vm.timestamp > OneMinuteAgo)){
      $http.get('/checklogin/' + vm.timestamp + '/' + vm.encryptstamp)
        .then(function(data){
            loginTest(data);
        });
    }
}