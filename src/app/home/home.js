angular.module('orderCloud')
	.config(HomeConfig)
	.controller('HomeCtrl', HomeController)
;

function HomeConfig($stateProvider) {
	$stateProvider
		.state('home', {
			parent: 'base',
			url: '/home',
			templateUrl: 'home/templates/home.tpl.html',
			controller: 'HomeCtrl',
			controllerAs: 'home',
			data: {
				pageTitle: 'Home'
			}
		})
	;
}

function HomeController(vendors, $state, ocPunchout, CurrentOrder, environment) {
	var vm = this;
	vm.vendors = vendors;
	vm.toPunchOut = function(ID){
		if((environment === 'test') | ( environment === 'staging')) ID =  ID + 'Test';
		var punchoutCategory = ocPunchout.IsPunchoutCategory(ID);
        if (punchoutCategory) {
            vm.loading = ocPunchout.SetupRequest(punchoutCategory.Name, punchoutCategory.SupplierPartID, CurrentOrder.ID)
                .then(function(data) {
                    $state.go('punchout', {link:data.StartURL});
                });
        } else {
            $state.go('home');
        }
	}
}
