<?php

namespace rednaowooextraproduct\Integration\PluginsIntegration\Plugins;

use rednaowooextraproduct\core\Loader;

abstract class IntegrationBase
{
    public static abstract function IsActive();

    /**
     * @param $loader Loader
     * @return mixed
     */
    public abstract function Execute($loader);
}