<?php

namespace FSProVendor\WPDesk\Forms\Validator;

use FSProVendor\WPDesk\Forms\Validator;
class NoValidateValidator implements \FSProVendor\WPDesk\Forms\Validator
{
    public function is_valid($value)
    {
        return \true;
    }
    public function get_messages()
    {
        return [];
    }
}
