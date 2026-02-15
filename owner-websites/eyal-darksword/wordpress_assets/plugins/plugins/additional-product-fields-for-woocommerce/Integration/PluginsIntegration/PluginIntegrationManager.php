<?php

namespace rednaowooextraproduct\Integration\PluginsIntegration;

use rednaowooextraproduct\Integration\PluginsIntegration\Plugins\RentalProduct\RentalProductIntegration;

class PluginIntegrationManager
{
    public static function Initialize($loader){
        if(RentalProductIntegration::IsActive())
            (new RentalProductIntegration())->Execute($loader);

    }
}