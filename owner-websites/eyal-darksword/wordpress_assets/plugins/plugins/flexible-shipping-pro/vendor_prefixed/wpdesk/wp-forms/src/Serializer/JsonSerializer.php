<?php

namespace FSProVendor\WPDesk\Forms\Serializer;

use FSProVendor\WPDesk\Forms\Serializer;
class JsonSerializer implements \FSProVendor\WPDesk\Forms\Serializer
{
    public function serialize($value)
    {
        return \json_encode($value);
    }
    public function unserialize($value)
    {
        return \json_decode($value, \true);
    }
}
