angular.module('bhima.controllers')
.controller('payroll_report', [
  '$scope',
  '$translate',
  '$http',
  '$routeParams',
  'connect',  
  'validate',
  'appstate',
  'util',
  function ($scope, $translate, $http, $routeParams, connect, validate, appstate, util) {
    var dependencies = {},
        session = $scope.session = {};

   dependencies.getPeriods = {
      query : {
        identifier : 'id',
        tables : {
          'paiement_period' : { 
            columns : ['id', 'label', 'dateFrom', 'dateTo']
          }
        }
      }
    };


    function reset () {
      var record = connect.clean(session);
      $http.get('/getReportPayroll/',{params : {
            'period_id' : record.period_id
          }  
      }).
      success(function(data) {
        console.log(data.length);
        $scope.Reports = data;
      });
    }

    function startup (models) {
      angular.extend($scope, models);
    }

    appstate.register('enterprise', function (enterprise) {
      $scope.enterprise = enterprise;
      validate.process(dependencies)
      .then(startup);
    });

    $scope.reset = reset;
    function generateReference () {
      window.data = $scope.getPeriods.data;
      var max = Math.max.apply(Math.max, $scope.getPeriods.data.map(function (o) { return o.reference; }));
      return Number.isNaN(max) ? 1 : max + 1;
    } 
  } 
]);

