angular.module('kpk.controllers').controller('utilController', function($scope, $translate) { 
  ////
  // summary: 
  //  Responsible for all utilities (buttons/ selects etc.) on the application side bar
  /////

  $scope.toggleTranslate = function toggleTranslate(lang_key) { 
    $translate.uses(lang_key);
  }
  
  //removed select code - downloaded Enterprises/Fiscal Years and populated selects
});