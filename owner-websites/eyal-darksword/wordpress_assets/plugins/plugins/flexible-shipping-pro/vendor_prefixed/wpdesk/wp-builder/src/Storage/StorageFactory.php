<?php

namespace FSProVendor\WPDesk\PluginBuilder\Storage;

class StorageFactory
{
    /**
     * @return PluginStorage
     */
    public function create_storage()
    {
        return new \FSProVendor\WPDesk\PluginBuilder\Storage\WordpressFilterStorage();
    }
}
