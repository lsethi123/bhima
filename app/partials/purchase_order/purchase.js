angular.module('kpk.controllers').controller('purchaseOrderController', function($scope, $q, connect, appstate, appnotify) {
  console.log("Inventory invoice initialised");

//  FIXME There is a lot of duplicated code for salesController - is there a better way to do this?
//  FIXME Resetting the form maintains the old invoice ID - this causes a unique ID error, resolve this
  $scope.sale_date = getDate();
  $scope.inventory = [];

  $scope.process = ["PO", "QUOTE"];
  $scope.current_process = $scope.process[0];

  $scope.purchase_order = {payable: "false"};

  var inventory_query = {
    'tables' : {
      'inventory' : {
        'columns' : [
          'id',
          'code',
          'text',
          'price',
          'type_id'
        ]
      }
    },
    'where' : [
      'inventory.type_id=0'
    ]
  }
  var inventory_request = connect.req(inventory_query);


  var max_sales_request = connect.basicGet('/max/id/sale');
  var max_purchase_request = connect.basicGet('/max/id/purchase');

  var creditor_query = {
    'e' : [{
      t : 'supplier',
      c : ['id', 'name', 'location_id', 'creditor_id']
    }, {
      t : 'location',
      c : ['city', 'region', 'country_id']
    }],
    'jc' : [{
      ts : ['location', 'supplier'],
      c : [ 'id', 'location_id']
    }]
  };

  var creditor_request = connect.basicReq(creditor_query);
  var user_request = connect.basicGet("user_session");

  function init() {

    $scope.inventory = [];
    $scope.purchase_order.payable = "false";
    $scope.creditor = "";

    $q.all([
      inventory_request,
      // sales_request,
      // purchase_request,
      max_sales_request,
      max_purchase_request,
      creditor_request,
      user_request

    ]).then(function(a) {
      $scope.inventory_model = a[0];
      $scope.max_sales = a[1].data.max;
      $scope.max_purchase = a[2].data.max;
      $scope.creditor_model = a[3];
      $scope.verify = a[4].data.id;

//      Raw hacks - #sorry, these might be the same entity anyway
      var id = Math.max($scope.max_sales, $scope.max_purchase);
      $scope.invoice_id = createId(id);
    });
  }

  function getDate() {
    //Format the current date according to RFC3339 (for HTML input[type=="date"])
    var now = new Date();
    return now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + ('0' + now.getDate()).slice(-2);
  }

  function createId(current) {
    /*
    *summary 
    *  Format and increment according to transaction ID format
    */
    var default_id = 100000;
    if(!current) return default_id;
    return current+1;
  }

  function formatInvoice() {
    var t = 0;
    for(var i= 0, l = $scope.inventory.length; i < l; i++) {
      t += $scope.inventory[i].quantity * $scope.inventory[i].price;
    }
//    verify total

    var format = {
      enterprise_id : appstate.get("enterprise").id, //Not async safe - may return null
      id : $scope.invoice_id,
      cost : t,
      currency_id : 1, // FIXME
      creditor_id : $scope.creditor.id,
      invoice_date : $scope.sale_date,
      purchaser_id : $scope.verify,
      note : $scope.formatText(),
      posted : '0'
    };
//    verify format
    return format;
  }

  function generateItems() {
    var deferred = $q.defer();
    var promise_arr = [];

    //iterate through invoice items and create an entry to sale_item
    $scope.inventory.forEach(function(item) {
      var format_item = {
        purchase_id : $scope.invoice_id,
        inventory_id : item.item.id,
        quantity : item.quantity,
        unit_price : item.price,
        total : item.quantity * item.price
      };
      console.log("Generating sale item for ", item);

      promise_arr.push(connect.basicPut('purchase_item', [format_item]));
    });

    $q.all(promise_arr).then(function(res) { deferred.resolve(res)});
    return deferred.promise;
  }

  $scope.submitPurchase = function() {
    var purchase = formatInvoice();

    console.log("Posting", purchase, "to 'purchase table");

    connect.basicPut('purchase', [purchase])
      .then(function(res) {
        if(res.status==200) {
          var promise = generateItems();
          promise
            .then(function(res) {
              console.log("Purchase order successfully generated", res);
              connect.journal([{id:$scope.invoice_id, transaction_type:3, user:1}]); //just for the test, send data to the journal traget server-side
//              Navigate to Purchase Order review || Reset form
//              Reset form
                init();

            });
        }
      });
  }

  $scope.updateItem = function(item) {

    if(item.item) {
      if(!item.quantity) item.quantity = 1;
      item.text = item.item.text;
      item.price = item.item.price;
    } else {
//      Reset
      item.text = "";
      item.price = "";
      item.quantity = "";
    }
  }

  $scope.updateInventory = function() {
    $scope.inventory.push({});
  }

  $scope.formatText = function() {
//      FIXME String functions within digest will take hours and years
    var c = "PO " + $scope.invoice_id + "/" + $scope.sale_date;
    if($scope.creditor) c += "/" + $scope.creditor.name + "/";
    return c;
  }



//  Radio inputs only accept string true/false? boolean value as payable doesn't work
  $scope.isPayable = function() {
    if($scope.purchase_order.payable=="true") return true;
    return false;
  };

  // FIXME Again - evaluated every digest, this is a bad thing
  $scope.invoiceTotal = function() {
    var total = 0;
    $scope.inventory.forEach(function(item) {
      if(item.quantity && item.price) {
        //FIXME this could probably be calculated less somewhere else (only when they change)
        total += (item.quantity * item.price);
      }
    });
    return total;
  }

  $scope.itemsInInv = function() {
    if($scope.inventory.length>0) return true;
    return false;
  }

  $scope.select = function(index) {
    $scope.current_process = $scope.process[index];
  }

  $scope.formatCreditor = function(creditor) {
    return creditor.name;
  }

  init();


});