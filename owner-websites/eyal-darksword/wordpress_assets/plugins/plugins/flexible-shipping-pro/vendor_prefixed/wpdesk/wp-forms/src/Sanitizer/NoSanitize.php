<?php

namespace FSProVendor\WPDesk\Forms\Sanitizer;

use FSProVendor\WPDesk\Forms\Sanitizer;
class NoSanitize implements \FSProVendor\WPDesk\Forms\Sanitizer
{
    public function sanitize($value)
    {
        return $value;
    }
}
