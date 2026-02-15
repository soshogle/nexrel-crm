<?php

namespace FSProVendor\WPDesk\Forms\Sanitizer;

use FSProVendor\WPDesk\Forms\Sanitizer;
class CallableSanitizer implements \FSProVendor\WPDesk\Forms\Sanitizer
{
    private $callable;
    public function __construct($callable)
    {
        $this->callable = $callable;
    }
    public function sanitize($value)
    {
        return \call_user_func($this->callable, $value);
    }
}
