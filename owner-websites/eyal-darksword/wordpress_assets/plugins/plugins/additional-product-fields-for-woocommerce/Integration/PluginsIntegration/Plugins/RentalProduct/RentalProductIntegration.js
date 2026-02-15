

var rnOriginalPrice='';
RedNaoSharedCore.default('shared/core/Events/EventManager').EventManager.SubscribeRaisable('GetFixedValue',function (args){
    if(args.Config.Id!='rp_num_days'&&args.Config.Id!='rp_total')
        return null;

    if(args.Config.Id=='rp_total')
    {
        if(rnOriginalPrice!='')
            return rnOriginalPrice;
        let total= args.Field.RootFormBuilder.FormContainer.querySelector('input[name="wcrp_rental_products_cart_item_price"]');
        if(total==null)
            return 0;

        let value=parseFloat(total.value);
        if(isNaN(value))
            return 0;

        return value;
    }


    let fromDate=args.Field.RootFormBuilder.FormContainer.querySelector('input[name="wcrp_rental_products_rent_from"]');
    let toDate=args.Field.RootFormBuilder.FormContainer.querySelector('input[name="wcrp_rental_products_rent_to"]');

    if(fromDate==null||toDate==null)
        return 0;

    var rentFromDate = fromDate.value;
    var rentToDate = toDate.value;

    if(rentFromDate==''||rentToDate=='')
    {
        return 0;
    }
    var rentFromDateSplit = rentFromDate.split( '-' );
    var rentFromDateTimestamp = new Date( rentFromDateSplit[ 0 ], rentFromDateSplit[1] - 1, rentFromDateSplit[ 2 ] , 12, 0, 0, 0 ).getTime();
    var rentToDateSplit = rentToDate.split( '-' );
    var rentToDateTimestamp = new Date( rentToDateSplit[ 0 ], rentToDateSplit[1] - 1, rentToDateSplit[ 2 ] , 12, 0, 0, 0 ).getTime();

    rentedDays = Math.round( Math.abs( ( rentFromDateTimestamp - rentToDateTimestamp ) / ( 24 * 60 * 60 * 1000 ) ) ) + 1;
    return rentedDays;

});

RedNaoSharedCore.default('shared/core/Events/EventManager').EventManager.SubscribeRaisable('BeforeSubmit',function (args){
    let total= args.FormContainer.querySelector('input[name="wcrp_rental_products_cart_item_price"]');
    if(total!=null)
    {
        if(rnOriginalPrice=='')
            rnOriginalPrice=total.value;
        let totalToUse=parseFloat(rnOriginalPrice);
        if(isNaN(totalToUse))
            totalToUse=0;
        rnTotalObserver.disconnect();
        total.value=args.PriceManager.OptionsUnitPrice;
        RNObserveTotal(args);

    }
});
var rnTotalObserver=null;
function RNObserveTotal(args){
    let total=args.FormContainer.querySelector('input[name="wcrp_rental_products_cart_item_price"]');
    rnTotalObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === "attributes") {

                    rnOriginalPrice='';
                    args.ContainerManager.GetRootContainer().FireVariationChanged('Rental Product Total Price');

            }
        });
    });
    if(total!=null)
        rnTotalObserver.observe(total,{attributes:true,attributeFilter:['value']});
}
RedNaoSharedCore.default('shared/core/Events/EventManager').EventManager.SubscribeRaisable('ExtraProductOptionsLoaded',function (args){

    RNObserveTotal(args);
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === "attributes") {
                args.ContainerManager.GetRootContainer().FireVariationChanged('Rental Product Number of Days');


            }
        });
    });


    let fromDate=args.FormContainer.querySelector('input[name="wcrp_rental_products_rent_from"]');

    if(fromDate!=null)
        observer.observe(fromDate,{attributes:true,attributeFilter:['value']});

    let toDate=args.FormContainer.querySelector('input[name="wcrp_rental_products_rent_to"]');
    if(toDate!=null)
        observer.observe(toDate,{attributes:true,attributeFilter:['value']});


    let span=args.FormContainer.querySelector('.wcrp-rental-products-total-price');

});