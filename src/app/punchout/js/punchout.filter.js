angular.module('orderCloud')
    .filter('punchoutProductName', punchoutProductName)
    .filter('punchoutLineItemVendor', punchoutLineItemVendor)
;

function punchoutProductName() {
    return function(xp, punchoutName) {
        if (!xp || !punchoutName) return;

        var map = {
            'officedepot': 'Description',
            'bestbuy': 'Description',
            'kaplan': 'Description',
            'reallygoodstuff': 'Description',
            'schoolspeciality': 'Description',
            'freyscientific': 'Description',
            'officedepottest' : 'Description',
            'bestbuytest' : 'Description',
            'kaplantest': 'Description',
            'reallygoodstufftest': 'Description',
            'schoolspecialitytest': 'Description',
            'freyscientifictest': 'Description',
            'lakeshorelearning':'Description'
        };

        return xp[map[punchoutName]];
    }
}

function punchoutLineItemVendor() {
    return function(punchoutName) {
        if (!punchoutName) return;

        var map = {
            'officedepot': 'Office Depot',
            'bestbuy': 'Best Buy',
            'kaplan': 'Kaplan',
            'reallygoodstuff': 'Really Good Stuff',
            'schoolspeciality': 'School Specialty',
            'freyscientific': 'School Specialy Frey Scientific',
            'lakeshorelearning': 'Lakeshore Learning',
            'officedepottest' : 'Office Depot Test',
            'bestbuytest' : 'Best Buy Test',
            'kaplantest': 'Kaplan Test',
            'reallygoodstufftest': 'Really Good Stuff Test',
            'schoolspecialitytest': 'School Speciality Test',
            'freyscientifictest': 'Frey Scientific Test',
            'lakeshorelearningtest': 'Lakeshore Learning Test',
         
        };

        return map[punchoutName];
    }
}