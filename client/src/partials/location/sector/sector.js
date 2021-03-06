angular.module('bhima.controllers')
.controller('sector', [
  '$scope',
  'connect',
  'validate',
  'uuid',
  function ($scope, connect, validate, uuid) {
    var dependencies = {};

    dependencies.provinces = {
      query :  {
        identifier : 'uuid',
        tables: {
          'province' : {
            columns : ['uuid', 'name', 'country_uuid']
          }
        }
      }
    };

    dependencies.sectors = {
      identifier : 'uuid',
      query : '/sector/'
    };

    function manageSector(model) {
      angular.extend($scope, model);
    }

    function setOp(action, sector){
      $scope.sector = angular.copy(sector) || {};
      $scope.op = action;
    }

    function addSector(obj){
      var newObject = {};
      newObject.uuid = uuid();
      newObject.name = obj.name;
      newObject.province_uuid = obj.province_uuid;
      connect.basicPut('sector', [connect.clean(newObject)])
      .then(function () {
        newObject.uuid = newObject.uuid;
        newObject.sector = newObject.name;
        newObject.province = $scope.provinces.get(obj.province_uuid).name;
        $scope.sectors.post(newObject);
        $scope.op = '';
      });
    }

    function editSector(){
      var sector = {
        uuid : $scope.sector.uuid,
        name : $scope.sector.sector,
        province_uuid :$scope.sector.province_uuid
      };

      connect.basicPost('sector', [connect.clean(sector)], ['uuid'])
      .then(function () {
        $scope.sectors.put(sector);
        $scope.op = '';
      });
    }

    function removeSector(uuid){
      connect.basicDelete('sector', uuid, 'uuid')
      .then(function(){
        $scope.sectors.remove(uuid);
      });
    }

    validate.process(dependencies)
    .then(manageSector);

    $scope.setOp = setOp;
    $scope.addSector = addSector;
    $scope.editSector = editSector;
    $scope.removeSector = removeSector;
  }
]);
