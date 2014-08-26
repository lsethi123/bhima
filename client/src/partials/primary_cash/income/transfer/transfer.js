angular.module('bhima.controllers')
.controller('primaryCash.income.transfer', [
  '$scope',
  'connect',
  'messenger',
  'validate',
  'appstate',
  'util',
  'uuid',
  '$routeParams',
  '$location',
  '$translate',
  function ($scope, connect, messenger, validate, appstate, util, uuid, $routeParams, $location, $translate) {

    //inits and declarations
    var dependencies = {}, configuration = {};
    $scope.data= {};
    configuration.cash_box_id = $routeParams.cashbox_id;

    dependencies.project = {
      required : true,
      query : {
        tables : {
          'project' : {
            columns : ['id', 'name', 'abbr', 'enterprise_id']
          }
        }
      }
    };

    dependencies.pcash_module = {
      required : true,
      query : {
        tables : {
          'primary_cash_module' : {
            columns : ['id']
          }
        },
        where : ['primary_cash_module.text='+'transfert']
      }
    };

    dependencies.cash_box = {
      required : true,
      query : {
        tables : {
          'cash_box' : {
            columns : ['id', 'text', 'project_id']
          }
        },
        where : ['cash_box.is_auxillary='+1]
      }
    };

    dependencies.cashAccounCurrency = {
      required : true,
      query : {
        tables : {
          'cash_box_account_currency' : {
            columns : ['id', 'currency_id', 'cash_box_id', 'account_id']
          }
        }
      }
    };

    dependencies.currency = {
      required : true,
      query : {
        tables : {
          'currency' : {
            columns : ['id', 'name', 'symbol', 'min_monentary_unit']
          }
        }
      }
    };

    dependencies.cashier = {
      query : 'user_session'
    };

    //fonctions
    function init(model) {
      $scope.model = model;
      $scope.view = model;
      configuration.enterprise = $scope.enterprise;
      configuration.currency = getCurrency(configuration.enterprise.currency_id);
      configuration.module_id = model.pcash_module.data[0].id;
    }

    function commitCash() {      
      validate.refresh(dependencies, ['cash_box'])
      .then(function (model) {
        $scope.view.cash_box.data = model.cash_box.data.filter(function (item) {
          return item.project_id == $scope.data.project_id;
        });
        configuration.project_id = $scope.data.project_id;
      });     
    }

    function getCurrency(value) {
      var currency = {};
      for (var i = $scope.model.currency.data.length - 1; i >= 0; i -= 1) {
        if ($scope.model.currency.data[i].id === value) {
          currency = $scope.model.currency.data[i];
          break;
        }
      }
      return currency;
    }

    function commitConfig() {
      configuration.cash_box_source_id = $scope.data.cash_box_id;
      updateInfoCashBox(configuration.cash_box_source_id, configuration.currency.id);
    }

    function updateInfoCashBox(cash_box_source_id, currency_id) {
      if (!cash_box_source_id || !currency_id) {
        messenger.danger();
        return;
      }
      configuration.cash_account_currency = $scope.model.cashAccounCurrency.data.filter(function (item) {
        return item.cash_box_id == configuration.cash_box_source_id &&
          item.currency_id == configuration.currency.id;
      });
    }

    function updateConfig() {
      configuration.symbol = $scope.data.currency.symbol;
      configuration.currency_id = $scope.data.currency.id;
    }

    function handleError(err) {
      messenger.danger(err.toString());
    }

    function isValid() {
      var clean = true;
      if (!configuration || !configuration.value) { return false; }
      for (var k in configuration) {
        clean = clean && (k) ? true : false;
      }
      return (clean && ($scope.data.value) ? true : false);
    }

    function ajouter () {
      configuration.value = $scope.data.value;

      if (!isValid()) { return  messenger.danger($translate.instant('TRANSFERT.NO_CURRENCY')); }

      writeTransfer()
      .then(writeItem)
      .then(postToJournal)
      .then(function () {
        $location.path('/invoice/pcash_transfert/' + configuration.pcash.uuid);
      })
      .catch(handleError);
    }

    function writeItem(result) {
      var item = {
        uuid : uuid(),
        primary_cash_uuid : result.config.data.data.uuid,
        debit : configuration.value,
        credit : 0
      };
      return connect.basicPut('primary_cash_item', [item]);
    }

    function writeTransfer() {
      var pcash = {
        uuid        : uuid(),
        project_id  : configuration.project_id,
        type        : 'E',
        date        : util.sqlDate(new Date()),
        currency_id : configuration.currency.id,
        account_id  : configuration.cash_account_currency[0].account_id,
        cost        : configuration.value,
        user_id     : $scope.model.cashier.data.id,
        description : 'CT/'+new Date().toTimeString(),
        cash_box_id : configuration.cash_box_id,
        origin_id   : configuration.module_id
      };
      configuration.pcash = pcash;
      return connect.basicPut('primary_cash', connect.clean(pcash));
    }

    function postToJournal() {
      return connect.fetch('/journal/transfert/' + configuration.pcash.uuid);
    }

    function commitConfiguration() {
      configuration.currency_id = $scope.data.currency_id;
    }

    function loadPath(path) {
      // TODO validate both correct path and cashbox
      $location.path(path + configuration.cashbox);
    }

    appstate.register('enterprise', function (enterprise) {
      $scope.enterprise = enterprise;
      validate.process(dependencies, ['project', 'cash_box', 'cashAccounCurrency', 'currency', 'cashier', 'pcash_module'])
      .then(init)
      .catch(handleError);
    });

    $scope.$watch('data.currency', function (nv) {
      if (nv) {
        configuration.currency = JSON.parse(nv);
        updateInfoCashBox(configuration.cash_box_source_id, configuration.currency.id);
      }
    }, true);

    //expositions
    $scope.loadPath = loadPath;
    $scope.commitCash = commitCash;
    $scope.commitConfiguration = commitConfiguration;
    $scope.commitConfig = commitConfig;
    $scope.commitCash = commitCash;
    $scope.ajouter = ajouter;
    $scope.configuration = configuration;
    $scope.updateConfig = updateConfig;
  }
]);