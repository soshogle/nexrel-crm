<?php

namespace rednaowooextraproduct\Integration\PluginsIntegration\Plugins\RentalProduct;

use rednaowooextraproduct\Integration\PluginsIntegration\Plugins\IntegrationBase;

class RentalProductIntegration extends IntegrationBase
{

    public static function IsActive()
    {
        return class_exists( 'WCRP_Rental_Products' );
    }


    public function Execute($loader)
    {
        add_filter('woo-extra-product-initialize-product-designer-var',function ($vars){
            $vars["AllAttributes"][]=array(
              "Name"=>"Rental Product Number of Days",
              "Id"=>"rp_num_days"
            );

            $vars["AllAttributes"][]=array(
                "Name"=>"Rental Product Total Price",
                "Id"=>"rp_total"
            );
           return $vars;
        });

        add_filter('woo-extra-product-load-extra-options',function ($dependencies,$product,$options)use($loader){
            $loader->AddScript('rental_product_calculate_days','Integration/PluginsIntegration/Plugins/RentalProduct/RentalProductIntegration.js',array('@shared-core'));
            $dependencies[]='@rental_product_calculate_days';
            return $dependencies;
        },10,3);

    }
}