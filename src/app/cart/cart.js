angular.module('orderCloud')
    .config(CartConfig)
    .controller('CartCtrl', CartController)
;

function CartConfig($stateProvider) {
    $stateProvider
        .state('cart', {
            parent: 'base',
            url: '/cart',
            templateUrl: 'cart/templates/cart.tpl.html',
            controller: 'CartCtrl',
            controllerAs: 'cart',
            data: {
                pageTitle: "Shopping Cart"
            },
            resolve: {
                LineItemsList: function($q, $rootScope, toastr, ocLineItems, CurrentOrder) {
                    var dfd = $q.defer();
                    ocLineItems.ListAll(CurrentOrder.ID)
                        .then(function(data) {
                            if (!data.length) {
                                $rootScope.$broadcast('OC:UpdateOrder', CurrentOrder.ID);
                                dfd.resolve(data);
                            }
                            else {
                                ocLineItems.GetProductInfo(data)
                                    .then(function() {
                                        $rootScope.$broadcast('OC:UpdateOrder', CurrentOrder.ID);
                                        dfd.resolve(data);
                                    });
                            }
                        })
                        .catch(function() {
                            toastr.error('Your order does not contain any line items.', 'Error');
                            dfd.reject();
                        });
                    return dfd.promise;
                },
                CurrentPromotions: function(CurrentOrder, OrderCloudSDK) {
                    return OrderCloudSDK.Orders.ListPromotions('outgoing', CurrentOrder.ID);
                
                },
                
                CategoryList: function($stateParams, OrderCloudSDK) {
                    var opts = {
                        depth: 1,
                        filters: {ParentID: $stateParams.categoryID}
                    };
                    return OrderCloudSDK.Me.ListCategories(opts);
                },
                ProductList: function($stateParams, OrderCloudSDK) {
                    var opts = {catalogID: $stateParams.categoryID };
                    return OrderCloudSDK.Me.ListProducts(opts);

                }
            }
        });
}

function CartController($rootScope, $scope,  $state, $filter, toastr, OrderCloudSDK, LineItemsList, CurrentPromotions, ocConfirm, CategoryList, ProductList) {
    var vm = this;
    vm.vendorLineItemsMap = {};
    vm.lineItems = LineItemsList;
    vm.LineCount = vm.lineItems.length;
    
    // watcher on vm.lineItems
    $scope.$watch(function () {
        	return vm.lineItems;
    	}, function(newVal, oldVal){
    	vm.vendorLineItemsMap = {};
    	angular.forEach(vm.lineItems, function(lineItem){
        	var vendorName = (lineItem.xp && lineItem.xp.PunchoutName) 
                ? $filter('punchoutLineItemVendor')(lineItem.xp.PunchoutName)
                : lineItem.ProductID.split("_")[0]; 

        	if (typeof vm.vendorLineItemsMap[vendorName] === 'undefined'){
        		vm.vendorLineItemsMap[vendorName] = [];
        	}
        	vm.vendorLineItemsMap[vendorName].push(lineItem);
        });
    }, true);
    
    vm.promotions = CurrentPromotions.Meta ? CurrentPromotions.Items : CurrentPromotions;
    vm.removeItem = function(order, scope) {
        vm.lineLoading = [];
        vm.lineLoading[scope.$index] = OrderCloudSDK.LineItems.Delete('outgoing', order.ID, scope.lineItem.ID)
            .then(function () {
                $rootScope.$broadcast('OC:UpdateOrder', order.ID);
                var index = _.findIndex( vm.lineItems, function(lineItem){return lineItem.ID === scope.lineItem.ID;});
                 vm.lineItems.splice(index, 1);
                toastr.success('Line Item Removed');
            });
    };

    //TODO: missing unit tests
    vm.removePromotion = function(order, scope) {
        OrderCloudSDK.Orders.RemovePromotion('outgoing', order.ID, scope.promotion.Code)
            .then(function() {
                $rootScope.$broadcast('OC:UpdateOrder', order.ID);
                vm.promotions.splice(scope.$index, 1);
            });
    };

    vm.cancelOrder = function(order){
        ocConfirm.Confirm("Are you sure you want cancel this order?")
            .then(function() {
                OrderCloudSDK.Orders.Delete('outgoing', order.ID)
                    .then(function(){
                        $state.go('home',{}, {reload:'base'})
                    });
            });
    };
    
    vm.getSubTotal = function(lineItemsList){
		var total = 0.0;
		angular.forEach(lineItemsList, function(lineItem){
			total += ( lineItem.UnitPrice * lineItem.Quantity);
		});
		return total;
	}
    //TODO: missing unit tests
    $rootScope.$on('OC:UpdatePromotions', function(event, orderid) {
        OrderCloudSDK.Orders.ListPromotions('outgoing', orderid)
            .then(function(data) {
                if (data.Meta) {
                    vm.promotions = data.Items;
                } else {
                    vm.promotions = data;
                }
            });
    });
}