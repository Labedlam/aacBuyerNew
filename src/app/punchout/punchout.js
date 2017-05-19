angular.module('orderCloud')
    .factory('ocPunchout', OrderCloudPunchoutService)
    .provider('$ocPunchout', OrderCloudPunchoutProvider)
    .config(OrderCloudPunchoutConfig)
    .config(OrderCloudPunchoutStatesConfig)
    .controller('OCPunchoutCtrl', OrderCloudPunchoutController)
    .controller('OCPunchoutReturnCtrl', OrderCloudPunchoutReturnController)
    .filter('punchoutProductName', punchoutProductName)
;

function OrderCloudPunchoutService($q, $resource, $ocPunchout, OrderCloudSDK, punchouturl, buyerid) {
    var service = {
        IsPunchoutCategory: _isPunchoutCategory,
        SetupRequest: _setupRequest
    };

    var punchouts = $ocPunchout.GetPunchouts();

    function _isPunchoutCategory(categoryID) {
        return punchouts[categoryID];
    }

    function _setupRequest(punchoutName, punchoutItemID, orderID) {
        var deferred = $q.defer();

        var shipToID;
        OrderCloudSDK.Me.ListAddresses({page: 1, pageSize: 1})
            .then(function(data) {
                if (data.Items.length) {
                    shipToID = data.Items[0].ID;
                }
                sendSetupRequest();
            })
            .catch(function() {
                sendSetupRequest();
            });

        function sendSetupRequest() {
            var body = {
                punchoutName: punchoutName,
                buyerID: buyerid,
                access_token: OrderCloudSDK.GetToken(),
                currentOrderID: orderID,
                shipToID: shipToID || null,
                selectedItemID: punchoutItemID || null
            };

            $resource(punchouturl + '/OutBoundSetupRequest', {}, {setuprequest: {method: 'POST'}}).setuprequest(body).$promise
                .then(function(data) {
                    deferred.resolve(data);
                })
                .catch(function(ex) {
                    deferred.reject(ex);
                });
        }

        return deferred.promise;
    }

    return service;
}

function OrderCloudPunchoutProvider() {
    var punchouts = {};

    return {
        $get: function() {
            return {
                GetPunchouts: function() {
                    return punchouts;
                }
            }
        },
        AddPunchout: function(punchout) {
            if (!punchout.Name) throw 'ocPunchout: punchout must have a Name';
            if (!punchout.CategoryID) throw 'ocPunchout: punchout must have a CategoryID'

            punchouts[punchout.CategoryID] = punchout;
        }
    };
}

function OrderCloudPunchoutConfig($ocPunchoutProvider) {
    var punchouts = [
        {Name: 'officedepot', CategoryID: 'TopStores_OfficeDepot', SupplierPartID: 'AAA'},
        {Name: 'bestbuy', CategoryID: 'TopStores_BestBuy'},
        {Name: 'kaplan', CategoryID: 'TopStores_Kaplan'},
        {Name: 'reallygoodstuff', CategoryID: 'TopStores_ReallyGoodStuff'},
        {Name: 'schoolspeciality', CategoryID: 'TopStores_SchoolSpecialty'},
        {Name: 'freyscientific', CategoryID: 'TopStores_FreyScientific'}
    ];

    angular.forEach(punchouts, function(punchout) {
        $ocPunchoutProvider.AddPunchout(punchout);
    });
}

function OrderCloudPunchoutStatesConfig($stateProvider) {
    $stateProvider
        .state('punchout', {
            url: '/punchout?link',
            templateUrl: 'punchout/templates/punchout.tpl.html',
            controller: 'OCPunchoutCtrl',
            controllerAs: 'punchout',
            resolve: {
                Parameters: function ($stateParams, ocParameters) {
                    return ocParameters.Get($stateParams);
                }
            }
        })
        .state('punchoutreturn', {
            url: '/punchoutreturn?state',
            templateUrl: 'common/templates/view.loading.tpl.html',
            controller: 'OCPunchoutReturnCtrl'
        })
    ;
}

function OrderCloudPunchoutController(Parameters, $sce, $scope, LoginService, adoptAClassromURL){
    var vm = this;
    vm.link = Parameters.link;
    vm.trustSrc = function(src){
        return $sce.trustAsResourceUrl(src);
    };
    vm.frameHeight = $('main').innerHeight();
    vm.outboundtURL = vm.trustSrc(vm.link);
     vm.logout = function() {
        LoginService.Logout(adoptAClassromURL);    
    };
}

function OrderCloudPunchoutReturnController($stateParams, $location) {
    window.top.location.href = '/' + (angular.isDefined($stateParams.state) ? $stateParams.state : 'cart');
}

function punchoutProductName() {
    return function(xp, punchoutName) {
        if (!xp || !punchoutName) return;

        var map = {
            'officedepot': 'Description'
        };

        return xp[map[punchoutName]];
    }
}