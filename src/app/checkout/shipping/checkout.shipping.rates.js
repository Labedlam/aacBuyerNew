angular.module('orderCloud')
	.service('VendorShippingCriteria', VendorShippingCriteria)
    .factory('ShippingRates', ShippingRatesService)
;

function ShippingRatesService($q, $resource, OrderCloudSDK, apiurl, buyerid) {
    var service = {
        GetRates: _getRates,
        GetLineItemRates: _getLineItemRates,
        SetShippingCost: _setShippingCost,
        ManageShipments: _manageShipments,
        AnalyzeShipments: _analyzeShipments
    };

    var shippingRatesURL = apiurl + '/v1/integrationproxy/shippingrates';

    function _getRates(order) {
        var deferred = $q.defer();

        var request = {
            BuyerID: buyerid,
            TransactionType: 'GetRates',
			OrderDirection: 'outgoing', 
            OrderID: order.ID
        };

        $resource(shippingRatesURL, {}, {getrates: {method: 'POST', headers: {'Authorization': 'Bearer ' + OrderCloudSDK.GetToken()}}}).getrates(request).$promise
            .then(function(data) {
                deferred.resolve(data.ResponseBody.Shipments);
            })
            .catch(function(ex) {
                deferred.resolve(null);
            });

        return deferred.promise;
    }

    function _getLineItemRates(order) {
        var deferred = $q.defer();

        var request = {
            BuyerID: buyerid,
            TransactionType: 'GetLineItemRates',
            OrderID: order.ID
        };

        $resource(shippingRatesURL, {}, {getlineitemrates: {method: 'POST', headers: {'Authorization': 'Bearer ' + OrderCloudSDK.GetToken()}}}).getlineitemrates(request).$promise
            .then(function(data) {
                deferred.resolve(data.ResponseBody.Shipments);
            })
            .catch(function(ex) {
                deferred.resolve(null);
            });

        return deferred.promise;
    }

    function _setShippingCost(order, cost) {
        var deferred = $q.defer();

        var request = {
            BuyerID: buyerid,
            TransactionType: 'SetShippingCost',
            OrderID: order.ID,
            ShippingCost: cost
        };

        $resource(shippingRatesURL, {}, {setshippingcost: {method: 'POST', headers: {'Authorization': 'Bearer ' + OrderCloudSDK.GetToken()}}}).setshippingcost(request).$promise
            .then(function(data) {
                deferred.resolve(data.ResponseBody);
            })
            .catch(function(ex) {
                deferred.resolve(null);
            });

        return deferred.promise;
    }

    function _manageShipments(order, shipments) {
        var deferred = $q.defer();

        var xpPatch = {Shippers: []};
        var shippingCost = 0;

        angular.forEach(shipments, function(shipment) {
            if (shipment.SelectedShipper) {
                shippingCost += shipment.SelectedShipper.Price;
                xpPatch.Shippers.push({
                    Shipper: shipment.SelectedShipper.Description,
                    Cost: shipment.SelectedShipper.Price,
                    LineItemIDs: shipment.LineItemIDs
                });
            }
        });

        OrderCloudSDK.Orders.Patch('outgoing', order.ID, {xp: xpPatch})
            .then(function() {
                updateShippingCost();
            })
            .catch(function() {
                deferred.reject();
            });

         function updateShippingCost() {
             _setShippingCost(order, shippingCost)
                 .then(function(data) {
                     deferred.resolve(data);
                 })
                 .catch(function(ex) {
                     deferred.reject();
                 });
         }

        return deferred.promise;
    }

    function _analyzeShipments(order, shippingRates) {
        if (order.xp && order.xp.Shippers) {
            angular.forEach(order.xp.Shippers, function(shipment) {
                angular.forEach(shippingRates, function(s) {
                    if (_.intersection(s.LineItemIDs, shipment.LineItemIDs).length == shipment.LineItemIDs.length) {
                        var selection = _.findWhere(s.Rates, {Description: shipment.Shipper});
                        if (selection) s.SelectedShipper = selection;
                    }
                });
            });
        }

        return shippingRates;
    }

    return service;
}


function VendorShippingCriteria() {
	var ByVendor = [
		{
			name: 'Adventure',
			minOrderAmount: 0,
			shippingCostFunc: function(order) {return 0;}
		},
		{
			name: 'AKJEducation',
			minOrderAmount: 0,
			shippingCostFunc: function(order) {
				return 3 + 0.1*order.amount;
			}
		},
		{
			name: 'Bazillions',
			minOrderAmount: 0,
			shippingCostFunc: function(order) {
				return 1.5 + 1*order.itemCount;
			}
		},
		{
			name: 'Beckers',
			minOrderAmount: 0,
			shippingCostFunc: function(order) {
				return Math.max(7.5, 0.15*order.amount);
			}
		},
		{
			name: 'Best Buy',
			minOrderAmount: 25,
			shippingCostFunc: function(order) {
				return 5 + 0.0175*order.amount;
			}
		},
		{
			name: 'Carson',
			minOrderAmount: 15,
			shippingCostFunc: function(order) {
				return 0.15*order.amount;
			}
		},
		{
			name: 'Edupress',
			minOrderAmount: 0,
			shippingCostFunc: function(order) {
				return 0.15*order.amount;
			}
		},
		
		{
			name: 'Hovercam',
			minOrderAmount: 0,
			shippingCostFunc: function(order) {
				return 0.15*order.amount;
			}
		},
		{
			name: 'Kaplan',
			minOrderAmount: 0,
			shippingCostFunc: function(order) {
				return 0.15*order.amount;
			}
		},
		{
			name: 'Rocketbook',
			minOrderAmount: 0,
			shippingCostFunc: function(order) {
				return 7;
			}
		},
		{
			name: 'Laser Classroom',
			minOrderAmount: 0,
			shippingCostFunc: function(order) {
				return 9.99;
			}
		},
		{
			name: 'LearningAZ',
			minOrderAmount: 0,
			shippingCostFunc: function(order) {return 0;}
		},
		{
			name: 'Lorenz',
			minOrderAmount: 0,
			shippingCostFunc: function(order) {
				return 5.95 + 0.15*order.amount;
			}
		},
		{
			name: "Miss Humblebee's Academy",
			minOrderAmount: 0,
			shippingCostFunc: function(order) {
				return 0.15*order.amount;
			}
		},
		{
			name: 'Office Depot',
			minOrderAmount: 25,
			shippingCostFunc: function(order) {
				return order.amount > 49.99 ? 0 : 5.95;
			}
		},
		{
			name: 'ReallyGoodStuff',
			minOrderAmount: 0,
			shippingCostFunc: function(order) {
				if (order.amount < 30)
					return 4.95;
				if (order.amount < 49.99)
					return 9.95;
				if (order.amount < 99.99)
					return 10.95;
				if (order.amount >= 100)
					return 0.14*order.amount;
			}
		},
		
		{
			name: 'Ooly',
			minOrderAmount: 0,
			shippingCostFunc: function(order) {
				return order.amount > 30.00 ? 0 : 4.95;
			}
		},
		{
			name: 'Scholastic',
			minOrderAmount: 0,
			shippingCostFunc: function(order) {
				return order.amount > 49.99 ? 0 : 9.95;
			}
		},
		{
			name: 'ScholasticMagazines',
			minOrderAmount: 0,
			shippingCostFunc: function(order) {return 0;}
		},
		
		{
			name: 'School Specialy Frey Scientific',
			minOrderAmount: 0,
			shippingCostFunc: function(order) {
				return order.amount > 49.99 ? 0 : 9.95;
			}
		},
		{
			name: 'School Specialty',
			minOrderAmount: 0,
			shippingCostFunc: function(order) {
				return order.amount > 49.99 ? 0 : 9.95;
			}
		},
		{
			name: 'Science4us',
			minOrderAmount: 0,
			shippingCostFunc: function(order) {return 0;}
		},
		{
			name: 'Speakaboos',
			minOrderAmount: 0,
			shippingCostFunc: function(order) {return 0;}
		},
		{
			name: 'SpellingCity',
			minOrderAmount: 0,
			shippingCostFunc: function(order) {return 0;}
		},
		{
			name: 'WestMusic',
			minOrderAmount: 0,
			shippingCostFunc: function(order) {
				return 0.09*order.amount;
			}
		},
		{
			name: 'WonderWorkshop',
			minOrderAmount: 0,
			shippingCostFunc: function(order) {
				return order.amount > 99 ? 0 : 10;
			}
		},
		{
			name: 'YourDollar',
			minOrderAmount: 0,
			shippingCostFunc: function(order) {return 0;}
		}
	];

	var ByState = [
		{
			name: 'CA',
			shippingCostFunc: function(order) {
				var cost = 0;
				if(order.itemCount < 10) {
					cost = 13;
				}else if (order.itemCount <= 20) {
					cost = 26;
				}else if (order.itemCount <= 40) {
					cost = 50;
				}else if (order.itemCount <= 60) {
					cost = 80;
				}else if (order.itemCount <= 80) {
					cost = 120;
				}else if (order.itemCount <= 100) {
					cost = 150;
				}
				return cost;
			}
		},
		{
			name: 'HI',
			shippingCostFunc: function(order) {
				var cost = 0;
				if(order.itemCount < 10) {
					cost = 40;
				}else if (order.itemCount <= 20) {
					cost = 80;
				}else if (order.itemCount <= 40) {
					cost = 180;
				}else if (order.itemCount <= 60) {
					cost = 280;
				}else if (order.itemCount <= 80) {
					cost = 380;
				}else if (order.itemCount <= 100) {
					cost = 440;
				}
				return cost;
			}
		},
		{
			name: 'AK',
			shippingCostFunc: function(order) {
				var cost = 0;
				if(order.itemCount < 10) {
					cost = 40;
				}else if (order.itemCount <= 20) {
					cost = 80;
				}else if (order.itemCount <= 40) {
					cost = 180;
				}else if (order.itemCount <= 60) {
					cost = 280;
				}else if (order.itemCount <= 80) {
					cost = 380;
				}else if (order.itemCount <= 100) {
					cost = 440;
				}
				return cost;
			}
		}
	];
	
	var ByDefault = {
		name: 'Other',
		shippingCostFunc: function(order) {
			var cost = 0;
			if(order.itemCount < 10) {
				cost = 12;
			}else if (order.itemCount <= 20) {
				cost = 20;
			}else if (order.itemCount <= 40) {
				cost = 35;
			}else if (order.itemCount <= 60) {
				cost = 50;
			}else if (order.itemCount <= 80) {
				cost = 80;
			}else if (order.itemCount <= 100) {
				cost = 100;
			}
			return cost;
		}
	};
	
	this.getShippingCostByVendor = function(vendorName, vendorLineItems){
        var itemCount = 0;
		var	amount = 0;
		var	state = '';
        angular.forEach(vendorLineItems, function(lineItem){
            amount += ( lineItem.UnitPrice * lineItem.Quantity);
            itemCount += lineItem.Quantity;
            state = lineItem.ShippingAddress ? lineItem.ShippingAddress.State : null;
        });

        var vendorShippingCriteria = _.find(ByVendor, {name: vendorName}) || _.find(ByState, {name: state}) || ByDefault;

        var shippingCalculator = vendorShippingCriteria.shippingCostFunc;

        var shippingCost = shippingCalculator({
            amount: amount,
            itemCount: itemCount
        });
        return shippingCost;
    };
}